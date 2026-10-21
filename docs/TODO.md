# Yapılacaklar

Sıradakiler yukarıdan aşağıya. Biten bir iş buradan silinir (ayrıntısı commit mesajında).

## Sırada

1. **Toplu konuşma alanları**: kahvehane ilk alan (içeridekiler birbirini duyar, yakındaki yüksek).
   Sırada: başka alanlar (çay bahçesi, cami avlusu?) ve 16 kişiden kalabalıkta en yakındakiler.
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

- **Şikayet mailleri**: SMTP başka sunucuda; oraya erişim verilince `server/src/Mailer.js` `send()` o sunucunun
  API'sine göre düzeltilecek (şimdilik `POST MAIL_API_URL` + `Bearer MAIL_API_KEY`, gövde `{ to, subject, text }`).
  Canlı sunucuya `MAIL_API_URL`, `MAIL_API_KEY`, `REPORT_MAIL_TO`, `PUBLIC_URL` (maildeki bağlantılar) eklenecek.
  O zamana dek şikayetler `https://<sunucu>/api/reports?key=<REPORT_KEY>` sayfasında; karar da oradan verilir.
- **Gemini ses formatı**: tarayıcılar sesi `audio/webm` / `audio/ogg` (opus), iPhone `audio/mp4` kaydediyor. Gemini'nin
  bunları gerçek bir şikayette doğru yazıya döktüğü canlıda denenmeli (`/api/reports` sayfasındaki döküm).
- **Gizlilik politikası / Play veri beyanı**: sesli sohbetler artık kaydediliyor ve şikayette Gemini'ye gidiyor;
  `docs/store/privacy-policy.md` güncellendi, yayımlanan sayfa ve Play Console "Veri güvenliği" formu (ses kaydı) da güncellenmeli.

- **Cloudflare önbellek kuralı**: modeller ve çeviriler için panelde tek bir Cache Rule (`docs/cdn.md`); sunucu tarafı hazır.
- **Play Store 1.0.17** (paket `com.anadolu`): AAB, metinler (tr/en/ru/ar), görseller ve sürüm notları `~/Desktop/AnadoluAilesi-release/` içinde; yükleme Play Console'dan.
- **Play Store veri beyanı**: konuşmaların saklandığı belirtildi; Play Console "Veri güvenliği" formu ve
  gizlilik politikası adresi son haline getirilecek (`docs/store/data-safety.md`, `docs/store/privacy-policy.md`).
- **Play Games girişi**: Play Console'da kurulum, sonra proje numarası `game_services_project_id`'ye (`docs/guvenlik-logu.md`).
- **Koşma**: kodda duruyor, şimdilik kapalı (`PlayerController.js` `run`, `Joystick.js` 🏃 düğmesi).
- **Kredi paketleri (kapalı)**: satın almalar sunucuda doğrulanınca (Google Play Developer API, service account) ve Play Console ürünleri (`credits_50/200/500`) açılınca `SELL_PACKS = true` (Billing.js).
