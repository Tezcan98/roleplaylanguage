# Tanıtım videoları (YouTube Shorts) — devir notu

Başka bir ajan bu işi sürdürecek. Bu dosya durumu, araçları, bilinen sorunları ve bekleyenleri anlatır.
Her şey oyunun kendisinden kare kare çekilir (Playwright + sanal saat + ffmpeg); ayrı bir video editörü yok.

## Hedef

- **Dikey Shorts** (1080×1920), TR / EN / AR. Kitle: **ebeveynler** (çocuk gelişimi, dil gelişimi, sosyalleşme). Ürün, Türkçede "dil gelişim ve sosyalleşme oyunu" diye anlatılıyor; "Türkçe öğrenme oyunu" denmez. EN/AR'da "Learn Turkish" kalır.
- İki tür video:
  1. **15 saniyelik tanıtım** (`--kids`): 5 sahne, her dilde bir tane. **Hazır.**
  2. **Seri bölümleri** (`--episode=<ad>`, her biri ~19 sn, bir özellik): `park` ve `speak` çekildi (kusurlu sahneler var, aşağıda). `okul`, `aile`, `satranc-dama`, `meydan` yazılacak.
- Ses: **ElevenLabs** ile kullanıcı yapacak. Biz müzikli, sessiz sürüm + okunacak metin + zamanlama veriyoruz; ElevenLabs mp3'leri gelince `--join --vo=` ile videoya yerleşir.

## Dosyalar

| Dosya | Ne |
|---|---|
| `web/tools/promo/record.mjs` | Çekici. Sahneleri oynatır, kare kare kaydeder, ffmpeg ile birleştirir, ses katmanını (`kidsAudio`) ekler |
| `web/tools/promo/kids-scenes.mjs` | 15 sn'lik videonun sahneleri + ortak yardımcılar (`start`, `fixed`, `showLabels`, `showToasts`) + `KIDS_VO` (okunacak cümleler) |
| `web/tools/promo/series.mjs` | Seri bölümleri (`EPISODES`: sahneler + `vo`) |
| `web/tools/promo/scenes.mjs` | Eski uzun (16:9) ve eski short tanıtım sahneleri (Play Store videosu), dokunma |
| `web/tools/promo/feature-graphics.mjs` | Play Store öne çıkan görselleri (1024×500, 7 dil) |

Çıktı klasörü: `~/Desktop/AnadoluAilesi-release/store/shorts/` (15 sn'likler) ve `…/shorts/seri/` (seri). `klipler-<dil>/` ElevenLabs birleştirmesi için sahne klipleridir (15 sn'liklerde var; seri klipleri şu an bilgisayarın geçici klasöründe, gerekirse yeniden çekilir).

## Komutlar (`web/` klasöründen)

```bash
# 15 sn'lik tanıtım — bütün sahneler, tek dil
nice -n 10 node tools/promo/record.mjs <çıktı-klasörü> --kids --lang=tr      # tr | en | ar
# yalnızca bir sahneyi yeniden çek, sonra birleştir (aynı komut --only olmadan, ya da --join)
nice -n 10 node tools/promo/record.mjs <klasör> --kids --lang=tr --only=kWords
nice -n 10 node tools/promo/record.mjs <klasör> --kids --lang=tr --join
# seri bölümü
nice -n 10 node tools/promo/record.mjs <klasör> --episode=park --lang=en
# ElevenLabs sesi eklemek: <mp3 klasörü>/1.mp3 … 5.mp3 (satır sırasıyla)
nice -n 10 node tools/promo/record.mjs <klasör> --episode=park --lang=en --join --vo=<mp3 klasörü>
```

Çıkan dosyalar (`<klasör>/`): `turk-ailem-15sn-<dil>.mp4` (sessiz ham), `…-muzik.mp4` (oyunun bahçe müziği altta), `…-ses.mp4` (Gemini sesli taslak), `…-elevenlabs.mp4` (`--vo` ile), `…-seslendirme.txt` (her satırın başlama saniyesi). Seri için `turk-ailem-<bölüm>-<dil>…`.

Her komut bir dil çeker. Bir dil ≈ 6–8 dk, üç dil art arda ≈ 25 dk. Bilgisayarı yormamak için hep `nice -n 10`, aynı anda tek çekim.

## Sahne yazma kuralları (yazarken bunlara dikkat)

- Sahne = `{ name, seconds, setup(kit), act(kit, page) }`. `setup` kayıtta değildir (hazırlık), `act` süre boyunca kayıttadır. Zamanlama `kit.sleep` ile **sanal** süredir; gerçek `setTimeout` kullanma.
- `kit.big(page, { tr, en, ar })` ekrana tek büyük satırı (video dilinde) koyar. `kit.card(page, html)` kapanış kartı.
- `start(kit)`: yeni oyun açar (park başlangıcı), tüm kartları kapatır, HD karakter + günlük kıyafet verir, arayüzü gizler. Meydan bağlantısı/rıza kartı için `dataConsent` ve `villageIntroSeen` ayarlanır (kamera önünde çıkmasın).
- Kamera: `fixed(page, [x,y,z], [bakılan x,y,z])`. Kamera sabitken oyuncu karakteri yürümez; yürütmek için `kit.walk` ya da `parkPlay`/diyalog kullan.
- **Duvara/çite çarpma:** sahnede karakter yürüyorsa yolun açık olduğunu doğrula (test ederken at/oyuncu çite takılınca ölçüm ve çekim boşa gider). Konumları `web/src/world/locations/VillageSquare.js` ve `docs`/kodundan al. Meydan: çit ±52 (batı/kuzey/güney), doğu 96.
- Park: x −46…−32, z 13…25 (`PARK`). Salıncaklar x≈−42.3 civarı, z≈15.6; kaydırak x≈−34.2; `window.__game.parkPlay.swing()/slide()/seesaw()` oyuncuyu oynatır.
- Konuşma balonu ağdan bağımsız: `g.labels.bubble(karakter, 'metin', null, saniye, 'İngilizce anlamı')`. `village.say()` meydana bağlıyken çalışır (çekimde bağlantı hazır olmayabilir, güvenme).
- Konuşma penceresi: `g.dialogue.open('anne', 'br1')` (düğüm adı). Mikrofon tıklaması: `#dlg .mic` (oyunda sahte mikrofon `?fakemic` açık, cevabı kendisi verir).
- Dil: `--lang=tr` oyunu **"Sadece Türkçe"** modunda çeker (ekranda yabancı dil yok). `en`/`ar` oyundaki açıklamaları o dilde gösterir.
- Gerçek oyuncu kalabalığı gereken sahne için eski `scenes.mjs`'teki `square(...)`/`CROWD` örneğine bak (yerel köy sunucusu açar, ağır).

## Durum

**15 sn'lik video (TR/EN/AR): bitti.** Sahneler: kHook (parkta salıncak), kSpeak (anne + mikrofon), kWords (kelime defteri + kaydırak), kHelp (dedeye yardım), kEnd (kapanış kartı). Türkçe metinler son sürüm ("Dil gelişim ve sosyalleşme oyunu"). Arapçada Gemini ses taslağı çıkmadı (sunucu ses kotası dolu); sorun değil, ElevenLabs kullanılacak.

**Seri:**
- `park` (pWide, pSlide, pSwing, pFriends, pEnd) ve `speak` (sMom, sDede, sHint, sFriends, sEnd) 3 dilde çekildi, ama:
  - **pSlide**: kamera kötüydü (çocuk kadrajdan çıkıyor). Koda düzeltme yazıldı (`series.mjs`: kamera kaydırağın önünde; Emre ve Mert uzaklaştırılıyor) ama **yeniden çekilmedi**. Kullanıcı "kaydırağı bırak, basit videolar çek" dedi: bu sahneyi seriden çıkar veya sadeleştir.
  - **sFriends**: konuşma balonları üst altyazıyla çakışıyor; kamera yükseltilip düzeltme yazıldı, **yeniden çekilmedi**.
  - sHint (yanlış cevapta ipucu) ekran görüntüsünde ipucu anına denk gelmedi; çekimden sonra kareleri kontrol et.
- Kalan bölümler **yazılmadı**: `okul` (ders, okul kitabı, kelime pratiği), `aile` (kahvaltı sofrası, dedenin masalı, bahçe), `satranc-dama` (İsmail Dede, Rıfat Amca), `meydan` (gerçek oyuncular: yazılı/sesli konuşma).

## Beklenen akış

1. Kusurlu iki sahneyi düzelt/çıkar, seriyi **tek dilde** (TR) çek, `ffmpeg -ss … -frames:v 1` ile kareleri gözle kontrol et. Sonra EN/AR.
2. Kalan bölümleri `series.mjs`'e ekle (`EPISODES.<ad> = { scenes: [...], vo: { tr, en, ar } }`), önce TR çek, kareleri kontrol et.
3. Kullanıcıya `…-muzik.mp4` + `…-seslendirme.txt` ver. Kullanıcı ElevenLabs'te her satırı ayrı mp3 yapıp `1.mp3…N.mp3` olarak klasöre koyunca `--join --vo=` ile birleştir; çıkan `…-elevenlabs.mp4` yayına hazırdır.
4. Her bölümün dosyalarını `~/Desktop/AnadoluAilesi-release/store/shorts/seri/` içine kopyala.

## Bilinen tuzaklar

- **Disk dolabilir.** Her çekim klasöründe `frames-*` JPEG klasörleri GB'larca yer tutar (~400 MB/video). Çekim bitince `rm -rf <klasör>/frames-*` ile sil. (Bu oturumda disk %100 doldu, derleme çöktü.)
- Ses satırını sunucudan (Gemini) alma `https://anadoluailesi.com.tr/api/tts?v=kadin&t=...` ile yapılır; kota doluysa 503/502 verir, araç bunu hata saymaz (müzikli video ve metin yine yazılır).
- Sanal saat yalnızca sayfa zamanlayıcılarını dondurur; sahnede gerçek ağ beklemesi (meydana bağlanma) varsa sürelere güvenme.
- Kapanış kartı CSS'i `record.mjs` içindeki `PROMO_CSS`'te; `kids` sınıfı büyük altyazıdır.
- Oyunun adı: TR "Türk Ailem", EN "My Turkish Family", AR "عائلتي التركية". Alan adı `anadoluailesi.com.tr`; Google Play bağlantısı `com.anadolu`.
- Kitlenin hassasiyeti: Müslüman aile/çocuk kitlesi. Yüzü açık/çıplak kıyafet, müzik aletlerinin ağır kullanımı, "dans" öne çıkarılmaz; günlük kıyafetli karakter ve uzun kıyafet kullanılıyor. Sahnelerde zaten böyle (HD karakter + `hd-casual`).

## Bitmiş işlerin kısa listesi (bağlam)

- Oyun yeni başlangıcı: meydandaki park, annenin çağrısı, tek menü düğmesi ("Hikayeye başla").
- "Sadece Türkçe" modu (kelimeler Türkçe tanım + örnek cümleyle).
- Play Store: 1.0.35 AAB hazır, sürüm notları `~/Desktop/AnadoluAilesi-release/surum-notlari-1.0.35.txt`.
