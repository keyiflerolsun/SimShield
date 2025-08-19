# Bu araç @keyiflerolsun tarafından | CodeNight için yazılmıştır.

from fastapi import APIRouter, WebSocket
from typing  import List
from CLI     import konsol

api_v1_router = APIRouter()

# WebSocket connection manager
class ConnectionManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)
        konsol.print(f"✅ [green]WebSocket kabul edildi. Aktif bağlantı sayısı:[/] {len(self.active_connections)}")

    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)
            konsol.print(f"🔌 [red]WebSocket bağlantısı kaldırıldı. Aktif bağlantı sayısı:[/] {len(self.active_connections)}")

    async def broadcast(self, message: str):
        if not self.active_connections:
            konsol.print("📡 [yellow]Broadcast edilecek aktif WebSocket bağlantısı yok[/]")
            return
            
        konsol.print(f"📡 [cyan]Broadcast mesajı:[/] {message} [yellow]({len(self.active_connections)} bağlantıya)[/]")
        for connection in self.active_connections:
            try:
                await connection.send_text(message)
            except:
                self.active_connections.remove(connection)
                konsol.print("❌ [red]Bozuk WebSocket bağlantısı kaldırıldı[/]")

manager = ConnectionManager()

from .actions      import *
from .analyze      import *
from .best_options import *
from .fleet        import *
from .usage        import *
from .whatif       import *
from .ws           import *