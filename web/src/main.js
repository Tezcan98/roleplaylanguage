import * as THREE from 'three';
import { CONFIG } from './config/remote.js'; // first: prices, rewards, cities set on the server (read before the content)
/**
 * Composition root: builds every object and wires dependencies. Nothing else in the
 * codebase calls `new` on a system — swapping an implementation happens here only.
 */
import { EventBus } from './core/EventBus.js';
import { EV } from './core/events.js';
import { GameState, START_CREDITS } from './core/GameState.js';
import { ModeStack } from './core/ModeStack.js';
import { GameContext } from './core/GameContext.js';
import { Game } from './core/Game.js';

import { RenderContext } from './engine/RenderContext.js';
import { TextureFactory } from './engine/TextureFactory.js';
import { MeshFactory } from './engine/MeshFactory.js';
import { ModelLibrary, PropFactory } from './engine/ModelLibrary.js';
import { CameraController } from './engine/CameraController.js';
import { PostFX } from './engine/PostFX.js';
import { SkyDome } from './engine/SkyDome.js';
import { Fireflies } from './engine/Fireflies.js';
import { Foliage } from './engine/Foliage.js';

import { LocationManager } from './world/LocationManager.js';
import { HouseInterior } from './world/locations/HouseInterior.js';
import { Yard } from './world/locations/Yard.js';
import { SchoolYard, PITCH } from './world/locations/SchoolYard.js';
import { Classroom } from './world/locations/Classroom.js';
import { VillageSquare, SQUARE_PITCH } from './world/locations/VillageSquare.js';
import { seatAt } from './world/seats.js';

import { Player } from './entities/Player.js';
import { Npc, HD_VILLAGERS } from './entities/Npc.js';

import { TimeSystem } from './systems/TimeSystem.js';
import { DayNightLighting } from './systems/DayNightLighting.js';
import { Inventory } from './systems/Inventory.js';
import { Vocabulary } from './systems/Vocabulary.js';
import { InputSystem } from './systems/InputSystem.js';
import { PlayerController } from './systems/PlayerController.js';
import { CastDirector } from './systems/CastDirector.js';
import { ItemSystem } from './systems/ItemSystem.js';
import { EffectRunner } from './systems/EffectRunner.js';
import { StoryDirector } from './systems/StoryDirector.js';
import { TravelService } from './systems/TravelService.js';
import { InteractionSystem, NpcInteractions, ItemInteractions, HotspotInteractions } from './systems/InteractionSystem.js';
import { QuestMarker } from './systems/QuestMarker.js';
import { FreeActionSystem } from './systems/FreeActionSystem.js';
import { ToySystem } from './systems/ToySystem.js';
import { Ball } from './entities/Ball.js';
import { Cat } from './entities/Cat.js';
import { LessonController } from './systems/LessonController.js';
import { TextbookController } from './systems/TextbookController.js';
import { CreditWallet } from './services/monetization/CreditWallet.js';
import { MockAdProvider } from './services/monetization/AdProvider.js';
import { isNativeApp, loadNativeAdapters, wireAppLifecycle, scheduleDailyReminder, updateGate } from './platform/native.js';
import { shareGame } from './platform/share.js';
import { HouseBanner } from './ui/HouseBanner.js';
import { ClassAccessGate } from './services/monetization/ClassAccessGate.js';
import { PlayBilling, NoBilling, SELL_PACKS } from './services/monetization/Billing.js';
import { SettingsPanel, defaultFps } from './ui/SettingsPanel.js';
import { FeedbackView } from './ui/FeedbackView.js';
import { ParkPlay } from './systems/ParkPlay.js';
import { Animals } from './systems/Animals.js';
import { Bicycle, bikeMount } from './systems/Bicycle.js';
import { Scooters, scooterMount } from './systems/Scooter.js';
import { KahveCirak } from './systems/KahveCirak.js';
import { DamaView } from './ui/DamaView.js';
import { ChessView } from './ui/ChessView.js';
import { DamaClub } from './systems/DamaClub.js';
import { HalayDance } from './systems/HalayDance.js';
import { el } from './ui/dom.js';
import { ShopView } from './ui/ShopView.js';
import { DailyRewardView } from './ui/DailyRewardView.js';
import { SHOP, outfitOn, outfitModel, auraOn, migrateWallet, isDress } from './content/shop.js';
import { LocalClassroomSession, WebSocketClassroomSession } from './services/multiplayer/ClassroomSession.js';
import { ClassroomView } from './ui/ClassroomView.js';
import { VillageNetwork } from './services/multiplayer/VillageNetwork.js';
import { VoiceChat } from './services/multiplayer/VoiceChat.js';
import { GroupVoice } from './services/multiplayer/GroupVoice.js';
import { RemotePlayers } from './systems/RemotePlayers.js';
import { VillageMultiplayer } from './systems/VillageMultiplayer.js';
import { UsernameDialog } from './ui/UsernameDialog.js';
import { PushToTalk } from './ui/PushToTalk.js';
import { CallUI } from './ui/CallUI.js';
import { ReportDialog } from './ui/ReportDialog.js';
import { ConsentDialog, CONSENT_VERSION } from './ui/ConsentDialog.js';
import { CaptionView } from './ui/CaptionView.js';
import { HelpPanel } from './ui/HelpPanel.js';
import { IntroSlides } from './ui/IntroSlides.js';
import { PrayerScene } from './systems/PrayerScene.js';
import { MealService } from './systems/MealService.js';
import { TextbookView } from './ui/TextbookView.js';
import { ActivityRegistry } from './activities/Activity.js';
import { ChoiceActivity } from './activities/ChoiceActivity.js';
import { ListenActivity } from './activities/ListenActivity.js';
import { OrderActivity } from './activities/OrderActivity.js';
import { SpeakActivity } from './activities/SpeakActivity.js';
import { DialogueController } from './dialogue/DialogueController.js';
import { WebSpeechTTS } from './services/speech/TextToSpeech.js';
import { PiperTTS } from './services/speech/PiperTTS.js';
import { ServerTTS } from './services/speech/ServerTTS.js';
import { CharacterVoices } from './services/speech/CharacterVoices.js';
import { SpeechRepo } from './services/speech/SpeechRepo.js';
import { Settings } from './services/Settings.js';
import { LocalSaveRepository } from './services/storage/SaveRepository.js';
import { AutoSave } from './systems/AutoSave.js';
import { WebSpeechRecognizer, RemoteSpeechRecognizer, ScriptedRecognizer } from './services/speech/SpeechRecognizer.js';
import { LanguageDetector } from './services/speech/LanguageDetector.js';
import { AnswerMatcher } from './services/speech/AnswerMatcher.js';
import { SpeechEvaluator } from './services/speech/SpeechEvaluator.js';

import { Hud } from './ui/Hud.js';
import { QuestPanel } from './ui/QuestPanel.js';
import { DirectionsCard } from './ui/DirectionsCard.js';
import { Minimap } from './ui/Minimap.js';
import { RoomCard } from './ui/RoomCard.js';
import { Stats } from './services/Stats.js';
import { Toasts } from './ui/Toasts.js';
import { LabelLayer } from './ui/LabelLayer.js';
import { Joystick } from './ui/Joystick.js';
import { ActionButton, ShotButton } from './ui/ActionButton.js';
import { InventoryView } from './ui/InventoryView.js';
import { Fader } from './ui/Fader.js';
import { CardOverlay } from './ui/CardOverlay.js';
import { MainMenu } from './ui/MainMenu.js';
import { WordDrill } from './systems/WordDrill.js';
import { ChessGame } from './systems/ChessGame.js';
import { Football } from './systems/Football.js';
import { TalkAreas } from './systems/TalkAreas.js';
import { Library } from './systems/Library.js';
import { Cinema } from './systems/Cinema.js';
import { CinemaView } from './ui/CinemaView.js';
import { ClipScreen } from './ui/ClipScreen.js';
import { RatePrompt } from './ui/RatePrompt.js';
import { NeyMusic } from './systems/NeyMusic.js';
import { BackgroundMusic } from './systems/BackgroundMusic.js';
import { BookReader } from './ui/BookReader.js';
import { Subtitles } from './ui/Subtitles.js';
import { AmbientTalk } from './systems/AmbientTalk.js';
import { KAHVE_UNCLES, KAHVEHANE, MOSQUE, LIBRARY, CHESS } from './world/locations/VillageSquare.js';
import { SERVERS, DEFAULT_SERVER, healthUrl } from './ui/ServerPicker.js';
import { ChoiceCard } from './ui/ChoiceCard.js';
import { CodeCard } from './ui/CodeCard.js';
import { DevCodes } from './services/DevCodes.js';
import { setupLandscape, iosBrowser, showIosGuide } from './ui/Landscape.js';
import { ListModal } from './ui/ListModal.js';
import { TableAndBins } from './systems/TableAndBins.js';
import { MarketView } from './ui/MarketView.js';
import { CHORE_PAY } from './content/goods.js';
import { DialogueView } from './ui/DialogueView.js';

import { gloss, wordNote, loadGlossLang, glossLang, meaning, example, withGloss } from './i18n/Gloss.js';
import { man } from './content/characters.js';
import { schoolDay } from './content/hotspots.js';
import { setPlayerGender, setPlayerLook, playerGender, playerName, personalizeContent, setTeacher, teacherInfo } from './i18n/Persona.js';
import { CharacterSetup } from './ui/CharacterSetup.js';
import {
  STORY, NPCS, PLAYER_LOOK, PLAYER_LOOK_GIRL, PLAYER_LOOKS, lookKey, VOICES, TEACHER_MAN, DIALOGUES, ITEMS, KIND_NAMES, HOTSPOTS, LINKS, FREE_ACTIONS, HOUSE_RULES,
  LESSONS, CLASSMATE_BOTS, TEXTBOOK, MEALS, PRAYER_STEPS, PRAYER_WORDS, KAHVE_TALKS, BOOKS, FILMS,
} from './content/index.js';

async function loadManifest() {
  try { const r = await fetch('assets/manifest.json', { cache: 'no-cache' }); return r.ok ? await r.json() : {}; } catch { return {}; }
}

const manifest = await loadManifest();
// canvas textures (signs, chalkboard, score boards) use Fredoka: both weights, with the Turkish letters — they are in a
// second part of the font (latin-ext) that a page only loads when it needs them; drawn before it, İ ğ ş came out in another font
await Promise.all(['700 40px Fredoka', '500 40px Fredoka'].map((f) => document.fonts?.load(f, 'ÇĞİÖŞÜçğıöşü').catch(() => {})));
const params = new URLSearchParams(location.search);
const host = document.getElementById('ui');

// --- core ---
const settings = new Settings();
/** Sound levels from the settings, 0–1: "Ses" (everything), "Karakter sesleri", "Müzik" (older saves: the on/off switches). */
const soundSetting = (k) => { const v = settings.get(`${k}Vol`); return typeof v === 'number' ? Math.max(0, Math.min(1, v)) : settings.get(`${k}On`, true) ? 1 : 0; };
const voicesLevel = () => soundSetting('sound') * soundSetting('voices'), musicLevel = () => soundSetting('sound') * soundSetting('music');
if (!SERVERS.some(([id]) => id === settings.get('serverRegion', DEFAULT_SERVER))) settings.set('serverRegion', DEFAULT_SERVER); // a city taken off the list (config.json)
const native = isNativeApp(); // inside the Android app
const nativeKit = native ? await loadNativeAdapters() : null;
if (native) await updateGate(nativeKit.App); // a newer build: downloaded and started now, before the game is built (never while playing)
// everyone starts on low (phones get hot, battery drains); once for those who had another value saved; medium / high is a choice, asked about (SettingsPanel)
if (!settings.get('qualityLow', false)) { settings.set('quality', 'low'); settings.set('qualityLow', true); }
const quality = params.get('quality') ?? settings.get('quality', 'low');
// on our own site the address carries the language: anadoluailesi.com.tr/oyun/en/ → meanings in English (kept as the player's choice)
const pathLang = location.pathname.match(/\/oyun\/(ar|ur|en|es|fr|tr)(?:\/|$)/)?.[1]; // tr: "Sadece Türkçe" (no other language)
if (pathLang && !params.has('gloss')) settings.set('glossLang', pathLang);
await loadGlossLang(params.get('gloss') ?? settings.get('glossLang', 'ar')); // meanings in Arabic by default (assets/i18n/)
document.title = withGloss('Türk Ailem', 'My Turkish Family'); // the tab: the name in the player's language too
const fullscreenBtn = setupLandscape(); // ⛶ in the HUD
// from the share message's iPhone link (anadoluailesi.com.tr/ios → /oyun/?ios): how to put the game on the home screen, at once
if (params.has('ios') && iosBrowser()) setTimeout(showIosGuide, 600);
// boy (Ahmet) or girl (Sare): the content is rewritten once, before any system reads it
setPlayerGender(params.get('gender') ?? settings.get('gender', 'boy'));
const playerLook = lookKey(playerGender(), params.get('look') ?? settings.get('look', ''));
setPlayerLook(playerLook); // Ahmet, Hakan, Sare or Seher
// the class teacher: picked at random once (a woman or a man, with a name), then kept
settings.set('teacher', setTeacher(params.get('teacher') ?? settings.get('teacher', '')));
{
  const t = teacherInfo();
  NPCS.ogretmen.name = `${t.name} Öğretmen`;
  if (t.gender === 'm') { Object.assign(NPCS.ogretmen, TEACHER_MAN); VOICES.ogretmen = man('Iapetus'); }
}
personalizeContent(STORY, DIALOGUES, FREE_ACTIONS, HOUSE_RULES, LESSONS, CLASSMATE_BOTS, TEXTBOOK, ITEMS);
if (playerGender() === 'girl') VOICES.ahmet = { id: 'tr-kiz', female: true, pitch: 1 }; // the player's own voice
// the village server (localhost: the dev server's own) — multiplayer, free chat and Turkish speech
const villageServer = VillageNetwork.resolveUrl({ manifestUrl: manifest.villageServer, override: params.get('mp'), native });
const bus = new EventBus();
const state = new GameState();
const modes = new ModeStack();

// --- engine ---
const ctx = new RenderContext(document.body, { quality });
if (params.has('norender')) ctx.render = () => {}; // ?norender: a player that only takes part (recordings with many players), nothing drawn
const textures = new TextureFactory(ctx.renderer);
await textures.loadOverrides(manifest.textures);
const mf = new MeshFactory(textures, { standard: quality !== 'low', blobShadows: quality === 'low' });
const models = new ModelLibrary(manifest.models);
const kit = { mf, props: new PropFactory(models), quality };
if (quality !== 'low') ctx.setPostFX(new PostFX(ctx, { ao: quality === 'high' }));
const camera = new CameraController(ctx);

// --- world ---
const time = new TimeSystem(state, bus);
const lighting = new DayNightLighting(ctx, time, {
  sky: new SkyDome(ctx.scene),
  fireflies: new Fireflies(ctx.scene, { area: { x: [-14, 14], z: [-8, 18] }, count: quality === 'low' ? 40 : 90 }),
});
const world = new LocationManager({ scene: ctx.scene, bus, lighting, kit });
world.register(new HouseInterior()).register(new Yard()).register(new VillageSquare())
  .register(new SchoolYard()).register(new Classroom());
world.setLinks(LINKS);

// --- ui ---
const toasts = new Toasts(host);
const questPanel = new QuestPanel(host, { settings, onTap: (q) => directions.open(q) }); // (folds down to its title: remembered)
const labels = new LabelLayer(host, ctx);
const joystick = new Joystick(host);
const cards = new CardOverlay(host, modes);
const list = new ListModal(host, modes);
const fader = new Fader(host);

// --- game model ---
const inventory = new Inventory(state, bus);
const vocab = new Vocabulary(state, bus);
const input = new InputSystem(joystick);
// credits live on the device, apart from the story save (a new game keeps what you bought or earned)
const wallet = new CreditWallet({ settings, bus, start: Math.max(START_CREDITS, new LocalSaveRepository().load()?.credits ?? 0) });
migrateWallet(wallet);
const player = new Player('ahmet', PLAYER_LOOKS[playerLook], { mf, models });
ctx.scene.add(player.group);
lighting.follow = player.position;
const npcs = new Map(Object.entries(NPCS).map(([id, def]) => [id, new Npc(id, def, { mf, models })]));
const cast = new CastDirector({ npcs, world, player });
const travel = new TravelService({ world, player, cast, camera, fader, state });
const story = new StoryDirector({ story: STORY, state, bus, time, cast, travel, cards, toasts, fader });
const items = new ItemSystem({ defs: ITEMS, names: KIND_NAMES, world, kit, state, inventory, vocab, bus, story });
const gameCtx = new GameContext({ state, inventory, story, world, time, vocab, player, cast });
story.setContext(gameCtx);
const controller = new PlayerController({ player, input, world, modes, cast, camera, boost: () => (wallet.boostLeft('pepper') > 0 ? CONFIG.boosts.pepperSpeed : 1) });

// --- dialogue ---
const progressShown = new Set();
const ttsServerUrl = manifest.ttsServer ?? villageServer.replace(/^ws/, 'http').replace(/\/ws\/village$/, '/api/tts');
const tts = new CharacterVoices({
  repo: params.has('nospeechrepo') ? null : new SpeechRepo(),
  server: params.has('nospeechserver') ? null : new ServerTTS(params.get('tts') ?? ttsServerUrl),
  neural: new PiperTTS({
    onProgress: (voice, f) => {
      const step = Math.floor(f * 4); // toast at 0/25/50/75%
      if (progressShown.has(`${voice}${step}`)) return;
      progressShown.add(`${voice}${step}`);
      toasts.show(`Doğal ses indiriliyor… %${Math.round(f * 100)}`, 'Downloading natural voice (first time only)');
    },
  }),
  fallback: native ? new nativeKit.NativeTTS('tr-TR') : new WebSpeechTTS('tr-TR'),
  voices: VOICES,
  enabled: () => settings.get('neuralVoices', native ? false : true),
  muted: () => voicesLevel() <= 0, // ⚙️ in the HUD (🔊 Ses: everything)
  level: voicesLevel,
});
// ?fakemic → scripted answers (tests); manifest.sttEndpoint → Whisper server; else browser STT
const recognizer = params.has('fakemic') ? new ScriptedRecognizer()
  : native ? new nativeKit.NativeSpeechRecognizer('tr-TR')
  : manifest.sttEndpoint ? new RemoteSpeechRecognizer(manifest.sttEndpoint) : new WebSpeechRecognizer('tr-TR');
const speech = new SpeechEvaluator({ recognizer, detector: new LanguageDetector(), matcher: new AnswerMatcher() });
// every ad event to our server too: live numbers (AdMob's own come a day or two late; server/src/AdStats.js)
const adEvent = (e, f, d) => {
  if (!settings.get('deviceId')) settings.set('deviceId', Array.from(crypto.getRandomValues(new Uint8Array(12)), (b) => (b % 36).toString(36)).join('')); // (as the square makes it: one per device)
  const body = { e, f, v: appVersion, pid: settings.get('deviceId'), ...(d.valueMicros != null ? { micros: Number(d.valueMicros), cur: d.currencyCode } : {}), ...(e === 'fail' && Number.isInteger(d.code) ? { code: d.code } : {}) };
  import('@capacitor/core').then(({ CapacitorHttp }) => CapacitorHttp.post({ url: 'https://anadoluailesi.com.tr/api/ad-event', headers: { 'Content-Type': 'application/json' }, data: body })).catch(() => {});
};
let appVersion = '';
if (native) nativeKit.App.getInfo().then((i) => { appVersion = `${i.version}`; }).catch(() => {});
const ads = native ? new nativeKit.AdMobAdProvider({ rewardedId: manifest.admob?.rewardedId, interstitialId: manifest.admob?.interstitialId, bannerId: manifest.admob?.bannerId, onEvent: adEvent })
  : new MockAdProvider(host, modes, params.has('fastads') ? 1 : 5, { interstitials: params.has('mockads'), rewarded: params.has('mockads') }); // (the website: no ads; tests: stand-ins)
const billing = !params.has('nobilling') && SELL_PACKS && native ? new PlayBilling(nativeKit.NativePurchases, nativeKit.PURCHASE_TYPE) : new NoBilling();
const gate = new ClassAccessGate({ host, modes, wallet, ads });
const activities = new ActivityRegistry({ tts, speech, gate })
  .register('choice', ChoiceActivity)
  .register('listen', ListenActivity)
  .register('order', OrderActivity)
  .register('speak', SpeakActivity);
const effects = new EffectRunner();
const dialogueView = new DialogueView(host, {
  onClose: () => dialogue.close(),
  onSpeak: () => dialogue.speak(),
  onToggleEn: () => dialogueView.setEnPressed(!document.body.classList.toggle('hide-en')),
});
const chatRecognizer = params.has('fakemic') ? new ScriptedRecognizer() : (native ? new nativeKit.NativeSpeechRecognizer('tr-TR') : new WebSpeechRecognizer('tr-TR'));
const dialogue = new DialogueController({
  dialogues: DIALOGUES, cast, view: dialogueView, activities, effects, vocab, tts, modes, bus, input,
  chat: null, recognizer: chatRecognizer, // (free typed chat with the characters is off: services/ai/NpcChatClient.js to turn it back on)
  chatAllowed: (npc) => story.target()?.npc !== npc, // quest conversations come first
});
dialogue.setContext(gameCtx);

effects
  .register('quest', (id) => story.complete(id))
  .register('chapter', () => story.nextChapter())
  .register('take', (kind, n) => inventory.remove(kind, n ? Number(n) : Infinity))
  .register('give', (kind, n) => {
    inventory.add(kind, n ? Number(n) : 1);
    const { tr, en } = items.info(kind);
    toasts.show(`+${n ?? 1} ${tr}`, gloss(en));
  })
  .register('wear', (what, off) => { player.wear(what, off !== 'off'); state.flags[`wear-${what}`] = off !== 'off'; })
  // the grocer: pay from the bag (no money, no shopping)
  .register('buy', (kind, price) => buyGood(kind, Number(price)))
  // dad's pocket money: once a day
  .register('pocket-money', (n) => {
    const key = `harclik-${state.day}`;
    if (state.flags[key]) { toasts.show('Bugünkü harçlığını aldın.', gloss('You already had your pocket money today.')); return; }
    state.flags[key] = true;
    inventory.add('para', Number(n));
    toasts.show(`+${n} lira`, gloss('Pocket money'));
  })
  .register('flag', (name) => { state.flags[name] = true; bus.emit(EV.FLAG, { name }); })
  .register('park', (toy) => parkPlay[toy]?.()) // swing, slide, seesaw in the park (systems/ParkPlay.js)
  .register('sit', (anchor) => { // a seat in the current place (sofra at home, tea-garden stools…)
    const here = world.current.anchors.has(anchor) ? world.current : world.get('house'), a = here.anchors.get(anchor);
    if (a) { player.place(a); player.sit(true, seatAt(here, a)); player.seatAnchor = anchor; } // the hips on the seat (world/seats.js); which seat: the dama tables (DamaClub)
    // how to get up again: always at the sofra (meals), the first two times on other seats
    const told = settings.get('sitHints', 0);
    if (anchor.startsWith('sofra') || told < 2) {
      toasts.show('Kalkmak için yürümen yeterli.', gloss('To get up, just walk.'));
      settings.set('sitHints', told + 1);
    }
  })
  .register('place-bread', () => {
    inventory.remove('ekmek', 1);
    state.flags['bread-on-table'] = true;
    world.get('house').setBreadOnTable?.(true);
    bus.emit(EV.INVENTORY);
  });
story.setEffects(effects);
// the first time in the square the recording consent and the username are asked (systems/VillageMultiplayer.js join): the welcome
// card, the "Annen çağırıyor" card and the quest box wait until those are answered, not sit behind them
story.beforeCards = () => new Promise((done) => {
  const asking = () => !!document.querySelector('.card.consent, form.username-card');
  // the first time in the square (the new game starts there) the two questions are still to come; they come a little after the story's card would
  const first = world.current?.id === village.locationId && !(settings.get('dataConsent', null)?.v >= CONSENT_VERSION && settings.get('usernameAsked', false));
  if (!first && !asking()) { done(); return; }
  document.body.classList.add('story-wait'); // (hides the quest box)
  if (first) village.join(); // the questions now, not after the cards (enterPlay would ask them then)
  let seen = false, quiet = 0, waited = 0;
  const poll = setInterval(() => {
    if (asking()) { seen = true; quiet = 0; } else quiet++;
    // answered (0.75 s with no question after one was open), or none came within 8 s (declined, offline…), or at most 40 s
    if ((seen && quiet >= 3) || (!seen && waited > 32) || ++waited > 160) { clearInterval(poll); document.body.classList.remove('story-wait'); done(); }
  }, 250);
});

// --- game money (lira in the bag): shop windows at the grocer's and the greengrocer's ---
function buyGood(kind, p) {
  if (inventory.count('para') < p) { toasts.show(`Paran yetmiyor: ${p} lira lazım`, gloss('Not enough money. Ask dad for pocket money!')); return false; }
  inventory.remove('para', p);
  inventory.add(kind, 1);
  state.bought[kind] = (state.bought[kind] ?? 0) + 1; // yours: for the table or the bin
  const { tr, en } = items.info(kind);
  vocab.learn(tr.replace(/^kilo /, ''), en.replace(/^kg of /, ''));
  toasts.show(`+1 ${tr} · −${p} lira`, gloss(en));
  return true;
}
const market = new MarketView(host, { modes, items, vocab, money: () => inventory.count('para'), buy: buyGood });
effects.register('market', (id) => setTimeout(() => market.open(id), 0)); // after the conversation has closed
// chores at home: mom gives a little pocket money, once a day each
bus.on(EV.FREE_ACTION, ({ id }) => {
  const pay = CHORE_PAY[id], key = `chore-${id}-${state.day}`;
  if (!pay || state.flags[key]) return;
  state.flags[key] = true;
  setTimeout(() => { inventory.add('para', pay); toasts.show(`Annen sana ${pay} lira harçlık verdi!`, gloss('Mom gave you pocket money for helping!')); }, 1200);
});

// --- what you bought: on the table at home, or in a rubbish bin ---
const tableAndBins = new TableAndBins({ state, inventory, items, world, mf, list, toasts, vocab, bus });
effects.register('table-goods', () => tableAndBins.atTable()).register('trash', () => tableAndBins.atBin());

// --- prayer scene, meal times ---
const prayer = new PrayerScene({ playerRow: () => (playerGender() === 'girl' ? 'saf2c' : 'saf1b'), watching: () => !!state.flags['watch-prayer'],
  bus, world, cast, player, camera, fader, modes, toasts, vocab, effects, story,
  caption: new CaptionView(host), steps: PRAYER_STEPS, words: PRAYER_WORDS,
});
new MealService({ bus, world, meals: MEALS });
effects
  .register('talk', (npc, node) => dialogue.open(npc, node))
  .register('prayer', () => prayer.start());

// --- free roam ---
const free = new FreeActionSystem({
  actions: FREE_ACTIONS, rules: HOUSE_RULES, ctx: gameCtx, cast, world, dialogue, vocab, time, labels, toasts, tts, bus,
  clock: () => game.t,
});
effects.register('free', (id) => free.perform(id));
const toys = new ToySystem({ world, player, free, tts });
const yard = world.get('yard');
// balls are kicked by running into them; the square's two (on its pitch) and the school's are shared online
toys.add(new Ball(mf, yard, { x: 3, z: 4 }), { action: 'ball', touch: true });
const schoolBall = toys.add(new Ball(mf, world.get('schoolyard'), { x: 0, z: -2 }), { action: 'ball', touch: true, quiet: true, onKick: (b, kind) => { football.assist(b, kind); village.ballKicked(b); } }); // aim assist, then shared
const pitchMid = (SQUARE_PITCH.x0 + SQUARE_PITCH.x1) / 2;
const villageBalls = [{ x: pitchMid, z: SQUARE_PITCH.cz }, { x: pitchMid - 4, z: SQUARE_PITCH.cz - 2 }]
  .map((at) => toys.add(new Ball(mf, world.get('village'), at), { action: 'ball', touch: true, quiet: true, onKick: (b, kind) => { squareFootball.assist(b, kind); village.ballKicked(b); } }));
// ⚡ hard shot next to a ball: button (see the action button below) or key F
input.onKey((e) => { if (modes.is('play') && (e.key === 'f' || e.key === 'F')) toys.shoot(); });
// C: another camera view (normal, close, far, from above)
const VIEW_NAMES = [['Normal görünüm', gloss('Normal view')], ['Yakın görünüm', gloss('Close view')], ['Uzak görünüm', gloss('Far view')], ['Yukarıdan görünüm', gloss('View from above')]];
input.onKey((e) => { if (modes.is('play') && (e.key === 'c' || e.key === 'C')) { const [tr, en] = VIEW_NAMES[camera.cycleView()]; toasts.show(`🎥 ${tr}`, en); } });
toys.add(new Cat(mf, yard, { x: [-6, 14], z: [-2, 18] }), { action: 'cat', range: 1.5, onUse: (c) => c.pet() }); // no spoken "miyav": a person's voice meowing sounds silly

// --- school: credits, ads, multiplayer lesson ---
const lessons = new LessonController({
  lessons: LESSONS, bots: CLASSMATE_BOTS, gate, activities, cast, world, travel, player, camera, tts, labels, modes, effects, state, vocab,
  // manifest.classroomServer → real multiplayer; otherwise local bots
  sessionFactory: (lesson, bots) => (manifest.classroomServer
    ? new WebSocketClassroomSession({ url: manifest.classroomServer, lesson })
    : new LocalClassroomSession({ lesson, bots, speed: params.has('fastclass') ? 6 : 1 })),
  view: new ClassroomView(host, { onReplay: () => lessons.replay() }),
});
const textbook = new TextbookController({
  book: TEXTBOOK, activities, tts, vocab, state, effects, modes, toasts,
  view: new TextbookView(host, { onClose: () => textbook.close(), onPrev: () => textbook.prev(), onNext: () => textbook.next() }),
});
effects
  .register('lesson', (id) => lessons.enter(id || story.chapter?.lessonId || 'l1'))
  .register('textbook', (unit) => textbook.open(unit))
  .register('school-practice', () => schoolPractice())
  .register('credits', (n) => { wallet.add(Number(n), 'reward'); toasts.show(`+${n} kredi`, gloss('Credits earned')); });

// --- multiplayer village square (server: tools/serve.mjs or server/index.mjs) ---
const villageNet = new VillageNetwork(villageServer);
const village = new VillageMultiplayer({
  bus, net: villageNet, voice: new VoiceChat({ net: villageNet, iceServers: manifest.iceServers ?? [{ urls: 'stun:stun.l.google.com:19302' }], onState: (st, id) => village.voiceState(st, id), relayOnly: params.has('relayonly') }),
  group: new GroupVoice({ net: villageNet, iceServers: manifest.iceServers, onState: (st) => village.zoneState(st) }),
  zones: { // talking zones: everyone inside hears each other
    kahve: { ...KAHVEHANE, name: 'Kahvehane' },
    avlu: { x: (MOSQUE.x0 + MOSQUE.x1) / 2, z: (MOSQUE.z0 + MOSQUE.z1) / 2, w: MOSQUE.x1 - MOSQUE.x0, d: MOSQUE.z1 - MOSQUE.z0, name: 'Cami avlusu' },
  },
  remotes: new RemotePlayers({ mf, models, baseLook: PLAYER_LOOK, looks: PLAYER_LOOKS, horse: () => animals.mount(), scooter: () => scooterMount(mf), bike: () => bikeMount(mf) }), // others on horseback, a scooter, a bike
  rooms: SERVERS, healthUrl: healthUrl(villageServer), choice: new ChoiceCard(host, modes), canAsk: () => modes.is('play'), // (a talking zone's door card: never over a dialogue)
  // public places: the square, and the schoolyard for football (its own room: <city>-okul)
  places: { village: { suffix: '', balls: villageBalls, label: '' }, schoolyard: { suffix: '-okul', balls: [schoolBall], label: 'Okul bahçesi' } },
  world, player, settings, labels, toasts,
  ptt: new PushToTalk(host, { onChange: (on) => village.talk(on) }),
  calls: new CallUI(host, modes),
  reportDialog: new ReportDialog(host, modes), // "Şikayet et" (🚩 in the top bar and in the call bar)
  consent: new ConsentDialog(host, modes), // before the first time online: agree to the recording
  usernames: new UsernameDialog(host, modes),
  // first time in the square: how talking works here (Arabic, with Turkish)
  onFirstVisit: () => cards.show({
    num: 'Köy meydanı', title: 'Burada gerçek oyuncular var',
    text: 'Konuşmak için sağ alttaki 🎤 düğmesine bir kez dokun, bitince bir daha dokun: söylediğin cümle başının üstünde yazı olarak görünür. Sesli sohbet sadece iki kişi arasında ve karşı taraf kabul ederse açılır. Seni rahatsız eden olursa üstteki 🚩 ile şikayet et.',
    en: 'There are real players here. Tap the 🎤 button at the bottom right to speak and tap it again when you are done: what you say appears as text above your head. Voice chat is only between two people, after the other person agrees. If someone bothers you, report them with the 🚩 at the top. Be kind!',
    button: 'Tamam',
  }),
  recognizer: chatRecognizer,
});
// "Meydan seç": another city's square — a tap on "👥 1 · Ankara" in the top bar, or the tile in the settings
const roomCard = new RoomCard(host, modes, { villageServer });
const pickRoom = async () => { const id = await roomCard.open(settings.get('serverRegion', DEFAULT_SERVER)); if (id) village.switchRoom(id); };
village.ptt.onRooms = pickRoom;
village.autoName = () => `Oyuncu${Math.floor(10 + Math.random() * 90)}`; // a name made up for the player, filled into the username question
village.autoNamed = (n) => /^Oyuncu\d{2}$/.test(n); // (still a made-up one: the question comes once more)
village.onNameCancel = () => menu.show(); // no username after all: back to the menu
village.outfit = () => ({ outfit: outfitOn(wallet), aura: auraOn(wallet) }); // others see them too
// the HD character from the shop: everywhere once bought — home too (prayer poses use the blocky body for a moment)
const playerHd = () => {
  player.setAura(auraOn(wallet)); const o = outfitOn(wallet);
  player.setHd(models, outfitModel(o ?? 'casual', playerGender(), playerLook.split('-')[1]), !!o, { covered: !!PLAYER_LOOKS[playerLook].headscarf, dress: isDress(o), paint: o });
  // an HD player (credits spent in the shop) sees the villagers in HD too, everywhere (entities/Npc.js)
  if (HD_VILLAGERS.on !== !!o) { HD_VILLAGERS.on = !!o; npcs.forEach((n) => n.refreshHd()); }
};
bus.on(EV.LOCATION, playerHd);
playerHd();

// --- giant chess on the square: online the server's board (İsmail Dede runs it), offline Dede plays you ---
const chess = new ChessGame({
  host, mf, square: world.get('village'), net: villageNet, vocab, toasts, player, world, view: new ChessView(host, { modes }), choice: new ChoiceCard(host, modes), // ("Maçı bırakıyor musun?")
  // İsmail Dede announces the games: a bubble over his head (no voice)
  onSay: (line) => {
    const dede = cast.get('ismail');
    if (dede?.location === 'village' && world.current.id === 'village' && Math.hypot(player.position.x - dede.position.x, player.position.z - dede.position.z) < 10) labels.bubble(dede, line, null, 5); // only near: bubbles from afar covered the screen
  },
  onAskDede: () => dialogue.open('ismail'), // touching a piece when not playing: Dede decides who plays
});
gameCtx.chess = chess; // İsmail Dede's dialogue asks the board who plays (content/addons/satranc.js)
controller.slow = () => chess.slowFactor; // careful steps on the board: a piece in hand, or my turn
// the first time you come near the board: a card says how it works
world.get('village').animated.push(() => {
  if (settings.get('chessCardSeen', false) || (params.has('nointro') && !params.has('cards')) || !modes.is('play') || world.current.id !== 'village') return; // (tests: ?nointro, unless &cards)
  if (Math.hypot(player.position.x - CHESS.cx, player.position.z - CHESS.cz) > 7.5) return;
  settings.set('chessCardSeen', true);
  cards.show({
    num: 'Dev satranç', title: 'İsmail Dede’nin satranç tahtası',
    text: 'Oynamak için İsmail Dede ile konuş; rakip yoksa Dede seninle oynar. Taşın üstüne yürü, sonra yeşil kareye git.',
    en: 'To play, talk to İsmail Dede; if nobody else is playing, he plays you. Walk onto a piece, then go to a green square.',
    button: 'Anladım',
  });
});
// playing chess near the board: the camera looks at it from your side (white sits at +z)
{
  let viewFor = null;
  const setView = (color) => {
    if (color === viewFor) return;
    viewFor = color;
    if (!color) { camera.clearFixed(); return; }
    const side = color === 'w' ? 1 : -1;
    camera.setFixed(new THREE.Vector3(CHESS.cx, 8.5, CHESS.cz + side * 8.5), new THREE.Vector3(CHESS.cx, 0, CHESS.cz + side * 0.6));
  };
  world.get('village').animated.push(() => {
    const mine = chess.myColor, near = Math.hypot(player.position.x - CHESS.cx, player.position.z - CHESS.cz) < 9;
    setView(mine && chess.state?.phase === 'playing' && near && !dialogue.talking ? mine : null);
  });
  bus.on(EV.LOCATION, () => setView(null)); // left the square (the view stays with the board)
}
village.chess = chess;
// football: the schoolyard's pitch and the fenced one in the square, each with its score board
const football = new Football({ place: 'schoolyard', pitch: PITCH, balls: [schoolBall], writeScore: (a, b) => world.get('schoolyard').writeScore(a, b), world, village, toasts });
const squareFootball = new Football({ place: 'village', pitch: SQUARE_PITCH, balls: villageBalls, writeScore: (a, b) => world.get('village').writeScore(a, b), world, village, toasts });
const matches = { schoolyard: football, village: squareFootball };
village.onGoal = (place, side) => matches[place]?.scored(side, false);
village.onScoreReset = (place) => matches[place]?.reset(false);
village.onPitch = (pos) => Object.values(matches).some((m) => m.has(pos));
effects.register('score-reset', () => matches[world.current.id]?.reset(true));
world.get('schoolyard').animated.push((dt) => football.update(dt));
world.get('village').animated.push((dt) => squareFootball.update(dt));
// the tea garden and the chess benches: villagers chat, sit down to listen in
// the villagers' own talk, out loud near them — not over a conversation of yours
const ambientSpeak = (text, who) => {
  if (!modes.is('play') || library.reading) return;
  const near = () => { // fainter as you walk away from whoever is talking, silent past 14 m
    const c = cast.get(who), d = c && c.location === world.current?.id ? Math.hypot(c.position.x - player.position.x, c.position.z - player.position.z) : 99;
    return d > 14 ? 0 : 1 / (1 + (Math.max(0, d - 2) / 3) ** 2);
  };
  tts.speak(text, { speaker: who, volume: near });
};
const talk = new TalkAreas({ world, player, cast, labels, speak: ambientSpeak });
village.ptt.onType = (text) => village.say(text); // typed instead of spoken (no speech-to-text on this device)
// the open library: borrow a book, read it sitting on a bench
const library = new Library({
  books: BOOKS, state, player, choice: new ChoiceCard(host, modes), toasts, vocab, wallet, world,
  subtitles: new Subtitles(host), speak: (t) => tts.speak(t, { speaker: 'okuyucu' }),
  reader: new BookReader(host, { modes, onSpeak: (t) => tts.speak(t, { speaker: 'okuyucu' }), onClose: (b, page) => library.closed(b, page), onFinish: (b) => library.finished(b) }),
});
effects.register('library', () => library.atShelf());
effects.register('library-read', () => library.readHere()); // a library seat: a book read aloud with subtitles
// the open-air cinema: sit on a chair and a cartoon plays on the screen a line at a time; say what each meant (no films yet: coming soon)
// playing on your own (home, the garden, school — anywhere but the square): now and then a line at the top, in the player's language, asking for a rating on Google Play (no reward: Play forbids it)
const ratePrompt = new RatePrompt(host, { settings, modes, alone: () => !!world.current && world.current.id !== 'village' });
const cinema = new Cinema({ films: FILMS, world, renderer: ctx.renderer, player, camera, vocab, wallet, toasts, state, modes, view: new CinemaView(host), clips: new ClipScreen(host) });
cinema.build();
effects.register('cinema', () => cinema.watch());
// a ney plays quietly in the background in Aslan Bey's open library
const ney = new NeyMusic({ world, player, place: { location: 'village', x: LIBRARY.x, z: LIBRARY.z }, src: 'assets/audio/kutuphane.mp3', muted: () => musicLevel() <= 0, volume: musicLevel });
// each outdoor place its own tune; low under talk, and giving way to the library's music near it
const music = new BackgroundMusic({
  world, muted: () => musicLevel() <= 0, volume: musicLevel,
  duck: () => (modes.is('dialogue') || village.group.zone || village.voice.inCall || library.reading || cinema.watching ? 0.3 : 1) * (1 - ney.level),
});
chess.onMove = (m) => talk.chessMoved(m);
effects
  .register('chess-ask', (color) => chess.ask(color))
  .register('chess-dede', (color) => chess.playDede(color || 'w'))
  .register('chess-leave', () => chess.leave())
  .register('chess-resign', () => chess.resign())
  .register('chess-draw', () => chess.offerDraw())
  .register('chess-draw-accept', () => chess.answerDraw(true))
  .register('chess-draw-decline', () => chess.answerDraw(false));
// the uncles in the kahvehane talk among themselves; come close and you hear them
const kahveTalk = new AmbientTalk({ world, player, cast, labels, place: { location: 'village', x: KAHVE_UNCLES.x, z: KAHVE_UNCLES.z }, talks: KAHVE_TALKS,
  quiet: () => village.group.ids().length > 0, speak: ambientSpeak }); // real people talking in the kahvehane: the uncles keep quiet
// the kahvehane's apprentice brings you a tea when you sit down
const cirak = new KahveCirak({ world, mf, models, player, labels, vocab, speak: (t) => tts.speak(t, { speaker: 'kardes' }) });
cirak.build();

// your own garden bed: planting comes later — grandpa says you are still a bit young
effects.register('my-garden', () => {
  if (cast.where('dede') === world.current.id) { dialogue.open('dede', 'myGarden'); return; }
  toasts.show('Dede: “Biraz büyü, sonra birlikte ekeriz.”', gloss('Grandpa: “Grow a little, then we will plant it together.”'));
});

// --- interaction ---
// farm animals: a cow, sheep and a dog in the yard; horses to ride on the square
setTimeout(() => world.warmUp(ctx.renderer, ctx.camera), 1200); // every place ready on the GPU before you walk in (no stutter on first entry)
const rideMore = new ChoiceCard(host, modes);
const animals = new Animals({
  world, models, player, labels, toasts, vocab, clock: () => game.t, wallet, onShop: () => shop.open(), story, effects,
  // the ride is up while on the horse: a video for 5 more minutes (the app only: the website has no ads)
  offerMore: ads.hasRewarded ? async () => (await rideMore.ask({ title: '🐴 Süren doldu', text: 'Kısa bir video izle, 5 dakika daha ata bin!', en: 'Watch a short video and ride 5 more minutes!', yes: '📺 Video izle', no: 'Attan in' })) && ads.showRewarded() : null,
});
animals.build();
bus.on(EV.LOCATION, ({ id }) => { if (id !== 'village') animals.leftPlace(); }); // the horse stays on the square
// scooters on the square (free)
const scooters = new Scooters({ world, mf, player, toasts, vocab });
scooters.build();
bus.on(EV.LOCATION, ({ id }) => { if (id !== 'village') scooters.leftPlace(); });
// the bicycle in the yard (riding it is a skill bought with credits)
const bicycle = new Bicycle({ world, mf, player, wallet, toasts, vocab, choice: new ChoiceCard(host, modes), onShop: () => shop.open() });
bicycle.build();
bus.on(EV.LOCATION, ({ id }) => bicycle.moved(id)); // ridden out of the gate it comes along
const interactions = new InteractionSystem([
  animals, // pet an animal, get on / off a horse
  bicycle,
  scooters,
  library, // sitting with a book in hand: read it
  chess, // on the giant board: take a piece, put it down
  village, // "voice chat with X" next to another player in the square
  toys,
  new NpcInteractions({ cast, dialogue, story }),
  new ItemInteractions({ items }),
  new HotspotInteractions({ world, rules: HOTSPOTS, story, travel, toasts, effects, bus, ctx: gameCtx }),
], modes);
const actionButton = new ActionButton(host, () => interactions.trigger());
const shotButton = new ShotButton(host, () => toys.shoot(), actionButton.root, { press: true }); // (fires as the finger goes down: with a thumb on the joystick a second tap makes no click on phones)
// on horseback: jump (the button, or Space on a keyboard)
const jumpHorse = () => { if (modes.is('play') && player.jump()) { vocab.learn('zıplamak', 'to jump'); village.jumped(); } }; // (the others see it)
const jumpButton = new ShotButton(host, jumpHorse, actionButton.root, { id: 'jump', text: '🐎 Zıpla', label: 'Zıpla', press: true });
addEventListener('keydown', (e) => { if (e.code === 'Space' && !e.repeat && player.mount?.kind === 'horse' && document.activeElement?.tagName !== 'INPUT') { e.preventDefault(); jumpHorse(); } });
const jumpShown = { update: () => jumpButton.show(modes.is('play') && player.mount?.kind === 'horse') };
input.onKey((e) => {
  if (modes.is('play') && ['e', 'E', 'Enter'].includes(e.key)) { e.preventDefault(); interactions.trigger(); }
  else if (['i', 'I'].includes(e.key) && (modes.is('play') || inventoryView.isOpen) && !e.target?.closest?.('input,textarea')) { e.preventDefault(); inventoryView.toggle(); } // the inventory
});
const marker = new QuestMarker({ scene: ctx.scene, story, world, cast, items, player });
const directions = new DirectionsCard(host, modes, { where: () => marker.describe(camera.yaw) }); // a tap on the task: where to go
// the round map, top right: people here, the one the task is about blinking (others online in blue); a tap: where to go
const minimap = new Minimap(host, { world, cast, player, camera, marker, story, settings, others: () => (world.current.id === village.locationId ? village.remotes.visible() : []), onTap: () => directions.open(questPanel.quest) });

// word notebook with "practice" (a quick quiz over the learned words)
const drill = new WordDrill(host, { modes, vocab, activities, tts, state, effects, toasts });
const openWords = () => list.open('Kelime defteri', vocab.entries().map(([tr, en]) => [tr, [meaning(tr, en), example(tr) && `Örnek: ${example(tr)}`].filter(Boolean).join('\n')]), 'Henüz kelime yok. Biriyle konuş!',
  drill.available ? { label: '🧠 Kelime pratiği yap', run: () => drill.open() } : null);
// --- shop, daily reward, ads between story days ---
const shop = new ShopView(host, {
  modes, wallet, ads, billing, toasts, gender: playerGender(), look: settings.get('look', ''), share: shareGame,
  feedback: { due: () => feedback.due, open: () => feedback.open() }, // "Yorum yaz, kazan" in the gold tab
  onDaily: () => takeDaily(),
  onCode: () => { settings.set('devCodes', true); shop.close(); if (menu.isOpen) menu.show(); codeCard.open(); }, // five quick taps on "Altın": the code card, and a 🔑 on the main menu from now on
  onEat: (food) => {
    if (food.glow) { // Altın baklava: the golden light on, seen by the others after a quick reconnect
      labels.bubble(player, 'Çok tatlı! Parlıyorum!', null, 3, "So sweet! I'm shining!");
      vocab.learn('tatlı', 'sweet'); vocab.learn('parlamak', 'to shine');
    } else { // Urfa biberi
      labels.bubble(player, 'Çok acı! Hızlandım!', null, 3, "So hot! I'm faster!");
      vocab.learn('biber', 'pepper'); vocab.learn('acı', 'hot (spicy)');
    }
    showBoost();
  },
  // new colours: saved, then the game opens again with them (and goes on where it was)
  onOutfit: () => { playerHd(); shop.render(); if (village.net.connected) { village.leave(); village.join(); } }, // others see it after a quick reconnect
});
// AdMob has no banner to give (no fill): our own offers in its place until it has one (HouseBanner)
const house = new HouseBanner(host, [
  { icon: '🚫', tr: 'Reklamsız oyna', en: 'Play without ads', run: () => shop.open('wear') },
  { icon: '▶️', tr: 'Video izle, kredi kazan', en: 'Watch a video, earn credits', run: () => shop.open('gold') },
  { icon: '📤', tr: 'Paylaş, kredi kazan', en: 'Share the game, earn credits', run: () => shop.open('gold') },
]);
ads.onHouse = (on) => house.set(on && !wallet.adFree);
const dailyView = new DailyRewardView(host, modes);
function takeDaily() {
  const d = wallet.takeDaily();
  if (d) toasts.show(`🎁 +${d.amount} kredi`, 'Daily reward');
  if (native) scheduleDailyReminder(nativeKit.LocalNotifications, { ask: true }); // "Bugünkü ödülünü al!" tomorrow
}
async function offerDaily() {
  const d = wallet.daily();
  if (!d || (params.has('nointro') && !params.has('daily'))) return; // tests: only with ?daily
  const double = await dailyView.show(d, { double: ads.hasRewarded ? () => ads.showRewarded() : null }); // a video: twice as many
  takeDaily();
  if (double) { wallet.add(d.amount, 'daily-video'); toasts.show(`📺 +${d.amount} kredi daha`, 'Twice the daily reward'); }
}
effects.register('shop', () => shop.open());
// dama in the kahvehane: a board from the shelf, a table, someone opposite — or Rıfat Amca (systems/DamaClub.js)
const damaView = new DamaView(host, {
  modes, vocab,
  say: (tr, en) => { const r = cast.get('rifat'); if (r) labels.bubble(r, tr, null, 3, en); tts.speak(tr, { speaker: 'rifat' }); },
});
const dama = new DamaClub({
  world, mf, net: villageNet, player, view: damaView, cast, toasts,
  myName: () => villageNet.name ?? playerName(), sitAt: (anchor) => effects.run([`sit:${anchor}`]),
});
gameCtx.dama = dama; // (the shelf's "Dama al" only when your hands are free)
effects.register('dama-take', () => dama.take()).register('dama-npc', () => dama.playRifat());
// Saturday's wedding: the drum, and the player joining the halay line
const halay = new HalayDance({ world, player, modes, toasts, vocab, effects, story, muted: () => musicLevel() <= 0, volume: musicLevel });
effects.register('halay', () => halay.join());
// the tailor's mannequin in the square wears the HD suit (so people see what they can buy)
models.has('hd.suit.boy') && models.load('hd.suit.boy').then(({ scene, animations }) => {
  const a = world.get('village').anchors.get('mannequin');
  const mixer = new THREE.AnimationMixer(scene);
  const idle = animations.find((x) => x.name === 'idle');
  if (idle) { mixer.clipAction(idle).play(); mixer.update(0.3); }
  scene.updateMatrixWorld(true);
  const b = new THREE.Box3().setFromObject(scene, true);
  scene.scale.multiplyScalar(1.7 / (b.max.y - b.min.y));
  scene.traverse((o) => { if (o.isMesh) for (const m of [o.material].flat()) { m.metalness = 0; m.roughness = 0.85; if (m.name === 'Skin') m.color.setHex(0xE9B98F); } });
  scene.position.set(a.x, 0, a.z); scene.rotation.y = a.rot;
  world.get('village').group.add(scene);
  world.get('village').animated.push((dt) => mixer.update(dt)); // breathes a little
}).catch(() => {});
/**
 * A full-screen ad; after the third one (and every tenth after it, at most once a day) a kind word
 * about ad-free mode: "Reklamsız oyna" opens the shop where it is sold.
 */
const fullAdOffer = new ChoiceCard(host, modes);
async function fullAd() {
  await ads.showInterstitial();
  if (!native && !params.has('mockads')) return; // (the website has no ads)
  const n = Number(settings.get('fullAds', 0)) + 1; settings.set('fullAds', n);
  if (wallet.adFree || (n !== 3 && (n < 3 || (n - 3) % 10 !== 0)) || Date.now() - Number(settings.get('adFreeAskedAt', 0)) < 86_400_000) return;
  settings.set('adFreeAskedAt', Date.now());
  const item = SHOP.find((i) => i.id === 'adFree');
  if (await fullAdOffer.ask({ title: '🚫 Reklamsız oyna', text: `Reklamlar seni rahatsız ediyor mu? ${item.price} krediyle reklamsız moda geç, hikâye kesintisiz devam etsin.`, en: 'Do the ads bother you? Go ad-free with credits and play on without breaks.', yes: 'Mağazaya bak', no: 'Şimdi değil' })) shop.open('wear');
}
// story mode: a full-screen ad between two days (not with ad-free mode)
// a game of chess of mine is over: a full-screen ad, once the result has been seen
chess.onGameOver = () => { if (!wallet.adFree && CONFIG.ads.afterChess) setTimeout(() => fullAd(), 3000); };
story.beforeNewDay = () => (wallet.adFree || !CONFIG.ads.betweenDays ? Promise.resolve() : fullAd());
// going through a door or a gate (home, yard, square, school): now and then a full-screen ad, as you
// leave — said first, never out of the blue in the middle of a place (config.json ads.travelChance),
// never in the first minute, at most one every travelGapMinutes, never in a voice chat
const travelAd = { last: performance.now() - CONFIG.ads.travelGapMinutes * 60000 + 60000 };
travel.beforeGo = async () => {
  if (!native || wallet.adFree || !modes.is('play') || village.voice.inCall || village.group.zone || Math.random() >= CONFIG.ads.travelChance) return; // (the app only: the website has no ads)
  if (performance.now() - travelAd.last < CONFIG.ads.travelGapMinutes * 60000) return;
  travelAd.last = performance.now();
  toasts.show('📺 Kısa bir reklam…', gloss('A short ad…'));
  await new Promise((r) => setTimeout(r, 1200));
  await fullAd();
};

// "Oyunu nasıl buldun?": once a day, credits for a real opinion (server/src/Feedback.js grades it with Gemini)
const feedbackUrl = villageServer.replace(/^ws/, 'http').replace(/\/ws\/village$/, '/api/feedback');
const feedback = new FeedbackView(host, {
  modes, settings,
  post: async (body) => { // the app: through Capacitor (no CORS), the web: fetch
    if (native) { const { CapacitorHttp } = await import('@capacitor/core'); const r = await CapacitorHttp.post({ url: feedbackUrl, headers: { 'Content-Type': 'application/json' }, data: body }); return { status: r.status, data: r.data }; }
    const r = await fetch(feedbackUrl, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    return { status: r.status, data: await r.json().catch(() => ({})) };
  },
  onCredits: (n) => wallet.add(n, 'feedback'),
  info: () => ({ lang: glossLang(), v: appVersion || 'web', place: world.current?.id ?? '' }),
});
/** It opens by itself after a while of playing (10 min, ?feedbackin=<s> in tests), when the player may write today and wasn't asked today. */
const FEEDBACK_AFTER = Number(params.get('feedbackin') ?? 600);
const feedbackAsk = {
  played: 0,
  update(dt) {
    if (!modes.is('play') || menu.isOpen || dialogueView.isOpen) return;
    this.played += dt;
    if (this.played < FEEDBACK_AFTER || !feedback.due || Date.now() - Number(settings.get('feedbackAskedAt', 0)) < 86_400_000) return;
    settings.set('feedbackAskedAt', Date.now());
    feedback.open();
  },
};

// ⚙️ in the HUD: voices and music, picture quality, how to play, back to the main menu
const qualityCard = new ChoiceCard(host, modes);
// the developer's codes (five quick taps on the shop's "Altın" tab, then the 🔑 on the main menu): credits, money, a jump to a chapter or a day, and test switches — only their hashes are in the game
const devCodes = new DevCodes({
  f5721f61994ee960374955e0: (n) => { const k = Math.min(n ?? 100, 100000); wallet.add(k, 'dev'); hud.setCredits(wallet.balance); return `+${k} kredi`; },
  bd438dfadd116abb88c617fc: (n) => { const k = Math.min(n ?? 100, 100000); inventory.add('para', k); hud.setMoney(inventory.count('para')); return `+${k} lira`; },
  e848557d207a5642350f73bd: (n) => { // the chapter whose cards say "Bölüm n" (the numbers the player sees; some are scenes inside a chapter)
    const i = n ? STORY.chapters.findIndex((ch) => new RegExp(`Bölüm ${n}(?!\\d)`).test(JSON.stringify(ch))) : -1;
    if (i < 0) return `Bölüm 1–${Math.max(...JSON.stringify(STORY.chapters).match(/Bölüm \d+/g).map((b) => Number(b.slice(6))))} arası`;
    menu.hide(); settingsPanel.close(); startNew(null, i);
    return { said: `${n}. bölüm`, close: true };
  },
  e4081a5cb4325ed0d6635ce6: (n) => { // the first chapter of a day
    const i = STORY.chapters.findIndex((ch) => ch.day === n);
    if (i < 0) return `Gün 1–${Math.max(...STORY.chapters.map((ch) => ch.day))} arası`;
    menu.hide(); settingsPanel.close(); startNew(null, i);
    return { said: `${n}. gün`, close: true };
  },
  f9cd3ee253df6c9319a4dc2c: () => { wallet.data.adFree = !wallet.data.adFree; wallet.add(0, 'dev'); if (wallet.adFree) ads.hideBanner(); return wallet.adFree ? 'Reklamsız mod açık' : 'Reklamsız mod kapalı'; },
  '151132daddc667a7d0195e1a': () => { wallet.data.dailyDay = ''; wallet.add(0, 'dev'); return 'Günlük ödül yeniden alınabilir (menüde ya da dükkânda)'; },
  cc9a63734c4d9afc3f5d5e9a: () => { wallet.data.adAt = 0; wallet.add(0, 'dev'); return 'Video beklemesi sıfırlandı'; },
  adaece02ed1be30ddf005c58: () => { // every outfit, the HD character, ad-free stays as it is
    for (const i of SHOP) if (i.id !== 'adFree' && !wallet.data.owned.includes(i.id)) wallet.data.owned.push(i.id);
    wallet.add(0, 'dev'); playerHd(); return 'Bütün kıyafetler senin';
  },
  '622faae8a47799225cd638ed': () => { settings.set('devCodes', false); if (menu.isOpen) menu.show(); return { said: 'Kod düğmesi gizlendi', close: true }; }, // (five taps on "Altın" bring it back)
});
const codeCard = new CodeCard(host, modes, devCodes);
const settingsPanel = new SettingsPanel(host, {
  modes, settings, onFps: (v) => applyFps(v),
  confirmQuality: () => qualityCard.ask({ title: 'Görüntü kalitesi', text: 'Daha yüksek kalite telefonu ısıtabilir, pili çabuk bitirebilir ve oyunu yavaşlatabilir. Emin misin?', en: gloss('A higher picture quality can heat up the phone, drain the battery faster and slow the game down. Are you sure?'), yes: 'Evet, değiştir', no: 'Vazgeç' }),
  onFeedback: () => feedback.open(),
  onRename: () => village.rename(), // the name others see in the square (asked the first time there)
  onRooms: pickRoom, room: () => SERVERS.find(([id]) => id === settings.get('serverRegion', DEFAULT_SERVER))?.[1] ?? '',
  onStartAt: (i) => startNew(null, i), // test mode (five taps on the title): a new game from any chapter
  chapters: STORY.chapters.map((ch, i) => ({ i, text: `${ch.day}. gün · ${ch.time} · ${ch.intro?.title ?? ch.id}` })),
  onHelp: () => intro.show(),
  onSound: () => { if (voicesLevel() <= 0) tts.cancel(); },
  onMenu: ({ resume = false } = {}) => {
    saves.save(state.snapshot()); // where you are now, for "Devam et"
    if (resume) try { sessionStorage.setItem('autoContinue', '1'); } catch { /* ignore */ } // (quality change: straight back into the game)
    location.reload(); // a clean start (the online square is left, the story is saved)
  },
});
const settingsBtn = el('button', { class: 'pill', attrs: { type: 'button', 'aria-label': 'Ayarlar', title: 'Ayarlar · settings' }, on: { click: () => settingsPanel.open() } }, ['⚙️']);
const inventoryView = new InventoryView(host, { modes, inventory, items, wallet, speak: (tr) => tts.speak(tr, { speaker: 'ahmet' }) });
const hud = new Hud(host, {
  extra: [settingsBtn, fullscreenBtn],
  onShop: () => shop.open(),
  onBookOpen: () => textbook.open(),
  onBook: () => openWords(),
  onBag: () => inventoryView.toggle(), // the game inventory (I on a keyboard)
});

// Urfa biberi: how long it still works, in the HUD
const boostPill = el('span', { class: 'pill boost', attrs: { title: 'Urfa biberi · faster' } });
hud.addRight(boostPill);
let glowing = auraOn(wallet);
function showBoost() {
  const ms = wallet.boostLeft('pepper'), s = Math.ceil(ms / 1000);
  boostPill.hidden = !ms;
  if (ms) boostPill.textContent = `🌶️ ${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
  if (glowing !== auraOn(wallet)) { // Altın baklava eaten, or its days are over: the light on / off, for the others too
    glowing = auraOn(wallet); playerHd();
    if (village.net.connected) { village.leave(); village.join(); }
  }
}
showBoost(); setInterval(showBoost, 1000);

// --- event wiring (UI reacts to the model) ---
const refreshQuest = () => questPanel.show(story.objective());
bus.on(EV.TIME, () => hud.setTime(time.dayName, time.label, time.isNight));
bus.on(EV.WORD, ({ size }) => hud.setWords(size));
bus.on(EV.INVENTORY, () => { hud.setBag(inventory.size); hud.setMoney(inventory.count('para')); hud.setTextbook(inventory.has('kitap')); refreshQuest(); });
hud.setBag(inventory.size); hud.setMoney(inventory.count('para')); // right away too: straight into the square from the menu, no story started (it said 0 ₺ with 30 in the bag)
bus.on(EV.CREDITS, ({ balance }) => hud.setCredits(balance));
hud.setCredits(wallet.balance); // from the start (online from the menu, too)
bus.on(EV.QUEST, refreshQuest);
bus.on(EV.CHAPTER, ({ chapter }) => {
  player.sit(false);
  world.get('house').setBreadOnTable?.(state.flags['bread-on-table'] === true && chapter.id === 'd1-breakfast');
});
bus.on(EV.ITEM_PICKED, ({ item, isNew }) => {
  effects.run(item.onPick);
  const note = `${isNew ? 'Yeni kelime: ' : ''}${wordNote(item.tr, item.en)}`;
  const name = item.bagTr ?? item.tr;
  if (item.goal) toasts.show(`${name[0].toLocaleUpperCase('tr')}${name.slice(1)}: ${inventory.count(item.kind)}/${item.goal}`, isNew ? note : '');
  else toasts.show(`${item.verb.replace(/ al$/, '')} aldın!`, note);
});

// --- menu scene, then start ---
cast.apply(STORY.chapters[0].cast);
travel.place('yard', 'houseDoor', { silent: true });
// --- save / continue ---
const saves = new LocalSaveRepository();
// a new game now starts in the park in the square: every old story save starts over once (credits, purchases,
// outfits and settings stay — they are the wallet's, not the save's)
if (!settings.get('parkStart', false)) { saves.clear(); settings.set('parkStart', true); }
if (params.has('consented') && params.has('debug')) { settings.set('dataConsent', { v: CONSENT_VERSION, at: 0 }); settings.set('usernameAsked', true); } // tests: the recording consent already given (and no username question)
let saved = params.has('fresh') ? null : saves.load();
let autosaveOn = false;
new AutoSave({ bus, state, repo: saves, enabled: () => autosaveOn });
const enterPlay = () => {
  tts.preload();
  modes.setBase('play');
  document.body.classList.remove('menu');
  autosaveOn = true;
  if (village.places[world.current.id]) village.join(); // in the square already (a new game starts in the park; a saved one may be there): among the others at once
};
const intro = new IntroSlides(host, modes);
const help = new HelpPanel(host, {
  modes,
  getState: () => ({
    quest: story.objective(),
    bag: inventory.entries().map(([kind, n]) => { const i = items.info(kind); const m = meaning(i.tr, i.en); return [n > 1 ? `${n} ${i.tr}` : i.tr, m && n > 1 ? `${n} ${m}` : m]; }),
    words: vocab.size,
  }),
  onIntro: () => intro.show(),
  onWords: () => openWords(),
});
hud.addRight(help.button); // a small ? in the top bar (it took a corner of the game)
hud.addRight(village.ptt.status); // who is online, next to it (not over the talk button)
hud.addRight(village.ptt.reportBtn); // 🚩 "Şikayet et", right by it
village.ptt.status.hidden = true;

// the first time, the introduction comes before the story (skip with ?nointro)
const introFirst = async () => {
  if (settings.get('introSeen', false) || params.has('nointro')) return;
  await intro.show();
  settings.set('introSeen', true);
};
const setup = new CharacterSetup(host, { modes, settings, villageServer });
// a player standing still for a long while (in the game, no card open): a banner ad, gone at the first step
const IDLE_BANNER = CONFIG.ads.idleBannerSeconds; // s (set on the server: config/remote.js)
const idleAd = {
  idle: 0, on: false,
  update(dt) {
    if (menu.isOpen) { this.idle = 0; this.on = false; return; } // the menu decides its own banner
    this.idle = modes.is('play') && !player.moving ? this.idle + dt : 0;
    const want = this.idle > IDLE_BANNER && !wallet.adFree;
    if (want !== this.on) { this.on = want; if (want) ads.showBanner(); else ads.hideBanner(); }
  },
};
const menu = new MainMenu(host, {
  settings, confirmQuality: () => qualityCard.ask({ title: 'Görüntü kalitesi', text: 'Daha yüksek kalite telefonu ısıtabilir, pili çabuk bitirebilir ve oyunu yavaşlatabilir. Emin misin?', en: gloss('A higher picture quality can heat up the phone, drain the battery faster and slow the game down. Are you sure?'), yes: 'Evet, değiştir', no: 'Vazgeç' }),
  onBanner: (on) => { if (on && !wallet.adFree) ads.showBanner(); else ads.hideBanner(); }, // a banner on the square's menu (none with ad-free)
  villageServer,
  hasSave: () => !!saved,
  onHelp: () => intro.show(),
  onStart: async () => { await introFirst(); startNew(); },
  onStartAt: (i) => startNew(null, i), // test mode: a new game from any chapter
  chapters: STORY.chapters.map((ch, i) => ({ i, text: `${ch.day}. gün · ${ch.time} · ${ch.intro?.title ?? ch.id}` })),
  onContinue: () => continueGame(),
  onProfile: () => { menu.hide(); editProfile(); },
  onShop: () => shop.open(),
  onCode: () => codeCard.open(), // the 🔑 (once five taps on the shop's "Altın" tab turned it on)
});
/** Character setup; language and boy/girl rewrite texts, so those changes reload the page. */
async function editProfile({ cancellable = true } = {}) {
  const before = { lang: settings.get('glossLang', 'ar'), gender: playerGender(), look: settings.get('look', '') };
  const p = await setup.open({ cancellable });
  if (p && (p.lang !== before.lang || p.gender !== before.gender || p.look !== before.look)) { location.reload(); return; }
  menu.show();
}
// how the game is played, anonymously: counts only (server/src/PlayStats.js; the privacy policy says so)
const stats = new Stats({
  bus, settings, modes, chapters: STORY.chapters.map((c) => c.id), native, lang: () => glossLang(), version: () => appVersion,
  enabled: !params.has('debug') && !params.has('nointro') && !params.has('fakemic') && (native || !/^(localhost|127\.0\.0\.1|\[::1\])$/.test(location.hostname)), // (the app's own pages come from https://localhost too: only a dev server's are left out)
  post: async (url, body) => {
    if (native) { const { CapacitorHttp } = await import('@capacitor/core'); const r = await CapacitorHttp.post({ url, headers: { 'Content-Type': 'application/json' }, data: body }); return r.status === 204; }
    const r = await fetch(url, { method: 'POST', body: JSON.stringify(body), keepalive: true, headers: { 'Content-Type': 'text/plain' } }); // (text/plain: no preflight)
    return r.status === 204;
  },
});
village.onStat = (key) => stats.count(key);
{ const open = shop.open.bind(shop); shop.open = (...a) => { stats.count('shop'); return open(...a); }; }
{ const ride = animals.ride.bind(animals); animals.ride = (h) => { stats.count('ride'); return ride(h); }; }
// first launch: create the character before anything else (tests skip it with ?nointro)
if (!setup.done && !params.has('nointro')) { menu.hide(); if (!wallet.adFree) ads.showBanner(); editProfile({ cancellable: false }); } // (the very first screen carries the banner too) // (no 3D offer: it is in the shop)
else {
  // back from changing the outfit: straight on where you were
  let again = false;
  try { again = sessionStorage.getItem('autoContinue') === '1'; sessionStorage.removeItem('autoContinue'); } catch { /* ignore */ }
  if (again && saved) { menu.hide(); continueGame(); } else offerDaily();
}
if (native) scheduleDailyReminder(nativeKit.LocalNotifications); // keep tomorrow's reminder
// Play Games sign-in (silent for Play Games users): the player id goes with what they write, for the safety log
if (native) nativeKit.PlayGames.signIn().then((r) => { if (r?.signedIn && r.playerId) settings.set('playGamesId', r.playerId); }).catch(() => {});

function backToMenu() {
  fader.run(() => {
    gameCtx.online = false;
    village.chosenRoom = false;
    travel.place('yard', 'houseDoor', { force: true }); // leaving the square disconnects
    story.resumeStory();
    autosaveOn = false;
    modes.setBase('menu');
    document.body.classList.add('menu');
    saved = params.has('fresh') ? null : saves.load();
    menu.show();
  });
}
effects.register('main-menu', () => backToMenu());

/** Outside school days: practise in the classroom (free); home life waits until you are back in the yard. */
async function schoolPractice() {
  story.pause();
  const paid = await lessons.practice({
    onDone: () => travel.go('schoolyard', 'door', () => { cast.apply(story.chapter.cast); story.resumeStory(); toasts.show('Ders bitti, bahçeye çıktın', gloss('Lesson over — your day continues where you left it')); }),
  });
  if (!paid) story.resumeStory();
}
// the classroom door: the day's lesson on school days, otherwise practice
effects.register('school-door', () => (schoolDay(gameCtx) ? effects.run(['lesson']) : schoolPractice()));

// the garden gate is the street: school or the village square (the one the quest needs comes first);
// "school" always leads to the schoolyard first — the lesson starts at the classroom door
const streetChoice = new ChoiceCard(host, modes);
effects.register('street', async () => {
  const schoolTrip = gameCtx.targetHotspot === 'yard.gate';
  const school = time.isNight && !schoolTrip
    ? { label: '🏫 Okul (gece kapalı)', en: 'The school is closed at night.', value: null, disabled: true }
    : { label: '🏫 Okula git', en: 'Go to school', value: 'school' };
  const square = { label: '🏘️ Köy meydanına git', en: 'Go to the village square', value: 'square' };
  const toSquare = gameCtx.targetNpcLoc === 'village' || story.target()?.hotspot?.startsWith('village.');
  const pick = await streetChoice.pick({ title: 'Nereye gidiyorsun?', en: 'Where are you going?', options: toSquare ? [square, school] : [school, square] });
  if (pick === 'school') { if (schoolTrip) effects.run(['chapter']); else travel.go('schoolyard', 'gate'); }
  else if (pick === 'square') travel.go('village', 'yardRoad');
});

function startNew(then, chapter = null) { // chapter: start from there (testers, ⚙️ in the menu)
  fader.run(() => {
    saves.clear();
    const requestedDay = Number(params.get('day'));
    const dayIndex = chapter ?? (Number.isInteger(requestedDay) && requestedDay > 0
      ? STORY.chapters.findIndex((ch) => ch.day === requestedDay)
      : 0);
    hud.setCredits(wallet.balance); hud.setWords(vocab.size); hud.setBag(inventory.size); hud.setMoney(inventory.count('para'));
    story.startChapter(dayIndex >= 0 ? dayIndex : 0, () => {
      enterPlay();
      then?.(); // (no thought bubble over the player: the day's task is in the quest panel)
    });
  });
}
function continueGame(then) {
  fader.run(() => {
    state.restore(saved);
    player.wear('jacket', !!state.flags['wear-jacket']);
    items.refresh();
    hud.setWords(vocab.size); hud.setBag(inventory.size); hud.setMoney(inventory.count('para')); hud.setCredits(wallet.balance); hud.setTextbook(inventory.has('kitap'));
    story.resume(world.get(state.location).spawn, () => { enterPlay(); then?.(); });
  });
}


const parkPlay = new ParkPlay({ world, player, vocab, toasts });
const game = new Game({ ambient: [kahveTalk, cirak, dama, halay, talk, ney, music, jumpShown, library, cinema, ratePrompt, idleAd, feedbackAsk, parkPlay], shotButton, help, prayer, village, toys, foliage: Foliage, modes, time, lighting, controller, cast, items, world, interactions, actionButton, joystick, marker, minimap, camera, labels, dialogue, story, player, ctx });

// frames a second (⚙️ "Kare hızı"; on a phone 30 by default: 120 Hz screens drew 120 a second and ran hot)
const applyFps = (v) => { game.fps = v === 'max' ? null : Number(v) || 30; };
if (!settings.get('fpsUnlimited1', false)) { settings.set('fps', defaultFps()); settings.set('fpsUnlimited1', true); } // once: everyone to unlimited (it was 30 on phones by default)
applyFps(settings.get('fps', defaultFps()));
game.start();
game.rest = () => damaView.isOpen || chess.view?.isOpen; // a board on screen: the world isn't drawn under it
if (native) wireAppLifecycle(nativeKit.App, { dialogue, tts, village });

// headscarves: off at home, on outside and for the prayer (mom, and Sare if she wears one)
const coverable = [player, ...[...npcs.values()].filter((n) => n.def.look?.homeUncovered)];
setInterval(() => coverable.forEach((c) => {
  if (!(c === player ? PLAYER_LOOKS[playerLook] : c.def.look)?.homeUncovered) return;
  const at = c === player ? world.current?.id : c.location;
  c.setCovered(at !== 'house' || !!prayer.active);
}), 300);

// Ali sometimes comes out into the garden with you (and plays there on his own); he stays home when you go further
{
  let goingOut = false;
  bus.on(EV.HOTSPOT, ({ id }) => { goingOut = id === 'house.door'; });
  bus.on(EV.LOCATION, ({ id }) => {
    const kid = cast.get('kardes'), out = goingOut;
    goingOut = false;
    if (!kid || gameCtx.online) return;
    if (id === 'yard' && out && kid.location === 'house' && !time.isNight && (params.has('kidout') || Math.random() < 0.5)) { // ?kidout: always (tests)
      cast.move('kardes', 'yard', 'houseDoor', 'follow');
      kid.position.x += 1.2; kid.position.z += 0.6;
    } else if (kid.location === 'yard' && kid.behavior.follow && id !== 'yard') {
      cast.move('kardes', 'house', 'start', 'roam'); // home with you, or back in when you go out of the gate
    }
  });
}

// the little brother: mom tells him off for jumping on the bed; now and then he calls you over to ask what something is
function scoldKid(anne = cast.get('anne'), kid = cast.get('kardes')) {
  labels.bubble(anne, 'Ali, yatakta zıplama!', null, 3, "Ali, don't jump on the bed!");
  // he answers once mom has finished (her line can take a moment to arrive: he used to answer first and cut her off)
  return Promise.race([tts.speak('Ali, yatakta zıplama!', { speaker: 'anne' }), new Promise((r) => setTimeout(r, 6000))])
    .then(() => new Promise((r) => setTimeout(r, 350)))
    .then(() => { labels.bubble(kid, 'Tamam anne!', null, 2.5, 'Okay mum!'); tts.speak('Tamam anne!', { speaker: 'kardes' }); });
}
let kidScoldAt = -99, kidAskAt = 120;
const KID_CALLS = [['bu ne? Gel bak!', 'Look, what is this? Come and see!'], ['bak ne buldum!', 'Look what I found!'], ['gel, oynayalım!', 'Come on, let’s play!'], ['sana bir şey soracağım!', 'I want to ask you something!']];
setInterval(() => {
  const kid = cast.get('kardes');
  if (!kid || kid.location !== 'house' || world.current.id !== 'house' || dialogue.talking || modes.top !== 'play') return;
  const t = game.t, anne = cast.get('anne');
  if (kid.roam.jumping && anne?.location === 'house' && t - kidScoldAt > 150 && kid.position.distanceTo(player.position) < 8) { // seldom, and only when you are near
    kidScoldAt = t;
    scoldKid(anne, kid);
  } else if (t > kidAskAt && kid.position.distanceTo(player.position) < 4.5) {
    kidAskAt = t + 240; // not too often: he is a child, not a teacher
    const [line, en] = KID_CALLS[Math.floor(Math.random() * KID_CALLS.length)]; // not the same call every time
    const call = `${playerGender() === 'girl' ? 'Abla' : 'Abi'}, ${line}`;
    labels.bubble(kid, call, null, 4, en);
    tts.speak(call, { speaker: 'kardes' });
  }
}, 1000);

// the app: everything above started, so this build works — then look for a newer one (live updates)
/** A newer app on Google Play than this one (config.json "update.latestApp", for changes live updates can't bring): a card at start. */
async function offerAppUpdate() {
  const info = await nativeKit.App.getInfo().catch(() => null);
  if (!info || Number(info.build) >= CONFIG.update.latestApp) return;
  const go = await new ChoiceCard(host, modes).ask({
    title: 'Yeni sürüm var! 🎉',
    text: CONFIG.update.text || 'Oyunun yeni sürümü Google Play\'de. Güncellemek bir dakika sürer.',
    en: CONFIG.update.en || 'A new version of the game is on Google Play. Updating takes a minute.',
    yes: 'Güncelle', no: 'Sonra',
  });
  if (go) location.href = CONFIG.update.store; // (the app opens Google Play for it)
}
if (native && CONFIG.update.latestApp && setup.done) setTimeout(offerAppUpdate, 1500);

// Debug handle for automated play-throughs: open with ?debug
if (params.has('debug')) { window.__progs = () => ctx.renderer.info.programs?.length ?? 0; window.__frame = () => new Promise((done) => { const i = ctx.renderer.info; i.autoReset = false; i.reset(); requestAnimationFrame(() => requestAnimationFrame(() => { const r = { calls: i.render.calls, triangles: i.render.triangles }; i.autoReset = true; done(r); })); }); } // (tests: shaders compiled so far, last frame's draw calls and triangles)
if (params.has('debug')) window.__game = { cinema, ratePrompt, parkPlay, feedback, halay, dama, controller, scoldKid, idleAd, music, cirak, toasts, animals, bicycle, scooters, market, tableAndBins, labels, shop, ads, billing, ney, library, bus, football, squareFootball, talk, chess, camera, drill, settings, glossProbe: gloss, help, intro, prayer, joystick, interactions, village, lessons, textbook, wallet, travel, cast, free, toys, tts, game, story, marker, player, modes, world, dialogue, inventory, vocab, time };
