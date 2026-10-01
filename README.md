# Yılmaz Ailesi

Köyde yaşayan bir ailenin hikayesi içinde Türkçe öğreten 3D rol yapma oyunu (Three.js, build adımı yok).

**Oyna:** https://tezcan98.github.io/roleplaylanguage/

## Çalıştırma

ES modülleri `file://` üzerinden yüklenmez, bu yüzden yerel sunucu gerekir:

```bash
npm run voices   # bir kez: Piper Türkçe sesleri assets/voices/ içine indirir (~120 MB)
npm start        # http://localhost:8080
```

`npm start`, COOP/COEP başlıklarıyla sunan bir sunucudur (`tools/serve.mjs`). Bu başlıklar sayesinde ses motoru çok çekirdekli çalışır ve cümle başına süre ~1 sn'ye iner.

URL parametreleri:
- `?debug`: `window.__game` üzerinden sistemlere erişim (otomatik test için).
- `?fakemic`: mikrofon yerine beklenen cevabı "duyan" sahte tanıyıcıyı kullanır (test için).
- `?fresh`: kayıtlı oyunu yok sayar. `?quality=high|medium|low`: kalite ayarını geçersiz kılar. `?fastclass`: sınıf botlarını hızlandırır.

`assets/manifest.json` içindeki isteğe bağlı ayarlar: `sttEndpoint` (Whisper sunucusu), `classroomServer` (multiplayer WebSocket sunucusu, `src/services/multiplayer/ClassroomSession.js` içindeki protokol).

## Ses

- **Konuşma (TTS):** Piper nöral sesleri (`fahrettin`, `fettah`, CC0), `services/speech/piper.worker.js` içinde ONNX ile çalışır. Her karakterin sesi ve perdesi `content/characters.js` → `VOICES` içinde tanımlı. Model hazır olana kadar tarayıcının kendi sesi aynı perdeyle konuşur. Ekranda görünen satır arka planda önceden sentezlenir.
- **Dinleme (STT):** varsayılan olarak tarayıcının Web Speech API'si kullanılır. `assets/manifest.json` içine `"sttEndpoint": "http://.../stt"` eklenirse ses kaydı bu sunucuya gönderilir (Whisper gibi bir sunucu, `{ text, language, language_probability }` döndürmeli). Whisper'ın dil tespiti, oyuncunun gerçekten Türkçe konuşup konuşmadığını doğrular. Sunucu yoksa `LanguageDetector` metin üzerinden tahmin yapar.

## Oyunda neler var

- **İki günlük hikaye (9 bölüm):** Pazar sabahı → kahvaltı → çamaşır → masal → akşam yemeği → gece/uyku → Pazartesi okul → ödev. Saat görevlerle ilerler, gece ve gündüz değişir.
- **Alıştırma tipleri:** seçmeli, dinleme (cümle gizli, sesle duyulur), kelime sıralama, sesli konuşma (konuşma tanıma + Türkçe tespiti + benzerlik puanı).
- **Dede'nin masalları:** her ziyarette yeni bir etkileşimli Nasreddin Hoca masalı (5 masal).
- **Köy meydanı:** avlunun doğusundan gidilir; bakkal ve muhtarla konuşulur.
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
                      LessonController, TextbookController, AutoSave
  dialogue/           DialogueController (mantık)
  activities/         Activity arayüzü + Choice, Listen, Order, Speak
  services/           speech/ (Piper TTS, STT, dil tespiti), monetization/ (kredi, reklam, ders kapısı),
                      multiplayer/ (ClassroomSession: yerel botlar, WebSocket), storage/, Settings
  ui/                 DOM bileşenleri (Hud, QuestPanel, DialogueView, CardOverlay, ...)
  content/            veriler: story, dialogues, tales, characters, items, hotspots,
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

- **Görev / bölüm:** `src/content/story.js`. Bir bölüm saati, kimin nerede durduğunu (`cast`) ve görev zincirini belirler. Karakterler sadece bölüm geçişlerinde yer değiştirir, böylece kimse oyuncunun gözü önünde ışınlanmaz.
- **Diyalog:** `src/content/dialogues.js`. Düğümler `say/en/words/hint/options` alanlarından oluşur. Seçenekler `next`, `do` (efektler) ve `wrong` alanlarını alır.
- **Eşya:** `src/content/items.js`. **Kapı ve geçiş:** `src/content/hotspots.js`.

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
