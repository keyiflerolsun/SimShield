# Bu araç @keyiflerolsun tarafından | CodeNight için yazılmıştır.

from CLI            import konsol
from typing         import Optional, Dict, Any
from pymongo        import AsyncMongoClient
from pymongo.errors import ConnectionFailure, ServerSelectionTimeoutError
from Settings       import AYAR

class MongoDBManager:
    """MongoDB bağlantı ve işlem yöneticisi"""
    
    def __init__(self):
        self.client: Optional[AsyncMongoClient] = None
        self.database = None
        self.is_connected = False
        
    async def connect(self) -> bool:
        """MongoDB bağlantısını başlat"""
        try:
            # Bağlantı string'ini oluştur - Settings'den çevre değişkeni ile güncellenmiş değeri al
            from Settings import MONGODB_URI, MONGODB_DB
            
            # Client oluştur
            self.client = AsyncMongoClient(
                MONGODB_URI,
                serverSelectionTimeoutMS=5000,  # 5 saniye timeout
                connectTimeoutMS=10000,         # 10 saniye connect timeout
                socketTimeoutMS=20000,          # 20 saniye socket timeout
                maxPoolSize=50,                 # Maksimum bağlantı havuzu
                minPoolSize=5                   # Minimum bağlantı havuzu
            )
            
            # Database seç
            self.database = self.client[MONGODB_DB]
            
            # Bağlantıyı test et
            await self.client.admin.command('ping')
            self.is_connected = True
            
            konsol.log("✅ [green]MongoDB bağlantısı başarılı[/]")
            return True
            
        except (ConnectionFailure, ServerSelectionTimeoutError) as e:
            konsol.log(f"❌ [red]MongoDB bağlantı hatası:[/] {e}")
            self.is_connected = False
            return False
        except Exception as e:
            konsol.log(f"❌ [red]MongoDB beklenmeyen hata:[/] {e}")
            self.is_connected = False
            return False
    
    async def disconnect(self):
        """MongoDB bağlantısını kapat"""
        if self.client:
            await self.client.close()
            self.is_connected = False
            konsol.log("🔌 [yellow]MongoDB bağlantısı kapatıldı[/]")
    
    def get_collection(self, collection_name: str):
        """MongoDB koleksiyonunu döndür"""
        if self.database is not None and self.is_connected:
            return self.database[collection_name]
        return None
    
    async def health_check(self) -> Dict[str, Any]:
        """MongoDB sağlık kontrolü"""
        if not self.is_connected:
            return {"status": "disconnected", "error": "No connection"}
        
        try:
            # Ping komutu
            await self.client.admin.command('ping')
            
            # Server info
            server_info = await self.client.admin.command('serverStatus')
            
            return {
                "status": "connected",
                "version": server_info.get("version"),
                "uptime": server_info.get("uptime"),
                "connections": server_info.get("connections", {}).get("current", 0)
            }
        except Exception as e:
            return {"status": "error", "error": str(e)}
    
    async def create_indexes(self):
        """Önemli koleksiyonlar için index'ler oluştur"""
        if not self.is_connected:
            return False
        
        try:
            # SIM kartları için index'ler
            sims_collection = self.get_collection("sims")
            await sims_collection.create_index("sim_id", unique=True)
            await sims_collection.create_index("customer_id")
            await sims_collection.create_index("device_type")
            await sims_collection.create_index("status")
            
            # Usage için index'ler
            usage_collection = self.get_collection("usage")
            await usage_collection.create_index([("sim_id", 1), ("timestamp", -1)])
            await usage_collection.create_index("timestamp")
            
            # Anomalies için index'ler
            anomalies_collection = self.get_collection("anomalies")
            await anomalies_collection.create_index([("sim_id", 1), ("detected_at", -1)])
            await anomalies_collection.create_index("type")
            await anomalies_collection.create_index("severity")
            
            # Actions için index'ler
            actions_collection = self.get_collection("actions_log")
            await actions_collection.create_index([("sim_id", 1), ("created_at", -1)])
            await actions_collection.create_index("action_id", unique=True)
            
            konsol.log("✅ [green]MongoDB index'ler oluşturuldu[/]")
            return True
            
        except Exception as e:
            konsol.log(f"❌ [red]MongoDB index oluşturma hatası:[/] {e}")
            return False
    
    async def get_stats(self) -> Dict[str, Any]:
        """Database istatistikleri"""
        if not self.is_connected:
            return {}
        
        try:
            stats = {}
            collections = ["sims", "usage", "anomalies", "actions_log", "iot_plans"]
            
            for collection_name in collections:
                collection = self.get_collection(collection_name)
                count = await collection.count_documents({})
                stats[collection_name] = {"count": count}
            
            return stats
        except Exception as e:
            konsol.log(f"❌ [red]MongoDB stats hatası:[/] {e}")
            return {}

# Global MongoDB manager instance
mongodb_manager = MongoDBManager()
