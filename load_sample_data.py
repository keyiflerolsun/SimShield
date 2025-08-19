#!/usr/bin/env python3
# Bu araç @keyiflerolsun tarafından | CodeNight için yazılmıştır.

"""
IoT SIM Filosu için örnek verileri MongoDB'ye yükler
"""

import asyncio
import os
import time
from datetime import datetime, timedelta
from motor.motor_asyncio import AsyncIOMotorClient
import random
import logging
from Settings import AYAR

# Logging yapılandırması
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# Örnek veriler - Genişletilmiş veri seti
SIMS_DATA = [
    {"sim_id": "2001", "customer_id": "9001", "device_type": "POS", "apn": "apn-iot", "plan_id": "11", "status": "active", "city": "Istanbul"},
    {"sim_id": "2002", "customer_id": "9001", "device_type": "SmartMeter", "apn": "apn-iot", "plan_id": "11", "status": "active", "city": "Ankara"},
    {"sim_id": "2003", "customer_id": "9001", "device_type": "Tracker", "apn": "apn-iot", "plan_id": "12", "status": "active", "city": "Izmir"},
    {"sim_id": "2004", "customer_id": "9001", "device_type": "Camera", "apn": "apn-video", "plan_id": "13", "status": "active", "city": "Bursa"},
    {"sim_id": "2005", "customer_id": "9001", "device_type": "Sensor", "apn": "apn-iot", "plan_id": "11", "status": "blocked", "city": "Antalya"},
    {"sim_id": "2006", "customer_id": "9002", "device_type": "POS", "apn": "apn-iot", "plan_id": "12", "status": "active", "city": "Adana"},
    {"sim_id": "2007", "customer_id": "9002", "device_type": "Tracker", "apn": "apn-iot", "plan_id": "11", "status": "active", "city": "Gaziantep"},
    {"sim_id": "2008", "customer_id": "9003", "device_type": "Camera", "apn": "apn-video", "plan_id": "13", "status": "active", "city": "Konya"},
    {"sim_id": "2009", "customer_id": "9003", "device_type": "SmartMeter", "apn": "apn-iot", "plan_id": "11", "status": "active", "city": "Mersin"},
    {"sim_id": "2010", "customer_id": "9004", "device_type": "Sensor", "apn": "apn-iot", "plan_id": "12", "status": "active", "city": "Eskisehir"},
    {"sim_id": "2011", "customer_id": "9004", "device_type": "POS", "apn": "apn-iot", "plan_id": "11", "status": "suspended", "city": "Samsun"},
    {"sim_id": "2012", "customer_id": "9005", "device_type": "Tracker", "apn": "apn-iot", "plan_id": "12", "status": "active", "city": "Trabzon"},
    {"sim_id": "2013", "customer_id": "9005", "device_type": "Camera", "apn": "apn-video", "plan_id": "13", "status": "active", "city": "Diyarbakir"},
    {"sim_id": "2014", "customer_id": "9006", "device_type": "SmartMeter", "apn": "apn-iot", "plan_id": "11", "status": "active", "city": "Malatya"},
    {"sim_id": "2015", "customer_id": "9006", "device_type": "Sensor", "apn": "apn-iot", "plan_id": "11", "status": "active", "city": "Van"},
]

CUSTOMERS_DATA = [
    {"customer_id": "9001", "company_name": "TechnoMart AŞ", "contact_email": "teknik@technomart.com.tr", "sector": "Retail"},
    {"customer_id": "9002", "company_name": "Güney Lojistik Ltd", "contact_email": "operasyon@guneylojistik.com", "sector": "Logistics"},
    {"customer_id": "9003", "company_name": "Akıllı Şehir Teknolojileri", "contact_email": "destek@akillisehir.gov.tr", "sector": "Municipality"},
    {"customer_id": "9004", "company_name": "Enerji İzleme Sistemleri", "contact_email": "sistem@energiizleme.com", "sector": "Energy"},
    {"customer_id": "9005", "company_name": "Güvenlik Kamera Sistemleri", "contact_email": "teknik@guvenlikkamera.com", "sector": "Security"},
    {"customer_id": "9006", "company_name": "Çevre İzleme Merkezi", "contact_email": "veri@cevreizleme.org", "sector": "Environment"},
]

IOT_PLANS_DATA = [
    {"plan_id": "11", "plan_name": "IoT Basic 500MB", "monthly_quota_mb": 500, "monthly_price": 39.9, "overage_per_mb": 0.20, "apn": "apn-iot"},
    {"plan_id": "12", "plan_name": "IoT Plus 2GB", "monthly_quota_mb": 2048, "monthly_price": 79.9, "overage_per_mb": 0.15, "apn": "apn-iot"},
    {"plan_id": "13", "plan_name": "Video Cam 10GB", "monthly_quota_mb": 10240, "monthly_price": 129.9, "overage_per_mb": 0.10, "apn": "apn-video"},
    {"plan_id": "14", "plan_name": "IoT Enterprise 5GB", "monthly_quota_mb": 5120, "monthly_price": 159.9, "overage_per_mb": 0.12, "apn": "apn-iot"},
    {"plan_id": "15", "plan_name": "IoT Micro 100MB", "monthly_quota_mb": 100, "monthly_price": 19.9, "overage_per_mb": 0.25, "apn": "apn-iot"},
]

DEVICE_PROFILES_DATA = [
    {"device_type": "POS", "expected_daily_mb_min": 5, "expected_daily_mb_max": 25, "roaming_expected": False},
    {"device_type": "SmartMeter", "expected_daily_mb_min": 1, "expected_daily_mb_max": 10, "roaming_expected": False},
    {"device_type": "Tracker", "expected_daily_mb_min": 10, "expected_daily_mb_max": 60, "roaming_expected": True},
    {"device_type": "Camera", "expected_daily_mb_min": 200, "expected_daily_mb_max": 800, "roaming_expected": False},
    {"device_type": "Sensor", "expected_daily_mb_min": 1, "expected_daily_mb_max": 5, "roaming_expected": False},
]

ADD_ON_PACKS_DATA = [
    {"addon_id": "701", "name": "IoT +200MB", "extra_mb": 200, "price": 12.9, "apn": "apn-iot"},
    {"addon_id": "702", "name": "Video +2GB", "extra_mb": 2048, "price": 19.9, "apn": "apn-video"},
    {"addon_id": "703", "name": "IoT +500MB", "extra_mb": 500, "price": 24.9, "apn": "apn-iot"},
    {"addon_id": "704", "name": "IoT +1GB", "extra_mb": 1024, "price": 39.9, "apn": "apn-iot"},
    {"addon_id": "705", "name": "Video +5GB", "extra_mb": 5120, "price": 49.9, "apn": "apn-video"},
]

# Örnek eylem logları
ACTIONS_LOG_DATA = [
    {
        "action_id": "A-001", 
        "sim_id": "2001", 
        "action": "freeze_24h", 
        "reason": "sudden_spike", 
        "created_at": datetime.now() - timedelta(days=2), 
        "actor": "system", 
        "status": "completed"
    },
    {
        "action_id": "A-002", 
        "sim_id": "2004", 
        "action": "throttle", 
        "reason": "unexpected_roaming", 
        "created_at": datetime.now() - timedelta(days=1), 
        "actor": "operator", 
        "status": "completed"
    },
    {
        "action_id": "A-003", 
        "sim_id": "2003", 
        "action": "notify", 
        "reason": "inactivity", 
        "created_at": datetime.now() - timedelta(hours=6), 
        "actor": "system", 
        "status": "pending"
    },
]

async def wait_for_mongodb(max_retries=30, retry_interval=2):
    """MongoDB'nin hazır olmasını bekler"""
    retries = 0
    while retries < max_retries:
        try:
            # Çevre değişkeninden URI'yi al, yoksa AYAR'dan al
            mongodb_uri = os.environ.get('MONGODB_URI', AYAR["DATABASE"]["MONGODB"]["URI"])
            client = AsyncIOMotorClient(mongodb_uri)
            
            # Bağlantıyı test et
            await client.admin.command('ping')
            logger.info("✅ MongoDB bağlantısı başarılı!")
            client.close()
            return True
        except Exception as e:
            retries += 1
            logger.warning(f"⏳ MongoDB bekleniyor... ({retries}/{max_retries}) - Hata: {e}")
            await asyncio.sleep(retry_interval)
    
    logger.error("❌ MongoDB bağlantısı kurulamadı!")
    return False

async def wait_for_redis(max_retries=30, retry_interval=2):
    """Redis'in hazır olmasını bekler"""
    retries = 0
    while retries < max_retries:
        try:
            import redis.asyncio as redis
            
            # Çevre değişkenlerinden Redis bilgilerini al
            redis_host = os.environ.get('REDIS_HOST', AYAR["DATABASE"]["REDIS"]["HOST"])
            redis_port = int(os.environ.get('REDIS_PORT', AYAR["DATABASE"]["REDIS"]["PORT"]))
            
            redis_client = redis.Redis(host=redis_host, port=redis_port, db=0)
            await redis_client.ping()
            logger.info("✅ Redis bağlantısı başarılı!")
            await redis_client.aclose()
            return True
        except Exception as e:
            retries += 1
            logger.warning(f"⏳ Redis bekleniyor... ({retries}/{max_retries}) - Hata: {e}")
            await asyncio.sleep(retry_interval)
    
    logger.error("❌ Redis bağlantısı kurulamadı!")
    return False

async def generate_usage_data():
    """30 günlük kullanım verisi oluşturur - Geliştirilmiş anomali senaryoları ile"""
    usage_data = []
    base_date = datetime.now() - timedelta(days=30)
    
    # Her SIM için farklı anomali senaryoları
    anomaly_scenarios = {
        "2001": {"type": "spike", "day": 15, "factor": 10},  # Sudden spike
        "2002": {"type": "drain", "start_day": 18, "duration": 5, "factor": 2.5},  # Sustained drain
        "2003": {"type": "inactivity", "start_day": 20, "duration": 8},  # Inactivity
        "2004": {"type": "roaming", "day": 22, "roaming_mb": 120},  # Unexpected roaming
        "2006": {"type": "spike", "day": 25, "factor": 8},  # Another spike
        "2008": {"type": "drain", "start_day": 12, "duration": 4, "factor": 3},  # Camera drain
        "2012": {"type": "roaming", "day": 10, "roaming_mb": 200},  # Tracker roaming (expected)
    }
    
    for sim in SIMS_DATA:
        sim_id = sim["sim_id"]
        device_type = sim["device_type"]
        
        # Cihaz profilini bul
        profile = next(p for p in DEVICE_PROFILES_DATA if p["device_type"] == device_type)
        min_mb = profile["expected_daily_mb_min"]
        max_mb = profile["expected_daily_mb_max"]
        
        # Son 7 günün ortalamasını hesaplamak için geçici liste
        daily_usage = []
        
        for day in range(30):
            current_date = base_date + timedelta(days=day)
            
            # Normal kullanım (biraz varyasyon ekle)
            base_usage = random.uniform(min_mb, max_mb)
            # Haftalık pattern ekle (hafta sonu daha az kullanım)
            if current_date.weekday() >= 5:  # Hafta sonu
                base_usage *= 0.7
            
            mb_used = base_usage
            roaming_mb = 0
            
            # Anomali senaryolarını uygula
            if sim_id in anomaly_scenarios:
                scenario = anomaly_scenarios[sim_id]
                
                if scenario["type"] == "spike" and day == scenario["day"]:
                    mb_used = base_usage * scenario["factor"]
                    logger.info(f"🚨 Spike anomalisi oluşturuldu: SIM {sim_id}, Gün {day}, {mb_used:.2f} MB")
                
                elif scenario["type"] == "drain":
                    if scenario["start_day"] <= day < scenario["start_day"] + scenario["duration"]:
                        mb_used = base_usage * scenario["factor"]
                        if day == scenario["start_day"]:
                            logger.info(f"🚨 Drain anomalisi başladı: SIM {sim_id}, {scenario['duration']} gün sürecek")
                
                elif scenario["type"] == "inactivity":
                    if scenario["start_day"] <= day < scenario["start_day"] + scenario["duration"]:
                        mb_used = 0
                        if day == scenario["start_day"]:
                            logger.info(f"🚨 Inactivity anomalisi başladı: SIM {sim_id}, {scenario['duration']} gün sürecek")
                
                elif scenario["type"] == "roaming" and day == scenario["day"]:
                    roaming_mb = scenario["roaming_mb"]
                    mb_used = base_usage + roaming_mb * 0.3  # Roaming kullanımı da normal kullanımı artırır
                    # Tracker'lar için roaming normal, diğerleri için anomali
                    if device_type != "Tracker":
                        logger.info(f"🚨 Unexpected roaming anomalisi: SIM {sim_id}, {roaming_mb} MB roaming")
            
            # Rastgele küçük varyasyonlar ekle
            mb_used *= random.uniform(0.9, 1.1)
            roaming_mb *= random.uniform(0.9, 1.1) if roaming_mb > 0 else 0
            
            usage_entry = {
                "sim_id": sim_id,
                "timestamp": current_date,
                "mb_used": round(max(0, mb_used), 2),
                "roaming_mb": round(max(0, roaming_mb), 2),
                "cost": 0.0,  # Maliyet hesaplaması için placeholder
                "overage": 0.0
            }
            
            daily_usage.append(mb_used)
            usage_data.append(usage_entry)
    
    logger.info(f"📊 {len(usage_data)} kullanım kaydı oluşturuldu")
    return usage_data

async def calculate_risk_scores():
    """Risk skorlarını hesaplar ve SIM verilerini günceller"""
    try:
        mongodb_uri = os.environ.get('MONGODB_URI', AYAR["DATABASE"]["MONGODB"]["URI"])
        client = AsyncIOMotorClient(mongodb_uri)
        db = client[AYAR["DATABASE"]["MONGODB"]["NAME"]]
        
        sims_collection = db["sims"]
        usage_collection = db["usage"]
        
        for sim in SIMS_DATA:
            sim_id = sim["sim_id"]
            
            # Son 30 günlük kullanımı al
            usage_cursor = usage_collection.find(
                {"sim_id": sim_id}
            ).sort("timestamp", -1).limit(30)
            
            usage_data = await usage_cursor.to_list(length=30)
            
            if len(usage_data) < 7:
                continue
            
            # Son 7 günün ortalamasını hesapla
            recent_usage = [u["mb_used"] for u in usage_data[:7]]
            avg_usage = sum(recent_usage) / len(recent_usage)
            
            # Anomalileri tespit et
            risk_score = 0
            anomalies = []
            
            # Spike kontrolü
            for usage in usage_data[:3]:  # Son 3 gün
                if usage["mb_used"] > avg_usage * 2.5:
                    risk_score += 40
                    anomalies.append("sudden_spike")
                    break
            
            # Drain kontrolü (3 gün üst üste yüksek kullanım)
            if len([u for u in usage_data[:3] if u["mb_used"] > avg_usage * 1.5]) >= 3:
                risk_score += 30
                anomalies.append("sustained_drain")
            
            # Inactivity kontrolü
            if len([u for u in usage_data[:2] if u["mb_used"] == 0]) >= 2:
                risk_score += 20
                anomalies.append("inactivity")
            
            # Roaming kontrolü
            for usage in usage_data[:7]:
                if usage["roaming_mb"] > 20:
                    device_profile = next((p for p in DEVICE_PROFILES_DATA if p["device_type"] == sim["device_type"]), None)
                    if device_profile and not device_profile["roaming_expected"]:
                        risk_score += 40
                        anomalies.append("unexpected_roaming")
                        break
            
            # Risk skorunu güncelle
            risk_score = min(risk_score, 100)
            
            await sims_collection.update_one(
                {"sim_id": sim_id},
                {
                    "$set": {
                        "risk_score": risk_score,
                        "anomaly_count": len(set(anomalies)),
                        "anomalies": list(set(anomalies)),
                        "last_analysis": datetime.now()
                    }
                }
            )
        
        logger.info("✅ Risk skorları hesaplandı ve güncellendi")
        client.close()
        
    except Exception as e:
        logger.error(f"❌ Risk skoru hesaplama hatası: {e}")

async def load_sample_data():
    """Örnek verileri MongoDB'ye yükler"""
    try:
        # Servislerin hazır olmasını bekle
        logger.info("🔄 Servislerin hazır olması bekleniyor...")
        
        if not await wait_for_mongodb():
            raise Exception("MongoDB bağlantısı kurulamadı")
        
        if not await wait_for_redis():
            raise Exception("Redis bağlantısı kurulamadı")
        
        # MongoDB bağlantısı
        mongodb_uri = os.environ.get('MONGODB_URI', AYAR["DATABASE"]["MONGODB"]["URI"])
        client = AsyncIOMotorClient(mongodb_uri)
        db = client[AYAR["DATABASE"]["MONGODB"]["NAME"]]
        
        logger.info("🔄 Örnek veriler yükleniyor...")
        
        # Müşteriler
        customers_collection = db["customers"]
        await customers_collection.delete_many({})
        await customers_collection.insert_many(CUSTOMERS_DATA)
        logger.info(f"✅ {len(CUSTOMERS_DATA)} müşteri yüklendi")
        
        # SIM kartları
        sims_collection = db["sims"]
        await sims_collection.delete_many({})
        
        for sim in SIMS_DATA:
            sim["risk_score"] = 0
            sim["anomaly_count"] = 0
            sim["anomalies"] = []
            sim["last_seen_at"] = datetime.now() - timedelta(hours=random.randint(1, 24))
            sim["created_at"] = datetime.now() - timedelta(days=random.randint(30, 365))
        
        await sims_collection.insert_many(SIMS_DATA)
        logger.info(f"✅ {len(SIMS_DATA)} SIM kartı yüklendi")
        
        # IoT Planları
        plans_collection = db["iot_plans"]
        await plans_collection.delete_many({})
        await plans_collection.insert_many(IOT_PLANS_DATA)
        logger.info(f"✅ {len(IOT_PLANS_DATA)} IoT planı yüklendi")
        
        # Cihaz Profilleri
        profiles_collection = db["device_profiles"]
        await profiles_collection.delete_many({})
        await profiles_collection.insert_many(DEVICE_PROFILES_DATA)
        logger.info(f"✅ {len(DEVICE_PROFILES_DATA)} cihaz profili yüklendi")
        
        # Ek Paketler
        addons_collection = db["add_on_packs"]
        await addons_collection.delete_many({})
        await addons_collection.insert_many(ADD_ON_PACKS_DATA)
        logger.info(f"✅ {len(ADD_ON_PACKS_DATA)} ek paket yüklendi")
        
        # Eylem Logları
        actions_collection = db["actions_log"]
        await actions_collection.delete_many({})
        await actions_collection.insert_many(ACTIONS_LOG_DATA)
        logger.info(f"✅ {len(ACTIONS_LOG_DATA)} eylem logu yüklendi")
        
        # Kullanım Verileri
        usage_collection = db["usage"]
        await usage_collection.delete_many({})
        usage_data = await generate_usage_data()
        
        # Büyük veri setini chunk'lara bölerek insert et
        chunk_size = 100
        for i in range(0, len(usage_data), chunk_size):
            chunk = usage_data[i:i + chunk_size]
            await usage_collection.insert_many(chunk)
        
        logger.info(f"✅ {len(usage_data)} kullanım kaydı yüklendi")
        
        # İndeksler oluştur
        logger.info("🔄 Veritabanı indeksleri oluşturuluyor...")
        
        await sims_collection.create_index("sim_id", unique=True)
        await sims_collection.create_index("customer_id")
        await sims_collection.create_index("status")
        await sims_collection.create_index("risk_score")
        
        await usage_collection.create_index([("sim_id", 1), ("timestamp", -1)])
        await usage_collection.create_index("timestamp")
        
        await customers_collection.create_index("customer_id", unique=True)
        await plans_collection.create_index("plan_id", unique=True)
        await actions_collection.create_index("sim_id")
        await actions_collection.create_index("created_at")
        
        logger.info("✅ Veritabanı indeksleri oluşturuldu")
        
        # Risk skorlarını hesapla
        logger.info("🔄 Risk skorları hesaplanıyor...")
        await calculate_risk_scores()
        
        # Cache'i başlat (Redis)
        try:
            import redis.asyncio as redis
            redis_host = os.environ.get('REDIS_HOST', AYAR["DATABASE"]["REDIS"]["HOST"])
            redis_port = int(os.environ.get('REDIS_PORT', AYAR["DATABASE"]["REDIS"]["PORT"]))
            
            redis_client = redis.Redis(host=redis_host, port=redis_port, db=0)
            
            # Cache'e bazı temel verileri yükle
            await redis_client.set("data_loaded", "true", ex=3600)  # 1 saat
            await redis_client.set("last_data_load", datetime.now().isoformat(), ex=3600)
            
            logger.info("✅ Redis cache başlatıldı")
            await redis_client.aclose()
            
        except Exception as e:
            logger.warning(f"⚠️ Redis cache başlatılamadı: {e}")
        
        logger.info("\n🎉 Tüm örnek veriler başarıyla yüklendi!")
        logger.info("📊 Dashboard URL: http://127.0.0.1:3310")
        logger.info("🔗 API Docs: http://127.0.0.1:3310/api/v1/docs")
        logger.info("📈 Analytics: http://127.0.0.1:3310/api/v1/fleet")
        
        # Veri özeti
        logger.info(f"\n📋 Yüklenen Veri Özeti:")
        logger.info(f"   • {len(CUSTOMERS_DATA)} Müşteri")
        logger.info(f"   • {len(SIMS_DATA)} SIM Kartı")
        logger.info(f"   • {len(IOT_PLANS_DATA)} IoT Planı")
        logger.info(f"   • {len(usage_data)} Kullanım Kaydı (30 gün)")
        logger.info(f"   • {len(ACTIONS_LOG_DATA)} Eylem Logu")
        
        client.close()
        
    except Exception as e:
        logger.error(f"❌ Veri yükleme hatası: {e}")
        raise

if __name__ == "__main__":
    asyncio.run(load_sample_data())
