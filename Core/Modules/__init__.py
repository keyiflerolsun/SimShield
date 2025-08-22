# Bu araç @keyiflerolsun tarafından | CodeNight için yazılmıştır.

from CLI        import konsol
from fastapi    import FastAPI
from contextlib import asynccontextmanager
from DB         import db_manager

@asynccontextmanager
async def lifespan(app: FastAPI):
    """FastAPI uygulama yaşam döngüsü yöneticisi"""
    # Başlangıç
    konsol.log("🚀 [green]SimShield IoT Fleet Guardian başlatılıyor...[/]")
    
    # Veritabanı bağlantılarını başlat
    connection_results = await db_manager.connect_all()
    
    if not connection_results.get("mongodb", False):
        konsol.log("⚠️  [yellow]MongoDB bağlantısı başarısız, bazı özellikler çalışmayabilir[/]")
    
    if not connection_results.get("redis", False):
        konsol.log("⚠️  [yellow]Redis bağlantısı başarısız, önbellekleme devre dışı[/]")
    
    konsol.log("✅ [green]Başlangıç tamamlandı[/]")
    
    yield
    
    # Kapanış
    konsol.log("🔄 [yellow]SimShield kapatılıyor...[/]")
    await db_manager.disconnect_all()
    konsol.log("✅ [green]Güvenli kapanış tamamlandı[/]")