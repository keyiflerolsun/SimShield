# 🛡️ SimShield IoT Fleet Guardian

**Turkcell IoT SIM Filosu Koruyucu** - Anomali Tespiti ve Maliyet Simülatörü

## 📋 Proje Açıklaması

SimShield, POS, sayaç, sensör gibi IoT cihazlarının SIM kartlarını izleyen, anomalileri tespit eden ve maliyet optimizasyonu sağlayan bir sistemdir. SIM kartları bazen aniden veri tüketmeye başlar, beklenmedik roaming yapar ya da tamamen susar. Bu durum hem maliyet hem de operasyon riski doğurur.

## ✨ Özellikler

### 🎯 Temel Özellikler (Tamamlandı)

1. **📊 Akıllı Filo Panosu**
   - SIM listesi: sim_id, cihaz_türü, APN, plan, durum (aktif/engelli), son sinyal zamanı
   - Risk rozeti (yeşil/turuncu/kırmızı) ve anomali sayısı
   - **Tıklanabilir istatistik kartları**: Aktif, Yüksek Risk, Anomali filtresi
   - **Canlı arama ve filtreleme**: Risk seviyesi, durum, şehir bazlı

2. **📈 Zaman Serisi & Anomali Detayı**
   - Seçili SIM için son 30 gün veri: günlük MB kullanımı
   - **İnteraktif grafik**: Tooltips, peak günler, istatistikler
   - **Gerçek zamanlı tarih bilgileri**: İlk aktivasyon ve son aktivite tarihleri
   - Anomali etiketleri:
     - **Sudden Spike**: 24 saatlik tüketim, son 7 gün ortalamasının 2.5x katı
     - **Sustained Drain**: 3+ gün normal üstü tüketim
     - **Inactivity**: 48+ saat hiç veri yok
     - **Unexpected Roaming**: profilinde roaming yokken > 20 MB roaming

3. **🤖 Otomatik Eylem Sistemi**
   - Tek SIM ya da seçili gruba: Geçici engelle, Hız düşür, Uyar
   - **Manuel analiz tetikleme**: Arayüzden tek tıkla analiz
   - Eylem öncesi etki analizi ve loglama

4. **💰 Gelişmiş Maliyet Simülatörü (What-If)**
   - **Senaryo tabanlı simülasyon**: %20 artış, %30 azalış, ani artış, roaming
   - Plan yükselt, ek paket ekle, hiçbir şey yapma seçenekleri
   - Ay sonu tahmini toplam maliyet (aşım dahil)
   - **Detaylı maliyet kırılımı**: Base, aşım, ek paket maliyetleri
   - Top 3 seçeneği en düşük toplam maliyete göre sırala

5. **🚨 Canlı İzleme & Uyarılar**
   - **WebSocket tabanlı gerçek zamanlı uyarılar**
   - **Tıklanabilir anomali uyarıları**: SIM ID'ye tıklayarak otomatik seçim
   - Duplicate anomali önleme (7 günlük pencere)
   - Risk seviyesi değişim bildirimleri

6. **🎛️ Gelişmiş Kullanıcı Arayüzü**
   - **Modern responsive tasarım**: Koyu tema, smooth animasyonlar
   - **Kompakt SIM detayları**: Grid layout, optimized badge'ler
   - **Scroll optimizasyonu**: Uzun SIM listesi desteği
   - **Klavye kısayolları**: Ctrl+R ile hızlı yenileme

### 🏗️ Teknik İyileştirmeler

- **Güvenli DOM manipülasyonu**: XSS koruması
- **Health check endpoints**: Docker ve sistem izleme
- **Gelişmiş hata yönetimi**: Detaylı log sistemi
- **Performans optimizasyonu**: Önbellekleme ve lazy loading

## 🚀 Hızlı Başlangıç

### Docker ile Çalıştırma (Önerilen)

```bash
# Projeyi klonla
git clone https://github.com/keyiflerolsun/SimShield.git
cd SimShield

# Tüm servisleri birlikte başlat (MongoDB, Redis, SimShield)
docker-compose up -d

# Servislerin durumunu kontrol et
docker-compose ps

# Logları izle
docker-compose logs -f simshield
```

### Manuel Kurulum

```bash
# Python bağımlılıklarını yükle
pip install -r requirements.txt

# MongoDB ve Redis'i manuel başlat (ports: 27018, 6380)
# Docker ile sadece veritabanlarını başlat:
docker-compose up -d simshield_mongodb simshield_redis

# Örnek verileri yükle (manuel analiz için hazır)
python load_sample_data.py

# Uygulamayı başlat
python basla.py
```

### 🔄 Sistem Durumu

```bash
# Health check
curl http://localhost:3310/health

# Docker servislerin sağlık durumu
docker-compose ps
```

## 🌐 Erişim Adresleri

- **Ana Dashboard**: http://127.0.0.1:3310
- **API Dokümantasyonu**: http://127.0.0.1:3310/docs
- **API Redoc**: http://127.0.0.1:3310/redoc
- **Sağlık Kontrolü**: http://127.0.0.1:3310/health

## 📊 API Kullanımı

### Fleet Overview
```bash
curl -s http://localhost:3310/api/v1/fleet
```

### SIM Kullanım Verisi
```bash
curl -s "http://localhost:3310/api/v1/usage/2001?days=30"
```

### Anomali Analizi
```bash
curl -s -X POST http://localhost:3310/api/v1/analyze/2001
```

### Maliyet Simülasyonu (Senaryo Tabanlı)
```bash
curl -s -X POST http://localhost:3310/api/v1/whatif/2001 \
  -H "Content-Type: application/json" \
  -d '{
    "scenario": "increase_20",
    "parameters": {
      "duration_days": 30
    }
  }'
```

### En İyi Plan Önerileri
```bash
curl -s http://localhost:3310/api/v1/best-options/2001
```

### Toplu Eylem
```bash
curl -s -X POST http://localhost:3310/api/v1/actions \
  -H "Content-Type: application/json" \
  -d '{"sim_ids":["2001","2004"],"action":"freeze_24h","reason":"sudden_spike"}'
```

## 🧪 Testler

```bash
# Tüm testleri çalıştır
pytest

# Kapsamlı test raporu
pytest --cov=. --cov-report=html

# Belirli bir test dosyası
pytest tests/test_api.py -v
```

## 🔧 Konfigürasyon

`AYAR.yml` dosyasında temel ayarları yapabilirsiniz:

```yaml
APP:
  HOST: 0.0.0.0
  PORT: 3310
  WORKERS: 1

DATABASE:
  MONGODB:
    URI: mongodb://admin:simshield123@127.0.0.1:27018/simshield_iot?authSource=admin
  REDIS:
    HOST: 127.0.0.1
    PORT: 6380

IOT_SETTINGS:
  ANOMALY_DETECTION:
    SPIKE_MULTIPLIER: 2.5
    DRAIN_DAYS: 3
    INACTIVITY_HOURS: 48
```

## 📁 Proje Yapısı

```
SimShield/
├── Core/                    # FastAPI uygulaması
├── Public/                  # Frontend ve API
│   ├── API/v1/             # REST API endpoints
│   └── Home/               # Dashboard frontend
├── DB/                     # Veritabanı yöneticileri
├── Settings/               # Konfigürasyon
├── tests/                  # Unit testler
├── docker-compose.yml      # Docker servisleri
└── load_sample_data.py     # Örnek veri yükleyici
```

## 📊 Örnek Veriler

Sistem `load_sample_data.py` ile şu veriler yüklenir:
- **16 SIM kartı** (çeşitli cihaz tipleri: POS, Camera, Tracker, SmartMeter, Sensor)
- **7 müşteri** (farklı sektörlerden)
- **5 IoT planı** (Basic 500MB'dan Enterprise 5GB'a)
- **30 günlük kullanım geçmişi** (gerçekçi anomali senaryoları dahil)
- **Eylem logları** ve **cihaz profilleri**

### 🔴 Yüksek Riskli Test SIM'i
- **SIM 2099**: Kritik seviye anomaliler (Risk: 100)
  - Extreme spike (7GB+ günlük kullanım)
  - Sustained drain (5 gün yüksek kullanım)
  - Critical roaming (500MB+ roaming)

### 📋 Manuel Analiz Sistemi
- Başlangıçta tüm SIM'ler **Risk 0** ile başlar
- **Manuel analiz** arayüzden tetiklenir
- Gerçek zamanlı anomali tespiti ve WebSocket uyarıları

## 🎯 Anomali Tespiti

### Gelişmiş Anomali Algoritması
- **MA7** = son 7 gün ortalama; **std7** = son 7 gün standart sapma
- **Duplicate önleme**: 7 günlük pencere ile aynı anomali tekrarını engeller

#### Anomali Tipleri ve Eşikler
- **Sudden Spike**: today_mb > max(MA7×2.5, MA7+3×std7)
- **Sustained Drain**: 3 gün üst üste today_mb > MA7×1.5
- **Inactivity**: 48+ saat üst üste 0 MB
- **Unexpected Roaming**: roaming_expected == false & today_roaming_mb > 20

#### Extreme Anomali Tespiti (Kritik SIM'ler için)
- **Extreme Spike**: today_mb > MA7×20 (Risk: +70)
- **Critical Drain**: 5 gün üst üste today_mb > MA7×6 (Risk: +50)
- **Critical Roaming**: roaming_mb > 400 (Risk: +60)

### Risk Skorlaması Sistemi
- **Sudden Spike**: +40, **Extreme Spike**: +70
- **Sustained Drain**: +30, **Critical Drain**: +50
- **Inactivity**: +20
- **Unexpected Roaming**: +40, **Critical Roaming**: +60
- **Risk Seviyeleri**: 
  - 🔴 **Kırmızı**: ≥70 (Kritik)
  - 🟠 **Turuncu**: 40-69 (Orta)
  - 🟢 **Yeşil**: <40 (Düşük)

## 💰 Maliyet Simülatörü

### Senaryo Tabanlı Simülasyon
1. **Kullanım Senaryoları**:
   - `increase_20`: %20 kullanım artışı
   - `decrease_30`: %30 kullanım optimizasyonu
   - `spike_day`: Günlük 10x ani artış
   - `roaming_week`: 7 günlük roaming simülasyonu

2. **Maliyet Hesaplama**:
   - **Ay sonu tahmini**: (son 7 gün ortalaması) × kalan gün
   - **Mevcut plan maliyeti**: base + aşım
   - **Plan optimizasyonu**: en düşük 3 seçenek
   - **Tasarruf analizi**: current_total - candidate_total

3. **Detaylı Kırılım**:
   - Plan ücreti, aşım maliyeti, ek paket ücreti
   - Risk değişim analizi
   - Öneriler ve uyarılar

## 🔄 WebSocket Desteği

Gerçek zamanlı anomali uyarıları ve canlı izleme:

```javascript
const ws = new WebSocket('ws://localhost:3310/api/v1/ws/alerts');

ws.onmessage = (event) => {
  const alert = JSON.parse(event.data);
  console.log('Yeni uyarı:', alert);
  
  // Örnek uyarı formatı:
  // {
  //   "type": "anomaly_detected",
  //   "sim_id": "2099",
  //   "message": "1 yeni anomali tespit edildi",
  //   "severity": "red",
  //   "timestamp": "2025-08-20T10:31:44.466578"
  // }
};
```

### ✨ İnteraktif Özellikler
- **Tıklanabilir SIM ID'ler**: Uyarılardaki SIM'e tıklayarak otomatik seçim
- **Duplicate anomali önleme**: 7 günlük pencere ile tekrar uyarı engelleme
- **Canlı bağlantı durumu**: Dashboard'ta WebSocket durumu göstergesi

## 🎮 Kullanım Kılavuzu

### 1. İlk Kurulum ve Veri Yükleme
```bash
# Docker ile tam kurulum
docker-compose up -d
# Veriler otomatik yüklenir, risk skorları sıfırlanır
```

### 2. Dashboard Kullanımı
- **SIM Seçimi**: Fleet listesinden herhangi bir SIM'e tıklayın
- **Manuel Analiz**: "Analiz" butonu ile anomali tespiti başlatın
- **İstatistik Filtreleme**: Üst kartlara tıklayarak hızlı filtreleme
- **Canlı Uyarılar**: Sağ paneldeki uyarılara tıklayarak SIM'e geçiş

### 3. Anomali İzleme
- Yüksek riskli SIM'ler için önce **2099 SIM'ini** test edin
- Manuel analiz sonrası WebSocket uyarıları gelir
- Uyarılardaki SIM ID'lerine tıklayarak otomatik seçim

### 4. Maliyet Optimizasyonu
- "En İyi Seçenekler" ile plan önerileri alın
- "Ne Olursa" simülasyonu ile senaryoları test edin
- Toplu eylemlerle risk azaltma işlemleri yapın

## 🔍 Sorun Giderme

### Yaygın Sorunlar

#### WebSocket Bağlantı Sorunu
```bash
# API durumunu kontrol et
curl http://localhost:3310/health

# Docker logları kontrol et
docker-compose logs simshield
```

#### Veritabanı Bağlantı Hatası
```bash
# MongoDB durumu
docker-compose ps simshield_mongodb

# Redis durumu
docker-compose ps simshield_redis

# Servisleri yeniden başlat
docker-compose restart
```

#### SIM Tarih Bilgileri Yüklenmiyor
- SIM seçildikten sonra 2-3 saniye bekleyin
- API yanıt süresini `/usage/{sim_id}?days=90` endpoint'i belirler
- Network gecikmesi durumunda yeniden seçim yapın

## 📄 Lisans

Bu proje @keyiflerolsun tarafından CodeNight için geliştirilmiştir.
