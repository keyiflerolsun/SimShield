#!/usr/bin/env python3
import asyncio
import websockets
import json

async def test_websocket():
    uri = "ws://127.0.0.1:3310/api/v1/ws/alerts"
    try:
        print(f"🔌 WebSocket bağlantısı kuruluyor: {uri}")
        
        async with websockets.connect(uri) as websocket:
            print("✅ WebSocket bağlantısı başarılı!")
            
            # Test mesajı gönder
            await websocket.send("test message")
            print("📤 Test mesajı gönderildi")
            
            # 5 saniye bekle ve gelen mesajları dinle
            try:
                message = await asyncio.wait_for(websocket.recv(), timeout=5.0)
                print(f"📥 Gelen mesaj: {message}")
            except asyncio.TimeoutError:
                print("⏰ 5 saniye içinde mesaj gelmedi (normal)")
            
    except websockets.exceptions.ConnectionClosed:
        print("❌ WebSocket bağlantısı kesildi")
    except websockets.exceptions.InvalidURI:
        print("❌ Geçersiz WebSocket URI")
    except ConnectionRefusedError:
        print("❌ Sunucuya bağlanılamadı - sunucu çalışıyor mu?")
    except Exception as e:
        print(f"❌ WebSocket hatası: {e}")

if __name__ == "__main__":
    asyncio.run(test_websocket())
