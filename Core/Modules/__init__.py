# Bu araç @keyiflerolsun tarafından | CodeNight için yazılmıştır.

from fastapi    import FastAPI
from contextlib import asynccontextmanager
from DB         import db_manager

@asynccontextmanager
async def lifespan(app: FastAPI):

    # Veritabanı bağlantılarını başlat
    await db_manager.connect_all()

    yield

    # Kaynakları temizle
    await db_manager.disconnect_all()