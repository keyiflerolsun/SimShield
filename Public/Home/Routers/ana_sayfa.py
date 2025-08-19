# Bu araç @keyiflerolsun tarafından | CodeNight için yazılmıştır.

from Core import Request, HTMLResponse
from .    import home_router, home_template

@home_router.get("/", response_class=HTMLResponse)
async def ana_sayfa(request: Request):
    context = {
        "request"  : request,
        "baslik"   : "SimShield IoT Fleet Guardian - Dashboard",
        "aciklama" : "Turkcell IoT SIM Filosu Koruyucu - Anomali Tespiti ve Maliyet Simülatörü"
    }

    return home_template.TemplateResponse("index.html", context)