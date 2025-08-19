# Bu araç @keyiflerolsun tarafından | CodeNight için yazılmıştır.

from CLI  import cikis_yap, hata_yakala
from Core import Motor

if __name__ == "__main__":
    try:
        Motor.basla()
        cikis_yap(False)
    except Exception as hata:
        hata_yakala(hata)