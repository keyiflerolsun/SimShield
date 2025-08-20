# Bu araç @keyiflerolsun tarafından | CodeNight için yazılmıştır.

# * Docker İmajı
FROM python:3.13.5-slim-bookworm

# * Python Standart Değişkenler
ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1 PYTHONIOENCODING="UTF-8"

# * Dil ve Bölge
ENV LANGUAGE="tr_TR.UTF-8" LANG="tr_TR.UTF-8" LC_ALL="tr_TR.UTF-8" TZ="Europe/Istanbul"

# * Çalışma Alanı
WORKDIR /usr/src/SimShield-IoT
COPY ./ /usr/src/SimShield-IoT

# ? Sistem Kurulumları ve Gereksiz Dosyaların Silinmesi
RUN apt-get update -y && \
    apt-get install --no-install-recommends -y \
        curl \
        wait-for-it \
        locales && \
    sed -i -e 's/# tr_TR.UTF-8 UTF-8/tr_TR.UTF-8 UTF-8/' /etc/locale.gen && \
    dpkg-reconfigure --frontend=noninteractive locales && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

# * Gerekli Paketlerin Yüklenmesi
RUN python3 -m pip install --upgrade pip && \
    python3 -m pip install --no-cache-dir -U setuptools wheel && \
    python3 -m pip install --no-cache-dir -Ur requirements.txt


# * Init script'i çalıştırılabilir yap
RUN chmod +x init.sh

# * Sağlık kontrolü
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD curl -f http://127.0.0.1:3310/health || exit 1

# * Başlangıç komutu
ENTRYPOINT ["bash", "./init.sh"]
