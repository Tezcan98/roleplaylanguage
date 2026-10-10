# Yapılacaklar

Sıradakiler yukarıdan aşağıya. Biten bir iş buradan silinir (ayrıntısı commit mesajında).

## Sırada

1. **Herkes 3D** (karar bekliyor): `?allhd` ile denendi, ekran görüntüsü `~/Desktop/AnadoluAilesi-release/denemeler/herkes-3d.png`.
    Meydan, avlu, ev çalışıyor; yer sofrası, sedirde oturma, bahçe/tamir pozları köşeli gövdeye dönüyor (o pozlar 3D gövdede yok).

## Bekleyen (karar / dış iş)

- **Cloudflare önbellek kuralı**: modeller ve çeviriler için panelde tek bir Cache Rule (`docs/cdn.md`); sunucu tarafı hazır.
- **Play Store 1.0.11** (1.0.10 yerine): AAB, metinler (tr/en/ru/ar), görseller ve sürüm notları `~/Desktop/AnadoluAilesi-release/` içinde; yükleme Play Console'dan.
- **Play Store veri beyanı**: konuşmaların saklandığı belirtildi; Play Console "Veri güvenliği" formu ve
  gizlilik politikası adresi son haline getirilecek (`docs/store/data-safety.md`, `docs/store/privacy-policy.md`).
- **Play Games girişi**: Play Console'da kurulum, sonra proje numarası `game_services_project_id`'ye (`docs/guvenlik-logu.md`).
- **Koşma**: kodda duruyor, şimdilik kapalı (`PlayerController.js` `run`, `Joystick.js` 🏃 düğmesi).
- **Yayından önce**: `TEST_PURCHASES = false` (Billing.js), gerçek AdMob kimlikleri, Play Console'da kredi paketleri.
