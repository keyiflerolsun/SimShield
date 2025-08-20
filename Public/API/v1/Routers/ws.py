# Bu araç @keyiflerolsun tarafından | CodeNight için yazılmıştır.

from fastapi import WebSocket, WebSocketDisconnect
from .       import api_v1_router, manager
from CLI     import konsol

@api_v1_router.websocket("/ws/alerts")
async def websocket_alerts(websocket: WebSocket):
    """
    Canlı anomali uyarıları için WebSocket endpoint
    """
    konsol.log("🔌 [cyan]WebSocket bağlantı isteği alındı[/]")
    await manager.connect(websocket)
    konsol.log("✅ [green]WebSocket bağlantısı kuruldu[/]")
    
    try:
        while True:
            # Bağlantıyı canlı tut
            message = await websocket.receive_text()
            konsol.log(f"📨 [yellow]WebSocket mesajı alındı:[/] {message}")
    except WebSocketDisconnect:
        konsol.log("🔌 [red]WebSocket bağlantısı kesildi[/]")
        manager.disconnect(websocket)