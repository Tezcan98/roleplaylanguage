# Yapılacaklar

Sıradakiler yukarıdan aşağıya. Biten bir iş buradan silinir (ayrıntısı commit mesajında).

## Sırada

1. **Toplu konuşma alanları**: kahvehane ilk alan (içeridekiler birbirini duyar, yakındaki yüksek).
   Sırada: başka alanlar (çay bahçesi, cami avlusu?) ve 16 kişiden kalabalıkta en yakındakiler.
2. **Tanıtım videosu (yeniden)**:
   - Diğer oyuncuların hızlı gidip ışınlanması düzeldi (bütün sayfalar aynı sanal saatte, Shorts'ta denendi).
   - Bakkal / alışveriş tanıtılmasın; aile ve görevler ön planda olsun.

## Bekleyen (karar / dış iş)

- **Cloudflare önbellek kuralı**: modeller ve çeviriler için panelde tek bir Cache Rule (`docs/cdn.md`); sunucu tarafı hazır.
- **Play Store 1.0.17** (paket `com.anadolu`): AAB, metinler (tr/en/ru/ar), görseller ve sürüm notları `~/Desktop/AnadoluAilesi-release/` içinde; yükleme Play Console'dan.
- **Play Store veri beyanı**: konuşmaların saklandığı belirtildi; Play Console "Veri güvenliği" formu ve
  gizlilik politikası adresi son haline getirilecek (`docs/store/data-safety.md`, `docs/store/privacy-policy.md`).
- **Play Games girişi**: Play Console'da kurulum, sonra proje numarası `game_services_project_id`'ye (`docs/guvenlik-logu.md`).
- **Koşma**: kodda duruyor, şimdilik kapalı (`PlayerController.js` `run`, `Joystick.js` 🏃 düğmesi).
- **Kredi paketleri (kapalı)**: satın almalar sunucuda doğrulanınca (Google Play Developer API, service account) ve Play Console ürünleri (`credits_50/200/500`) açılınca `SELL_PACKS = true` (Billing.js).
