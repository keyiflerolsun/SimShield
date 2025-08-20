# Bu araç @keyiflerolsun tarafından | CodeNight için yazılmıştır.

from enum import Enum

class SimStatus(str, Enum):
    """SIM kart durumları"""
    ACTIVE = "active"
    BLOCKED = "blocked"
    SUSPENDED = "suspended"

class DeviceType(str, Enum):
    """IoT cihaz tipleri"""
    POS = "POS"
    SMARTMETER = "SmartMeter"
    TRACKER = "Tracker"
    CAMERA = "Camera"
    SENSOR = "Sensor"

class ActionType(str, Enum):
    """SIM'lere uygulanabilecek eylem tipleri"""
    FREEZE_24H = "freeze_24h"
    THROTTLE = "throttle"
    NOTIFY = "notify"

class AnomalyType(str, Enum):
    """Anomali tipleri"""
    SUDDEN_SPIKE = "sudden_spike"
    SUSTAINED_DRAIN = "sustained_drain"
    INACTIVITY = "inactivity"
    UNEXPECTED_ROAMING = "unexpected_roaming"

class RiskLevel(str, Enum):
    """Risk seviyeleri"""
    GREEN = "green"
    ORANGE = "orange"
    RED = "red"

class Severity(str, Enum):
    """Anomali önem seviyeleri"""
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"
