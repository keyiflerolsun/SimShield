# Bu araç @keyiflerolsun tarafından | CodeNight için yazılmıştır.

from pydantic import BaseModel
from typing   import Optional
from datetime import datetime
from .enums   import SimStatus, DeviceType, ActionType, AnomalyType, RiskLevel

class SimCard(BaseModel):
    """SIM kart bilgileri"""
    sim_id: str
    customer_id: str
    device_type: DeviceType
    apn: str
    plan_id: str
    status: SimStatus
    city: str
    risk_score: Optional[int] = 0
    last_seen_at: Optional[datetime] = None
    anomaly_count: Optional[int] = 0

class IoTPlan(BaseModel):
    """IoT veri planları"""
    plan_id: str
    plan_name: str
    monthly_quota_mb: int
    monthly_price: float
    overage_per_mb: float
    apn: str

class Usage(BaseModel):
    """SIM kullanım verileri"""
    sim_id: str
    timestamp: datetime
    mb_used: float
    roaming_mb: Optional[float] = 0

class DeviceProfile(BaseModel):
    """Cihaz profilleri ve beklenen kullanım"""
    device_type: DeviceType
    expected_daily_mb_min: int
    expected_daily_mb_max: int
    roaming_expected: bool

class AddOnPack(BaseModel):
    """Ek veri paketleri"""
    addon_id: str
    name: str
    extra_mb: int
    price: float
    apn: str

class ActionLog(BaseModel):
    """Eylem logları"""
    action_id: str
    sim_id: str
    action: ActionType
    reason: str
    created_at: datetime
    actor: str
    status: str = "pending"

class Anomaly(BaseModel):
    """Tespit edilen anomaliler"""
    anomaly_id: Optional[str] = None
    sim_id: str
    type: AnomalyType
    detected_at: datetime
    severity: RiskLevel
    reason: str
    evidence: dict
    resolved: bool = False
