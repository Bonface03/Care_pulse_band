from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
import asyncio
import json

from app import routes, models
from app.db import Base, engine

# Create database tables on startup
models.Base.metadata.create_all(bind=engine)

app = FastAPI(title="CarePulse Backend API")

# Setup CORS for the Next.js frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "*"], # Allow frontend
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Active websocket connections
class ConnectionManager:
    def __init__(self):
        self.active_connections: list[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)

    def disconnect(self, websocket: WebSocket):
        self.active_connections.remove(websocket)

    async def broadcast(self, message: dict):
        for connection in self.active_connections:
            try:
                await connection.send_text(json.dumps(message))
            except Exception:
                pass

manager = ConnectionManager()

from app.routers import telemetry, devices

# Include authentication/legacy routes
app.include_router(routes.router)
app.include_router(telemetry.router)
app.include_router(devices.router)

@app.websocket("/ws/telemetry")
async def websocket_endpoint(websocket: WebSocket):
    await manager.connect(websocket)
    try:
        while True:
            # Keep connection open and listen for client messages if needed
            data = await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(websocket)

# A global reference so routes can import the manager to broadcast
app.state.ws_manager = manager

# Run hypertable setup on startup if using TimescaleDB
@app.on_event("startup")
async def startup_event():
    from sqlalchemy import text
    try:
        with engine.connect() as conn:
            # Attempt to create the hypertable. Will fail if not TimescaleDB extension, but we ignore safe errors.
            conn.execute(text("CREATE EXTENSION IF NOT EXISTS timescaledb;"))
            conn.execute(text("SELECT create_hypertable('telemetry_data', 'time', if_not_exists => TRUE);"))
            conn.commit()
            print("TimescaleDB initialized")
    except Exception as e:
        print(f"Note: TimescaleDB initialization skipped or failed: {e}")
