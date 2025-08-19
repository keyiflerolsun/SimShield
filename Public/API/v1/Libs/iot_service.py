# Bu araç @keyiflerolsun tarafından | CodeNight için yazılmıştır.

from typing            import List, Optional
from datetime          import datetime, timedelta
from DB                import db_manager
from ..Models          import SimCard, IoTPlan, Usage, DeviceProfile, AddOnPack, ActionLog, Anomaly, FleetResponse
from .anomaly_detector import anomaly_detector
import uuid

class IoTService:
    def __init__(self):
        self.db = db_manager
    
    async def get_fleet_overview(self) -> List[FleetResponse]:
        """
        Filo genel görünümünü döndürür
        """
        collection = self.db.get_collection("sims")
        sims = []
        
        async for sim_doc in collection.find():
            # Risk seviyesini hesapla
            risk_level = anomaly_detector.get_risk_level(sim_doc.get("risk_score", 0))
            
            fleet_item = FleetResponse(
                sim_id=sim_doc["sim_id"],
                device_type=sim_doc["device_type"],
                apn=sim_doc["apn"],
                plan=sim_doc["plan_id"],
                status=sim_doc["status"],
                city=sim_doc["city"],
                risk_score=sim_doc.get("risk_score", 0),
                risk_level=risk_level,
                last_seen_at=sim_doc.get("last_seen_at"),
                anomaly_count=sim_doc.get("anomaly_count", 0)
            )
            sims.append(fleet_item)
        
        return sims
    
    async def get_sim_usage(self, sim_id: str, days: int = 30) -> List[Usage]:
        """
        SIM kartın kullanım geçmişini döndürür
        """
        collection = self.db.get_collection("usage")
        start_date = datetime.now() - timedelta(days=days)
        
        cursor = collection.find({
            "sim_id": sim_id,
            "timestamp": {"$gte": start_date}
        }).sort("timestamp", 1)
        
        usage_list = []
        async for usage_doc in cursor:
            usage = Usage(
                sim_id=usage_doc["sim_id"],
                timestamp=usage_doc["timestamp"],
                mb_used=usage_doc["mb_used"],
                roaming_mb=usage_doc.get("roaming_mb", 0)
            )
            usage_list.append(usage)
        
        return usage_list
    
    async def get_sim_by_id(self, sim_id: str) -> Optional[SimCard]:
        """
        SIM kartı ID'ye göre bulur
        """
        collection = self.db.get_collection("sims")
        sim_doc = await collection.find_one({"sim_id": sim_id})
        
        if sim_doc:
            return SimCard(**sim_doc)
        return None
    
    async def get_device_profile(self, device_type: str) -> Optional[DeviceProfile]:
        """
        Cihaz profilini döndürür
        """
        collection = self.db.get_collection("device_profiles")
        profile_doc = await collection.find_one({"device_type": device_type})
        
        if profile_doc:
            return DeviceProfile(**profile_doc)
        return None
    
    async def get_plan_by_id(self, plan_id: str) -> Optional[IoTPlan]:
        """
        Plan bilgilerini döndürür
        """
        collection = self.db.get_collection("iot_plans")
        plan_doc = await collection.find_one({"plan_id": plan_id})
        
        if plan_doc:
            return IoTPlan(**plan_doc)
        return None
    
    async def get_available_plans(self, apn: str) -> List[IoTPlan]:
        """
        APN'e uygun planları döndürür
        """
        collection = self.db.get_collection("iot_plans")
        cursor = collection.find({"apn": apn})
        
        plans = []
        async for plan_doc in cursor:
            plans.append(IoTPlan(**plan_doc))
        
        return plans
    
    async def get_available_addons(self, apn: str) -> List[AddOnPack]:
        """
        APN'e uygun ek paketleri döndürür
        """
        collection = self.db.get_collection("add_on_packs")
        cursor = collection.find({"apn": apn})
        
        addons = []
        async for addon_doc in cursor:
            addons.append(AddOnPack(**addon_doc))
        
        return addons
    
    async def save_anomaly(self, anomaly: Anomaly) -> str:
        """
        Anomaliyi veritabanına kaydeder
        """
        collection = self.db.get_collection("anomalies")
        anomaly_dict = anomaly.dict()
        anomaly_dict["anomaly_id"] = str(uuid.uuid4())
        
        result = await collection.insert_one(anomaly_dict)
        return anomaly_dict["anomaly_id"]
    
    async def get_sim_anomalies(self, sim_id: str, days: int = 30) -> List[Anomaly]:
        """
        SIM'in anomalilerini döndürür
        """
        collection = self.db.get_collection("anomalies")
        start_date = datetime.now() - timedelta(days=days)
        
        cursor = collection.find({
            "sim_id": sim_id,
            "detected_at": {"$gte": start_date}
        }).sort("detected_at", -1)
        
        anomalies = []
        async for anomaly_doc in cursor:
            anomalies.append(Anomaly(**anomaly_doc))
        
        return anomalies
    
    async def get_latest_anomalies(self, sim_id: str, limit: int = 10) -> List[Anomaly]:
        """
        SIM'in en son anomalilerini döndürür
        """
        collection = self.db.get_collection("anomalies")
        
        cursor = collection.find({
            "sim_id": sim_id
        }).sort("detected_at", -1).limit(limit)
        
        anomalies = []
        async for anomaly_doc in cursor:
            try:
                # dict'i Anomaly modeline çevir
                anomaly = Anomaly(**anomaly_doc)
                anomalies.append(anomaly)
            except Exception as e:
                # Eğer model dönüşümü başarısız olursa basit bir anomaly objesi oluştur
                anomaly = type('SimpleAnomaly', (), {
                    'type': anomaly_doc.get('type', 'unknown'),
                    'detected_at': anomaly_doc.get('detected_at', datetime.now()),
                    'reason': anomaly_doc.get('reason', 'Detay bilgi yok'),
                    'evidence': anomaly_doc.get('evidence', {}),
                    'sim_id': anomaly_doc.get('sim_id', sim_id)
                })()
                anomalies.append(anomaly)
        
        return anomalies
    
    async def create_action_log(self, sim_ids: List[str], action: str, 
                              reason: str, actor: str = "system") -> List[str]:
        """
        Eylem logları oluşturur
        """
        collection = self.db.get_collection("actions_log")
        action_ids = []
        
        for sim_id in sim_ids:
            action_id = f"A-{str(uuid.uuid4())[:8]}"
            action_log = ActionLog(
                action_id=action_id,
                sim_id=sim_id,
                action=action,
                reason=reason,
                created_at=datetime.now(),
                actor=actor,
                status="created"
            )
            
            await collection.insert_one(action_log.dict())
            action_ids.append(action_id)
        
        return action_ids
    
    async def update_sim_risk_score(self, sim_id: str, risk_score: int, 
                                  anomaly_count: int):
        """
        SIM'in risk skorunu günceller
        """
        collection = self.db.get_collection("sims")
        await collection.update_one(
            {"sim_id": sim_id},
            {
                "$set": {
                    "risk_score": risk_score,
                    "anomaly_count": anomaly_count,
                    "last_analyzed": datetime.now()
                }
            }
        )
    
    async def get_filtered_sims(self, risk_level: str = None, 
                              has_roaming: bool = None) -> List[FleetResponse]:
        """
        Filtrelenmiş SIM listesi döndürür
        """
        collection = self.db.get_collection("sims")
        query = {}
        
        if risk_level:
            if risk_level == "red":
                query["risk_score"] = {"$gte": 70}
            elif risk_level == "orange":
                query["risk_score"] = {"$gte": 40, "$lt": 70}
            elif risk_level == "green":
                query["risk_score"] = {"$lt": 40}
        
        cursor = collection.find(query)
        sims = []
        
        async for sim_doc in cursor:
            # Roaming filtresi için usage kontrolü gerekebilir
            if has_roaming is not None:
                # Son 7 günde roaming kullanımı var mı?
                usage_collection = self.db.get_collection("usage")
                start_date = datetime.now() - timedelta(days=7)
                roaming_usage = await usage_collection.find_one({
                    "sim_id": sim_doc["sim_id"],
                    "timestamp": {"$gte": start_date},
                    "roaming_mb": {"$gt": 0}
                })
                
                if has_roaming and not roaming_usage:
                    continue
                if not has_roaming and roaming_usage:
                    continue
            
            risk_level_enum = anomaly_detector.get_risk_level(sim_doc.get("risk_score", 0))
            
            fleet_item = FleetResponse(
                sim_id=sim_doc["sim_id"],
                device_type=sim_doc["device_type"],
                apn=sim_doc["apn"],
                plan=sim_doc["plan_id"],
                status=sim_doc["status"],
                city=sim_doc["city"],
                risk_score=sim_doc.get("risk_score", 0),
                risk_level=risk_level_enum,
                last_seen_at=sim_doc.get("last_seen_at"),
                anomaly_count=sim_doc.get("anomaly_count", 0)
            )
            sims.append(fleet_item)
        
        return sims

# Global IoT servisi
iot_service = IoTService()
