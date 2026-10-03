# mobile — Android uygulaması (Anadolu Ailesi)

`web/dist`'i Capacitor ile Android uygulamasına paketler. Paket adı `com.anadoluailesi.app`.

```bash
cd mobile
npm install
npm run release        # web'i derler, android/ içine kopyalar, imzalı APK + AAB üretir
```

Çıktılar: `android/app/build/outputs/apk/release/app-release.apk` ve
`android/app/build/outputs/bundle/release/app-release.aab` (Play Store'a AAB yüklenir).

- JDK 21 (`~/.jdks/jdk-21…` ya da `JAVA_HOME`), Android SDK 36.
- İmza: `android/keystore.properties` → `~/AnadoluAilesi-imza/upload.jks`. İkisi de git'e girmez.
  **Bu anahtar kaybolursa uygulama güncellenemez** — yedekle.
- Her yeni sürümde `android/app/build.gradle` → `versionCode` bir artırılır.
- AdMob uygulama kimliği: `android/app/src/main/res/values/strings.xml` → `admob_app_id`
  (şimdilik Google'ın test kimliği). Reklam birimleri: `web/assets/manifest.json` → `admob`.
- Kredi paketleri Play Console'da tüketilebilir ürün olarak açılır: `credits_50`, `credits_200`, `credits_500`.
