# Bu araç @keyiflerolsun tarafından | CodeNight için yazılmıştır.

from pydantic import BaseModel
from typing   import Optional, List
from datetime import datetime
from .enums   import RiskLevel, ActionType

# Fleet API Models
class FleetResponse(BaseModel):
    """Fleet genel görünüm response"""
    sim_id: str
    device_type: str
    apn: str
    plan: str
    status: str
    city: str
    risk_score: int
    risk_level: RiskLevel
    last_seen_at: Optional[datetime]
    anomaly_count: int

# Usage API Models
class UsageResponse(BaseModel):
    """SIM kullanım geçmişi response"""
    timestamp: datetime
    mb_used: float
    roaming_mb: float

# Analyze API Models
class AnomalyResponse(BaseModel):
    """Anomali detay response"""
    type: str
    detected_at: datetime
    reason: str
    evidence: dict

class AnalyzeResponse(BaseModel):
    """SIM analiz sonucu response"""
    anomalies: List[AnomalyResponse]
    risk_score: int
    risk_level: RiskLevel
    summary: str

# What-If API Models
class WhatIfRequest(BaseModel):
    """Maliyet simülasyon request"""
    plan_id: Optional[str] = None
    addons: Optional[List[str]] = []
    scenario: Optional[str] = None  # increase_20, decrease_30, spike_day, roaming_week
    parameters: Optional[dict] = {}

class CostBreakdown(BaseModel):
    """Maliyet detayları"""
    base_cost: float
    overage_cost: float
    addon_cost: float
    total_cost: float

class WhatIfResponse(BaseModel):
    """Maliyet simülasyon response"""
    current_total: float
    candidate_total: float
    saving: float
    breakdown: CostBreakdown
    description: str
    current_monthly: Optional[float] = None
    projected_monthly: Optional[float] = None
    cost_change: Optional[float] = None
    risk_change: Optional[int] = 0
    recommendations: Optional[List[str]] = []

# Actions API Models
class ActionRequest(BaseModel):
    """Toplu eylem request"""
    sim_ids: List[str]
    action: ActionType
    reason: str

class ActionResponse(BaseModel):
    """Toplu eylem response"""
    status: str
    created: List[dict]
    message: str
