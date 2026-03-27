from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional
from datetime import datetime

from app.db import SessionLocal
from app.models import TelemetryData, Device

router = APIRouter(prefix="/api/v1/telemetry", tags=["telemetry"])

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# Telemetry Payloads
class GlucoseData(BaseModel):
    value: float
    unit: str = "mmol/L"
    trend: str = "stable"

class HeartRateData(BaseModel):
    value: int
    unit: str = "bpm"

class FallEventData(BaseModel):
    detected: bool
    confidence: float

class AccelerometerData(BaseModel):
    x: float
    y: float
    z: float

class TelemetryPayload(BaseModel):
    glucose: Optional[GlucoseData] = None
    heart_rate: Optional[HeartRateData] = None
    fall_event: Optional[FallEventData] = None
    accelerometer: Optional[AccelerometerData] = None

class TelemetryRequest(BaseModel):
    device_id: str
    timestamp: datetime
    battery_level: int
    payload: TelemetryPayload
    network: str

@router.post("/")
async def ingest_telemetry(request: Request, data: TelemetryRequest, db: Session = Depends(get_db)):
    # 1. Verify Device Exists
    device = db.query(Device).filter(Device.id == data.device_id).first()
    if not device:
        # Auto-provision for testing purposes
        print(f"Auto-provisioning device {data.device_id}")
        new_device = Device(id=data.device_id)
        db.add(new_device)
        db.commit()
        db.refresh(new_device)
        device = new_device
    
    # 2. Store in DB
    new_telemetry = TelemetryData(
        time=data.timestamp,
        device_id=data.device_id,
        battery_level=data.battery_level,
        
        glucose_value=data.payload.glucose.value if data.payload.glucose else None,
        glucose_trend=data.payload.glucose.trend if data.payload.glucose else None,
        heart_rate=data.payload.heart_rate.value if data.payload.heart_rate else None,
        
        fall_detected=data.payload.fall_event.detected if data.payload.fall_event else False,
        accel_x=data.payload.accelerometer.x if data.payload.accelerometer else None,
        accel_y=data.payload.accelerometer.y if data.payload.accelerometer else None,
        accel_z=data.payload.accelerometer.z if data.payload.accelerometer else None,
    )
    
    db.add(new_telemetry)
    db.commit()

    # 3. Broadcast to WebSockets (Live Dashboard)
    # Using the manager attached to FastAPI state
    manager = request.app.state.ws_manager
    await manager.broadcast(data.dict())

    # 4. (Optional) Check thresholds and trigger alerts asynchronously
    if new_telemetry.fall_detected:
        print(f"ALERT: Fall detected for device {data.device_id}")
        # Insert alert into DB
        # Send SMS via Twilio (to be implemented)
    
    return {"status": "success", "message": "Telemetry processed"}
