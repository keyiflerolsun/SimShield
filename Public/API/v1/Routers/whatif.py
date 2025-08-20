# Bu araç @keyiflerolsun tarafından | CodeNight için yazılmıştır.

from fastapi  import HTTPException
from .        import api_v1_router
from ..Models import WhatIfResponse, WhatIfRequest, AddOnPack, CostBreakdown
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
        current_monthly = sum(u.mb_used for u in usage_data)
        
        # Senaryo varsa özel simülasyon yap
        if request.scenario:
            duration_days = request.parameters.get('duration_days', 30)
            
            if request.scenario == 'increase_20':
                # %20 artış senaryosu
                projected_monthly = current_monthly * 1.2
                cost_change = (projected_monthly - current_monthly) * current_plan.overage_per_mb
                recommendations = [
                    "Kullanım artışına karşı plan yükseltmeyi değerlendirin",
                    "Uyarı limitleri ayarlayın"
                ]
                
            elif request.scenario == 'decrease_30':
                # %30 azalış senaryosu  
                projected_monthly = current_monthly * 0.7
                cost_change = (projected_monthly - current_monthly) * current_plan.overage_per_mb
                recommendations = [
                    "Daha düşük kotaya sahip plana geçiş yapabilirsiniz",
                    "Tasarruf edilen bütçeyi ek özelliklerde kullanabilirsiniz"
                ]
                
            elif request.scenario == 'spike_day':
                # Günlük ani artış senaryosu
                daily_avg = current_monthly / 30
                spike_usage = daily_avg * 10  # 10x artış
                projected_monthly = current_monthly + spike_usage
                cost_change = spike_usage * current_plan.overage_per_mb
                recommendations = [
                    "Ani artışlara karşı acil durum planı hazırlayın",
                    "Otomatik dondurma limitleri belirleyin"
                ]
                
            elif request.scenario == 'roaming_week':
                # Haftalık roaming senaryosu
                roaming_cost_per_mb = 2.5  # TL
                weekly_usage = current_monthly / 4  # haftalık kullanım
                cost_change = weekly_usage * roaming_cost_per_mb
                projected_monthly = current_monthly
                recommendations = [
                    "Roaming öncesi yerel veri paketi satın alın",
                    "Roaming kullanımını sınırlandırın"
                ]
                
            else:
                # Varsayılan senaryo
                projected_monthly = current_monthly
                cost_change = 0.0
                recommendations = []
            
            # Risk değişimi hesapla
            risk_change = 0
            if cost_change > current_plan.monthly_price * 0.5:
                risk_change = 2
            elif cost_change > current_plan.monthly_price * 0.2:
                risk_change = 1
            elif cost_change < 0:
                risk_change = -1
            
            return WhatIfResponse(
                current_total=current_plan.monthly_price,
                candidate_total=current_plan.monthly_price + cost_change,
                saving=-cost_change,
                breakdown=CostBreakdown(
                    base_cost=current_plan.monthly_price,
                    overage_cost=max(0, cost_change),
                    addon_cost=0.0,
                    total_cost=current_plan.monthly_price + max(0, cost_change)
                ),
                description=f"Senaryo: {request.scenario}",
                current_monthly=current_plan.monthly_price,
                projected_monthly=current_plan.monthly_price + cost_change,
                cost_change=cost_change,
                risk_change=risk_change,
                recommendations=recommendations
            )
        
        # Normal plan/addon simülasyonu (eski kod)
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