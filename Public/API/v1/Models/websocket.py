# Bu araç @keyiflerolsun tarafından | CodeNight için yazılmıştır.

from pydantic import BaseModel
from datetime import datetime
from typing   import Optional, Dict, Any
from .enums   import RiskLevel

class AnomalyDetail(BaseModel):
    """Anomali detay bilgisi"""
    type: Optional[str] = None
    reason: Optional[str] = None
    evidence: Optional[Dict[str, Any]] = None

class AlertMessage(BaseModel):
    """WebSocket üzerinden gönderilen uyarı mesajları"""
    type: str
    sim_id: str
    message: str
    severity: RiskLevel
    timestamp: datetime
    # Yeni alanlar
    risk_score: Optional[float] = None
    anomaly_count: Optional[int] = None
    new_anomaly_count: Optional[int] = None
    latest_anomaly: Optional[AnomalyDetail] = None

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
