# Bu araç @keyiflerolsun tarafından | CodeNight için yazılmıştır.

from fastapi  import HTTPException
from .        import api_v1_router
from ..Models import WhatIfResponse, WhatIfRequest, AddOnPack
from ..Libs   import iot_service, cost_simulator

@api_v1_router.post("/whatif/{sim_id}", response_model=WhatIfResponse)
async def simulate_costs(sim_id: str, request: WhatIfRequest):
    """
    Maliyet simülasyonu yapar (What-If analizi)
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
        
        # Hedef plan
        target_plan = None
        if request.plan_id:
            target_plan = await iot_service.get_plan_by_id(request.plan_id)
            if not target_plan:
                raise HTTPException(status_code=404, detail="Hedef plan bulunamadı")
        
        # Ek paketler
        addons = []
        if request.addons:
            for addon_id in request.addons:
                addon_collection = iot_service.db.get_collection("add_on_packs")
                addon_doc = await addon_collection.find_one({"addon_id": addon_id})
                if addon_doc:
                    addons.append(AddOnPack(**addon_doc))
        
        # Simülasyon yap
        result = cost_simulator.simulate_costs(
            sim_id, usage_data, current_plan, target_plan, addons
        )
        
        return result
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Maliyet simülasyonu yapılamadı: {str(e)}")