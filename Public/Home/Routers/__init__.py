# Bu araç @keyiflerolsun tarafından | CodeNight için yazılmıştır.

from fastapi            import APIRouter
from fastapi.templating import Jinja2Templates

home_router   = APIRouter()
home_template = Jinja2Templates(directory="Public/Home/Templates")

from .ana_sayfa import *