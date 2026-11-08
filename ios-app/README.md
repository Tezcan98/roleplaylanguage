# Türk Ailem — iOS

Ayrı Capacitor iOS paketi; Android uygulaması `mobile/` içinde kalır. React Native'e yeniden yazım yapılmaz. EAS'te standart native Xcode iş akışı kullanılır; CocoaPods ve Xcode derlemesi buluttaki macOS makinesinde çalışır.

- Expo sahibi: `tezcan98`
- Slug: `turk-ailem-ios`
- EAS projectId: `b5e5a4ff-17e0-4a4b-a4b8-793626b14203`
- Bundle ID: `com.nssoft.turkailem.ios`
- Apple Team: `29ZC3SL63L` (API ve mevcut sertifikanın OU alanıyla doğrulandı; yeni Bundle ID kaydı yapıldı)

```bash
npm ci                       # repository root: game dependencies
npm ci --prefix ios-app
npm run sync --prefix ios-app # offline game and native runtime config
cd ios-app
npx eas-cli@latest build --platform ios --profile simulator
npx eas-cli@latest build --platform ios --profile production
```

Xcode projesi EAS'in beklediği `ios/App.xcodeproj`, `ios/Podfile` düzenindedir. `cap sync ios` yerine `npm run sync` kullanılır; doğrudan Capacitor CLI varsayılan iç içe `ios/App/` projesini tekrar oluşturur. Yeni native eklenti eklenirse Podfile ve runtime-config.json da güncellenmelidir.

`.easignore` yalnızca ios-app/ ağacını ve hazırlanmış www/ dosyalarını yükler; Android anahtarları, sunucu dosyaları, kullanıcı ekleri ve diğer projeler gönderilmez. `npm run prepare:web` bulut yüklemesinden önce yerelde çalıştırılır. `www/` Git'e yazılmaz; EAS arşivinde bulunur.

İlk derleme varsayılan EAS imajının iOS 17.5 SDK'sını seçmesi nedeniyle satın alma eklentisinde hata verdi. Capacitor 8 ve StoreKit için imaj Xcode 26.6 olarak sabitlendi.

## Bulut derleme sonucu

2026-11-08: Xcode 26.6 üzerinde iOS simülatör derlemesi başarıyla tamamlandı.
Build: `f72b4111-0d96-4b33-aee6-6a92070164d9`
https://expo.dev/accounts/tezcan98/projects/turk-ailem-ios/builds/f72b4111-0d96-4b33-aee6-6a92070164d9
Bu simülatör paketidir; imzalı cihaz/TestFlight paketi veya gerçek iOS çalıştırma testi değildir.

## Henüz yayımlama koşulları tamamlanmadı

- `enes0tezcan@gmail.com` App Manager rolünde; Developer portalı erişimi yok, fakat mevcut API anahtarı ile yeni Bundle ID ve imzalama profili oluşturuldu. Bu adım için hesap sahibi girişi gerekmiyor. Mağaza kaydı için App Store Connect tarayıcı oturumu açılmalı; tarayıcı aracı şu an Work ayarlarında kapalı.
- Bundle ID kaydı tamamlandı. Yeni App Store Connect uygulama kaydı oluşturulmalı; **bu uygulamanın** ascAppId değeri eas.json submit.production.ios alanına eklenmeli.
- İmzalama yapılandırıldı: ges-kumanda hesabındaki 29ZC3SL63L sertifikası doğrulandı ve yeni projenin tezcan98 hesabında güvenli biçimde yeniden kullanıldı. Apple sertifikası iptal edilmedi veya değiştirilmedi. Yeni Bundle ID için App Store profili oluşturulup EAS build credentials kaydına bağlandı. Mevcut API anahtarının eski uygulamaya ve bu ekibin sertifikalarına erişimi Apple API üzerinde doğrulandı. Henüz App Store Connect yüklemesi yapılmadı.
- Şu an yalnızca Google'ın iOS test AdMob kimlikleri kullanılıyor. Gerçek iOS AdMob uygulama kimliği Info.plist'e, reklam birimleri manifest.admobIos alanına girilmeli. Android reklam birimleri iOS'ta kullanılmaz.
- Uygulama simgesi hâlâ Capacitor şablonu; mevcut oyun simgesi App Store'un 1024×1024 biçimine hazırlanmalı.
- iOS ekran görüntüleri, App Privacy, yaş derecelendirmesi, inceleme notları, destek ve gizlilik sayfaları gerçek iOS kullanımıyla eşleştirilmeli.
- Kredi satışı uzaktan yapılandırmada kapalı. Açılacaksa Apple StoreKit ürünleri ve fiyatları oluşturulmalı; Apple incelemesi tamamlanmadan açılmamalı.
- Apple App ID geldiğinde iOS mağaza puanlama/paylaşma bağlantıları eklenmeli. iOS'ta Google Play'e yönlendiren güncelleme ve puanlama devre dışı.
- Android OTA'sı iOS'ta çalıştırılmaz. Google Play Games ve Android Firebase yapılandırması iOS'ta kullanılmaz.
- Gerçek iPhone / iOS simülatöründe çalıştırma testi henüz yapılmadı. Bulutta derlemek veya web önizlemesi bu testin yerine geçmez.
