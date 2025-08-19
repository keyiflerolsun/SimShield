#!/bin/bash
# Bu araç @keyiflerolsun tarafından | CodeNight için yazılmıştır.

set -e

echo "🚀 SimShield IoT Fleet Guardian başlatılıyor..."

# Gerekli paketlerin kurulu olduğundan emin ol
echo "📦 Python bağımlılıklarını kontrol ediliyor..."
python3 -m pip install --no-cache-dir -q motor redis

# Örnek verileri yükle
echo "📊 Örnek veriler yükleniyor..."
python3 load_sample_data.py

# Ana uygulamayı başlat
echo "🌐 Web servisi başlatılıyor..."
exec python3 basla.py
