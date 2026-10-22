# Canlı güncelleme (OTA)

Android uygulamasının web kısmı (kod, metinler, görevler, sesler, müzik, modeller) Play Store'a
gitmeden güncellenir.

- **Yayınlamak:** `tools/deploy.sh`. Siteye giden her yayın aynı zamanda uygulamalara giden
  güncellemedir; ayrı bir adım yok.
- **Nasıl:** `npm run build` sonrası `web/tools/ota-stamp.mjs`, `dist/version.json` (bu paketin
  sürümü) ve `dist/ota.json`'u (son sürüm + her dosyanın SHA-256'sı) yazar. Uygulama açılışta
  `https://anadoluailesi.com.tr/oyun/ota.json`'a bakar (`web/src/platform/native.js` → `liveUpdate`), yalnız
  elinde olmayan dosyaları indirir (`@capgo/capacitor-updater`, kendi sunucumuz, Capgo bulutu kapalı)
  ve yeni sürüm uygulama bir sonraki açıldığında (ya da arka plandan dönünce) başlar.
- **Güvenlik:** yeni sürüm 60 sn içinde açılamazsa (`notifyAppReady` çağrılmazsa) eklenti önceki
  sürüme döner. Sunucudaki sürüm eldekinden eskiyse indirilmez. Play'den yeni APK gelince
  (`resetWhenUpdate`) uygulamanın içindeki sürüme dönülür.
- **Yerli değişiklikler hâlâ Play Store ister:** yeni bir Capacitor eklentisi, izin, AdMob uygulama
  kimliği, ikon. Böyle bir değişiklikte `ota-stamp.mjs` içindeki `NATIVE`'i yeni versionCode'a çıkar:
  eski uygulamalar o web paketini almaz, Play güncellemesini bekler.
- **HTML:** Cloudflare HTML sayfalarına kendi analiz betiğini ekliyor (özet tutmaz); bu yüzden
  `.html` dosyaları `dist/ota-raw/*.txt` kopyalarından indirilir.
