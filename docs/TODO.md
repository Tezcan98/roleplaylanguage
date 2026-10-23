# Yapılacaklar

Sıradakiler yukarıdan aşağıya. Biten bir iş buradan silinir (ayrıntısı commit mesajında).

## Sırada

1. **Toplu konuşma alanları**: kahvehane ve cami avlusu var (içeridekiler birbirini duyar, yakındaki yüksek;
   engellenen oyuncu duyulmaz — `npm run playtest:multiplayer -w web` dener).
   Sırada: çay bahçesi ve 16 kişiden kalabalıkta en yakındakiler.
2. **Tanıtım videosu (yeniden)**:
   - Diğer oyuncuların hızlı gidip ışınlanması düzeldi (bütün sayfalar aynı sanal saatte, Shorts'ta denendi).
   - Bakkal / alışveriş tanıtılmasın; aile ve görevler ön planda olsun.
3. **Türkiye'de günlük süre sınırı**:
   - Günlük oyun süresi yarım saati geçince uyarı çıksın.
   - Bir saati geçince oyun 6 saat dinlenmeye girsin; bu sürede oyuncu karakteri uyuyor görünsün (yatakta, "Zzz").
   - Kalan dinlenme süresi ekranda görünsün.
   - Kararlar:
     - Türkiye: **Play Store ülkesinden** (Play Billing `getBillingConfig().countryCode`; web sürümünde sınır yok).
     - Süre **telefonda** tutulur; uygulamayı silip yeniden kuran çok meraklıysa girsin, önemli değil.
     - Dinlenmede **hiçbir şey oynanmaz** (hikâye, meydan, okul hepsi kapalı); bekleme ekranına **banner reklam**.
     - Henüz açık: sayaç ne zaman sıfırlanır (gece yarısı mı, dinlenme bitince mi).

## Bekleyen (karar / dış iş)

- **Gemini ses formatı**: tarayıcılar sesi `audio/webm` / `audio/ogg` (opus), iPhone `audio/mp4` kaydediyor. Gemini'nin
  bunları gerçek bir şikayette doğru yazıya döktüğü canlıda denenmeli (`/api/reports` sayfasındaki döküm).
- **Play Console "Veri güvenliği" formu**: ses kaydı (sesli sohbet + bas-konuş, 48 saat, şikayette Gemini) ve
  kullanıcı adı denetimi `docs/store/data-safety.md`'ye göre forma işlenecek; gizlilik politikası güncel.

- **Cloudflare önbellek kuralı**: modeller ve çeviriler için panelde tek bir Cache Rule (`docs/cdn.md`); sunucu tarafı hazır.
- **Play Games girişi**: Play Console'da kurulum, sonra proje numarası `game_services_project_id`'ye (`docs/guvenlik-logu.md`).
- **Koşma**: kodda duruyor, şimdilik kapalı (`PlayerController.js` `run`, `Joystick.js` 🏃 düğmesi).
- **Kredi paketleri (kapalı)**: satın almalar sunucuda doğrulanınca (Google Play Developer API, service account) ve Play Console ürünleri (`credits_50/200/500`) açılınca `SELL_PACKS = true` (Billing.js).
