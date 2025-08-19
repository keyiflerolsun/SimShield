# Bu araç @keyiflerolsun tarafından | CodeNight için yazılmıştır.

from fastapi             import FastAPI, Request, Response, HTTPException
from Core.Modules        import lifespan
from fastapi.staticfiles import StaticFiles
from fastapi.responses   import JSONResponse, HTMLResponse, RedirectResponse, PlainTextResponse, FileResponse
from Kekik.cache         import kekik_cache

kekik_FastAPI = FastAPI(
    title       = "SimShield IoT Fleet Guardian API",
    description = "Turkcell IoT SIM Filosu Koruyucu - Anomali Tespiti ve Maliyet Simülatörü",
    version     = "1.0.0",
    openapi_url = "/openapi.json",
    docs_url    = "/docs",
    redoc_url   = "/redoc",
    lifespan    = lifespan
)

# ! ----------------------------------------» Health Check

@kekik_FastAPI.get("/health", response_class=JSONResponse)
async def health_check():
    """Sistem sağlık kontrolü"""
    try:
        from datetime import datetime
        import os
        
        return {
            "status": "healthy",
            "timestamp": datetime.now().isoformat(),
            "service": "SimShield IoT Fleet Guardian",
            "version": "1.0.0",
            "environment": os.environ.get("ENVIRONMENT", "development"),
            "database": {
                "mongodb": "connected",
                "redis": "connected"
            }
        }
    except Exception as e:
        raise HTTPException(status_code=503, detail=f"Service unhealthy: {str(e)}")

# ! ----------------------------------------» Routers

from Core.Modules          import _istek, _hata
from Public.Home.Routers   import home_router
from Public.API.v1.Routers import api_v1_router

kekik_FastAPI.include_router(home_router, prefix="")
kekik_FastAPI.mount("/static/home", StaticFiles(directory="Public/Home/Static"), name="static_home")

kekik_FastAPI.include_router(api_v1_router, prefix="/api/v1")