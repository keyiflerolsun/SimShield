# Bu araç @keyiflerolsun tarafından | CodeNight için yazılmıştır.

from pydantic import BaseModel
from datetime import datetime
from .enums   import RiskLevel

class AlertMessage(BaseModel):
    """WebSocket üzerinden gönderilen uyarı mesajları"""
    type: str
    sim_id: str
    message: str
    severity: RiskLevel
    timestamp: datetime

class ConnectionStatus(BaseModel):
    """WebSocket bağlantı durumu"""
    connected: bool
    connection_count: int
    last_heartbeat: datetime

class BroadcastMessage(BaseModel):
    """Broadcast mesaj formatı"""
    channel: str
    message: str
    timestamp: datetime
    priority: str = "normal"
