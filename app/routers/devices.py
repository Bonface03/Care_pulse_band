from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import List

from app.db import SessionLocal
from app.models import Device, User
from app.auth import get_current_user

router = APIRouter(prefix="/api/v1/devices", tags=["devices"])

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

class DeviceCreate(BaseModel):
    device_id: str

class DeviceResponse(BaseModel):
    id: str
    owner_id: int
    is_active: bool

    class Config:
        from_attributes = True # updated config for Pydantic v2

@router.post("/", response_model=DeviceResponse)
def onboard_device(device: DeviceCreate, db: Session = Depends(get_db), current_user = Depends(get_current_user)):
    # Find user
    user_record = db.query(User).filter(User.username == current_user["username"]).first()
    if not user_record:
        raise HTTPException(status_code=404, detail="User not found")

    existing = db.query(Device).filter(Device.id == device.device_id).first()
    if existing:
        raise HTTPException(status_code=400, detail="Device already registered")
    
    # HIPAA/X.509 Simulation placeholder
    new_device = Device(id=device.device_id, owner_id=user_record.id)
    db.add(new_device)
    db.commit()
    db.refresh(new_device)
    return new_device

@router.get("/", response_model=List[DeviceResponse])
def get_user_devices(db: Session = Depends(get_db), current_user = Depends(get_current_user)):
    user_record = db.query(User).filter(User.username == current_user["username"]).first()
    if not user_record:
        raise HTTPException(status_code=404, detail="User not found")
        
    devices = db.query(Device).filter(Device.owner_id == user_record.id).all()
    return devices
