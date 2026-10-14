# Uzaktan ayarlar

`site/config.json` → https://sehem2.com.tr/config.json. Değiştir, `tools/deploy-sehem2.sh` ile yayınla:
web'de ve uygulamada bir sonraki açılışta geçerli olur (yeni sürüm gerekmez). Eksik ya da yanlış
türde bir değer (sayı yerine yazı, eksi sayı) yok sayılır, koddaki varsayılan kullanılır
(`web/src/config/remote.js` → `DEFAULTS`). İnternet yoksa son okunan ayarlar kullanılır.

| Anahtar | Ne |
|---|---|
| `prices.horseRide` | at kirası (kredi) |
| `prices.bikeLearn` | bisiklet öğrenmek (kredi) |
| `prices.hd`, `prices.outfit`, `prices.aura`, `prices.adFree` | mağaza fiyatları (kredi) |
| `rewards.startCredits`, `rewards.startMoney` | yeni oyunun kredisi ve parası (TL) |
| `rewards.video`, `rewards.videoEveryHours` | ödüllü video: kaç kredi, kaç saatte bir |
| `rewards.daily` | günlük ödül, art arda 1., 2., … gün |
| `rides.minutes` | at kiralama süresi (dakika) |
| `ads.idleBannerSeconds` | kaç saniye kıpırdamayınca banner |
| `ads.menuBannerChance` | ana menüde banner olasılığı (0–1) |
| `ads.betweenDays` | hikâyede gün arası geçiş reklamı (true/false) |
| `ads.travelChance`, `ads.travelGapMinutes` | mekân geçişinde geçiş reklamı olasılığı (0–1) ve iki reklam arası en az dakika |
| `cities` | meydan şehirleri: `["kimlik", "Ad"]` (kimlik: küçük harf, rakam, tire) |
| `update.latestApp` | Play'deki en yeni uygulamanın versionCode'u: daha eski uygulamada "Yeni sürüm var" kartı (0: kapalı) |
| `update.text`, `update.en` | o kartın metni (boşsa hazır metin) |

Not: uygulama sürümü yeni bir şey getirdiğinde (yerli değişiklik), Play'de yayına girdikten sonra
`update.latestApp`'i o sürümün versionCode'una çıkar.
