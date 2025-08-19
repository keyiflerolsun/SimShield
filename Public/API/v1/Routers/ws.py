# Bu araç @keyiflerolsun tarafından | CodeNight için yazılmıştır.

from fastapi import WebSocket, WebSocketDisconnect
from .       import api_v1_router, manager
from CLI     import konsol

@api_v1_router.websocket("/ws/alerts")
async def websocket_alerts(websocket: WebSocket):
    """
    Canlı anomali uyarıları için WebSocket endpoint
    """
    konsol.print("🔌 [cyan]WebSocket bağlantı isteği alındı[/]")
    await manager.connect(websocket)
    konsol.print("✅ [green]WebSocket bağlantısı kuruldu[/]")
    
    try:
        while True:
            # Bağlantıyı canlı tut
            message = await websocket.receive_text()
            konsol.print(f"📨 [yellow]WebSocket mesajı alındı:[/] {message}")
    except WebSocketDisconnect:
        konsol.print("🔌 [red]WebSocket bağlantısı kesildi[/]")
        manager.disconnect(websocket)