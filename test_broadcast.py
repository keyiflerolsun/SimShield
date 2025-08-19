#!/usr/bin/env python3
import asyncio
import json
from Public.API.v1.Routers import manager

async def test_broadcast():
    """WebSocket broadcast test mesajı gönder"""
    test_message = json.dumps({
        "type": "test",
        "severity": "info", 
        "message": "Test mesajı - WebSocket çalışıyor! 🚀",
        "timestamp": "2025-08-19T03:20:00Z"
    })
    
    print(f"📡 Broadcast test mesajı gönderiliyor...")
    await manager.broadcast(test_message)
    print("✅ Test mesajı gönderildi")

if __name__ == "__main__":
    asyncio.run(test_broadcast())
