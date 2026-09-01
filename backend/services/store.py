"""
State Store & Audit Log Service for Pulse.
Maintains in-memory ring buffers for real-time dashboard updates and persistent
records for flagged cases, analyst actions, and user feedback.
"""

import os
import json
import sqlite3
from datetime import datetime
from typing import List, Dict, Any, Optional

class Store:
    def __init__(self, db_path=None):
        if not db_path:
            backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
            db_path = os.path.join(backend_dir, "data", "pulse_store.db")
            
        self.db_path = db_path
        os.makedirs(os.path.dirname(self.db_path), exist_ok=True)
        
        # In-memory fast ring buffers
        self.recent_txns: List[Dict[str, Any]] = []
        self.max_txns_buffer = 150
        
        self.recent_vitals: List[Dict[str, Any]] = []
        self.max_vitals_buffer = 120
        
        self.flags: Dict[str, Dict[str, Any]] = {}
        self.audit_log: List[Dict[str, Any]] = []
        
        self._init_db()

    def _init_db(self):
        conn = sqlite3.connect(self.db_path)
        cur = conn.cursor()
        
        cur.execute("""
            CREATE TABLE IF NOT EXISTS flags (
                id TEXT PRIMARY KEY,
                type TEXT,
                status TEXT,
                score REAL,
                deviation REAL,
                first_txn_id TEXT,
                payload TEXT,
                created_at TEXT,
                resolved_action TEXT,
                resolved_at TEXT,
                notes TEXT
            )
        """)
        
        cur.execute("""
            CREATE TABLE IF NOT EXISTS audit_trail (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                flag_id TEXT,
                action TEXT,
                analyst TEXT,
                notes TEXT,
                timestamp TEXT
            )
        """)
        
        cur.execute("""
            CREATE TABLE IF NOT EXISTS explanation_feedback (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                flag_id TEXT,
                rating TEXT,
                comment TEXT,
                timestamp TEXT
            )
        """)
        
        conn.commit()
        conn.close()

    def add_transaction(self, txn: Dict[str, Any]):
        self.recent_txns.insert(0, txn)
        if len(self.recent_txns) > self.max_txns_buffer:
            self.recent_txns.pop()

    def add_vitals_point(self, point: Dict[str, Any]):
        self.recent_vitals.append(point)
        if len(self.recent_vitals) > self.max_vitals_buffer:
            self.recent_vitals.pop(0)

    def add_flag(self, flag: Dict[str, Any]):
        flag_id = flag["id"]
        flag["resolved"] = False
        flag["resolved_action"] = None
        flag["resolved_at"] = None
        self.flags[flag_id] = flag
        
        try:
            conn = sqlite3.connect(self.db_path)
            cur = conn.cursor()
            cur.execute("""
                INSERT OR REPLACE INTO flags 
                (id, type, status, score, deviation, first_txn_id, payload, created_at, resolved_action, resolved_at, notes)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                flag_id,
                flag.get("type", "spike"),
                flag.get("status", "open"),
                flag.get("score", 0.0),
                flag.get("deviation_sigma", 0.0),
                flag.get("first_anomalous_txn_id", ""),
                json.dumps(flag),
                flag.get("detected_at", datetime.utcnow().isoformat()),
                None,
                None,
                ""
            ))
            conn.commit()
            conn.close()
        except Exception as e:
            print(f"Error persisting flag: {e}")

    def record_action(self, flag_id: str, action: str, analyst: str = "Risk Analyst", notes: str = "") -> Optional[Dict[str, Any]]:
        timestamp = datetime.utcnow().isoformat()
        
        # Update in-memory
        if flag_id in self.flags:
            self.flags[flag_id]["resolved"] = True
            self.flags[flag_id]["resolved_action"] = action
            self.flags[flag_id]["resolved_at"] = timestamp
            self.flags[flag_id]["status"] = "resolved"
            
        entry = {
            "flag_id": flag_id,
            "action": action,
            "analyst": analyst,
            "notes": notes,
            "timestamp": timestamp
        }
        self.audit_log.insert(0, entry)
        
        try:
            conn = sqlite3.connect(self.db_path)
            cur = conn.cursor()
            cur.execute("""
                UPDATE flags SET status='resolved', resolved_action=?, resolved_at=?, notes=? WHERE id=?
            """, (action, timestamp, notes, flag_id))
            
            cur.execute("""
                INSERT INTO audit_trail (flag_id, action, analyst, notes, timestamp)
                VALUES (?, ?, ?, ?, ?)
            """, (flag_id, action, analyst, notes, timestamp))
            
            conn.commit()
            conn.close()
        except Exception as e:
            print(f"Error persisting audit action: {e}")
            
        return self.flags.get(flag_id)

    def record_feedback(self, flag_id: str, rating: str, comment: str = ""):
        timestamp = datetime.utcnow().isoformat()
        try:
            conn = sqlite3.connect(self.db_path)
            cur = conn.cursor()
            cur.execute("""
                INSERT INTO explanation_feedback (flag_id, rating, comment, timestamp)
                VALUES (?, ?, ?, ?)
            """, (flag_id, rating, comment, timestamp))
            conn.commit()
            conn.close()
        except Exception as e:
            print(f"Error saving feedback: {e}")

    def get_all_flags(self) -> List[Dict[str, Any]]:
        # Return descending by detected time
        return list(self.flags.values())

    def get_flag(self, flag_id: str) -> Optional[Dict[str, Any]]:
        return self.flags.get(flag_id)

    def get_audit_trail(self) -> List[Dict[str, Any]]:
        return self.audit_log

    def reset_state(self):
        self.recent_txns = []
        self.recent_vitals = []
        self.flags = {}
        self.audit_log = []

# Global singleton
store_instance = Store()
