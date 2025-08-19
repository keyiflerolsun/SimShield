# Bu araç @keyiflerolsun tarafından | CodeNight için yazılmıştır.

import pytest
import asyncio
from httpx import AsyncClient
from fastapi import FastAPI
from fastapi.testclient import TestClient
from unittest.mock import AsyncMock, patch, MagicMock
from datetime import datetime
from Core import kekik_FastAPI

# Test verileri
TEST_SIM_DATA = {
    "sim_id": "2001",
    "customer_id": "9001",
    "device_type": "POS",
    "apn": "apn-iot",
    "plan_id": "11",
    "status": "active",
    "city": "Istanbul",
    "risk_score": 85,
    "anomaly_count": 2,
    "last_seen_at": datetime.now()
}

TEST_USAGE_DATA = [
    {
        "timestamp": datetime.now(),
        "mb_used": 480.0,
        "roaming_mb": 0.0
    },
    {
        "timestamp": datetime.now(),
        "mb_used": 410.0,
        "roaming_mb": 0.0
    },
    {
        "timestamp": datetime.now(),
        "mb_used": 12.0,
        "roaming_mb": 0.0
    }
]

TEST_FLEET_RESPONSE = [
    {
        "sim_id": "2001",
        "device_type": "POS",
        "apn": "apn-iot",
        "plan": "IoT Basic 500MB",
        "status": "active",
        "city": "Istanbul",
        "risk_score": 85,
        "risk_level": "red",
        "last_seen_at": datetime.now(),
        "anomaly_count": 2
    }
]

@pytest.fixture
def test_client():
    """Test client fixture"""
    # Test için ayrı bir FastAPI instance oluştur
    from fastapi import FastAPI
    from Public.API.v1.Routers import api_v1_router
    
    test_app = FastAPI()
    test_app.include_router(api_v1_router, prefix="/api/v1")
    
    return TestClient(test_app, follow_redirects=False)

@pytest.fixture
async def async_client():
    """Async test client fixture"""
    from fastapi import FastAPI
    from Public.API.v1.Routers import api_v1_router
    
    test_app = FastAPI()
    test_app.include_router(api_v1_router, prefix="/api/v1")
    
    async with AsyncClient(app=test_app, base_url="http://test", follow_redirects=False) as ac:
        yield ac

@pytest.fixture(autouse=True)
def mock_services():
    """Servisleri mock'la"""
    with patch('Public.API.v1.Libs.iot_service.iot_service') as mock_iot_service, \
         patch('Public.API.v1.Libs.anomaly_detector.anomaly_detector') as mock_anomaly, \
         patch('Public.API.v1.Libs.cost_simulator.cost_simulator') as mock_cost, \
         patch('DB.db_manager') as mock_db:
        
        # Mock IoT Service
        mock_iot_service.get_fleet_overview.return_value = TEST_FLEET_RESPONSE
        mock_iot_service.get_filtered_sims.return_value = TEST_FLEET_RESPONSE
        mock_iot_service.get_sim_usage.return_value = TEST_USAGE_DATA
        mock_iot_service.get_sim_by_id.return_value = TEST_SIM_DATA
        mock_iot_service.create_action_log.return_value = ["A-12345678"]
        
        # Mock Anomaly Detector
        mock_anomaly.analyze_sim.return_value = {
            "anomalies": [],
            "risk_score": 85,
            "risk_level": "red",
            "summary": "Test analysis"
        }
        mock_anomaly.get_risk_level.return_value = "red"
        
        # Mock Cost Simulator
        mock_cost.simulate_whatif.return_value = {
            "current_total": 100.0,
            "candidate_total": 80.0,
            "saving": 20.0,
            "breakdown": {
                "base_cost": 50.0,
                "overage_cost": 20.0,
                "addon_cost": 10.0,
                "total_cost": 80.0
            },
            "description": "Test simulation"
        }
        
        # Mock collection
        mock_collection = AsyncMock()
        mock_collection.find.return_value.to_list = AsyncMock(return_value=[TEST_SIM_DATA])
        mock_collection.find_one.return_value = AsyncMock(return_value=TEST_SIM_DATA)
        mock_collection.insert_one.return_value = AsyncMock()
        mock_collection.update_one.return_value = AsyncMock()
        
        mock_db.get_collection.return_value = mock_collection
        mock_db.database = MagicMock()
        yield mock_iot_service, mock_anomaly, mock_cost, mock_db

@pytest.fixture
def sample_sim_id():
    """Test SIM ID fixture"""
    return "2001"

@pytest.fixture
def sample_usage_request():
    """Test usage request fixture"""
    return {"days": 30}

@pytest.fixture
def sample_whatif_request():
    """Test what-if request fixture"""
    return {
        "plan_id": "12",
        "addons": ["701"]
    }

@pytest.fixture
def sample_action_request():
    """Test action request fixture"""
    return {
        "sim_ids": ["2001", "2002"],
        "action": "freeze_24h",
        "reason": "sudden_spike"
    }
