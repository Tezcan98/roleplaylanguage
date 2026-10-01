# Play Store yayın listesi

✅ yapıldı · 🔧 kodda (Claude) · 🔑 senden anahtar/hesap · 📝 senin dolduracağın form/metin (ChatGPT yardım edebilir)

## Senden gerekenler (API anahtarları ve hesaplar)

| # | Ne | Nereden | Nereye yazılacak |
|---|---|---|---|
| 1 | **Google Play geliştirici hesabı** (tek seferlik 25 $) | play.google.com/console | — |
| 2 | **AdMob uygulama kimliği** (`ca-app-pub-XXXX~YYYY`) | admob.google.com → Uygulamalar → Uygulama ekle | `android/app/src/main/AndroidManifest.xml` → `com.google.android.gms.ads.APPLICATION_ID` (yer tutucu hazır) |
| 3 | **AdMob ödüllü reklam birimi kimliği** (`ca-app-pub-XXXX/ZZZZ`) | AdMob → Reklam birimleri → Ödüllü | `assets/manifest.json` → `"admob": { "rewardedId": "…" }` |
| 4 | **Çok oyunculu sunucu adresi** (`wss://…/ws/village`) | Render / Fly.io / VPS'e `npm run server` | `assets/manifest.json` → `"villageServer"` |
| 5 | **TURN sunucusu** (sesli sohbet farklı ağlarda bağlansın): kullanıcı adı + şifre | metered.ca / Twilio Network Traversal | `assets/manifest.json` → `"iceServers"` |
| 6 | **İmzalama anahtarı (keystore)** — senin bilgisayarında üretilir, **kaybetme** | `keytool -genkey -v -keystore yilmaz.keystore -alias yilmaz -keyalg RSA -keysize 2048 -validity 10000` | Android Studio → Generate Signed Bundle |
| 7 | (İsteğe bağlı) **Whisper konuşma tanıma sunucusu** | kendi sunucun (faster-whisper) | `assets/manifest.json` → `"sttEndpoint"` |
| 8 | (İsteğe bağlı) **Firebase** çökme raporu: `google-services.json` | console.firebase.google.com | `android/app/` |

> Anahtarlar istemciye gömülür ama bunlar gizli değildir (AdMob kimlikleri ve sunucu adresleri herkese açık bilgilerdir). Gizli anahtar (ör. OpenAI) **asla** uygulamaya konmaz; bir sunucu arkasında tutulur.

## Liste

### 1. Paketleme
- 🔧 Üretim derlemesi `npm run build` → `dist/` (three.js ve yazı tipleri pakete gömülü, internetsiz açılır).
- 🔧 Capacitor Android yapılandırması ve native adapterları; `android/` projesi/Gradle APK üretimi çalışma ortamında henüz doğrulanmadı.
- 🔧 Yatay ekran manifest ayarı, Android geri tuşu ve arka plana geçince sesin durması (native lifecycle kodu eklendi; cihaz testi bekliyor).
- 📝 Uygulama ikonu 512×512 ve tanıtım görseli 1024×500 (ChatGPT).
- 🔑 İmzalı AAB (keystore, madde 6).

### 2. Ses
- 🔧 Android WebView'de tarayıcı konuşma tanıması yok → yerel eklenti (`@capacitor-community/speech-recognition`).
- 🔧 Sesli okuma: telefonun Türkçe sesi (`@capacitor-community/text-to-speech`); Piper (~120 MB) isteğe bağlı kalır.

### 3. Para kazanma
- 🔧 AdMob ödüllü reklam adaptörü (`AdProvider` arayüzüne). 🔑 madde 2–3.
- (Sonra) kredi paketi satışı: Google Play Billing.

### 4. Çok oyunculu meydan
- ✅ Toplu alanda yazı, birebir sesli sohbet onayla.
- 🔑 Sunucu ve TURN (madde 4–5).
- 🔧 Kullanıcı adı küfür filtresi, yazı sansürleme ve cihaz bazlı oyuncu engelleme altyapısı.
- ⚠️ Hedef kitle çocuk içeriyorsa (Families politikası) çocuk modunda sesli sohbet kapalı olmalı.

### 5. Mağaza / yasal (📝 ChatGPT taslak hazırlayabilir)
- 🔧 `docs/store/privacy-policy.md` taslağı hazır; yayınlanmadan önce gerçek şirket/iletişim ve veri işleyenler eklenmeli.
- 🔧 `docs/store/data-safety.md` ve `docs/store/content-rating.md` taslakları hazır; Play Console'da gerçek SDK/veri akışıyla doğrulanmalı.
- 🔧 `docs/store/listing.md` içinde AR/TR/EN mağaza metinleri hazır; ekran görüntüleri ve grafikler ayrıca hazırlanmalı.

### 6. Dil
- ✅ Arapça açıklamalar, sağdan sola, Arapça yardım düğmesi ve tanıtım.

### 7. Kalite
- ✅ `npm run check` içerik doğrulaması, otomatik oynanış testleri.
- 🔧 Telefonda varsayılan "düşük" kalite.
