from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, Boolean
from sqlalchemy.orm import relationship
from datetime import datetime
from app.db import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True)
    hashed_password = Column(String)
    role = Column(String, default="user")
    devices = relationship("Device", back_populates="owner")

class Device(Base):
    __tablename__ = "devices"

    id = Column(String, primary_key=True, index=True) # e.g., "CPB-00A1B2C3"
    owner_id = Column(Integer, ForeignKey("users.id"))
    registered_at = Column(DateTime, default=datetime.utcnow)
    is_active = Column(Boolean, default=True)

    owner = relationship("User", back_populates="devices")
    telemetry = relationship("TelemetryData", back_populates="device")
    alerts = relationship("Alert", back_populates="device")

class TelemetryData(Base):
    # TimescaleDB hypertable
    __tablename__ = "telemetry_data"

    time = Column(DateTime, primary_key=True, index=True, default=datetime.utcnow)
    device_id = Column(String, ForeignKey("devices.id"), primary_key=True)
    battery_level = Column(Integer)

    # Vitals
    glucose_value = Column(Float)
    glucose_trend = Column(String)
    heart_rate = Column(Integer)

    # Accelerometer / Fall detection
    fall_detected = Column(Boolean, default=False)
    accel_x = Column(Float)
    accel_y = Column(Float)
    accel_z = Column(Float)
    
    device = relationship("Device", back_populates="telemetry")

class Alert(Base):
    __tablename__ = "alerts"

    id = Column(Integer, primary_key=True, index=True)
    device_id = Column(String, ForeignKey("devices.id"))
    time = Column(DateTime, default=datetime.utcnow)
    alert_type = Column(String) # "FALL", "HIGH_HR", "LOW_GLUCOSE"
    message = Column(String)
    resolved = Column(Boolean, default=False)

    device = relationship("Device", back_populates="alerts")
