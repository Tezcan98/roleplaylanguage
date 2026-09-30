# Yılmaz Ailesi

Köyde yaşayan bir ailenin hikayesi içinde Türkçe öğreten 3D rol yapma oyunu (Three.js, build adımı yok).

## Çalıştırma

ES modülleri `file://` üzerinden yüklenmez, bu yüzden bir yerel sunucu gerekir:

```bash
npm start                  # http://localhost:8080
# ya da
python3 -m http.server 8080
```

`?debug` ile açınca `window.__game` üzerinden sistemlere erişilebilir (otomatik test için).

## Mimari

```
index.html            sadece iskelet + importmap
css/style.css         tüm stiller
src/
  main.js             composition root: her nesne burada kurulur ve bağlanır
  core/               EventBus, GameState, ModeStack, GameContext, Game (döngü)
  engine/             RenderContext, TextureFactory, MeshFactory, ModelLibrary/PropFactory,
                      CollisionWorld, CameraController
  world/              Location (temel sınıf), LocationManager, locations/HouseInterior, Yard
  entities/           Character, CharacterRig, Npc, Player, Behaviors
  systems/            Time, DayNightLighting, Inventory, Vocabulary, Input, PlayerController,
                      CastDirector, ItemSystem, EffectRunner, StoryDirector, TravelService,
                      InteractionSystem, QuestMarker
  dialogue/           DialogueController (mantık)
  activities/         Activity arayüzü + ChoiceActivity (alıştırma tipleri)
  services/           TextToSpeech
  ui/                 DOM bileşenleri (Hud, QuestPanel, DialogueView, CardOverlay, ...)
  content/            veriler: story, dialogues, characters, items, hotspots
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
