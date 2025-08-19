# Bu araç @keyiflerolsun tarafından | CodeNight için yazılmıştır.

from fastapi import HTTPException
from .       import api_v1_router
from ..Libs  import iot_service, cost_simulator

@api_v1_router.get("/best-options/{sim_id}")
async def get_best_cost_options(sim_id: str):
    """
    En iyi maliyet seçeneklerini döndürür
    """
    try:
        # SIM ve plan bilgilerini al
        sim = await iot_service.get_sim_by_id(sim_id)
        if not sim:
            raise HTTPException(status_code=404, detail="SIM bulunamadı")
        
        current_plan = await iot_service.get_plan_by_id(sim.plan_id)
        if not current_plan:
            raise HTTPException(status_code=404, detail="Mevcut plan bulunamadı")
        
        # Kullanım verilerini al
        usage_data = await iot_service.get_sim_usage(sim_id, 30)
        
        # Mevcut APN'e uygun planları ve ek paketleri al
        available_plans = await iot_service.get_available_plans(current_plan.apn)
        available_addons = await iot_service.get_available_addons(current_plan.apn)
        
        # En iyi seçenekleri hesapla
        best_options = cost_simulator.get_best_options(
            sim_id, usage_data, current_plan, available_plans, available_addons
        )
        
        return best_options
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"En iyi seçenekler hesaplanamadı: {str(e)}")