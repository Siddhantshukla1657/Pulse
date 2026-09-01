"""
Asynchronous Stream Replayer Engine for Pulse.
Simulates a live merchant transaction feed, scores each transaction online via XGBoost,
runs rolling spike detection, and broadcasts live vitals over WebSocket.
"""

import asyncio
import json
import os
import joblib
import random
from typing import Set, Dict, Any, Optional
from fastapi import WebSocket
from backend.ml.train import extract_feature_vector, get_feature_contributions
from backend.engine.spike_detector import RollingSpikeDetector
from backend.services.store import store_instance

class StreamReplayer:
    def __init__(self, backend_dir=None):
        if not backend_dir:
            backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        self.backend_dir = backend_dir
        
        self.model_path = os.path.join(backend_dir, "ml", "artifacts", "xgboost_model.joblib")
        self.replay_path = os.path.join(backend_dir, "data", "replay_stream.json")
        
        self.model = None
        self.stream_data = []
        self.current_idx = 0
        
        self.is_running = False
        self.is_paused = False
        self.speed_multiplier = 1.0  # 1x, 2x, 5x, 10x
        self.base_delay_sec = 0.16   # ~160ms base tick
        
        self.detector = RollingSpikeDetector(window_size=25, z_threshold=2.5, ewma_alpha=0.08)
        self.active_connections: Set[WebSocket] = set()
        self._task: Optional[asyncio.Task] = None
        
        self._load_artifacts()

    def _load_artifacts(self):
        if os.path.exists(self.model_path):
            bundle = joblib.load(self.model_path)
            self.model = bundle["model"]
        if os.path.exists(self.replay_path):
            with open(self.replay_path, "r") as f:
                self.stream_data = json.load(f)

    async def register_connection(self, websocket: WebSocket):
        self.active_connections.add(websocket)
        # Send initial snapshot of recent state
        initial_msg = {
            "type": "SNAPSHOT",
            "is_running": self.is_running,
            "is_paused": self.is_paused,
            "speed_multiplier": self.speed_multiplier,
            "stream_index": self.current_idx,
            "total_transactions": len(self.stream_data),
            "recent_txns": store_instance.recent_txns[:30],
            "recent_vitals": store_instance.recent_vitals[-40:],
            "flags": store_instance.get_all_flags(),
            "config": {
                "window_size": self.detector.window_size,
                "z_threshold": self.detector.z_threshold,
                "ewma_alpha": self.detector.ewma_alpha,
                "risk_cutoff": self.detector.risk_cutoff
            }
        }
        await websocket.send_json(initial_msg)

    def unregister_connection(self, websocket: WebSocket):
        self.active_connections.discard(websocket)

    async def broadcast(self, message: Dict[str, Any]):
        if not self.active_connections:
            return
        dead_conns = []
        for conn in self.active_connections:
            try:
                await conn.send_json(message)
            except Exception:
                dead_conns.append(conn)
        for d in dead_conns:
            self.active_connections.discard(d)

    def update_detector_config(self, window_size=None, z_threshold=None, ewma_alpha=None, risk_cutoff=None):
        if window_size is not None:
            self.detector.window_size = int(window_size)
        if z_threshold is not None:
            self.detector.z_threshold = float(z_threshold)
        if ewma_alpha is not None:
            self.detector.ewma_alpha = float(ewma_alpha)
        if risk_cutoff is not None:
            self.detector.risk_cutoff = float(risk_cutoff)

    def inject_instant_spike(self, archetype="card_testing_bot_burst", burst_size=15):
        """Inject synthetic spike cluster on demand during live presentation."""
        insert_pos = self.current_idx + 1
        new_burst = []
        for b in range(burst_size):
            tid = f"tx_live_spk_{insert_pos + b:05d}"
            burst_txn = {
                "txn_id": tid,
                "timestamp": "now",
                "replay_timestamp": "now",
                "stream_index": insert_pos + b,
                "user_id": f"usr_bot_{random.randint(100, 200)}",
                "amount": round(random.uniform(20.0, 95.0), 2),
                "amount_ratio_to_user_avg": 0.5,
                "payment_method": "Credit Card",
                "merchant_category": "bill_pay",
                "city": "Mumbai",
                "location_distance_km": 0.0,
                "device_id": f"dev_live_cluster_{insert_pos}",
                "is_new_device": 1,
                "velocity_10m": 15 + b,
                "failed_attempts": 3,
                "device_trust_score": 0.05,
                "hour_of_day": 14,
                "is_night": 0,
                "is_fraud": 1,
                "fraud_archetype": archetype
            }
            new_burst.append(burst_txn)
            
        self.stream_data[insert_pos:insert_pos] = new_burst
        return len(new_burst)

    async def step_single(self) -> Optional[Dict[str, Any]]:
        if not self.stream_data or not self.model:
            self._load_artifacts()
            if not self.stream_data or not self.model:
                return None
                
        if self.current_idx >= len(self.stream_data):
            self.current_idx = 0  # Loop stream on finish
            
        txn = self.stream_data[self.current_idx]
        self.current_idx += 1
        
        # 1. Classify with trained ML model
        x_vec = extract_feature_vector(txn)
        score = float(self.model.predict_proba([x_vec])[0][1])
        top_features = get_feature_contributions(self.model, x_vec, score)
        
        # 2. Update rolling spike detector
        vitals = self.detector.update(
            txn_id=txn["txn_id"],
            score=score,
            timestamp_str=txn.get("replay_timestamp", txn.get("timestamp"))
        )
        
        scored_txn = {
            "txn_id": txn["txn_id"],
            "timestamp": txn.get("replay_timestamp", txn.get("timestamp")),
            "stream_index": self.current_idx,
            "user_id": txn.get("user_id"),
            "amount": txn.get("amount"),
            "payment_method": txn.get("payment_method"),
            "category": txn.get("merchant_category"),
            "city": txn.get("city"),
            "score": round(score, 3),
            "is_high_risk": score >= 0.50,
            "top_features": top_features
        }
        
        store_instance.add_transaction(scored_txn)
        
        vitals_point = {
            "stream_index": self.current_idx,
            "txn_id": txn["txn_id"],
            "score": round(score, 3),
            "current_risk_rate": vitals["current_risk_rate"],
            "baseline_ewma": vitals["baseline_ewma"],
            "std_dev": vitals["std_dev"],
            "z_score": vitals["z_score"],
            "in_spike": vitals["in_spike"],
            "is_calibrated": vitals["is_calibrated"]
        }
        store_instance.add_vitals_point(vitals_point)
        
        # 3. Check for Spike Flag
        spike_flag = vitals.get("spike_flag")
        if spike_flag:
            spike_flag["features"] = top_features
            store_instance.add_flag(spike_flag)
            
        # 4. Also register individual high-risk transaction flags (score > 0.85)
        txn_flag = None
        if score >= 0.85 and not spike_flag:
            txn_flag = {
                "id": f"flag_{txn['txn_id']}",
                "type": "transaction",
                "status": "active",
                "score": round(score, 3),
                "deviation_sigma": 0.0,
                "first_anomalous_txn_id": txn["txn_id"],
                "txn": scored_txn,
                "features": top_features,
                "detected_at": txn.get("replay_timestamp", txn.get("timestamp")),
                "resolved": False
            }
            store_instance.add_flag(txn_flag)
            
        payload = {
            "type": "TICK",
            "txn": scored_txn,
            "vitals": vitals_point,
            "spike_flag": spike_flag,
            "txn_flag": txn_flag,
            "stream_index": self.current_idx,
            "total_transactions": len(self.stream_data)
        }
        
        await self.broadcast(payload)
        return payload

    async def _replay_loop(self):
        while self.is_running:
            if not self.is_paused:
                await self.step_single()
            delay = self.base_delay_sec / max(self.speed_multiplier, 0.1)
            await asyncio.sleep(delay)

    def start(self):
        if not self.is_running:
            self.is_running = True
            self.is_paused = False
            self._task = asyncio.create_task(self._replay_loop())

    def pause(self):
        self.is_paused = True

    def resume(self):
        self.is_paused = False
        if not self.is_running:
            self.start()

    def reset(self):
        self.current_idx = 0
        self.detector.reset()
        store_instance.reset_state()

    def set_speed(self, multiplier: float):
        self.speed_multiplier = max(0.2, min(multiplier, 20.0))

replayer_instance = StreamReplayer()
