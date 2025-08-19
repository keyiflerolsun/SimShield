# Bu araç @keyiflerolsun tarafından | CodeNight için yazılmıştır.

from fastapi  import HTTPException
from .        import api_v1_router, manager
from datetime import datetime
from ..Models import ActionRequest, ActionResponse, AlertMessage
from ..Libs   import iot_service

@api_v1_router.post("/actions", response_model=ActionResponse)
async def execute_bulk_actions(request: ActionRequest):
    """
    Toplu eylem gerçekleştirir
    """
    try:
        # Eylem logları oluştur
        action_ids = await iot_service.create_action_log(
            request.sim_ids, request.action.value, request.reason
        )
        
        # Burada gerçek eylemler simüle edilir
        created_actions = [
            {"sim_id": sim_id, "action_id": action_id}
            for sim_id, action_id in zip(request.sim_ids, action_ids)
        ]
        
        # WebSocket bildirimi
        alert = AlertMessage(
            type="bulk_action",
            sim_id="multiple",
            message=f"{len(request.sim_ids)} SIM'e {request.action.value} eylemi uygulandı",
            severity="green",
            timestamp=datetime.now()
        )
        await manager.broadcast(alert.model_dump_json())
        
        return ActionResponse(
            status="success",
            created=created_actions,
            message=f"{len(request.sim_ids)} SIM'e eylem başarıyla uygulandı"
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Eylem gerçekleştirilemedi: {str(e)}")