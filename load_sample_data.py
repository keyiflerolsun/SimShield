#!/usr/bin/env python3
# Bu araç @keyiflerolsun tarafından | CodeNight için yazılmıştır.

"""
IoT SIM Filosu için örnek verileri JSON dosyalarından okuyarak MongoDB'ye yükler
Sadece veri yükleme işlemi yapar, anomali analizi arayüz üzerinden çalıştırılır.
"""

import asyncio
import os
import json
from pathlib import Path
from datetime import datetime, timedelta
from motor.motor_asyncio import AsyncIOMotorClient
import random
import logging
from Settings import AYAR

# Logging yapılandırması
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# JSON dosyalarının bulunduğu dizin
SAMPLE_DATA_DIR = Path(__file__).parent / "sample_datas"

def load_json_file(filename):
    """JSON dosyasını yükler"""
    file_path = SAMPLE_DATA_DIR / filename
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            data = json.load(f)
            logger.info(f"✅ {filename} yüklendi ({len(data) if isinstance(data, list) else 'object'} kayıt)")
            return data
    except FileNotFoundError:
        logger.error(f"❌ Dosya bulunamadı: {file_path}")
        raise
    except json.JSONDecodeError as e:
        logger.error(f"❌ JSON parse hatası {filename}: {e}")
        raise
    except Exception as e:
        logger.error(f"❌ Dosya okuma hatası {filename}: {e}")
        raise

async def wait_for_mongodb(max_retries=30, retry_interval=2):
    """MongoDB'nin hazır olmasını bekler"""
    retries = 0
    while retries < max_retries:
        try:
            mongodb_uri = os.environ.get('MONGODB_URI', AYAR["DATABASE"]["MONGODB"]["URI"])
            client = AsyncIOMotorClient(mongodb_uri)
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

def prepare_actions_log_data():
    """Eylem logları verilerini hazırlar (tarih hesaplamaları ile)"""
    actions_data = load_json_file("actions_log.json")
    
    for action in actions_data:
        if "days_ago" in action:
            action["created_at"] = datetime.now() - timedelta(days=action["days_ago"])
            del action["days_ago"]
        elif "hours_ago" in action:
            action["created_at"] = datetime.now() - timedelta(hours=action["hours_ago"])
            del action["hours_ago"]
        else:
            action["created_at"] = datetime.now()
    
    return actions_data

async def generate_usage_data():
    """30 günlük kullanım verisi oluşturur - Normal kullanım + çeşitli anomali senaryoları ile"""
    usage_data = []
    base_date = datetime.now() - timedelta(days=30)
    
    # JSON dosyalarından verileri yükle
    sims_data = load_json_file("sims.json")
    device_profiles_data = load_json_file("device_profiles.json")
    
    # Anomali senaryoları için özel SIM'ler - Çeşitlilik ve farklı risk seviyeleri
    anomaly_scenarios = {
        # YÜKSEK RİSKLİ ANOMALILER (Risk: 80-100)
        "2001": {"type": "critical_usage_spike", "day": 25, "intensity": "extreme"},     # Kritik ani kullanım artışı
        "2002": {"type": "massive_data_drain", "day": 20, "intensity": "extreme"},      # Masif veri tüketimi
        "2003": {"type": "security_breach", "day": 22, "intensity": "extreme"},         # Güvenlik ihlali şüphesi
        
        # ORTA RİSKLİ ANOMALILER (Risk: 40-70)
        "2004": {"type": "sustained_drain", "day": 18, "intensity": "medium"},          # Sürekli yüksek kullanım
        "2005": {"type": "pattern_change", "day": 15, "intensity": "medium"},           # Kullanım kalıbı değişikliği
        "2006": {"type": "unexpected_roaming", "day": 12, "intensity": "medium"},       # Beklenmeyen roaming
        "2007": {"type": "device_malfunction", "day": 10, "intensity": "medium"},       # Cihaz arızası şüphesi
        "2008": {"type": "location_jump", "day": 8, "intensity": "medium"},             # Anormal lokasyon değişimi
        
        # DÜŞÜK RİSKLİ ANOMALILER (Risk: 20-40)
        "2009": {"type": "mild_inactivity", "day": 5, "intensity": "low"},              # Hafif inaktivite
        "2010": {"type": "minor_spike", "day": 14, "intensity": "low"},                 # Küçük kullanım artışı
        "2011": {"type": "cost_anomaly", "day": 16, "intensity": "low"},                # Maliyet anomalisi
        "2012": {"type": "gradual_increase", "day": 19, "intensity": "low"},            # Kademeli artış
        
        # ÇOK DÜŞÜK RİSKLİ (Risk: 10-20)
        "2013": {"type": "minor_variation", "day": 21, "intensity": "minimal"},         # Küçük varyasyon
        "2014": {"type": "weekend_anomaly", "day": 13, "intensity": "minimal"},         # Hafta sonu anomalisi
        
        # KARMA ANOMALILER (Birden fazla anomali türü)
        "2015": {"type": "multi_anomaly", "day": 7, "intensity": "high"},               # Karma anomali
        "2016": {"type": "progressive_drain", "day": 11, "intensity": "medium"}         # Kademeli veri tüketimi
    }
    
    for sim in sims_data:
        sim_id = sim["sim_id"]
        device_type = sim["device_type"]
        
        # Cihaz profilini bul
        profile = next((p for p in device_profiles_data if p["device_type"] == device_type), None)
        if not profile:
            logger.warning(f"⚠️ {device_type} için profil bulunamadı, varsayılan değerler kullanılıyor")
            min_mb = 1
            max_mb = 10
        else:
            min_mb = profile["expected_daily_mb_min"]
            max_mb = profile["expected_daily_mb_max"]
        
        # Bu SIM için anomali senaryosu var mı?
        anomaly_scenario = anomaly_scenarios.get(sim_id)
        
        for day in range(30):
            current_date = base_date + timedelta(days=day)
            
            # Normal kullanım (biraz varyasyon ekle)
            base_usage = random.uniform(min_mb, max_mb)
            
            # Haftalık pattern ekle (hafta sonu daha az kullanım)
            if current_date.weekday() >= 5:  # Hafta sonu
                base_usage *= 0.7
            
            # Günlük saatlik pattern ekle (gündüz daha aktif)
            hour_factor = 1.0
            current_hour = random.randint(0, 23)  # Rastgele bir saat simüle et
            if 6 <= current_hour <= 22:  # Gündüz saatleri
                hour_factor = 1.2
            else:  # Gece saatleri
                hour_factor = 0.6
            
            base_usage *= hour_factor
            
            # Rastgele küçük varyasyonlar ekle
            mb_used = base_usage * random.uniform(0.8, 1.2)
            
            # Anomali senaryolarını uygula
            if anomaly_scenario and day >= anomaly_scenario["day"]:
                anomaly_type = anomaly_scenario["type"]
                intensity = anomaly_scenario["intensity"]
                
                if anomaly_type == "critical_usage_spike":
                    # Kritik ani kullanım artışı (çok yüksek risk)
                    if day >= 25:
                        mb_used *= random.uniform(15, 25)  # 15-25x normal kullanım
                        
                elif anomaly_type == "massive_data_drain":
                    # Masif veri tüketimi (sürekli çok yüksek)
                    if day >= 20:
                        mb_used *= random.uniform(10, 18)  # 10-18x normal kullanım
                        
                elif anomaly_type == "security_breach":
                    # Güvenlik ihlali şüphesi (anormal pattern)
                    if day >= 22:
                        # Gece saatlerinde çok yüksek kullanım
                        if current_hour < 6 or current_hour > 22:
                            mb_used *= random.uniform(12, 20)
                        else:
                            mb_used *= random.uniform(3, 6)
                            
                elif anomaly_type == "sustained_drain":
                    # Sürekli yüksek kullanım (orta risk)
                    if day >= 18:
                        mb_used *= random.uniform(4, 7)  # 4-7x normal kullanım
                        
                elif anomaly_type == "pattern_change":
                    # Kullanım kalıbı değişikliği (gece kullanımı)
                    if day >= 15:
                        if current_hour < 6:  # Gece saatleri
                            mb_used *= random.uniform(5, 10)
                        elif 6 <= current_hour <= 12:  # Sabah saatleri
                            mb_used *= 0.2  # Çok düşük
                        else:
                            mb_used *= random.uniform(2, 4)
                            
                elif anomaly_type == "unexpected_roaming":
                    # Beklenmeyen roaming
                    if day >= 12:
                        mb_used *= random.uniform(2, 4)
                        
                elif anomaly_type == "device_malfunction":
                    # Cihaz arızası şüphesi (düzensiz kullanım)
                    if day >= 10:
                        if random.random() < 0.3:  # %30 ihtimal çok yüksek
                            mb_used *= random.uniform(8, 15)
                        elif random.random() < 0.3:  # %30 ihtimal çok düşük
                            mb_used *= 0.1
                        else:
                            mb_used *= random.uniform(1.5, 3)
                            
                elif anomaly_type == "location_jump":
                    # Anormal lokasyon değişimi (roaming ile birlikte)
                    if day >= 8:
                        mb_used *= random.uniform(3, 6)
                        
                elif anomaly_type == "mild_inactivity":
                    # Hafif inaktivite (düşük risk)
                    if day >= 5:
                        if random.random() < 0.7:  # %70 ihtimal inaktif
                            mb_used = 0
                        else:
                            mb_used *= 0.3
                            
                elif anomaly_type == "minor_spike":
                    # Küçük kullanım artışı
                    if day >= 14:
                        mb_used *= random.uniform(2, 4)
                        
                elif anomaly_type == "cost_anomaly":
                    # Maliyet anomalisi (normal kullanım ama yüksek maliyet)
                    if day >= 16:
                        mb_used *= random.uniform(1.5, 2.5)
                        
                elif anomaly_type == "gradual_increase":
                    # Kademeli artış
                    if day >= 19:
                        days_since_start = day - 19
                        multiplier = 1 + (days_since_start * 0.5)  # Her gün %50 artış
                        mb_used *= multiplier
                        
                elif anomaly_type == "minor_variation":
                    # Küçük varyasyon (çok düşük risk)
                    if day >= 21:
                        mb_used *= random.uniform(1.3, 1.8)
                        
                elif anomaly_type == "weekend_anomaly":
                    # Hafta sonu anomalisi
                    if day >= 13 and current_date.weekday() >= 5:  # Hafta sonu
                        mb_used *= random.uniform(3, 6)
                        
                elif anomaly_type == "multi_anomaly":
                    # Karma anomali (birden fazla problem)
                    if day >= 7:
                        # Hem yüksek kullanım hem de pattern değişikliği
                        if current_hour < 6:  # Gece
                            mb_used *= random.uniform(8, 15)
                        else:
                            mb_used *= random.uniform(4, 8)
                            
                elif anomaly_type == "progressive_drain":
                    # Kademeli veri tüketimi artışı
                    if day >= 11:
                        days_since_start = day - 11
                        multiplier = 2 + (days_since_start * 0.3)  # Kademeli artış
                        mb_used *= multiplier
            
            # Roaming kullanımı
            roaming_mb = 0
            if anomaly_scenario and day >= anomaly_scenario["day"]:
                anomaly_type = anomaly_scenario["type"]
                
                if anomaly_type == "unexpected_roaming":
                    # Beklenmeyen roaming - yoğun roaming kullanımı
                    roaming_mb = random.uniform(80, 200)  # Çok yüksek roaming
                    
                elif anomaly_type == "location_jump":
                    # Lokasyon değişimi - anormal roaming pattern
                    roaming_mb = random.uniform(100, 300)  # Ekstrem roaming
                    
                elif anomaly_type == "security_breach":
                    # Güvenlik ihlali - şüpheli roaming
                    roaming_mb = random.uniform(50, 150)
                    
                elif anomaly_type == "multi_anomaly":
                    # Karma anomali - roaming da dahil
                    roaming_mb = random.uniform(60, 180)
                    
            elif device_type == "Tracker" and random.random() < 0.1:  # Normal roaming
                roaming_mb = random.uniform(5, 20)
            
            usage_entry = {
                "sim_id": sim_id,
                "timestamp": current_date,
                "mb_used": round(max(0, mb_used), 2),
                "roaming_mb": round(max(0, roaming_mb), 2),
                "cost": 0.0,  # Maliyet hesaplaması için placeholder
                "overage": 0.0
            }
            
            usage_data.append(usage_entry)
    
    logger.info(f"📊 {len(usage_data)} kullanım kaydı oluşturuldu (16 farklı anomali senaryosu dahil - Risk seviyeleri: Düşük/Orta/Yüksek/Kritik)")
    return usage_data

async def load_sample_data():
    """Örnek verileri JSON dosyalarından okuyarak MongoDB'ye yükler"""
    try:
        logger.info("🚀 SimShield Sample Data Loader başlatılıyor...")
        logger.info("🔄 JSON dosyaları kontrol ediliyor...")
        
        # Sample data dizininin varlığını kontrol et
        if not SAMPLE_DATA_DIR.exists():
            raise FileNotFoundError(f"Sample data dizini bulunamadı: {SAMPLE_DATA_DIR}")
        
        logger.info(f"📁 Sample data dizini: {SAMPLE_DATA_DIR.absolute()}")
        
        # JSON dosyalarının varlığını kontrol et
        required_files = [
            "customers.json", "sims.json", "iot_plans.json", 
            "device_profiles.json", "add_on_packs.json", "actions_log.json"
        ]
        
        for file in required_files:
            if not (SAMPLE_DATA_DIR / file).exists():
                raise FileNotFoundError(f"Gerekli JSON dosyası bulunamadı: {file}")
        
        # Servislerin hazır olmasını bekle
        logger.info("🔄 Veritabanı servislerinin hazır olması bekleniyor...")
        
        if not await wait_for_mongodb():
            raise Exception("MongoDB bağlantısı kurulamadı")
        
        if not await wait_for_redis():
            raise Exception("Redis bağlantısı kurulamadı")
        
        # MongoDB bağlantısı
        mongodb_uri = os.environ.get('MONGODB_URI', AYAR["DATABASE"]["MONGODB"]["URI"])
        client = AsyncIOMotorClient(mongodb_uri)
        db = client[AYAR["DATABASE"]["MONGODB"]["NAME"]]
        
        logger.info("📂 JSON dosyalarından örnek veriler yükleniyor...")
        
        # JSON dosyalarını yükle
        customers_data = load_json_file("customers.json")
        sims_data = load_json_file("sims.json")
        iot_plans_data = load_json_file("iot_plans.json")
        device_profiles_data = load_json_file("device_profiles.json")
        add_on_packs_data = load_json_file("add_on_packs.json")
        actions_log_data = prepare_actions_log_data()
        
        # Müşteriler
        logger.info("👥 Müşteri verileri yükleniyor...")
        customers_collection = db["customers"]
        await customers_collection.delete_many({})
        await customers_collection.insert_many(customers_data)
        logger.info(f"✅ {len(customers_data)} müşteri yüklendi")
        
        # SIM kartları
        logger.info("📱 SIM kartları yükleniyor...")
        sims_collection = db["sims"]
        await sims_collection.delete_many({})
        
        for sim in sims_data:
            # Temel alanları ekle
            sim["risk_score"] = 0
            sim["risk_level"] = "green"
            sim["anomaly_count"] = 0
            sim["anomalies"] = []
            sim["last_analysis"] = None
            sim["last_seen_at"] = datetime.now() - timedelta(hours=random.randint(1, 24))
            sim["created_at"] = datetime.now() - timedelta(days=random.randint(30, 365))
            
            # JSON açıklama notlarını temizle
            if "_note" in sim:
                del sim["_note"]
        
        await sims_collection.insert_many(sims_data)
        logger.info(f"✅ {len(sims_data)} SIM kartı yüklendi (Risk skorları sıfır - Analiz için hazır)")
        
        # IoT Planları
        logger.info("📋 IoT planları yükleniyor...")
        plans_collection = db["iot_plans"]
        await plans_collection.delete_many({})
        await plans_collection.insert_many(iot_plans_data)
        logger.info(f"✅ {len(iot_plans_data)} IoT planı yüklendi")
        
        # Cihaz Profilleri
        logger.info("🔧 Cihaz profilleri yükleniyor...")
        profiles_collection = db["device_profiles"]
        await profiles_collection.delete_many({})
        await profiles_collection.insert_many(device_profiles_data)
        logger.info(f"✅ {len(device_profiles_data)} cihaz profili yüklendi")
        
        # Ek Paketler
        logger.info("📦 Ek paketler yükleniyor...")
        addons_collection = db["add_on_packs"]
        await addons_collection.delete_many({})
        await addons_collection.insert_many(add_on_packs_data)
        logger.info(f"✅ {len(add_on_packs_data)} ek paket yüklendi")
        
        # Eylem Logları
        logger.info("📝 Eylem logları yükleniyor...")
        actions_collection = db["actions_log"]
        await actions_collection.delete_many({})
        await actions_collection.insert_many(actions_log_data)
        logger.info(f"✅ {len(actions_log_data)} eylem logu yüklendi")
        
        # Normal Kullanım Verileri
        logger.info("📊 30 günlük normal kullanım verileri oluşturuluyor...")
        usage_collection = db["usage"]
        await usage_collection.delete_many({})
        usage_data = await generate_usage_data()
        
        # Büyük veri setini chunk'lara bölerek insert et
        chunk_size = 100
        for i in range(0, len(usage_data), chunk_size):
            chunk = usage_data[i:i + chunk_size]
            await usage_collection.insert_many(chunk)
        
        logger.info(f"✅ {len(usage_data)} normal kullanım kaydı yüklendi")
        
        # Veritabanı indekslerini oluştur
        logger.info("🔍 Veritabanı indeksleri oluşturuluyor...")
        
        await sims_collection.create_index("sim_id", unique=True)
        await sims_collection.create_index("customer_id")
        await sims_collection.create_index("status")
        await sims_collection.create_index("risk_score")
        await sims_collection.create_index("device_type")
        
        await usage_collection.create_index([("sim_id", 1), ("timestamp", -1)])
        await usage_collection.create_index("timestamp")
        await usage_collection.create_index("sim_id")
        
        await customers_collection.create_index("customer_id", unique=True)
        await plans_collection.create_index("plan_id", unique=True)
        await actions_collection.create_index("sim_id")
        await actions_collection.create_index("created_at")
        
        logger.info("✅ Veritabanı indeksleri oluşturuldu")
        
        # Redis cache'i başlat
        logger.info("🚀 Redis cache başlatılıyor...")
        try:
            import redis.asyncio as redis
            redis_host = os.environ.get('REDIS_HOST', AYAR["DATABASE"]["REDIS"]["HOST"])
            redis_port = int(os.environ.get('REDIS_PORT', AYAR["DATABASE"]["REDIS"]["PORT"]))
            
            redis_client = redis.Redis(host=redis_host, port=redis_port, db=0)
            
            # Cache'e temel verileri yükle
            await redis_client.set("data_loaded", "true", ex=3600)  # 1 saat
            await redis_client.set("last_data_load", datetime.now().isoformat(), ex=3600)
            await redis_client.set("total_sims", str(len(sims_data)), ex=3600)
            await redis_client.set("total_customers", str(len(customers_data)), ex=3600)
            
            logger.info("✅ Redis cache başlatıldı")
            await redis_client.aclose()
            
        except Exception as e:
            logger.warning(f"⚠️ Redis cache başlatılamadı: {e}")
        
        # Başarı mesajları
        logger.info("\n🎉 Tüm örnek veriler JSON dosyalarından başarıyla yüklendi!")
        logger.info("=" * 60)
        logger.info("📊 Dashboard URL: http://127.0.0.1:3310")
        logger.info("🔗 API Docs: http://127.0.0.1:3310/api/v1/docs")
        logger.info("📈 Analytics: http://127.0.0.1:3310/api/v1/fleet")
        logger.info("🔍 Anomali analizi arayüzden 'Tüm SIM'leri Analiz Et' butonu ile çalıştırılabilir")
        logger.info("=" * 60)
        
        # Veri özeti
        logger.info(f"\n📋 Yüklenen Veri Özeti:")
        logger.info(f"   • {len(customers_data)} Müşteri ({len(set(c['sector'] for c in customers_data))} farklı sektör)")
        logger.info(f"   • {len(sims_data)} SIM Kartı (Risk skorları sıfır - Analiz için hazır)")
        logger.info(f"   • {len(iot_plans_data)} IoT Planı")
        logger.info(f"   • {len(usage_data)} Normal Kullanım Kaydı (30 gün)")
        logger.info(f"   • {len(actions_log_data)} Eylem Logu")
        logger.info(f"   • {len(device_profiles_data)} Cihaz Profili")
        logger.info(f"   • {len(add_on_packs_data)} Ek Paket")
        
        # JSON dosya listesi
        logger.info(f"\n📁 Kullanılan JSON Dosyaları:")
        for json_file in SAMPLE_DATA_DIR.glob("*.json"):
            file_size = json_file.stat().st_size
            logger.info(f"   • {json_file.name} ({file_size} bytes)")
        
        # İstatistikler
        device_types = {}
        cities = {}
        for sim in sims_data:
            device_type = sim.get("device_type", "Unknown")
            city = sim.get("city", "Unknown")
            device_types[device_type] = device_types.get(device_type, 0) + 1
            cities[city] = cities.get(city, 0) + 1
        
        logger.info(f"\n📊 SIM Kartı Dağılımı:")
        logger.info(f"   Cihaz Tipleri: {dict(sorted(device_types.items()))}")
        logger.info(f"   Şehirler: {dict(sorted(cities.items()))}")
        
        logger.info(f"\n🚀 Sistem hazır! Anomali analizi için arayüzü kullanın.")
        
        client.close()
        
    except Exception as e:
        logger.error(f"❌ Veri yükleme hatası: {e}")
        raise

if __name__ == "__main__":
    asyncio.run(load_sample_data())