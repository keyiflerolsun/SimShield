# Bu araç @keyiflerolsun tarafından | CodeNight için yazılmıştır.

from datetime import datetime
from typing   import List, Tuple
from ..Models import Usage, Anomaly, AnomalyType, RiskLevel, DeviceProfile
from Settings import IOT_SETTINGS
import statistics

class AnomalyDetector:
    def __init__(self):
        self.spike_multiplier = IOT_SETTINGS["ANOMALY_DETECTION"]["SPIKE_MULTIPLIER"]
        self.drain_days = IOT_SETTINGS["ANOMALY_DETECTION"]["DRAIN_DAYS"]
        self.drain_multiplier = IOT_SETTINGS["ANOMALY_DETECTION"]["DRAIN_MULTIPLIER"]
        self.inactivity_hours = IOT_SETTINGS["ANOMALY_DETECTION"]["INACTIVITY_HOURS"]
        self.roaming_threshold = IOT_SETTINGS["ANOMALY_DETECTION"]["UNEXPECTED_ROAMING_THRESHOLD"]
        
        self.risk_scores = IOT_SETTINGS["RISK_SCORING"]
        
    def analyze_sim(self, sim_id: str, usage_data: List[Usage], 
                   device_profile: DeviceProfile) -> Tuple[List[Anomaly], int]:
        """
        Bir SIM için anomali analizi yapar
        """
        anomalies = []
        
        if len(usage_data) < 7:
            return anomalies, 0
            
        # Son 7 günün ortalaması ve standart sapması
        last_7_days = usage_data[-7:]
        daily_usage = [usage.mb_used for usage in last_7_days]
        ma7 = statistics.mean(daily_usage) if daily_usage else 0
        std7 = statistics.stdev(daily_usage) if len(daily_usage) > 1 else 0
        
        # Sudden Spike kontrolü
        today_usage = usage_data[-1] if usage_data else None
        if today_usage:
            spike_threshold = max(ma7 * self.spike_multiplier, ma7 + 3 * std7)
            if today_usage.mb_used > spike_threshold and ma7 > 0:
                anomaly = Anomaly(
                    sim_id=sim_id,
                    type=AnomalyType.SUDDEN_SPIKE,
                    detected_at=today_usage.timestamp,
                    severity=RiskLevel.RED,
                    reason=f"Günlük kullanım {today_usage.mb_used:.1f}MB, son 7 gün ortalaması {ma7:.1f}MB",
                    evidence={
                        "current_usage": today_usage.mb_used,
                        "7day_average": ma7,
                        "threshold": spike_threshold,
                        "multiplier": self.spike_multiplier
                    }
                )
                anomalies.append(anomaly)
        
        # Sustained Drain kontrolü
        if len(usage_data) >= self.drain_days:
            recent_days = usage_data[-self.drain_days:]
            drain_threshold = ma7 * self.drain_multiplier
            consecutive_high = all(usage.mb_used > drain_threshold for usage in recent_days)
            
            if consecutive_high and ma7 > 0:
                anomaly = Anomaly(
                    sim_id=sim_id,
                    type=AnomalyType.SUSTAINED_DRAIN,
                    detected_at=recent_days[-1].timestamp,
                    severity=RiskLevel.ORANGE,
                    reason=f"{self.drain_days} gün boyunca sürekli yüksek kullanım",
                    evidence={
                        "days_count": self.drain_days,
                        "threshold": drain_threshold,
                        "recent_usage": [u.mb_used for u in recent_days],
                        "average": ma7
                    }
                )
                anomalies.append(anomaly)
        
        # Inactivity kontrolü
        inactive_hours = self._check_inactivity(usage_data)
        if inactive_hours >= self.inactivity_hours:
            last_active = next((u.timestamp for u in reversed(usage_data) if u.mb_used > 0), None)
            anomaly = Anomaly(
                sim_id=sim_id,
                type=AnomalyType.INACTIVITY,
                detected_at=usage_data[-1].timestamp if usage_data else datetime.now(),
                severity=RiskLevel.ORANGE,
                reason=f"{inactive_hours} saattir veri kullanımı yok",
                evidence={
                    "inactive_hours": inactive_hours,
                    "last_active": last_active,
                    "threshold_hours": self.inactivity_hours
                }
            )
            anomalies.append(anomaly)
        
        # Unexpected Roaming kontrolü
        if not device_profile.roaming_expected:
            today_roaming = today_usage.roaming_mb if today_usage else 0
            if today_roaming > self.roaming_threshold:
                anomaly = Anomaly(
                    sim_id=sim_id,
                    type=AnomalyType.UNEXPECTED_ROAMING,
                    detected_at=today_usage.timestamp,
                    severity=RiskLevel.RED,
                    reason=f"Beklenmeyen roaming kullanımı: {today_roaming}MB",
                    evidence={
                        "roaming_usage": today_roaming,
                        "threshold": self.roaming_threshold,
                        "device_allows_roaming": device_profile.roaming_expected
                    }
                )
                anomalies.append(anomaly)
        
        # Risk skoru hesaplama
        risk_score = self._calculate_risk_score(anomalies)
        
        return anomalies, risk_score
    
    def _check_inactivity(self, usage_data: List[Usage]) -> int:
        """
        Son kaç saattir inaktif olduğunu hesaplar
        """
        if not usage_data:
            return 0
            
        now = datetime.now()
        inactive_hours = 0
        
        for usage in reversed(usage_data):
            if usage.mb_used > 0:
                break
            time_diff = now - usage.timestamp
            inactive_hours = time_diff.total_seconds() / 3600
            
        return int(inactive_hours)
    
    def _calculate_risk_score(self, anomalies: List[Anomaly]) -> int:
        """
        Anomalilere göre risk skoru hesaplar
        """
        score = 0
        
        for anomaly in anomalies:
            if anomaly.type == AnomalyType.SUDDEN_SPIKE:
                score += self.risk_scores["SPIKE_SCORE"]
            elif anomaly.type == AnomalyType.SUSTAINED_DRAIN:
                score += self.risk_scores["DRAIN_SCORE"]
            elif anomaly.type == AnomalyType.INACTIVITY:
                score += self.risk_scores["INACTIVITY_SCORE"]
            elif anomaly.type == AnomalyType.UNEXPECTED_ROAMING:
                score += self.risk_scores["ROAMING_SCORE"]
        
        return min(score, self.risk_scores["MAX_SCORE"])
    
    def get_risk_level(self, risk_score: int) -> RiskLevel:
        """
        Risk skoruna göre seviye döndürür
        """
        if risk_score >= IOT_SETTINGS["THRESHOLDS"]["RED_RISK"]:
            return RiskLevel.RED
        elif risk_score >= IOT_SETTINGS["THRESHOLDS"]["ORANGE_RISK"]:
            return RiskLevel.ORANGE
        else:
            return RiskLevel.GREEN
    
    def generate_summary(self, anomalies: List[Anomaly], risk_score: int) -> str:
        """
        Anomali özetini oluşturur
        """
        if not anomalies:
            return "Anomali tespit edilmedi, SIM normal çalışıyor."
        
        anomaly_types = [a.type.value for a in anomalies]
        risk_level = self.get_risk_level(risk_score)
        
        summary = f"{len(anomalies)} anomali tespit edildi. "
        summary += f"Risk seviyesi: {risk_level.value.upper()}. "
        summary += f"Tespit edilen sorunlar: {', '.join(anomaly_types)}"
        
        return summary

# Global anomali tespit motoru
anomaly_detector = AnomalyDetector()
