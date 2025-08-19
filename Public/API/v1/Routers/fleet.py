# Bu araç @keyiflerolsun tarafından | CodeNight için yazılmıştır.

from fastapi  import HTTPException, Query
from .        import api_v1_router
from typing   import List, Optional
from ..Models import FleetResponse
from ..Libs   import iot_service

@api_v1_router.get("/fleet", response_model=List[FleetResponse])
async def get_fleet_overview(
    risk_level: Optional[str] = Query(None, description="Risk seviyesi filtresi: green, orange, red"),
    has_roaming: Optional[bool] = Query(None, description="Roaming kullanımı filtresi")
):
    """
    IoT SIM filosunun genel görünümünü döndürür
    """
    try:
        if risk_level or has_roaming is not None:
            sims = await iot_service.get_filtered_sims(risk_level, has_roaming)
        else:
            sims = await iot_service.get_fleet_overview()
        
        return sims
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Filo verileri alınamadı: {str(e)}")
