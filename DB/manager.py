# Bu araç @keyiflerolsun tarafından | CodeNight için yazılmıştır.

from CLI      import konsol
from typing   import Dict, Any
from .mongodb import mongodb_manager
from .redis   import redis_manager

class DatabaseManager:
    """Ana veritabanı yöneticisi - MongoDB ve Redis'i koordine eder"""
    
    def __init__(self):
        self.mongodb = mongodb_manager
        self.redis = redis_manager
        
    async def connect_all(self) -> Dict[str, bool]:
        """Tüm veritabanı bağlantılarını başlat"""
        konsol.log("🔌 [cyan]Veritabanı bağlantıları başlatılıyor...[/]")
        
        results = {}
        
        # MongoDB bağlantısı
        results["mongodb"] = await self.mongodb.connect()
        
        # Redis bağlantısı  
        results["redis"] = await self.redis.connect()
        
        # Index'leri oluştur (sadece MongoDB başarılı ise)
        # if results["mongodb"]:
        #     await self.mongodb.create_indexes()
        
        # Sonuçları özetle
        successful = sum(results.values())
        total = len(results)
        
        if successful == total:
            konsol.log(f"✅ [green]Tüm veritabanı bağlantıları başarılı[/] ({successful}/{total})")
        else:
            konsol.log(f"⚠️  [yellow]Kısmi bağlantı başarılı[/] ({successful}/{total})")
            
        return results
    
    async def disconnect_all(self):
        """Tüm veritabanı bağlantılarını kapat"""
        konsol.log("🔌 [yellow]Veritabanı bağlantıları kapatılıyor...[/]")
        
        await self.mongodb.disconnect()
        await self.redis.disconnect()
        
        konsol.log("✅ [green]Tüm bağlantılar kapatıldı[/]")
    
    async def health_check_all(self) -> Dict[str, Any]:
        """Tüm veritabanlarının sağlık kontrolü"""
        return {
            "mongodb": await self.mongodb.health_check(),
            "redis": await self.redis.health_check()
        }
    
    async def get_stats_all(self) -> Dict[str, Any]:
        """Tüm veritabanlarının istatistikleri"""
        return {
            "mongodb": await self.mongodb.get_stats(),
            "redis": await self.redis.get_stats()
        }
    
    def get_collection(self, collection_name: str):
        """MongoDB koleksiyonunu döndür (backward compatibility)"""
        return self.mongodb.get_collection(collection_name)
    
    @property
    def database(self):
        """MongoDB database'ini döndür (backward compatibility)"""
        return self.mongodb.database
    
    @property
    def redis_client(self):
        """Redis client'ını döndür (backward compatibility)"""
        return self.redis.client

# Global database manager instance
db_manager = DatabaseManager()

# Backward compatibility functions
async def get_database():
    """MongoDB veritabanını döndür"""
    return db_manager.database

async def get_redis():
    """Redis bağlantısını döndür"""  
    return db_manager.redis_client
