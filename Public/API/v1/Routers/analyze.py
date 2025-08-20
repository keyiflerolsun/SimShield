# Bu araç @keyiflerolsun tarafından | CodeNight için yazılmıştır.

from fastapi  import HTTPException
from .        import api_v1_router, manager
from datetime import datetime
from ..Models import AnalyzeResponse, AlertMessage, AnomalyResponse
from ..Libs   import iot_service, anomaly_detector

@api_v1_router.post("/analyze/{sim_id}", response_model=AnalyzeResponse)
async def analyze_sim_anomalies(sim_id: str):
    """
    SIM'in anomalilerini analiz eder ve döndürür
    """
    try:
        # SIM bilgilerini al
        sim = await iot_service.get_sim_by_id(sim_id)
        if not sim:
            raise HTTPException(status_code=404, detail="SIM bulunamadı")
        
        # Device profile al
        device_profile = await iot_service.get_device_profile(sim.device_type)
        if not device_profile:
            raise HTTPException(status_code=404, detail="Cihaz profili bulunamadı")
        
        # Kullanım verilerini al
        usage_data = await iot_service.get_sim_usage(sim_id, 30)
        
        # Zaten tespit edilmiş anomalileri al (son 7 gün)
        existing_anomalies = await iot_service.get_sim_anomalies(sim_id, 7)  # son 7 gün
        existing_types = []
        for a in existing_anomalies:
            if hasattr(a, 'type'):
                if hasattr(a.type, 'value'):
                    existing_types.append(a.type.value)
                else:
                    existing_types.append(str(a.type))
            else:
                existing_types.append('unknown')
        
        # Anomali analizi yap
        all_anomalies, risk_score = anomaly_detector.analyze_sim(
            sim_id, usage_data, device_profile
        )
        
        # Sadece yeni tipte anomalileri filtrele
        new_anomalies = []
        for anomaly in all_anomalies:
            anomaly_type = anomaly.type.value if hasattr(anomaly.type, 'value') else str(anomaly.type)
            if anomaly_type not in existing_types:
                new_anomalies.append(anomaly)
        
        # Anomalileri veritabanına kaydet ve yeni olanları say
        new_anomalies_count = 0
        saved_anomaly_ids = []
        
        for anomaly in new_anomalies:
            anomaly_id = await iot_service.save_anomaly(anomaly)
            if anomaly_id != "existing":
                new_anomalies_count += 1
                saved_anomaly_ids.append(anomaly_id)
        
        # Toplam anomali listesi (mevcut + yeni)
        anomalies = existing_anomalies + new_anomalies
        
        # SIM risk skorunu güncelle
        await iot_service.update_sim_risk_score(sim_id, risk_score, len(anomalies))
        
        # Risk seviyesi belirle
        risk_level = anomaly_detector.get_risk_level(risk_score)
        
        # Özet oluştur (toplam anomali sayısı ile)
        summary = anomaly_detector.generate_summary(anomalies, risk_score)
        
        # Eğer gerçekten yeni anomali tespit edildi ise summary'yi güncelle
        if new_anomalies_count > 0 and new_anomalies_count < len(anomalies):
            summary = f"{new_anomalies_count} yeni anomali tespit edildi (toplam: {len(anomalies)}). Risk seviyesi: {risk_level.value.upper()}."
        elif new_anomalies_count == 0 and len(anomalies) > 0:
            summary = f"Mevcut {len(anomalies)} anomali devam ediyor. Risk seviyesi: {risk_level.value.upper()}. Son analiz tamamlandı."
        
        # Response formatına çevir
        anomaly_responses = [
            AnomalyResponse(
                type=anomaly.type.value,
                detected_at=anomaly.detected_at,
                reason=anomaly.reason,
                evidence=anomaly.evidence
            )
            for anomaly in anomalies
        ]
        
        response = AnalyzeResponse(
            anomalies=anomaly_responses,
            risk_score=risk_score,
            risk_level=risk_level,
            summary=summary
        )
        
        # WebSocket ile canlı uyarı gönder - sadece YENİ anomaliler için
        if new_anomalies_count > 0:
            alert = AlertMessage(
                type="anomaly_detected",
                sim_id=sim_id,
                message=f"{new_anomalies_count} yeni anomali tespit edildi",
                severity=risk_level,
                timestamp=datetime.now()
            )
            await manager.broadcast(alert.model_dump_json())
        
        return response
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Analiz gerçekleştirilemedi: {str(e)}")

@api_v1_router.get("/analyze/{sim_id}/latest", response_model=AnalyzeResponse)
async def get_latest_anomaly_analysis(sim_id: str):
    """
    SIM'in en son anomali analizini döndürür
    """
    try:
        # En son anomali verilerini al
        latest_anomalies = await iot_service.get_latest_anomalies(sim_id)
        
        # SIM bilgilerini al
        sim = await iot_service.get_sim_by_id(sim_id)
        if not sim:
            raise HTTPException(status_code=404, detail="SIM bulunamadı")
        
        risk_score = sim.risk_score or 0
        risk_level = anomaly_detector.get_risk_level(risk_score)
        summary = anomaly_detector.generate_summary(latest_anomalies, risk_score)
        
        # Response formatına çevir
        anomaly_responses = [
            AnomalyResponse(
                type=anomaly.type.value if hasattr(anomaly.type, 'value') else anomaly.type,
                detected_at=anomaly.detected_at,
                reason=anomaly.reason,
                evidence=anomaly.evidence if hasattr(anomaly, 'evidence') else {}
            )
            for anomaly in latest_anomalies
        ]
        
        return AnalyzeResponse(
            anomalies=anomaly_responses,
            risk_score=risk_score,
            risk_level=risk_level,
            summary=summary
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Anomali verileri alınamadı: {str(e)}")