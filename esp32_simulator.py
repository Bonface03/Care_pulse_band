import time
import requests
import random
from datetime import datetime

API_URL = "http://localhost:8000/api/v1/telemetry/"
DEVICE_ID = "CPB-00A1B2C3"

def generate_payload(fall=False):
    return {
        "device_id": DEVICE_ID,
        "timestamp": datetime.utcnow().isoformat() + "Z",
        "battery_level": random.randint(70, 100),
        "payload": {
            "glucose": {
                "value": round(random.uniform(4.5, 6.0), 1),
                "unit": "mmol/L",
                "trend": "stable"
            },
            "heart_rate": {
                "value": random.randint(65, 85) if not fall else random.randint(110, 140),
                "unit": "bpm"
            },
            "fall_event": {
                "detected": fall,
                "confidence": 0.95 if fall else 0.0
            },
            "accelerometer": {
                "x": random.uniform(-0.1, 0.1) if not fall else random.uniform(5.0, 9.8),
                "y": 9.78 if not fall else random.uniform(-5.0, 0.0),
                "z": random.uniform(-0.1, 0.1) if not fall else random.uniform(2.0, 7.0)
            }
        },
        "network": "wifi"
    }

def run_simulation():
    print(f"Starting ESP32 Simulator for Device {DEVICE_ID}...")
    try:
        count = 0
        while True:
            # Simulate a fall event every 20 readings
            trigger_fall = (count > 0 and count % 20 == 0)
            data = generate_payload(fall=trigger_fall)
            
            try:
                response = requests.post(API_URL, json=data)
                if response.status_code == 200:
                    print(f"[{data['timestamp']}] Successfully sent telemetry (HR: {data['payload']['heart_rate']['value']} - Fall: {trigger_fall})")
                else:
                    print(f"Failed to send telemetry. Status code: {response.status_code}, DB may not have device registered.")
            except requests.exceptions.ConnectionError:
                print("Connection to API failed. Is FastAPI running on port 8000?")
            
            count += 1
            time.sleep(2) # Send every 2 seconds
            
    except KeyboardInterrupt:
        print("\nSimulator stopped.")

if __name__ == "__main__":
    run_simulation()
