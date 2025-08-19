# Bu araç @keyiflerolsun tarafından | CodeNight için yazılmıştır.

import os
from yaml import load, FullLoader

with open("AYAR.yml", "r", encoding="utf-8") as yaml_dosyasi:
    AYAR = load(yaml_dosyasi, Loader=FullLoader)

HOST       = AYAR["APP"]["HOST"]
PORT       = AYAR["APP"]["PORT"]
WORKERS    = AYAR["APP"]["WORKERS"]
CACHE_TIME = AYAR["APP"]["CACHE"] * 60

# Database settings - Docker çevre değişkenlerini kontrol et
MONGODB_URI = os.getenv("MONGODB_URI", AYAR["DATABASE"]["MONGODB"]["URI"])
MONGODB_DB = AYAR["DATABASE"]["MONGODB"]["NAME"]
REDIS_HOST = os.getenv("REDIS_HOST", AYAR["DATABASE"]["REDIS"]["HOST"])
REDIS_PORT = int(os.getenv("REDIS_PORT", AYAR["DATABASE"]["REDIS"]["PORT"]))
REDIS_DB = AYAR["DATABASE"]["REDIS"]["DB"]

# IoT Settings
IOT_SETTINGS = AYAR["IOT_SETTINGS"]