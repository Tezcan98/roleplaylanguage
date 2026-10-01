# mobile — Android uygulaması (şimdilik rafta)

`web/dist`'i Capacitor ile Android uygulamasına paketleyen proje. Şu an geliştirilmiyor;
kod tarafı hazır:

- Yerel adaptörler `web/src/platform/native.js` üzerinden yalnızca uygulamanın içinde yüklenir
  (konuşma tanıma, telefonun Türkçe sesi, AdMob ödüllü reklam, geri tuşu).
- `capacitor.config.json` → `webDir: ../web/dist`.

Devam ederken:

```bash
npm install                 # kökte
cd mobile
npx cap add android         # ilk sefer, android/ klasörünü üretir (commit edilir)
npm run sync                # web'i derler ve android/ içine kopyalar
npm run open                # Android Studio
```

Gerekenler: JDK 21, Android SDK 36. Keystore, `google-services.json` ve derleme çıktıları
asla commit edilmez (`.gitignore`). Yayın listesi: `docs/RELEASE.md`.
