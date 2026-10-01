# Yılmaz Ailesi

Köyde yaşayan bir ailenin hikayesi içinde Türkçe öğreten 3D rol yapma oyunu (Three.js, build adımı yok).

**Oyna:** https://tezcan98.github.io/roleplaylanguage/

## Projeler

| Klasör | Ne | Nerede çalışır |
|---|---|---|
| [`web/`](web/) | Oyunun kendisi (three.js) | Tarayıcı: GitHub Pages; aynı kod mobil uygulamanın içinde |
| [`server/`](server/) | Köy meydanı çok oyunculu sunucusu (WebSocket) | Kendi sunucun (Docker + Caddy/HTTPS) — bkz. [server/README.md](server/README.md) |
| [`mobile/`](mobile/) | Android uygulaması (Capacitor) — **şimdilik rafta** | Google Play |

Hikaye, dersler, ses ve kayıt tamamen cihazda çalışır; sunucu yalnızca köy meydanı içindir.
Sunucu yoksa meydan tek kişilik açılır.

## Çalıştırma

```bash
npm install          # kökte, bir kez (web + server)
npm run voices -w web  # isteğe bağlı: Piper Türkçe sesleri (~120 MB)
npm start            # http://localhost:8080 — oyun + yerleşik köy meydanı (ws://localhost:8080/ws/village)
npm run server       # yalnızca üretim sunucusu (port 8090)
npm test             # sunucu testleri + içerik kontrolü + otomatik oynanış testleri
```

Aynı ağdaki başka bir cihazdan (telefon) `http://<bilgisayarın-ip>:8080` ile bağlanılır. Not: tarayıcılar mikrofonu sadece `https` ya da `localhost` üzerinde verir.

**Hangi meydan sunucusu?** `localhost`'ta yerleşik sunucu; GitHub Pages'te ve uygulamada `web/assets/manifest.json` → `"villageServer": "wss://…/ws/village"`. Adres çubuğunda `?mp=wss://…` ile geçersiz kılınır.

`npm start`, COOP/COEP başlıklarıyla sunan bir sunucudur (`tools/serve.mjs`). Bu başlıklar sayesinde ses motoru çok çekirdekli çalışır ve cümle başına süre ~1 sn'ye iner.

URL parametreleri:
- `?debug`: `window.__game` üzerinden sistemlere erişim (otomatik test için).
- `?fakemic`: mikrofon yerine beklenen cevabı "duyan" sahte tanıyıcıyı kullanır (test için).
- `?nointro`: ilk açılış tanıtımını atlar (testler için). `?gloss=en|ar`: açıklama dilini geçersiz kılar.
- `?mp=wss://…/ws/village`: başka bir meydan sunucusuna bağlanır (`?mp=local`: sayfanın kendi sunucusu).
- `?fresh`: kayıtlı oyunu yok sayar. `?quality=high|medium|low`: kalite ayarını geçersiz kılar. `?fastclass`: sınıf botlarını hızlandırır.

`assets/manifest.json` içindeki isteğe bağlı ayarlar: `sttEndpoint` (Whisper sunucusu), `classroomServer` (multiplayer WebSocket sunucusu, `src/services/multiplayer/ClassroomSession.js` içindeki protokol).

## Ses

- **Konuşma (TTS):** Piper nöral sesleri (`fahrettin`, `fettah`, CC0), `services/speech/piper.worker.js` içinde ONNX ile çalışır. Her karakterin sesi ve perdesi `content/characters.js` → `VOICES` içinde tanımlı. Model hazır olana kadar tarayıcının kendi sesi aynı perdeyle konuşur. Ekranda görünen satır arka planda önceden sentezlenir.
- **Dinleme (STT):** varsayılan olarak tarayıcının Web Speech API'si kullanılır. `assets/manifest.json` içine `"sttEndpoint": "http://.../stt"` eklenirse ses kaydı bu sunucuya gönderilir (Whisper gibi bir sunucu, `{ text, language, language_probability }` döndürmeli). Whisper'ın dil tespiti, oyuncunun gerçekten Türkçe konuşup konuşmadığını doğrular. Sunucu yoksa `LanguageDetector` metin üzerinden tahmin yapar.

## Oyunda neler var

- **Arapça:** Türkçe cümlelerin altındaki anlamlar, görevler, ipuçları ve bildirimler Arapça (sağdan sola). Menüden İngilizceye çevrilebilir. Köşedeki **؟ مساعدة** düğmesi şu anki görevi, çantayı, kontrolleri ve meydan kurallarını Arapça anlatır. İlk açılışta Arapça/Türkçe bir tanıtım gelir (menüde "Nasıl oynanır?" ile tekrar açılır). Ders kitabındaki hafıza kartları Arapça ses benzerlikleri kullanır (süt ≈ سوط, kova ≈ قهوة, kitap ≈ كتاب).

- **İki günlük hikaye (9 bölüm):** Pazar sabahı → kahvaltı → çamaşır → masal → akşam yemeği → gece/uyku → Pazartesi okul → ödev. Saat görevlerle ilerler, gece ve gündüz değişir.
- **Alıştırma tipleri:** seçmeli, dinleme (cümle gizli, sesle duyulur), kelime sıralama, sesli konuşma (konuşma tanıma + Türkçe tespiti + benzerlik puanı).
- **Yatsı namazı:** Pazar gecesi dede ezanı duyunca aile birlikte namaz kılar: lavaboda abdest adımları (el, ağız, burun, yüz, kol, baş, kulak, ayak), sonra seccadelerde dedenin imamlığında kıyam, rükû, secde, oturuş ve selam, ekranda adlarıyla.
- **Manav ve bakkal:** Pazar öğleden sonra manavdan elma ve patates (kilo, fiyat, toplam, para üstü), Pazartesi bakkaldan ekmek ve süt.
- **Sofra:** yemek sadece yemek vakitlerinde (kahvaltı, akşam yemeği, sofra kurulunca) sofrada durur.
- **Dede'nin masalları:** her ziyarette yeni bir etkileşimli Nasreddin Hoca masalı (5 masal).
- **Köy meydanı (çok oyunculu):** avlunun doğusundan gidilir; bakkal ve muhtarla konuşulur. İlk girişte kullanıcı adı sorulur. Toplu alanda konuşmalar **yazıyla** görünür: bas-konuş (düğme ya da `T`) söyleneni konuşma tanımayla yazıya çevirip herkese balon olarak gösterir. **Sesli sohbet birebirdir ve onay ister:** bir oyuncunun yanına gidip "sesli sohbet et" dersin, karşı taraf kabul ederse ikiniz arasında WebRTC sesli görüşme açılır (sessize al / bitir; uzaklaşınca kendiliğinden biter). Sunucu ses sinyalini yalnızca onaylı ikili arasında aktarır.
- **Serbest dolaşma:** TV, su içme, kitap okuma, pencereden bakma, el yıkama, bahçe sulama, top, kedi. **Ev kuralları:** ödev ya da iş varken, sofrada veya yatma saatinde TV açılınca anne uyarır ve özür dilettirir.
- **Okul:** kredi ya da reklamla girilen ders, öğretmenin sesli soruları, bot sınıf arkadaşlarıyla canlı puan tablosu (multiplayer arayüzü hazır).
- **Ders kitabı:** okuma, "fil hafızası" kartları (kelime ↔ sesi benzeyen İngilizce kelime ↔ komik resim), alıştırmalar. Ünite 1 günlük ödevdir.
- **Otomatik kayıt:** menüde "Devam et".
- **Görüntü:** gerçek CC0 dokular (~0,6 MB), gökyüzü kubbesi, rüzgarda sallanan çimen, post-processing. Kalite ayarı: yüksek / orta / düşük.

## Mimari

```
index.html            sadece iskelet + importmap
css/style.css         tüm stiller
src/
  main.js             composition root: her nesne burada kurulur ve bağlanır
  core/               EventBus, GameState, ModeStack, GameContext, Game (döngü)
  engine/             RenderContext, TextureFactory, MeshFactory, ModelLibrary/PropFactory,
                      CollisionWorld, CameraController
  world/              Location (temel sınıf), LocationManager,
                      locations/HouseInterior, Yard, VillageSquare, SchoolYard, Classroom
  entities/           Character, CharacterRig, Npc, Player, Behaviors
  systems/            Time, DayNightLighting, Inventory, Vocabulary, Input, PlayerController,
                      CastDirector, ItemSystem, EffectRunner, StoryDirector, TravelService,
                      InteractionSystem, QuestMarker, FreeActionSystem, ToySystem,
                      LessonController, TextbookController, AutoSave, RemotePlayers, VillageMultiplayer
  dialogue/           DialogueController (mantık)
  activities/         Activity arayüzü + Choice, Listen, Order, Speak
  services/           speech/ (Piper TTS, STT, dil tespiti), monetization/ (kredi, reklam, ders kapısı),
                      multiplayer/ (ClassroomSession, VillageNetwork, VoiceChat/WebRTC), storage/, Settings
server/               VillageServer (WebSocket: odalar, konumlar, yazı balonları, onaylı birebir görüşme ve WebRTC sinyali), index.mjs
  ui/                 DOM bileşenleri (Hud, QuestPanel, DialogueView, CardOverlay, ...)
  content/            veriler: story, dialogues, tales, characters, items, hotspots, addons/ (yatsı, manav — core/ContentComposer
                      ile açılışta eklenir), index.js (eklentiler uygulanmış içerik),
                      freeActions (+ ev kuralları), lessons, textbook
```

SOLID karşılıkları:

- **Tek sorumluluk:** her dosya tek iş yapar. Örneğin `DialogueController` akışı yönetir, `DialogueView` sadece DOM çizer, `StoryDirector` görev zincirini yürütür.
- **Açık/kapalı:** yeni alıştırma tipi `ActivityRegistry.register`, yeni efekt `EffectRunner.register`, yeni NPC animasyonu `Behaviors`, yeni etkileşim türü `InteractionSystem`'e yeni bir provider ile eklenir. Mevcut kod değişmez.
- **Liskov:** tüm `Activity` alt sınıfları aynı `mount → Promise` sözleşmesine uyar. Tüm `Location`'lar aynı `build(kit)` sözleşmesine uyar.
- **Arayüz ayrımı:** içerik scriptleri sistemleri değil, sadece okuma amaçlı `GameContext`'i görür.
- **Bağımlılıkların tersine çevrilmesi:** sistemler bağımlılıklarını constructor'dan alır. Somut sınıflar sadece `main.js`'te seçilir (ör. `WebSpeechTTS` yerine bulut TTS takılabilir).

Sistemler birbirini doğrudan çağırmak yerine `EventBus` üzerinden haberleşir (`core/events.js`).

## İçerik ekleme

- **Görev / bölüm:** `web/src/content/story.js`. Bir bölüm saati, kimin nerede durduğunu (`cast`) ve görev zincirini belirler. Karakterler sadece bölüm geçişlerinde yer değiştirir, böylece kimse oyuncunun gözü önünde ışınlanmaz.
- **Diyalog:** `web/src/content/dialogues.js`. Düğümler `say/en/words/hint/options` alanlarından oluşur. Seçenekler `next`, `do` (efektler) ve `wrong` alanlarını alır.
- **Eşya:** `web/src/content/items.js`. **Kapı ve geçiş:** `web/src/content/hotspots.js`.

## Test

`web/` klasöründe (ya da kökten `-w web` ile):

```bash
npm run check                 # içerik doğrulama: diyalog düğümleri, görev hedefleri, kilitli kapılar, gün adları
npm run playtest:smoke        # Pazar sabahından öğleden sonraya otomatik oynanış (~2 dk)
npm run playtest              # bütün haftayı baştan sona oynar (~10 dk); takılırsa teşhisle ve exit 1 ile durur
npm run playtest:multiplayer  # iki oyuncu: kullanıcı adı, yazı balonu, onaylı sesli sohbet, ses akışı, kopma
npm run playtest:standalone   # aynısı, ama meydan ayrı bir sunucuda (GitHub Pages + kendi sunucun düzeni)
npm run playtest:offline      # üretim derlemesi internetsiz açılıyor mu
npm test                      # hepsi (tam hafta hariç)
```

Sunucu: `npm test -w server` (gerçek WebSocket istemcileriyle protokol, filtre, köken, hız sınırı; ~1 sn).
Kurulu bir sunucuyu dışarıdan denemek: `node server/deploy/check.mjs wss://alan-adi/ws/village`, oyunla birlikte:
`npm run playtest:multiplayer -w web -- --village=wss://alan-adi/ws/village`.

Testler sunucuyu kendileri başlatır. Varsayılan olarak Playwright'ın Chromium'unu kullanırlar (CI). Yerelde `PLAYTEST_CHANNEL=chrome` daha hızlıdır, `PLAYTEST_HEADED=1` pencereyi gösterir. Hikaye testi `--from=<bölüm no>` ve `--to=<bölüm id>` alır. Başarısızlıkta ekran görüntüleri `web/playtest-results/` klasörüne düşer. GitHub Actions (`.github/workflows/test.yml`) her push'ta sunucu testleri + check + smoke + multiplayer + standalone + offline çalıştırır.

## Çeviri

Açıklamalar İngilizce yazılır, `src/i18n/ar.js` İngilizce → Arapça sözlüktür. Yeni içerik ekledikten sonra eksikleri gör: `node tools/extract-glosses.mjs --missing ar`. Elle yazılan arayüz metinleri `src/i18n/ar-ui.js` içinde.

## 3D model ve doku ekleme

`assets/manifest.json` dosyasına bir id eklersen o nesnenin prosedürel hali yerine GLB modeli ya da doku dosyası kullanılır. Model, prosedürel halin boyutuna otomatik oturtulur:

```json
{
  "models":   { "prop.sedir": "assets/models/sedir.glb", "char.anne": "assets/models/anne.glb", "item.kova": "assets/models/kova.glb" },
  "textures": { "kilim": "assets/textures/kilim.jpg" }
}
```

Id'ler: `prop.*` (Location dosyalarında `this.prop(kit, 'prop.x', ...)`), `item.<kind>`, `char.<npcId>` / `char.ahmet`. Doku adları `engine/TextureFactory.js` içindeki `GENERATORS` anahtarlarıdır.

`legacy/` klasöründe refactor öncesi tek dosyalık sürüm referans olarak duruyor.
