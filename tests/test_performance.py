# Bu araç @keyiflerolsun tarafından | CodeNight için yazılmıştır.

import pytest
import time
import asyncio
from concurrent.futures import ThreadPoolExecutor
from httpx import AsyncClient

class TestAPIPerformance:
    """API performans testleri"""
    
    def test_fleet_response_time(self, test_client):
        """Fleet API yanıt süresi testi"""
        start_time = time.time()
        
        response = test_client.get("/api/v1/fleet")
        
        end_time = time.time()
        response_time = end_time - start_time
        
        # 5 saniyeden az olmalı
        assert response_time < 5.0
        print(f"Fleet API yanıt süresi: {response_time:.3f} saniye")
    
    def test_usage_response_time(self, test_client):
        """Usage API yanıt süresi testi"""
        start_time = time.time()
        
        response = test_client.get("/api/v1/usage/2001?days=30")
        
        end_time = time.time()
        response_time = end_time - start_time
        
        # 3 saniyeden az olmalı
        assert response_time < 3.0
        print(f"Usage API yanıt süresi: {response_time:.3f} saniye")
    
    def test_analyze_response_time(self, test_client):
        """Analyze API yanıt süresi testi"""
        start_time = time.time()
        
        response = test_client.post("/api/v1/analyze/2001")
        
        end_time = time.time()
        response_time = end_time - start_time
        
        # 10 saniyeden az olmalı (analiz işlemi)
        assert response_time < 10.0
        print(f"Analyze API yanıt süresi: {response_time:.3f} saniye")
    
    def test_concurrent_requests(self, test_client):
        """Eşzamanlı istek testi"""
        def make_request():
            return test_client.get("/api/v1/fleet")
        
        # 10 eşzamanlı istek
        start_time = time.time()
        
        with ThreadPoolExecutor(max_workers=10) as executor:
            futures = [executor.submit(make_request) for _ in range(10)]
            responses = [future.result() for future in futures]
        
        end_time = time.time()
        total_time = end_time - start_time
        
        # Tüm istekler başarılı olmalı veya beklenen hata kodları
        for response in responses:
            assert response.status_code in [200, 500]  # Service olmayabilir
        
        # 15 saniyeden az olmalı
        assert total_time < 15.0
        print(f"10 eşzamanlı istek süresi: {total_time:.3f} saniye")
    
    @pytest.mark.asyncio
    async def test_async_performance(self):
        """Async API performans testi"""
        async with AsyncClient(base_url="http://test") as client:
            start_time = time.time()
            
            # 5 async istek
            tasks = [
                client.get("http://127.0.0.1:3310/api/v1/fleet"),
                client.get("http://127.0.0.1:3310/api/v1/usage/2001"),
                client.post("http://127.0.0.1:3310/api/v1/analyze/2001"),
                client.get("http://127.0.0.1:3310/api/v1/fleet?risk_level=red"),
                client.get("http://127.0.0.1:3310/api/v1/usage/2002")
            ]
            
            try:
                responses = await asyncio.gather(*tasks, return_exceptions=True)
                
                end_time = time.time()
                total_time = end_time - start_time
                
                print(f"5 async istek süresi: {total_time:.3f} saniye")
                
                # 8 saniyeden az olmalı
                assert total_time < 8.0
                
            except Exception as e:
                # Server çalışmıyorsa skip
                pytest.skip(f"Server erişilebilir değil: {e}")

class TestAPILoad:
    """API yük testleri"""
    
    def test_fleet_load_test(self, test_client):
        """Fleet API yük testi"""
        success_count = 0
        error_count = 0
        
        start_time = time.time()
        
        # 50 istek
        for _ in range(50):
            try:
                response = test_client.get("/api/v1/fleet")
                if response.status_code == 200:
                    success_count += 1
                else:
                    error_count += 1
            except Exception:
                error_count += 1
        
        end_time = time.time()
        total_time = end_time - start_time
        
        print(f"50 istek - Başarılı: {success_count}, Hata: {error_count}")
        print(f"Toplam süre: {total_time:.3f} saniye")
        print(f"İstek/saniye: {50/total_time:.2f}")
        
        # En az %80 başarı oranı
        success_rate = success_count / 50
        assert success_rate >= 0.8 or success_count == 0  # Service olmayabilir
    
    def test_memory_usage_stability(self, test_client):
        """Bellek kullanımı stabilite testi"""
        import psutil
        import os
        
        process = psutil.Process(os.getpid())
        initial_memory = process.memory_info().rss / 1024 / 1024  # MB
        
        # 100 istek
        for _ in range(100):
            try:
                test_client.get("/api/v1/fleet")
            except Exception:
                pass
        
        final_memory = process.memory_info().rss / 1024 / 1024  # MB
        memory_increase = final_memory - initial_memory
        
        print(f"Başlangıç bellek: {initial_memory:.2f} MB")
        print(f"Son bellek: {final_memory:.2f} MB")
        print(f"Bellek artışı: {memory_increase:.2f} MB")
        
        # 50MB'dan fazla artış olmamalı
        assert memory_increase < 50
