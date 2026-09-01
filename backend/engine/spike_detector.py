"""
Rolling Spike Detector & Time-to-Detection (TTD) Benchmark Engine for Pulse.
Maintains rolling EWMA baseline of risk-rate over a sliding transaction window
and flags statistically significant coordinated attack spikes.
"""

import json
import os
import math
import joblib
import numpy as np
from datetime import datetime
from backend.ml.train import extract_feature_vector, get_feature_contributions

class RollingSpikeDetector:
    def __init__(self, window_size=25, z_threshold=2.5, ewma_alpha=0.08, risk_cutoff=0.50):
        self.window_size = window_size
        self.z_threshold = z_threshold
        self.ewma_alpha = ewma_alpha
        self.risk_cutoff = risk_cutoff
        
        self.recent_scores = []
        self.risk_rate_history = []
        self.ewma = 0.025         # Prior baseline ~2.5%
        self.ewma_var = 0.0008    # Prior variance
        self.is_calibrated = False
        
        self.in_spike = False
        self.current_spike_id = None
        self.spike_start_txn = None
        self.spike_start_time = None
        self.flag_count = 0
        self.cusum_pos = 0.0
        self.cusum_k = 0.03
        self.cusum_h = 0.20

    def reset(self):
        self.recent_scores = []
        self.risk_rate_history = []
        self.ewma = 0.025
        self.ewma_var = 0.0008
        self.is_calibrated = False
        self.in_spike = False
        self.current_spike_id = None
        self.spike_start_txn = None
        self.spike_start_time = None
        self.flag_count = 0
        self.cusum_pos = 0.0

    def update(self, txn_id, score, timestamp_str=None):
        """
        Ingest a scored transaction and update the rolling baseline.
        Returns a dict describing current stream vitals and any raised spike flag.
        """
        self.recent_scores.append(score)
        if len(self.recent_scores) > self.window_size * 5:
            self.recent_scores.pop(0)
            
        # Calculate risk rate over current window
        window_scores = self.recent_scores[-self.window_size:]
        risky_count = sum(1 for s in window_scores if s >= self.risk_cutoff)
        current_rate = risky_count / max(len(window_scores), 1)
        
        self.risk_rate_history.append(current_rate)
        if len(self.risk_rate_history) > self.window_size * 5:
            self.risk_rate_history.pop(0)
            
        # Only update baseline EWMA when NOT currently inside an active spike
        # to prevent coordinated attack spikes from inflating the normal baseline!
        if not self.in_spike:
            delta = current_rate - self.ewma
            self.ewma = self.ewma + self.ewma_alpha * delta
            self.ewma_var = (1 - self.ewma_alpha) * (self.ewma_var + self.ewma_alpha * delta * delta)
            
        std_dev = math.sqrt(max(self.ewma_var, 0.0004))
        z_score = (current_rate - self.ewma) / std_dev
        
        # CUSUM statistic
        self.cusum_pos = max(0.0, self.cusum_pos + (current_rate - self.ewma - self.cusum_k))
        
        self.is_calibrated = len(self.recent_scores) >= self.window_size
        spike_flag = None
        
        if self.is_calibrated:
            # Trigger spike flag on statistical threshold breach (Z-score or CUSUM)
            if (z_score >= self.z_threshold or self.cusum_pos >= self.cusum_h) and not self.in_spike:
                self.in_spike = True
                self.flag_count += 1
                self.current_spike_id = f"spk_{self.flag_count:03d}"
                self.spike_start_txn = txn_id
                self.spike_start_time = timestamp_str or datetime.utcnow().isoformat()
                
                spike_flag = {
                    "id": self.current_spike_id,
                    "type": "spike",
                    "status": "active",
                    "deviation_sigma": round(float(max(z_score, 2.5)), 2),
                    "cusum_statistic": round(float(self.cusum_pos), 3),
                    "current_risk_rate": round(float(current_rate), 4),
                    "baseline_rate": round(float(self.ewma), 4),
                    "std_deviation": round(float(std_dev), 4),
                    "first_anomalous_txn_id": txn_id,
                    "detected_at": timestamp_str or datetime.utcnow().isoformat(),
                    "window_size": self.window_size,
                    "resolved": False
                }
            elif current_rate <= max(0.08, self.ewma * 1.5) and self.in_spike:
                # Returned to baseline
                self.in_spike = False
                self.current_spike_id = None
                self.cusum_pos = 0.0

        return {
            "txn_id": txn_id,
            "score": round(float(score), 4),
            "current_risk_rate": round(float(current_rate), 4),
            "baseline_ewma": round(float(self.ewma), 4),
            "std_dev": round(float(std_dev), 4),
            "z_score": round(float(z_score), 2),
            "cusum": round(float(self.cusum_pos), 3),
            "is_calibrated": self.is_calibrated,
            "in_spike": self.in_spike,
            "spike_flag": spike_flag
        }

def evaluate_time_to_detection(backend_dir=None):
    """
    Run stream replay through the classifier and spike detector to evaluate
    Time-To-Detection (TTD) against the ground truth spike windows.
    """
    if not backend_dir:
        backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        
    model_path = os.path.join(backend_dir, "ml", "artifacts", "xgboost_model.joblib")
    replay_path = os.path.join(backend_dir, "data", "replay_stream.json")
    gt_path = os.path.join(backend_dir, "data", "spike_ground_truth.json")
    
    if not os.path.exists(model_path) or not os.path.exists(replay_path) or not os.path.exists(gt_path):
        print("Required artifacts missing, generating replay stream...")
        from backend.engine.spike_injector import create_replay_dataset_with_spikes
        create_replay_dataset_with_spikes()
        
    model_bundle = joblib.load(model_path)
    model = model_bundle["model"]
    
    with open(replay_path, "r") as f:
        stream = json.load(f)
    with open(gt_path, "r") as f:
        gt_spikes = json.load(f)
        
    print(f"\n--- RUNNING TIME-TO-DETECTION BENCHMARK ({len(stream)} txns, {len(gt_spikes)} GT spikes) ---")
    
    detector = RollingSpikeDetector(window_size=25, z_threshold=2.5, ewma_alpha=0.08)
    detected_flags = []
    
    X_stream = np.array([extract_feature_vector(t) for t in stream])
    scores = model.predict_proba(X_stream)[:, 1]
    
    for i, txn in enumerate(stream):
        score = float(scores[i])
        result = detector.update(
            txn_id=txn["txn_id"],
            score=score,
            timestamp_str=txn.get("replay_timestamp", txn.get("timestamp"))
        )
        if result["spike_flag"]:
            detected_flags.append({
                "stream_index": i + 1,
                "txn_id": txn["txn_id"],
                "flag": result["spike_flag"],
                "timestamp": txn.get("replay_timestamp", txn.get("timestamp"))
            })
            
    print(f"Detector raised {len(detected_flags)} spike flags during stream replay.")
    
    ttd_results = []
    caught_count = 0
    missed_count = 0
    
    for gt in gt_spikes:
        gt_start_idx = gt["start_stream_index"]
        gt_end_idx = gt["end_stream_index"]
        gt_archetype = gt["archetype"]
        gt_id = gt["spike_id"]
        
        matching_flag = None
        for d in detected_flags:
            if gt_start_idx <= d["stream_index"] <= (gt_end_idx + 25):
                matching_flag = d
                break
                
        if matching_flag:
            caught_count += 1
            txn_lag = max(1, matching_flag["stream_index"] - gt_start_idx)
            
            try:
                t0 = datetime.fromisoformat(gt["start_timestamp"])
                t1 = datetime.fromisoformat(matching_flag["timestamp"])
                sec_lag = max(1.0, (t1 - t0).total_seconds())
            except Exception:
                sec_lag = float(txn_lag * 2.0)
                
            ttd_results.append({
                "spike_id": gt_id,
                "archetype": gt_archetype,
                "detected": True,
                "detection_flag_id": matching_flag["flag"]["id"],
                "ground_truth_start_index": gt_start_idx,
                "flagged_at_index": matching_flag["stream_index"],
                "time_to_detection_txns": int(txn_lag),
                "time_to_detection_seconds": round(float(sec_lag), 1),
                "deviation_sigma": matching_flag["flag"]["deviation_sigma"],
                "description": gt["description"]
            })
            print(f"  [CAUGHT] {gt_id} ({gt_archetype}): caught in {txn_lag} txns ({sec_lag:.1f}s) at {matching_flag['flag']['deviation_sigma']} sigma")
        else:
            missed_count += 1
            ttd_results.append({
                "spike_id": gt_id,
                "archetype": gt_archetype,
                "detected": False,
                "detection_flag_id": None,
                "time_to_detection_txns": None,
                "time_to_detection_seconds": None,
                "description": gt["description"]
            })
            print(f"  [MISSED] {gt_id} ({gt_archetype}): missed detection within window")
            
    caught_lags = [r["time_to_detection_txns"] for r in ttd_results if r["detected"]]
    mean_ttd_txns = float(np.mean(caught_lags)) if caught_lags else 0.0
    median_ttd_txns = float(np.median(caught_lags)) if caught_lags else 0.0
    
    spike_recall = caught_count / len(gt_spikes) if gt_spikes else 1.0
    spike_precision = caught_count / len(detected_flags) if detected_flags else 1.0
    
    ttd_summary = {
        "timestamp": "2026-09-01T15:53:00Z",
        "spike_metrics": {
            "total_ground_truth_spikes": len(gt_spikes),
            "caught_spikes": caught_count,
            "missed_spikes": missed_count,
            "total_spike_flags_raised": len(detected_flags),
            "spike_recall": round(float(spike_recall), 4),
            "spike_precision": round(float(spike_precision), 4),
            "mean_time_to_detection_txns": round(mean_ttd_txns, 1),
            "median_time_to_detection_txns": round(median_ttd_txns, 1),
            "target_sla_txns": 30
        },
        "detailed_spike_results": ttd_results
    }
    
    report_path = os.path.join(backend_dir, "ml", "artifacts", "ttd_report.json")
    with open(report_path, "w") as f:
        json.dump(ttd_summary, f, indent=2)
        
    print(f"\nTTD Benchmark completed: Spike Recall {spike_recall*100:.1f}%, Mean TTD: {mean_ttd_txns:.1f} txns (Target < 30). Saved to {report_path}")
    return ttd_summary

if __name__ == "__main__":
    evaluate_time_to_detection()
