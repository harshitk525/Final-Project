import json
import logging
from typing import List, Dict, Any
from fastapi import APIRouter, WebSocket, WebSocketDisconnect

logger = logging.getLogger("vektor.websocket")

router = APIRouter(tags=["Real-Time WebSockets"])

class ConnectionManager:
    """Manages active real-time WebSocket client connections across browser tabs."""

    def __init__(self):
        self.active_connections: List[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)
        logger.info(f"WebSocket client connected. Total active connections: {len(self.active_connections)}")

    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)
            logger.info(f"WebSocket client disconnected. Total active connections: {len(self.active_connections)}")

    async def broadcast(self, message: Dict[str, Any]):
        """Broadcasts a JSON message to all connected browsers simultaneously."""
        if not self.active_connections:
            return

        payload = json.dumps(message)
        dead_connections = []

        for connection in self.active_connections:
            try:
                await connection.send_text(payload)
            except Exception as exc:
                logger.warning(f"Failed to send to WebSocket connection: {exc}")
                dead_connections.append(connection)

        for dead in dead_connections:
            self.disconnect(dead)

# Global singleton connection manager
manager = ConnectionManager()

@router.websocket("/ws/disruptions")
async def websocket_disruptions_endpoint(websocket: WebSocket):
    """
    Real-time WebSocket endpoint for instant transport disruption and telemetry streaming.
    Connected clients receive broadcasts whenever a new crowd report or route update occurs.
    """
    await manager.connect(websocket)
    try:
        # Send initial handshake welcome
        await websocket.send_json({
            "type": "CONNECTION_ESTABLISHED",
            "message": "Connected to Vektor Real-Time WebSocket Engine",
            "active_clients": len(manager.active_connections),
        })

        while True:
            # Keep connection alive; handle incoming client pings
            data = await websocket.receive_text()
            try:
                msg = json.loads(data)
                if msg.get("type") == "PING":
                    await websocket.send_json({"type": "PONG"})
            except Exception:
                pass
    except WebSocketDisconnect:
        manager.disconnect(websocket)
    except Exception as exc:
        logger.warning(f"WebSocket connection error: {exc}")
        manager.disconnect(websocket)

async def broadcast_disruption_event(event_type: str, data: Dict[str, Any]):
    """Helper function to broadcast real-time disruption events to all open frontend tabs."""
    message = {
        "type": event_type,
        "payload": data,
    }
    await manager.broadcast(message)
