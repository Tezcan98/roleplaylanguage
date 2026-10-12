# Yapılacaklar

Sıradakiler yukarıdan aşağıya. Biten bir iş buradan silinir (ayrıntısı commit mesajında).

## Sırada

0. **Meydanı büyüt** (~100 kişi): meydan, kahvehane, çay bahçesi, halı saha ve diğer alanlar daha geniş; sunucuda oda kapasitesi.
1. **YouTube Shorts (Arapça)**: 9:16, 3D karakter. Oyun henüz yok: "yakında Play Store ve App Store'da".
   Odak: aileyle görevler yaparak dil öğrenmek, meydanda sosyalleşmek, "Bas, konuş", birebir sesli
   sohbet, toplu konuşma odaları. Kantin, bisiklet, alışveriş yok. Başlık ve açıklama Arapça + İngilizce.
2. **Toplu konuşma odaları** (yeni özellik): meydanda birden fazla kişinin aynı anda sesli konuştuğu odalar
   (şu an yalnızca birebir sesli sohbet ve "Bas, konuş" yazısı var).
3. **Tanıtım videosu (yeniden)**:
   - Hatalar: diğer oyuncular hızlı gidiyor, ışınlanıyor, kaybolup geliyor (kayıtta onların sayfaları gerçek
     zamanda akıyor; filme alınan sayfa sanal zamanda — ikisi aynı saatte ilerlemeli).
   - Bakkal / alışveriş tanıtılmasın; aile ve görevler ön planda olsun.
4. **Herkes 3D** (karar bekliyor): `?allhd` ile denendi, ekran görüntüsü `~/Desktop/AnadoluAilesi-release/denemeler/herkes-3d.png`.
    Meydan, avlu, ev çalışıyor; yer sofrası, sedirde oturma, bahçe/tamir pozları köşeli gövdeye dönüyor (o pozlar 3D gövdede yok).

## Bekleyen (karar / dış iş)

- **Cloudflare önbellek kuralı**: modeller ve çeviriler için panelde tek bir Cache Rule (`docs/cdn.md`); sunucu tarafı hazır.
- **Play Store 1.0.11** (1.0.10 yerine): AAB, metinler (tr/en/ru/ar), görseller ve sürüm notları `~/Desktop/AnadoluAilesi-release/` içinde; yükleme Play Console'dan.
- **Play Store veri beyanı**: konuşmaların saklandığı belirtildi; Play Console "Veri güvenliği" formu ve
  gizlilik politikası adresi son haline getirilecek (`docs/store/data-safety.md`, `docs/store/privacy-policy.md`).
- **Play Games girişi**: Play Console'da kurulum, sonra proje numarası `game_services_project_id`'ye (`docs/guvenlik-logu.md`).
- **Koşma**: kodda duruyor, şimdilik kapalı (`PlayerController.js` `run`, `Joystick.js` 🏃 düğmesi).
- **Yayından önce**: `TEST_PURCHASES = false` (Billing.js), gerçek AdMob kimlikleri, Play Console'da kredi paketleri.
