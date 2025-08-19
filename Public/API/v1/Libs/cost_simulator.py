# Bu araç @keyiflerolsun tarafından | CodeNight için yazılmıştır.

from typing   import List
from datetime import datetime, timedelta
from ..Models import Usage, IoTPlan, AddOnPack, WhatIfResponse, CostBreakdown
import statistics

class CostSimulator:
    def __init__(self):
        pass
    
    def simulate_costs(self, sim_id: str, usage_data: List[Usage], 
                      current_plan: IoTPlan, target_plan: IoTPlan = None,
                      addons: List[AddOnPack] = None) -> WhatIfResponse:
        """
        Maliyet simülasyonu yapar
        """
        if not usage_data:
            return self._empty_response()
        
        # Ay sonu tahmini hesapla
        forecast_mb = self._calculate_forecast(usage_data)
        used_so_far = sum(usage.mb_used for usage in usage_data)
        
        # Mevcut plan maliyeti
        current_total = self._calculate_plan_cost(
            used_so_far, forecast_mb, current_plan, []
        )
        
        # Hedef plan maliyeti
        if target_plan:
            candidate_total = self._calculate_plan_cost(
                used_so_far, forecast_mb, target_plan, addons or []
            )
            description = f"Plan değişikliği: {target_plan.plan_name}"
        elif addons:
            candidate_total = self._calculate_plan_cost(
                used_so_far, forecast_mb, current_plan, addons
            )
            addon_names = [addon.name for addon in addons]
            description = f"Ek paket: {', '.join(addon_names)}"
        else:
            candidate_total = current_total
            description = "Değişiklik yok"
        
        # Tasarruf hesapla
        saving = current_total - candidate_total
        
        # Detay breakdown
        breakdown = self._get_cost_breakdown(
            used_so_far, forecast_mb, target_plan or current_plan, addons or []
        )
        
        return WhatIfResponse(
            current_total=current_total,
            candidate_total=candidate_total,
            saving=saving,
            breakdown=breakdown,
            description=description
        )
    
    def _calculate_forecast(self, usage_data: List[Usage]) -> float:
        """
        Son 7 günün ortalamasına göre ay sonu tahmini yapar
        """
        if len(usage_data) < 7:
            return 0
        
        last_7_days = usage_data[-7:]
        daily_average = statistics.mean([usage.mb_used for usage in last_7_days])
        
        # Bu ayın kalan günlerini hesapla
        now = datetime.now()
        last_day_of_month = datetime(now.year, now.month + 1, 1) - timedelta(days=1)
        remaining_days = (last_day_of_month - now).days
        
        return daily_average * remaining_days
    
    def _calculate_plan_cost(self, used_so_far: float, forecast_mb: float,
                           plan: IoTPlan, addons: List[AddOnPack]) -> float:
        """
        Plan ve ek paketlerle toplam maliyeti hesaplar
        """
        base_cost = plan.monthly_price
        
        # Ek paket maliyetleri
        addon_cost = sum(addon.price for addon in addons)
        addon_mb = sum(addon.extra_mb for addon in addons)
        
        # Toplam kota
        total_quota = plan.monthly_quota_mb + addon_mb
        
        # Aşım hesapla
        total_usage = used_so_far + forecast_mb
        overage = max(0, total_usage - total_quota)
        overage_cost = overage * plan.overage_per_mb
        
        return base_cost + addon_cost + overage_cost
    
    def _get_cost_breakdown(self, used_so_far: float, forecast_mb: float,
                          plan: IoTPlan, addons: List[AddOnPack]) -> CostBreakdown:
        """
        Maliyet detaylarını döndürür
        """
        base_cost = plan.monthly_price
        addon_cost = sum(addon.price for addon in addons)
        addon_mb = sum(addon.extra_mb for addon in addons)
        
        total_quota = plan.monthly_quota_mb + addon_mb
        total_usage = used_so_far + forecast_mb
        overage = max(0, total_usage - total_quota)
        overage_cost = overage * plan.overage_per_mb
        
        return CostBreakdown(
            base_cost=base_cost,
            overage_cost=overage_cost,
            addon_cost=addon_cost,
            total_cost=base_cost + addon_cost + overage_cost
        )
    
    def _empty_response(self) -> WhatIfResponse:
        """
        Boş veri için varsayılan response"""
        return WhatIfResponse(
            current_total=0,
            candidate_total=0,
            saving=0,
            breakdown=CostBreakdown(
                base_cost=0,
                overage_cost=0,
                addon_cost=0,
                total_cost=0
            ),
            description="Yetersiz veri"
        )
    
    def get_best_options(self, sim_id: str, usage_data: List[Usage],
                        current_plan: IoTPlan, available_plans: List[IoTPlan],
                        available_addons: List[AddOnPack]) -> List[WhatIfResponse]:
        """
        En iyi 3 seçeneği döndürür
        """
        options = []
        
        # Mevcut plan
        current_option = self.simulate_costs(sim_id, usage_data, current_plan)
        current_option.description = f"Mevcut Plan: {current_plan.plan_name}"
        options.append(current_option)
        
        # Diğer planlar
        for plan in available_plans:
            if plan.plan_id != current_plan.plan_id:
                option = self.simulate_costs(sim_id, usage_data, current_plan, plan)
                options.append(option)
        
        # Ek paketler (tek tek)
        for addon in available_addons:
            if addon.apn == current_plan.apn:
                option = self.simulate_costs(sim_id, usage_data, current_plan, 
                                           addons=[addon])
                options.append(option)
        
        # En düşük maliyetli 3 seçeneği döndür
        options.sort(key=lambda x: x.candidate_total)
        return options[:3]

# Global maliyet simülatörü
cost_simulator = CostSimulator()
