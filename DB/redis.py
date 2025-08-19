# Bu araç @keyiflerolsun tarafından | CodeNight için yazılmıştır.

from CLI              import konsol
import redis.asyncio  as redis
from redis.exceptions import ConnectionError, TimeoutError
from Settings         import AYAR
from typing           import Optional, Dict, Any
import json

class RedisManager:
    """Redis bağlantı ve cache yöneticisi"""
    
    def __init__(self):
        self.client: Optional[redis.Redis] = None
        self.is_connected = False
        
    async def connect(self) -> bool:
        """Redis bağlantısını başlat"""
        try:
            # Redis client oluştur - Settings'den çevre değişkeni ile güncellenmiş değerleri al
            from Settings import REDIS_HOST, REDIS_PORT, REDIS_DB
            
            self.client = redis.Redis(
                host=REDIS_HOST,
                port=REDIS_PORT,
                db=REDIS_DB,
                decode_responses=True,
                socket_timeout=5,
                socket_connect_timeout=5,
                retry_on_timeout=True,
                max_connections=20
            )
            
            # Bağlantıyı test et
            await self.client.ping()
            self.is_connected = True
            
            konsol.print("✅ [green]Redis bağlantısı başarılı[/]")
            return True
            
        except (ConnectionError, TimeoutError) as e:
            konsol.print(f"❌ [red]Redis bağlantı hatası:[/] {e}")
            self.is_connected = False
            return False
        except Exception as e:
            konsol.print(f"❌ [red]Redis beklenmeyen hata:[/] {e}")
            self.is_connected = False
            return False
    
    async def disconnect(self):
        """Redis bağlantısını kapat"""
        if self.client:
            await self.client.close()
            self.is_connected = False
            konsol.print("🔌 [yellow]Redis bağlantısı kapatıldı[/]")
    
    async def health_check(self) -> Dict[str, Any]:
        """Redis sağlık kontrolü"""
        if not self.is_connected:
            return {"status": "disconnected", "error": "No connection"}
        
        try:
            # Ping test
            latency = await self.client.ping()
            
            # Info komutu
            info = await self.client.info()
            
            return {
                "status": "connected",
                "ping": latency,
                "version": info.get("redis_version"),
                "used_memory": info.get("used_memory_human"),
                "connected_clients": info.get("connected_clients"),
                "total_commands_processed": info.get("total_commands_processed")
            }
        except Exception as e:
            return {"status": "error", "error": str(e)}
    
    # Cache Operations
    async def set_cache(self, key: str, value: Any, expire_seconds: int = 300) -> bool:
        """Cache'e veri kaydet"""
        if not self.is_connected:
            return False
        
        try:
            # JSON serialize edilebilir mi kontrol et
            if isinstance(value, (dict, list)):
                serialized_value = json.dumps(value, default=str)
            else:
                serialized_value = str(value)
            
            await self.client.setex(key, expire_seconds, serialized_value)
            return True
        except Exception as e:
            konsol.print(f"❌ [red]Redis cache set hatası:[/] {e}")
            return False
    
    async def get_cache(self, key: str) -> Optional[Any]:
        """Cache'den veri oku"""
        if not self.is_connected:
            return None
        
        try:
            value = await self.client.get(key)
            if value is None:
                return None
            
            # JSON parse etmeye çalış
            try:
                return json.loads(value)
            except json.JSONDecodeError:
                return value
        except Exception as e:
            konsol.print(f"❌ [red]Redis cache get hatası:[/] {e}")
            return None
    
    async def delete_cache(self, key: str) -> bool:
        """Cache'den veri sil"""
        if not self.is_connected:
            return False
        
        try:
            await self.client.delete(key)
            return True
        except Exception as e:
            konsol.print(f"❌ [red]Redis cache delete hatası:[/] {e}")
            return False
    
    async def exists_cache(self, key: str) -> bool:
        """Cache'de key var mı kontrol et"""
        if not self.is_connected:
            return False
        
        try:
            return bool(await self.client.exists(key))
        except Exception as e:
            konsol.print(f"❌ [red]Redis cache exists hatası:[/] {e}")
            return False
    
    # Rate Limiting
    async def rate_limit_check(self, key: str, limit: int, window_seconds: int) -> Dict[str, Any]:
        """Rate limiting kontrolü"""
        if not self.is_connected:
            return {"allowed": True, "remaining": limit, "reset_time": 0}
        
        try:
            # Sliding window rate limiting
            current_time = int(await self.client.time()[0])
            window_start = current_time - window_seconds
            
            # Pipeline kullan
            pipe = self.client.pipeline()
            pipe.zremrangebyscore(key, 0, window_start)
            pipe.zcard(key)
            pipe.zadd(key, {str(current_time): current_time})
            pipe.expire(key, window_seconds)
            
            results = await pipe.execute()
            current_requests = results[1]
            
            if current_requests >= limit:
                return {
                    "allowed": False,
                    "remaining": 0,
                    "reset_time": window_start + window_seconds
                }
            else:
                return {
                    "allowed": True,
                    "remaining": limit - current_requests - 1,
                    "reset_time": window_start + window_seconds
                }
        except Exception as e:
            konsol.print(f"❌ [red]Redis rate limit hatası:[/] {e}")
            return {"allowed": True, "remaining": limit, "reset_time": 0}
    
    # Session Management
    async def set_session(self, session_id: str, data: Dict[str, Any], expire_hours: int = 24) -> bool:
        """Session verisi kaydet"""
        return await self.set_cache(f"session:{session_id}", data, expire_hours * 3600)
    
    async def get_session(self, session_id: str) -> Optional[Dict[str, Any]]:
        """Session verisi oku"""
        return await self.get_cache(f"session:{session_id}")
    
    async def delete_session(self, session_id: str) -> bool:
        """Session verisi sil"""
        return await self.delete_cache(f"session:{session_id}")
    
    # Statistics
    async def get_stats(self) -> Dict[str, Any]:
        """Redis istatistikleri"""
        if not self.is_connected:
            return {}
        
        try:
            info = await self.client.info()
            
            return {
                "memory": {
                    "used": info.get("used_memory_human"),
                    "peak": info.get("used_memory_peak_human"),
                    "fragmentation_ratio": info.get("mem_fragmentation_ratio")
                },
                "connections": {
                    "current": info.get("connected_clients"),
                    "total": info.get("total_connections_received")
                },
                "commands": {
                    "processed": info.get("total_commands_processed"),
                    "per_second": info.get("instantaneous_ops_per_sec")
                },
                "keyspace": {
                    "keys": info.get("keyspace", {})
                }
            }
        except Exception as e:
            konsol.print(f"❌ [red]Redis stats hatası:[/] {e}")
            return {}

# Global Redis manager instance
redis_manager = RedisManager()
