# Bu araç @keyiflerolsun tarafından | CodeNight için yazılmıştır.

from fastapi  import HTTPException, Query
from .        import api_v1_router
from typing   import List
from ..Models import UsageResponse
from ..Libs   import iot_service


@api_v1_router.get("/usage/{sim_id}", response_model=List[UsageResponse])
async def get_sim_usage(
    sim_id: str,
    days: int = Query(30, ge=1, le=90, description="Kaç günlük veri")
):
    """
    Belirtilen SIM'in kullanım geçmişini döndürür
    """
    try:
        usage_data = await iot_service.get_sim_usage(sim_id, days)
        
        if not usage_data:
            raise HTTPException(status_code=404, detail="SIM kullanım verisi bulunamadı")
        
        response = [
            UsageResponse(
                timestamp=usage.timestamp,
                mb_used=usage.mb_used,
                roaming_mb=usage.roaming_mb
            )
            for usage in usage_data
        ]
        
        return response
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Kullanım verileri alınamadı: {str(e)}")
