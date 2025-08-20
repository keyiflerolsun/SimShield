# Bu araç @keyiflerolsun tarafından | CodeNight için yazılmıştır.

from datetime import datetime, timedelta
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
            
        # Son 7 günün ortalaması ve standart sapması (son 3 günü hariç tut, çünkü onlarda anomali olabilir)
        if len(usage_data) >= 10:
            # Son 10 günden son 3'ü hariç ilk 7'sini al (baseline için)
            baseline_data = usage_data[-10:-3]
        else:
            baseline_data = usage_data[:-3] if len(usage_data) > 3 else usage_data[:-1]
        
        if len(baseline_data) < 3:
            baseline_data = usage_data[:len(usage_data)//2] if len(usage_data) > 6 else usage_data[:-1]
            
        daily_usage = [usage.mb_used for usage in baseline_data]
        ma7 = statistics.mean(daily_usage) if daily_usage else 0
        std7 = statistics.stdev(daily_usage) if len(daily_usage) > 1 else 0
        
        # Son 3 günü kontrol et (anomali için)
        recent_days = usage_data[-3:] if len(usage_data) >= 3 else usage_data
        
        # Sudden Spike kontrolü - son 3 günde herhangi birinde
        for usage in recent_days:
            spike_threshold = max(ma7 * self.spike_multiplier, ma7 + 3 * std7, 50)  # minimum 50MB threshold
            if usage.mb_used > spike_threshold and ma7 > 0:
                anomaly = Anomaly(
                    sim_id=sim_id,
                    type=AnomalyType.SUDDEN_SPIKE,
                    detected_at=usage.timestamp,
                    severity=RiskLevel.RED,
                    reason=f"Günlük kullanım {usage.mb_used:.1f}MB, baseline ortalama {ma7:.1f}MB (eşik: {spike_threshold:.1f}MB)",
                    evidence={
                        "current_usage": usage.mb_used,
                        "baseline_average": ma7,
                        "threshold": spike_threshold,
                        "multiplier": self.spike_multiplier
                    }
                )
                anomalies.append(anomaly)
        
        # Sustained Drain kontrolü
        if len(usage_data) >= self.drain_days:
            recent_days_drain = usage_data[-self.drain_days:]
            drain_threshold = max(ma7 * self.drain_multiplier, 20)  # minimum 20MB threshold
            consecutive_high = all(usage.mb_used > drain_threshold for usage in recent_days_drain)
            
            if consecutive_high and ma7 > 0:
                anomaly = Anomaly(
                    sim_id=sim_id,
                    type=AnomalyType.SUSTAINED_DRAIN,
                    detected_at=recent_days_drain[-1].timestamp,
                    severity=RiskLevel.ORANGE,
                    reason=f"{self.drain_days} gün boyunca sürekli yüksek kullanım (ortalama: {ma7:.1f}MB, eşik: {drain_threshold:.1f}MB)",
                    evidence={
                        "days_count": self.drain_days,
                        "threshold": drain_threshold,
                        "recent_usage": [u.mb_used for u in recent_days_drain],
                        "baseline_average": ma7
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
        
        # Unexpected Roaming kontrolü - sadece son 2 günde
        if not device_profile.roaming_expected:
            # Son 2 günde roaming kullanımı kontrol et (gerçek zamanlı analiz için)
            two_days_ago = datetime.now() - timedelta(days=2)
            recent_roaming_data = [u for u in recent_days if u.timestamp >= two_days_ago]
            
            for usage in recent_roaming_data:
                if usage.roaming_mb > self.roaming_threshold:
                    anomaly = Anomaly(
                        sim_id=sim_id,
                        type=AnomalyType.UNEXPECTED_ROAMING,
                        detected_at=usage.timestamp,
                        severity=RiskLevel.RED,
                        reason=f"Beklenmeyen roaming kullanımı: {usage.roaming_mb}MB",
                        evidence={
                            "roaming_usage": usage.roaming_mb,
                            "threshold": self.roaming_threshold,
                            "device_allows_roaming": device_profile.roaming_expected
                        }
                    )
                    anomalies.append(anomaly)
                    break  # Sadece bir roaming anomalisi ekle
        
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
        
        anomaly_types = []
        for a in anomalies:
            anomaly_type = a.type.value if hasattr(a.type, 'value') else str(a.type)
            if anomaly_type not in anomaly_types:
                anomaly_types.append(anomaly_type)
        
        risk_level = self.get_risk_level(risk_score)
        
        summary = f"{len(anomalies)} anomali tespit edildi. "
        summary += f"Risk seviyesi: {risk_level.value.upper()}. "
        summary += f"Tespit edilen sorunlar: {', '.join(anomaly_types)}"
        
        # Risk seviyesine göre ek açıklama
        if risk_level == RiskLevel.RED:
            summary += " - Acil müdahale gerekiyor!"
        elif risk_level == RiskLevel.ORANGE:
            summary += " - Yakın takip öneriliyor."
        
        return summary

# Global anomali tespit motoru
anomaly_detector = AnomalyDetector()
