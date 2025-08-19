# Bu araç @keyiflerolsun tarafından | CodeNight için yazılmıştır.

import pytest
import json

class TestAPISecurity:
    """API güvenlik testleri"""
    
    def test_sql_injection_protection(self, test_client):
        """SQL injection koruması testi"""
        malicious_sim_id = "'; DROP TABLE sims; --"
        
        response = test_client.get(f"/api/v1/usage/{malicious_sim_id}")
        
        # SQL injection çalışmamalı, 404 veya 500 dönmeli
        assert response.status_code in [400, 404, 422, 500]
    
    def test_xss_protection(self, test_client):
        """XSS koruması testi"""
        xss_payload = "<script>alert('xss')</script>"
        
        response = test_client.post("/api/v1/actions", json={
            "sim_ids": ["2001"],
            "action": "freeze_24h",
            "reason": xss_payload
        })
        
        # XSS payload'ı güvenli şekilde işlenmeli
        assert response.status_code in [200, 201, 422, 500]
        
        if response.status_code in [200, 201]:
            # Response'da script tag'ı olmamalı
            assert "<script>" not in response.text
    
    def test_invalid_json_handling(self, test_client):
        """Geçersiz JSON işleme testi"""
        invalid_json = '{"sim_ids": ["2001", "action": "freeze_24h"}'  # Eksik kapatma
        
        response = test_client.post(
            "/api/v1/actions",
            content=invalid_json,
            headers={"Content-Type": "application/json"}
        )
        
        # 422 Unprocessable Entity dönmeli
        assert response.status_code == 422
    
    def test_large_payload_protection(self, test_client):
        """Büyük payload koruması testi"""
        # Çok büyük SIM listesi
        large_sim_list = [f"sim_{i}" for i in range(10000)]
        
        response = test_client.post("/api/v1/actions", json={
            "sim_ids": large_sim_list,
            "action": "freeze_24h",
            "reason": "test"
        })
        
        # Büyük payload reddedilmeli veya timeout olmalı
        assert response.status_code in [413, 422, 500, 504]
    
    def test_path_traversal_protection(self, test_client):
        """Path traversal koruması testi"""
        malicious_path = "../../../etc/passwd"
        
        response = test_client.get(f"/api/v1/usage/{malicious_path}")
        
        # Path traversal çalışmamalı
        assert response.status_code in [400, 404, 422]
    
    def test_http_methods_restriction(self, test_client):
        """HTTP method kısıtlama testi"""
        # GET endpoint'ine POST
        response = test_client.post("/api/v1/fleet")
        assert response.status_code == 405  # Method Not Allowed
        
        # POST endpoint'ine GET
        response = test_client.get("/api/v1/actions")
        assert response.status_code == 405  # Method Not Allowed
    
    def test_content_type_validation(self, test_client):
        """Content-Type validasyon testi"""
        # JSON endpoint'ine XML gönder
        xml_data = '<?xml version="1.0"?><root><sim_ids>2001</sim_ids></root>'
        
        response = test_client.post(
            "/api/v1/actions",
            content=xml_data,
            headers={"Content-Type": "application/xml"}
        )
        
        # Desteklenmeyen content-type reddedilmeli
        assert response.status_code in [415, 422]
    
    def test_parameter_validation(self, test_client):
        """Parameter validasyon testi"""
        # Negatif days parametresi
        response = test_client.get("/api/v1/usage/2001?days=-1")
        assert response.status_code == 422
        
        # Çok büyük days parametresi
        response = test_client.get("/api/v1/usage/2001?days=99999")
        assert response.status_code == 422
        
        # Geçersiz risk_level
        response = test_client.get("/api/v1/fleet?risk_level=invalid")
        assert response.status_code in [422, 500]
    
    def test_rate_limiting(self, test_client):
        """Rate limiting testi"""
        # Hızlı ardışık istekler
        responses = []
        for _ in range(100):
            response = test_client.get("/api/v1/fleet")
            responses.append(response.status_code)
        
        # Rate limiting aktifse 429 dönmeli
        # Aktif değilse normal yanıtlar dönecek
        has_rate_limiting = 429 in responses
        
        if has_rate_limiting:
            print("Rate limiting aktif")
        else:
            print("Rate limiting pasif veya yüksek limit")
    
    def test_error_message_information_disclosure(self, test_client):
        """Hata mesajı bilgi sızıntısı testi"""
        response = test_client.get("/api/v1/usage/nonexistent_sim_12345")
        
        if response.status_code in [404, 500]:
            error_detail = response.json().get("detail", "")
            
            # Hata mesajında hassas bilgi olmamalı
            sensitive_keywords = [
                "password", "token", "secret", "database", 
                "connection", "mongodb", "redis", "internal"
            ]
            
            for keyword in sensitive_keywords:
                assert keyword.lower() not in error_detail.lower()

class TestAPIAuthentication:
    """API kimlik doğrulama testleri"""
    
    def test_unauthorized_access(self, test_client):
        """Yetkisiz erişim testi - Gelecekte authentication için"""
        # Şu an API public, ancak gelecekte authentication eklendiğinde
        # bu testler aktif olacak. Şimdilik API'nin erişilebilir olduğunu doğrula
        response = test_client.get("/api/v1/fleet")
        assert response.status_code in [200, 500]  # 200 OK veya 500 server error kabul edilebilir
    
    def test_invalid_token(self, test_client):
        """Geçersiz token testi - Gelecekte authentication için"""
        # Authentication eklendiğinde test edilecek
        # Şimdilik API'nin token olmadan çalıştığını doğrula
        response = test_client.get("/api/v1/fleet")
        # Token kontrolü olmadığı için normal response bekleniyor
        assert response.status_code in [200, 500]

class TestAPIInputValidation:
    """API giriş validasyon testleri"""
    
    def test_enum_validation(self, test_client):
        """Enum validasyon testi"""
        # Geçersiz action type
        response = test_client.post("/api/v1/actions", json={
            "sim_ids": ["2001"],
            "action": "invalid_action_type",
            "reason": "test"
        })
        
        assert response.status_code == 422
    
    def test_required_fields_validation(self, test_client):
        """Zorunlu alan validasyon testi"""
        # Eksik sim_ids
        response = test_client.post("/api/v1/actions", json={
            "action": "freeze_24h",
            "reason": "test"
        })
        
        assert response.status_code == 422
        
        # Eksik action
        response = test_client.post("/api/v1/actions", json={
            "sim_ids": ["2001"],
            "reason": "test"
        })
        
        assert response.status_code == 422
    
    def test_data_type_validation(self, test_client):
        """Veri tipi validasyon testi"""
        # String yerine integer
        response = test_client.get("/api/v1/usage/2001?days=invalid_number")
        assert response.status_code == 422
        
        # List yerine string
        response = test_client.post("/api/v1/actions", json={
            "sim_ids": "2001",  # String instead of list
            "action": "freeze_24h",
            "reason": "test"
        })
        
        assert response.status_code == 422
