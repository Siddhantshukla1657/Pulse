"""
Synthetic Spike Injector for Pulse Replay Stream.
Injects coordinated multi-transaction fraud bursts (bot card testing, ATO rings, velocity storms)
and outputs ground-truth spike window logs for rigorous time-to-detection evaluation.
"""

import json
import os
import random
import copy
from datetime import datetime, timedelta

def create_replay_dataset_with_spikes(input_file=None, output_dir=None, num_spikes=4):
    """
    Takes baseline transactions and injects coordinated spike windows.
    Outputs replay_stream.json and spike_ground_truth.json.
    """
    backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    if not input_file:
        input_file = os.path.join(backend_dir, "data", "heldout_transactions.json")
    if not output_dir:
        output_dir = os.path.join(backend_dir, "data")
        
    os.makedirs(output_dir, exist_ok=True)
    
    with open(input_file, "r") as f:
        base_txns = json.load(f)
        
    print(f"Loaded {len(base_txns)} baseline transactions for replay stream preparation...")
    
    # We will pick 4 distinct window intervals in the stream to inject coordinated spikes
    # Window spacing: e.g., txn ~600, ~1600, ~2700, ~3800
    n = len(base_txns)
    spike_intervals = [
        {"target_start": int(n * 0.12), "archetype": "card_testing_bot_burst", "burst_size": 18},
        {"target_start": int(n * 0.35), "archetype": "credential_stuffing_ring", "burst_size": 22},
        {"target_start": int(n * 0.60), "archetype": "high_velocity_ato_surge", "burst_size": 25},
        {"target_start": int(n * 0.82), "archetype": "stealth_micro_burst", "burst_size": 14}
    ]
    
    stream = []
    ground_truth_spikes = []
    
    current_idx = 0
    current_time = datetime(2026, 8, 20, 10, 0, 0)
    
    spike_counter = 0
    
    for i, txn in enumerate(base_txns):
        # Update transaction timestamp sequentially
        time_step = max(1, random.randint(1, 4))
        current_time += timedelta(seconds=time_step)
        
        txn_copy = copy.deepcopy(txn)
        current_idx += 1
        txn_copy["stream_index"] = current_idx
        txn_copy["replay_timestamp"] = current_time.isoformat()
        stream.append(txn_copy)
        
        # Check if we should trigger an injected spike
        matching_spikes = [s for s in spike_intervals if s["target_start"] == i]
        if matching_spikes:
            spk_cfg = matching_spikes[0]
            spike_counter += 1
            spike_id = f"gt_spike_{spike_counter:02d}"
            archetype = spk_cfg["archetype"]
            burst_size = spk_cfg["burst_size"]
            
            start_txn_id = None
            injected_txn_ids = []
            
            print(f"Injecting spike '{spike_id}' ({archetype}) at stream index {current_idx}...")
            
            # Generate the burst transactions
            for b in range(burst_size):
                current_idx += 1
                current_time += timedelta(seconds=random.randint(1, 2)) # very tight inter-transaction time
                
                burst_txn_id = f"tx_spk_{spike_counter}_{b:03d}"
                if start_txn_id is None:
                    start_txn_id = burst_txn_id
                injected_txn_ids.append(burst_txn_id)
                
                if archetype == "card_testing_bot_burst":
                    burst_txn = {
                        "txn_id": burst_txn_id,
                        "timestamp": current_time.isoformat(),
                        "replay_timestamp": current_time.isoformat(),
                        "stream_index": current_idx,
                        "user_id": f"usr_bot_{random.randint(100, 150):04d}",
                        "amount": round(random.uniform(15.0, 75.0), 2),
                        "amount_ratio_to_user_avg": 0.4,
                        "payment_method": "Credit Card",
                        "merchant_category": "bill_pay",
                        "city": "Mumbai",
                        "location_distance_km": 0.0,
                        "device_id": f"dev_bot_cluster_{spike_counter}",
                        "is_new_device": 1,
                        "velocity_10m": 12 + b,
                        "failed_attempts": random.randint(2, 5),
                        "device_trust_score": 0.08,
                        "hour_of_day": current_time.hour,
                        "is_night": 0,
                        "is_fraud": 1,
                        "fraud_archetype": archetype,
                        "injected_spike_id": spike_id
                    }
                elif archetype == "credential_stuffing_ring":
                    burst_txn = {
                        "txn_id": burst_txn_id,
                        "timestamp": current_time.isoformat(),
                        "replay_timestamp": current_time.isoformat(),
                        "stream_index": current_idx,
                        "user_id": f"usr_ring_{random.randint(200, 300):04d}",
                        "amount": round(random.uniform(350.0, 1200.0), 2),
                        "amount_ratio_to_user_avg": 2.2,
                        "payment_method": "Debit Card",
                        "merchant_category": "gaming",
                        "city": "Bengaluru",
                        "location_distance_km": round(random.uniform(400, 1200), 1),
                        "device_id": f"dev_ring_shared_{b % 3}",
                        "is_new_device": 1,
                        "velocity_10m": 8 + b,
                        "failed_attempts": random.randint(3, 6),
                        "device_trust_score": 0.12,
                        "hour_of_day": current_time.hour,
                        "is_night": 0,
                        "is_fraud": 1,
                        "fraud_archetype": archetype,
                        "injected_spike_id": spike_id
                    }
                elif archetype == "high_velocity_ato_surge":
                    burst_txn = {
                        "txn_id": burst_txn_id,
                        "timestamp": current_time.isoformat(),
                        "replay_timestamp": current_time.isoformat(),
                        "stream_index": current_idx,
                        "user_id": f"usr_ato_{random.randint(400, 500):04d}",
                        "amount": round(random.uniform(4500.0, 18000.0), 2),
                        "amount_ratio_to_user_avg": 8.5,
                        "payment_method": "Credit Card",
                        "merchant_category": "crypto_ramp",
                        "city": "Delhi",
                        "location_distance_km": round(random.uniform(500, 1500), 1),
                        "device_id": f"dev_ato_botnet_{spike_counter}",
                        "is_new_device": 1,
                        "velocity_10m": 10 + b,
                        "failed_attempts": random.randint(1, 4),
                        "device_trust_score": 0.18,
                        "hour_of_day": current_time.hour,
                        "is_night": 0,
                        "is_fraud": 1,
                        "fraud_archetype": archetype,
                        "injected_spike_id": spike_id
                    }
                else: # stealth_micro_burst
                    burst_txn = {
                        "txn_id": burst_txn_id,
                        "timestamp": current_time.isoformat(),
                        "replay_timestamp": current_time.isoformat(),
                        "stream_index": current_idx,
                        "user_id": f"usr_stealth_{random.randint(600, 700):04d}",
                        "amount": round(random.uniform(850.0, 2400.0), 2),
                        "amount_ratio_to_user_avg": 1.8,
                        "payment_method": "UPI",
                        "merchant_category": "apparel",
                        "city": "Pune",
                        "location_distance_km": 150.0,
                        "device_id": f"dev_stealth_{spike_counter}",
                        "is_new_device": 1,
                        "velocity_10m": 5 + (b // 2),
                        "failed_attempts": 1,
                        "device_trust_score": 0.35,
                        "hour_of_day": current_time.hour,
                        "is_night": 0,
                        "is_fraud": 1,
                        "fraud_archetype": archetype,
                        "injected_spike_id": spike_id
                    }
                stream.append(burst_txn)
                
            ground_truth_spikes.append({
                "spike_id": spike_id,
                "archetype": archetype,
                "burst_size": burst_size,
                "first_anomalous_txn_id": start_txn_id,
                "start_stream_index": stream[-burst_size]["stream_index"],
                "end_stream_index": stream[-1]["stream_index"],
                "start_timestamp": stream[-burst_size]["replay_timestamp"],
                "end_timestamp": stream[-1]["replay_timestamp"],
                "injected_txn_ids": injected_txn_ids,
                "description": f"Coordinated {archetype.replace('_', ' ')} attack burst of {burst_size} consecutive transactions."
            })
            
    # Save replay dataset and ground-truth spike log
    replay_file = os.path.join(output_dir, "replay_stream.json")
    with open(replay_file, "w") as f:
        json.dump(stream, f, indent=2)
        
    gt_file = os.path.join(output_dir, "spike_ground_truth.json")
    with open(gt_file, "w") as f:
        json.dump(ground_truth_spikes, f, indent=2)
        
    print(f"Generated replay stream with {len(stream)} txns and {len(ground_truth_spikes)} ground truth spike windows.")
    return stream, ground_truth_spikes

if __name__ == "__main__":
    create_replay_dataset_with_spikes()
