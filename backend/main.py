"""
FastAPI Server & Real-Time API for Pulse AI Risk Manager.
Exposes held-out metrics, case explanations, audit trails, and WebSocket streaming.
"""

import os
import json
from contextlib import asynccontextmanager
from typing import Dict, Any, Optional
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException, Query, Body
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from backend.engine.replayer import replayer_instance
from backend.services.store import store_instance
from backend.services.explainer import generate_explanation

backend_dir = os.path.dirname(os.path.abspath(__file__))
metrics_file = os.path.join(backend_dir, "ml", "artifacts", "metrics.json")
ttd_file = os.path.join(backend_dir, "ml", "artifacts", "ttd_report.json")

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: start stream replayer
    print("Starting Pulse AI Risk Manager backend...")
    replayer_instance.start()
    yield
    # Shutdown
    replayer_instance.is_running = False

app = FastAPI(
    title="Pulse — AI Risk Manager API",
    description="Real-time transaction fraud scoring and rolling coordinated spike detector API",
    version="1.0.0",
    lifespan=lifespan
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class ActionRequest(BaseModel):
    action: str # "act" or "dismiss"
    analyst: Optional[str] = "Risk Analyst"
    notes: Optional[str] = ""

class FeedbackRequest(BaseModel):
    rating: str # "helpful" or "unhelpful"
    comment: Optional[str] = ""

class ConfigRequest(BaseModel):
    window_size: Optional[int] = None
    z_threshold: Optional[float] = None
    ewma_alpha: Optional[float] = None
    risk_cutoff: Optional[float] = None
    speed_multiplier: Optional[float] = None

class SpikeInjectRequest(BaseModel):
    archetype: Optional[str] = "card_testing_bot_burst"
    burst_size: Optional[int] = 15

@app.get("/api/health")
async def health_check():
    return {"status": "ok", "app": "Pulse AI Risk Manager", "timestamp": "2026-09-01T15:54:00Z"}

@app.get("/api/metrics")
async def get_metrics():
    """Held-out precision, recall, confusion matrix, false-positive cost & TTD benchmarks."""
    result = {}
    if os.path.exists(metrics_file):
        with open(metrics_file, "r") as f:
            result["classification"] = json.load(f)
    if os.path.exists(ttd_file):
        with open(ttd_file, "r") as f:
            result["spike_benchmarks"] = json.load(f)
    return result

@app.get("/api/flags")
async def list_flags():
    """Get list of all raised flags (spikes and high-risk transactions)."""
    return store_instance.get_all_flags()

@app.get("/api/flags/{flag_id}")
async def get_flag_detail(flag_id: str):
    flag = store_instance.get_flag(flag_id)
    if not flag:
        # Check showcase cases
        showcase = await get_showcase_cases()
        if flag_id == "showcase-tp":
            flag = showcase.get("true_positive")
        elif flag_id == "showcase-fp":
            flag = showcase.get("false_positive")
            
    if not flag:
        raise HTTPException(status_code=404, detail="Flag not found")
    return flag

@app.get("/api/flags/{flag_id}/explain")
async def explain_flag(flag_id: str):
    """Generate or retrieve plain-language explanation for a flag."""
    flag = store_instance.get_flag(flag_id)
    if not flag:
        showcase = await get_showcase_cases()
        if flag_id == "showcase-tp":
            flag = showcase.get("true_positive")
        elif flag_id == "showcase-fp":
            flag = showcase.get("false_positive")
            
    if not flag:
        raise HTTPException(status_code=404, detail="Flag not found")
        
    flag_type = flag.get("type", "spike")
    explanation = await generate_explanation(flag_id, flag_type, flag)
    return {
        "flag_id": flag_id,
        "flag_type": flag_type,
        "explanation": explanation
    }

@app.post("/api/flags/{flag_id}/action")
async def take_action_on_flag(flag_id: str, req: ActionRequest):
    """Record analyst action (act / dismiss) in audit log."""
    updated = store_instance.record_action(
        flag_id=flag_id,
        action=req.action,
        analyst=req.analyst or "Risk Analyst",
        notes=req.notes or ""
    )
    # Broadcast update over WebSocket
    await replayer_instance.broadcast({
        "type": "FLAG_ACTION",
        "flag_id": flag_id,
        "action": req.action,
        "flag": updated
    })
    return {"status": "success", "flag_id": flag_id, "action": req.action, "flag": updated}

@app.post("/api/flags/{flag_id}/feedback")
async def submit_feedback(flag_id: str, req: FeedbackRequest):
    store_instance.record_feedback(flag_id, req.rating, req.comment or "")
    return {"status": "recorded"}

@app.get("/api/audit")
async def get_audit_trail():
    return store_instance.get_audit_trail()

@app.get("/api/showcase")
async def get_showcase_cases():
    """Return pinned Caught-Fraud (TP) and False-Positive (FP) cases for pitch walkthrough."""
    if os.path.exists(metrics_file):
        with open(metrics_file, "r") as f:
            data = json.load(f)
            return data.get("showcase_cases", {})
    return {}

@app.get("/api/config")
async def get_config():
    return {
        "is_running": replayer_instance.is_running,
        "is_paused": replayer_instance.is_paused,
        "speed_multiplier": replayer_instance.speed_multiplier,
        "window_size": replayer_instance.detector.window_size,
        "z_threshold": replayer_instance.detector.z_threshold,
        "ewma_alpha": replayer_instance.detector.ewma_alpha,
        "risk_cutoff": replayer_instance.detector.risk_cutoff
    }

@app.post("/api/config")
async def update_config(req: ConfigRequest):
    replayer_instance.update_detector_config(
        window_size=req.window_size,
        z_threshold=req.z_threshold,
        ewma_alpha=req.ewma_alpha,
        risk_cutoff=req.risk_cutoff
    )
    if req.speed_multiplier is not None:
        replayer_instance.set_speed(req.speed_multiplier)
        
    await replayer_instance.broadcast({
        "type": "CONFIG_UPDATE",
        "config": await get_config()
    })
    return await get_config()

@app.post("/api/replay/control")
async def replay_control(action: str = Query(..., description="start, pause, resume, reset, step")):
    if action == "start":
        replayer_instance.start()
    elif action == "pause":
        replayer_instance.pause()
    elif action == "resume":
        replayer_instance.resume()
    elif action == "reset":
        replayer_instance.reset()
    elif action == "step":
        res = await replayer_instance.step_single()
        return {"status": "stepped", "result": res}
    return {"status": "ok", "action": action}

@app.post("/api/replay/inject-spike")
async def inject_spike(req: SpikeInjectRequest):
    count = replayer_instance.inject_instant_spike(req.archetype or "card_testing_bot_burst", req.burst_size or 15)
    return {"status": "injected", "transactions_added": count, "archetype": req.archetype}

@app.websocket("/ws")
async def websocket_stream(websocket: WebSocket):
    await websocket.accept()
    await replayer_instance.register_connection(websocket)
    try:
        while True:
            data = await websocket.receive_text()
            # Handle any client side control commands over websocket
            try:
                cmd = json.loads(data)
                if cmd.get("action") == "pause":
                    replayer_instance.pause()
                elif cmd.get("action") == "resume":
                    replayer_instance.resume()
                elif cmd.get("action") == "speed":
                    replayer_instance.set_speed(float(cmd.get("value", 1.0)))
            except Exception:
                pass
    except WebSocketDisconnect:
        replayer_instance.unregister_connection(websocket)
    except Exception:
        replayer_instance.unregister_connection(websocket)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=8000)
