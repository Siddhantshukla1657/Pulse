"""
Dataset Generator & Preprocessing for Pulse Fraud Detection System.
Generates realistic payment transaction distributions with genuine fraud patterns,
realistic borderline cases, and strictly held-out train/test splits.
"""

import json
import os
import random
import numpy as np
from datetime import datetime, timedelta

PAYMENT_METHODS = ["UPI", "Credit Card", "Debit Card", "Netbanking", "Wallet"]
MERCHANT_CATEGORIES = ["electronics", "gaming", "crypto_ramp", "groceries", "apparel", "travel", "bill_pay"]
CITIES = ["Mumbai", "Bengaluru", "Delhi", "Hyderabad", "Pune", "Chennai", "Kolkata"]

def generate_transaction_dataset(n_samples=25000, seed=42, output_dir=None):
    """
    Generate synthetic transactions with realistic features, organic noise, and realistic fraud signatures.
    Fraud is kept realistic (~2.2% baseline) with borderline genuine and subtle fraud transactions.
    """
    random.seed(seed)
    np.random.seed(seed)

    transactions = []
    start_time = datetime(2026, 8, 1, 0, 0, 0)
    
    # Pre-generate user profiles (1200 users)
    users = {}
    for uid in range(1, 1201):
        users[f"usr_{uid:04d}"] = {
            "home_city": random.choice(CITIES),
            "typical_amount": float(np.random.exponential(scale=1400) + 120),
            "primary_method": random.choice(PAYMENT_METHODS),
            "device_id": f"dev_{uid:04d}",
            "ip_base": f"103.{random.randint(10, 250)}.{random.randint(1, 250)}",
        }

    current_time = start_time
    
    for i in range(1, n_samples + 1):
        time_step_sec = max(1, int(np.random.exponential(scale=6)))
        current_time += timedelta(seconds=time_step_sec)
        
        user_id = f"usr_{random.randint(1, 1200):04d}"
        profile = users[user_id]
        
        is_fraud = False
        fraud_archetype = None
        
        # Base fraud rate ~ 2.2%
        if random.random() < 0.022:
            is_fraud = True
            fraud_archetype = random.choice([
                "velocity_surge",
                "credential_stuffing",
                "high_ticket_anomaly",
                "geo_impossible_speed",
                "bot_card_testing",
                "subtle_stealth_fraud"
            ])
            
        hour = current_time.hour
        is_night = 1 if (hour >= 23 or hour <= 5) else 0
        
        if not is_fraud:
            # Genuine transactions, including 4% borderline / high-variance genuine behavior
            is_borderline_genuine = random.random() < 0.04
            
            if is_borderline_genuine:
                # Genuine user traveling or buying luxury gift on a new phone
                amount = float(profile["typical_amount"] * np.random.uniform(3.5, 7.5) + 3000)
                payment_method = random.choice(["Credit Card", "Netbanking"])
                category = random.choice(["electronics", "travel", "apparel"])
                city = random.choice([c for c in CITIES if c != profile["home_city"]])
                location_dist = float(np.random.uniform(200, 1100))
                device_id = f"dev_{random.randint(4000, 9999)}"
                velocity_10m = random.choice([2, 3, 4])
                failed_attempts = random.choice([0, 1, 2])
                device_trust = float(np.random.uniform(0.40, 0.70))
                is_new_device = 1
            else:
                amount = max(40.0, float(np.random.normal(profile["typical_amount"], profile["typical_amount"] * 0.40)))
                payment_method = profile["primary_method"] if random.random() < 0.85 else random.choice(PAYMENT_METHODS)
                category = random.choice(MERCHANT_CATEGORIES)
                city = profile["home_city"] if random.random() < 0.94 else random.choice(CITIES)
                location_dist = 0.0 if city == profile["home_city"] else float(np.random.uniform(20, 350))
                device_id = profile["device_id"] if random.random() < 0.95 else f"dev_{random.randint(2000, 9999)}"
                velocity_10m = random.choice([1, 1, 1, 2])
                failed_attempts = 0 if random.random() < 0.96 else 1
                device_trust = float(np.random.uniform(0.75, 0.99))
                is_new_device = 1 if device_id != profile["device_id"] else 0
        else:
            # Fraud transactions with varying subtlety
            if fraud_archetype == "subtle_stealth_fraud":
                # Stealth fraud designed to mimic legitimate spend
                amount = float(profile["typical_amount"] * np.random.uniform(1.1, 2.2))
                payment_method = profile["primary_method"]
                category = random.choice(["groceries", "apparel", "bill_pay"])
                city = profile["home_city"]
                location_dist = 0.0
                device_id = profile["device_id"] if random.random() < 0.4 else f"dev_{random.randint(5000, 9999)}"
                velocity_10m = random.choice([1, 2, 3])
                failed_attempts = random.choice([0, 1])
                device_trust = float(np.random.uniform(0.45, 0.75))
                is_new_device = 1 if device_id != profile["device_id"] else 0
            elif fraud_archetype == "velocity_surge":
                amount = float(np.random.uniform(900, 4800))
                payment_method = "Credit Card"
                category = "electronics"
                city = profile["home_city"]
                location_dist = 0.0
                device_id = f"dev_{random.randint(5000, 9999)}"
                velocity_10m = random.randint(5, 14)
                failed_attempts = random.randint(1, 3)
                device_trust = float(np.random.uniform(0.15, 0.45))
                is_new_device = 1
            elif fraud_archetype == "credential_stuffing":
                amount = float(np.random.uniform(120, 850))
                payment_method = random.choice(["Credit Card", "Debit Card"])
                category = "gaming"
                city = random.choice(CITIES)
                location_dist = float(np.random.uniform(250, 1500))
                device_id = f"dev_{random.randint(7000, 9999)}"
                velocity_10m = random.randint(3, 7)
                failed_attempts = random.randint(2, 6)
                device_trust = float(np.random.uniform(0.10, 0.35))
                is_new_device = 1
            elif fraud_archetype == "high_ticket_anomaly":
                amount = float(profile["typical_amount"] * np.random.uniform(5.0, 15.0) + 12000)
                payment_method = random.choice(["Credit Card", "Netbanking"])
                category = random.choice(["crypto_ramp", "electronics", "travel"])
                city = random.choice(CITIES)
                location_dist = float(np.random.uniform(100, 1200))
                device_id = f"dev_{random.randint(8000, 9999)}"
                velocity_10m = random.randint(1, 4)
                failed_attempts = random.randint(0, 3)
                device_trust = float(np.random.uniform(0.20, 0.50))
                is_new_device = 1
            elif fraud_archetype == "geo_impossible_speed":
                amount = float(profile["typical_amount"] * np.random.uniform(1.5, 3.5))
                payment_method = profile["primary_method"]
                category = random.choice(MERCHANT_CATEGORIES)
                city = random.choice([c for c in CITIES if c != profile["home_city"]])
                location_dist = float(np.random.uniform(600, 1800))
                device_id = f"dev_{random.randint(3000, 6000)}"
                velocity_10m = random.randint(2, 4)
                failed_attempts = random.choice([0, 1, 2])
                device_trust = float(np.random.uniform(0.25, 0.55))
                is_new_device = 1
            else:  # bot_card_testing
                amount = float(np.random.uniform(15, 95))
                payment_method = "Credit Card"
                category = "bill_pay"
                city = profile["home_city"]
                location_dist = 0.0
                device_id = f"dev_bot_{random.randint(100, 999)}"
                velocity_10m = random.randint(7, 18)
                failed_attempts = random.randint(2, 5)
                device_trust = float(np.random.uniform(0.05, 0.25))
                is_new_device = 1

        txn = {
            "txn_id": f"tx_{i:06d}",
            "timestamp": current_time.isoformat(),
            "user_id": user_id,
            "amount": round(amount, 2),
            "amount_ratio_to_user_avg": round(amount / max(profile["typical_amount"], 50.0), 3),
            "payment_method": payment_method,
            "merchant_category": category,
            "city": city,
            "location_distance_km": round(location_dist, 1),
            "device_id": device_id,
            "is_new_device": is_new_device,
            "velocity_10m": velocity_10m,
            "failed_attempts": failed_attempts,
            "device_trust_score": round(device_trust, 3),
            "hour_of_day": hour,
            "is_night": is_night,
            "is_fraud": 1 if is_fraud else 0,
            "fraud_archetype": fraud_archetype or "none"
        }
        transactions.append(txn)

    # 80/20 chronological train/test split
    split_idx = int(len(transactions) * 0.8)
    train_set = transactions[:split_idx]
    heldout_set = transactions[split_idx:]
    
    if output_dir:
        os.makedirs(output_dir, exist_ok=True)
        with open(os.path.join(output_dir, "train_transactions.json"), "w") as f:
            json.dump(train_set, f, indent=2)
        with open(os.path.join(output_dir, "heldout_transactions.json"), "w") as f:
            json.dump(heldout_set, f, indent=2)
            
    print(f"Dataset generated: {len(transactions)} total | Train: {len(train_set)} (Fraud: {sum(t['is_fraud'] for t in train_set)}) | Held-Out: {len(heldout_set)} (Fraud: {sum(t['is_fraud'] for t in heldout_set)})")
    return train_set, heldout_set

if __name__ == "__main__":
    current_dir = os.path.dirname(os.path.abspath(__file__))
    data_dir = os.path.join(os.path.dirname(current_dir), "data")
    generate_transaction_dataset(n_samples=25000, output_dir=data_dir)
