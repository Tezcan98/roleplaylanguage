import * as THREE from 'three';
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

import { Player } from './entities/Player.js';
import { Npc } from './entities/Npc.js';

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
import { isNativeApp, loadNativeAdapters, wireAppLifecycle, scheduleDailyReminder } from './platform/native.js';
import { ClassAccessGate } from './services/monetization/ClassAccessGate.js';
import { PlayBilling, NoBilling } from './services/monetization/Billing.js';
import { ShopView } from './ui/ShopView.js';
import { DailyRewardView } from './ui/DailyRewardView.js';
import { outfitOn, outfitModel, auraOn } from './content/shop.js';
import { LocalClassroomSession, WebSocketClassroomSession } from './services/multiplayer/ClassroomSession.js';
import { ClassroomView } from './ui/ClassroomView.js';
import { VillageNetwork } from './services/multiplayer/VillageNetwork.js';
import { VoiceChat } from './services/multiplayer/VoiceChat.js';
import { RemotePlayers } from './systems/RemotePlayers.js';
import { VillageMultiplayer } from './systems/VillageMultiplayer.js';
import { UsernameDialog } from './ui/UsernameDialog.js';
import { PushToTalk } from './ui/PushToTalk.js';
import { CallUI } from './ui/CallUI.js';
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
import { Settings } from './services/Settings.js';
import { LocalSaveRepository } from './services/storage/SaveRepository.js';
import { AutoSave } from './systems/AutoSave.js';
import { WebSpeechRecognizer, RemoteSpeechRecognizer, ScriptedRecognizer } from './services/speech/SpeechRecognizer.js';
import { LanguageDetector } from './services/speech/LanguageDetector.js';
import { AnswerMatcher } from './services/speech/AnswerMatcher.js';
import { SpeechEvaluator } from './services/speech/SpeechEvaluator.js';

import { Hud } from './ui/Hud.js';
import { QuestPanel } from './ui/QuestPanel.js';
import { Toasts } from './ui/Toasts.js';
import { LabelLayer } from './ui/LabelLayer.js';
import { Joystick } from './ui/Joystick.js';
import { ActionButton, ShotButton } from './ui/ActionButton.js';
import { Fader } from './ui/Fader.js';
import { CardOverlay } from './ui/CardOverlay.js';
import { MainMenu } from './ui/MainMenu.js';
import { WordDrill } from './systems/WordDrill.js';
import { ChessGame } from './systems/ChessGame.js';
import { Football } from './systems/Football.js';
import { TalkAreas } from './systems/TalkAreas.js';
import { Library } from './systems/Library.js';
import { NeyMusic } from './systems/NeyMusic.js';
import { BookReader } from './ui/BookReader.js';
import { AmbientTalk } from './systems/AmbientTalk.js';
import { KAHVEHANE, LIBRARY, CHESS } from './world/locations/VillageSquare.js';
import { SERVERS, healthUrl } from './ui/ServerPicker.js';
import { ChoiceCard } from './ui/ChoiceCard.js';
import { setupLandscape } from './ui/Landscape.js';
import { ListModal } from './ui/ListModal.js';
import { DialogueView } from './ui/DialogueView.js';

import { gloss, wordNote, loadGlossLang, glossLang } from './i18n/Gloss.js';
import { schoolDay } from './content/hotspots.js';
import { setPlayerGender, setPlayerLook, playerGender, playerName, personalizeContent, setTeacher, teacherInfo } from './i18n/Persona.js';
import { NpcChatClient } from './services/ai/NpcChatClient.js';
import { CharacterSetup } from './ui/CharacterSetup.js';
import {
  STORY, NPCS, PLAYER_LOOK, PLAYER_LOOK_GIRL, PLAYER_LOOKS, lookKey, VOICES, TEACHER_MAN, DIALOGUES, ITEMS, KIND_NAMES, HOTSPOTS, LINKS, FREE_ACTIONS, HOUSE_RULES,
  LESSONS, CLASSMATE_BOTS, TEXTBOOK, MEALS, PRAYER_STEPS, PRAYER_WORDS, KAHVE_TALKS, BOOKS,
} from './content/index.js';

async function loadManifest() {
  try { const r = await fetch('assets/manifest.json', { cache: 'no-cache' }); return r.ok ? await r.json() : {}; } catch { return {}; }
}

const manifest = await loadManifest();
await document.fonts?.load('700 40px Fredoka').catch(() => {}); // canvas textures (signs, chalkboard) use it
const params = new URLSearchParams(location.search);
const host = document.getElementById('ui');

// --- core ---
const settings = new Settings();
const native = isNativeApp(); // inside the Android app
const nativeKit = native ? await loadNativeAdapters() : null;
const quality = params.get('quality') ?? settings.get('quality', native ? 'low' : 'medium');
await loadGlossLang(params.get('gloss') ?? settings.get('glossLang', 'ar')); // meanings in Arabic by default (assets/i18n/)
const fullscreenBtn = setupLandscape(); // ⛶ in the HUD
// boy (Ahmet) or girl (Sare): the content is rewritten once, before any system reads it
setPlayerGender(params.get('gender') ?? settings.get('gender', 'boy'));
const playerLook = lookKey(playerGender(), params.get('look') ?? settings.get('look', ''));
setPlayerLook(playerLook); // Ahmet, Hakan, Sare or Seher
// the class teacher: picked at random once (a woman or a man, with a name), then kept
settings.set('teacher', setTeacher(params.get('teacher') ?? settings.get('teacher', '')));
{
  const t = teacherInfo();
  NPCS.ogretmen.name = `${t.name} Öğretmen`;
  if (t.gender === 'm') { Object.assign(NPCS.ogretmen, TEACHER_MAN); VOICES.ogretmen = { id: 'tr_TR-fahrettin-medium', pitch: 1.0 }; }
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
const textures = new TextureFactory(ctx.renderer);
await textures.loadOverrides(manifest.textures);
const mf = new MeshFactory(textures, { standard: quality !== 'low' });
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
const questPanel = new QuestPanel(host);
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
const controller = new PlayerController({ player, input, world, modes, cast, camera });

// --- dialogue ---
const progressShown = new Set();
const ttsServerUrl = manifest.ttsServer ?? villageServer.replace(/^ws/, 'http').replace(/\/ws\/village$/, '/api/tts');
const tts = new CharacterVoices({
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
});
// ?fakemic → scripted answers (tests); manifest.sttEndpoint → Whisper server; else browser STT
const recognizer = params.has('fakemic') ? new ScriptedRecognizer()
  : native ? new nativeKit.NativeSpeechRecognizer('tr-TR')
  : manifest.sttEndpoint ? new RemoteSpeechRecognizer(manifest.sttEndpoint) : new WebSpeechRecognizer('tr-TR');
const speech = new SpeechEvaluator({ recognizer, detector: new LanguageDetector(), matcher: new AnswerMatcher() });
const ads = native ? new nativeKit.AdMobAdProvider({ rewardedId: manifest.admob?.rewardedId, interstitialId: manifest.admob?.interstitialId })
  : new MockAdProvider(host, modes, params.has('fastads') ? 1 : 5, { interstitials: params.has('mockads') });
const billing = native ? new PlayBilling(nativeKit.NativePurchases, nativeKit.PURCHASE_TYPE) : new NoBilling();
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
  onChat: () => dialogue.startChat(),
});
// free conversation with village characters (Gemini behind the village server; off without a key)
const npcChat = new NpcChatClient({ url: manifest.npcChat || NpcChatClient.urlFor(villageServer), lang: glossLang, player: playerName });
const chatRecognizer = params.has('fakemic') ? new ScriptedRecognizer() : (native ? new nativeKit.NativeSpeechRecognizer('tr-TR') : new WebSpeechRecognizer('tr-TR'));
const dialogue = new DialogueController({
  dialogues: DIALOGUES, cast, view: dialogueView, activities, effects, vocab, tts, modes, bus, input,
  chat: npcChat, recognizer: chatRecognizer,
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
  .register('flag', (name) => { state.flags[name] = true; bus.emit(EV.FLAG, { name }); })
  .register('sit', (anchor) => { // a seat in the current place (sofra at home, tea-garden stools…)
    const a = world.current.anchors.get(anchor) ?? world.get('house').anchors.get(anchor);
    if (a) { player.place(a); player.sit(true); }
  })
  .register('place-bread', () => {
    inventory.remove('ekmek', 1);
    state.flags['bread-on-table'] = true;
    world.get('house').setBreadOnTable?.(true);
    bus.emit(EV.INVENTORY);
  });
story.setEffects(effects);

// --- prayer scene, meal times ---
const prayer = new PrayerScene({ playerRow: () => (playerGender() === 'girl' ? 'saf2c' : 'saf1b'),
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
const schoolBall = toys.add(new Ball(mf, world.get('schoolyard'), { x: 0, z: -2 }), { action: 'ball', touch: true, quiet: true, onKick: (b) => { football.assist(b); village.ballKicked(b); } }); // aim assist, then shared
const pitchMid = (SQUARE_PITCH.x0 + SQUARE_PITCH.x1) / 2;
const villageBalls = [{ x: pitchMid, z: SQUARE_PITCH.cz }, { x: pitchMid - 4, z: SQUARE_PITCH.cz - 2 }]
  .map((at) => toys.add(new Ball(mf, world.get('village'), at), { action: 'ball', touch: true, quiet: true, onKick: (b) => { squareFootball.assist(b); village.ballKicked(b); } }));
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
  bus, net: villageNet, voice: new VoiceChat({ net: villageNet, iceServers: manifest.iceServers ?? [{ urls: 'stun:stun.l.google.com:19302' }], onState: (st) => village.voiceState(st), relayOnly: params.has('relayonly') }),
  remotes: new RemotePlayers({ mf, models, baseLook: PLAYER_LOOK, looks: PLAYER_LOOKS }),
  rooms: SERVERS, healthUrl: healthUrl(villageServer), choice: new ChoiceCard(host, modes),
  // public places: the square, and the schoolyard for football (its own room: <city>-okul)
  places: { village: { suffix: '', balls: villageBalls, label: '' }, schoolyard: { suffix: '-okul', balls: [schoolBall], label: 'Okul bahçesi' } },
  world, player, settings, labels, toasts,
  ptt: new PushToTalk(host, { onChange: (on) => village.talk(on) }),
  calls: new CallUI(host, modes),
  usernames: new UsernameDialog(host, modes),
  // first time in the square: how talking works here (Arabic, with Turkish)
  onFirstVisit: () => cards.show({
    num: 'Köy meydanı', title: 'Burada gerçek oyuncular var',
    text: 'Söylediğin cümle başının üstünde yazı olarak görünür. Sesli sohbet sadece iki kişi arasında ve karşı taraf kabul ederse açılır.',
    en: 'There are real players here. What you say appears as text above your head («Bas, konuş» or T). Voice chat is only between two people, after the other person agrees. Be kind!',
    button: 'Tamam',
  }),
  recognizer: chatRecognizer,
});
village.autoName = () => `${playerName()}${Math.floor(10 + Math.random() * 90)}`; // story mode: no username question
village.outfit = () => ({ outfit: outfitOn(wallet), aura: auraOn(wallet) }); // others see them too
// the HD character from the shop: in the public places (square, schoolyard), the blocky one elsewhere
const playerHd = () => { player.setAura(auraOn(wallet)); const o = outfitOn(wallet); player.setHd(models, outfitModel(o ?? 'casual', playerGender()), !!o && ['village', 'schoolyard'].includes(world.current?.id), { covered: !!PLAYER_LOOKS[playerLook].headscarf, dress: o === 'dress' }); };
bus.on(EV.LOCATION, playerHd);
playerHd();

// --- giant chess on the square: online the server's board (İsmail Dede runs it), offline Dede plays you ---
const chess = new ChessGame({
  host, mf, square: world.get('village'), net: villageNet, vocab, toasts, player, world,
  // İsmail Dede announces the games: a bubble over his head (no voice)
  onSay: (line) => {
    const dede = cast.get('ismail');
    if (dede?.location === 'village' && world.current.id === 'village') labels.bubble(dede, line, null, 5);
  },
  onAskDede: () => dialogue.open('ismail'), // touching a piece when not playing: Dede decides who plays
});
gameCtx.chess = chess; // İsmail Dede's dialogue asks the board who plays (content/addons/satranc.js)
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
const talk = new TalkAreas({ world, player, cast, labels });
village.ptt.onType = (text) => village.say(text); // typed instead of spoken (no speech-to-text on this device)
// the open library: borrow a book, read it sitting on a bench
const library = new Library({
  books: BOOKS, state, player, choice: new ChoiceCard(host, modes), toasts, vocab, wallet, world,
  reader: new BookReader(host, { modes, onSpeak: (t) => tts.speak(t, { speaker: 'okuyucu' }), onClose: (b, page) => library.closed(b, page), onFinish: (b) => library.finished(b) }),
});
effects.register('library', () => library.atShelf());
// a ney plays quietly in the background in Aslan Bey's open library
const ney = new NeyMusic({ world, player, place: { location: 'village', x: LIBRARY.x, z: LIBRARY.z } });
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
const kahveTalk = new AmbientTalk({ world, player, cast, labels, place: { location: 'village', x: KAHVEHANE.x, z: KAHVEHANE.z }, talks: KAHVE_TALKS });

// your own garden bed: planting comes later — grandpa says you are still a bit young
effects.register('my-garden', () => {
  if (cast.where('dede') === world.current.id) { dialogue.open('dede', 'myGarden'); return; }
  labels.think('Burası benim bahçem olacak!', 3.5, game.t);
  toasts.show('Dede: “Biraz büyü, sonra birlikte ekeriz.”', gloss('Grandpa: “Grow a little, then we will plant it together.”'));
});

// --- interaction ---
const interactions = new InteractionSystem([
  library, // sitting with a book in hand: read it
  chess, // on the giant board: take a piece, put it down
  village, // "voice chat with X" next to another player in the square
  toys,
  new NpcInteractions({ cast, dialogue, story }),
  new ItemInteractions({ items }),
  new HotspotInteractions({ world, rules: HOTSPOTS, story, travel, toasts, effects, bus, ctx: gameCtx }),
], modes);
const actionButton = new ActionButton(host, () => interactions.trigger());
const shotButton = new ShotButton(host, () => toys.shoot(), actionButton.root);
input.onKey((e) => { if (modes.is('play') && ['e', 'E', 'Enter'].includes(e.key)) { e.preventDefault(); interactions.trigger(); } });
const marker = new QuestMarker({ scene: ctx.scene, story, world, cast, items, player });

// word notebook with "practice" (a quick quiz over the learned words)
const drill = new WordDrill(host, { modes, vocab, activities, tts, state, effects, toasts });
const openWords = () => list.open('Kelime defteri', vocab.entries().map(([tr, en]) => [tr, gloss(en)]), 'Henüz kelime yok. Biriyle konuş!',
  drill.available ? { label: '🧠 Kelime pratiği yap', run: () => drill.open() } : null);
// --- shop, daily reward, ads between story days ---
const shop = new ShopView(host, {
  modes, wallet, ads, billing, toasts, gender: playerGender(), look: settings.get('look', ''),
  onDaily: () => takeDaily(),
  // new colours: saved, then the game opens again with them (and goes on where it was)
  onOutfit: () => { playerHd(); shop.render(); if (village.net.connected) { village.leave(); village.join(); } }, // others see it after a quick reconnect
});
const dailyView = new DailyRewardView(host, modes);
function takeDaily() {
  const d = wallet.takeDaily();
  if (d) toasts.show(`🎁 +${d.amount} kredi`, 'Daily reward');
  if (native) scheduleDailyReminder(nativeKit.LocalNotifications, { ask: true }); // "Bugünkü ödülünü al!" tomorrow
}
async function offerDaily() {
  const d = wallet.daily();
  if (!d || (params.has('nointro') && !params.has('daily'))) return; // tests: only with ?daily
  await dailyView.show(d);
  takeDaily();
}
effects.register('shop', () => shop.open());
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
// story mode: a full-screen ad between two days (not with ad-free mode)
story.beforeNewDay = () => (wallet.adFree ? Promise.resolve() : ads.showInterstitial());

const hud = new Hud(host, {
  extra: [fullscreenBtn],
  onShop: () => shop.open(),
  onBookOpen: () => textbook.open(),
  onBook: () => openWords(),
  onBag: () => list.open('Çanta', inventory.entries().map(([kind, n]) => {
    const i = items.info(kind);
    return n > 1 ? [`${n} ${i.tr}`, `${n} ${gloss(i.en)}`] : [i.tr, gloss(i.en)];
  }), 'Çantan boş.'),
});

// --- event wiring (UI reacts to the model) ---
const refreshQuest = () => questPanel.show(story.objective());
bus.on(EV.TIME, () => hud.setTime(time.dayName, time.label, time.isNight));
bus.on(EV.WORD, ({ size }) => hud.setWords(size));
bus.on(EV.INVENTORY, () => { hud.setBag(inventory.size); hud.setTextbook(inventory.has('kitap')); refreshQuest(); });
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
let saved = params.has('fresh') ? null : saves.load();
let autosaveOn = false;
new AutoSave({ bus, state, repo: saves, enabled: () => autosaveOn });
const enterPlay = () => {
  tts.preload();
  modes.setBase('play');
  document.body.classList.remove('menu');
  autosaveOn = true;
};
const intro = new IntroSlides(host, modes);
const help = new HelpPanel(host, {
  modes,
  getState: () => ({
    quest: story.objective(),
    bag: inventory.entries().map(([kind, n]) => { const i = items.info(kind); return [n > 1 ? `${n} ${i.tr}` : i.tr, n > 1 ? `${n} ${gloss(i.en)}` : gloss(i.en)]; }),
    words: vocab.size,
  }),
  onIntro: () => intro.show(),
  onWords: () => openWords(),
});
// the first time, the introduction comes before the story (skip with ?nointro)
const introFirst = async () => {
  if (settings.get('introSeen', false) || params.has('nointro')) return;
  await intro.show();
  settings.set('introSeen', true);
};
const setup = new CharacterSetup(host, { modes, settings, villageServer });
const menu = new MainMenu(host, {
  settings,
  villageServer,
  hasSave: () => !!saved,
  onHelp: () => intro.show(),
  onStart: async () => { await introFirst(); startNew(); },
  onContinue: () => continueGame(),
  onSquare: (server) => playOnline(server),
  onProfile: () => { menu.hide(); editProfile(); },
  onShop: () => shop.open(),
  // gift code (for testing the shop; to be removed or changed before the store release)
  onGift: (code) => {
    const c = String(code).trim().toUpperCase();
    if (c !== 'ANADOLU100') return 'Bu kod geçerli değil.';
    if (settings.get(`gift-${c}`)) return 'Bu kodu zaten kullandın.';
    settings.set(`gift-${c}`, true);
    wallet.add(100, 'gift');
    return '+100 kredi! İyi eğlenceler.';
  },
});
/** Character setup; language and boy/girl rewrite texts, so those changes reload the page. */
async function editProfile({ cancellable = true } = {}) {
  const before = { lang: settings.get('glossLang', 'ar'), gender: playerGender(), look: settings.get('look', '') };
  const p = await setup.open({ cancellable });
  if (p && (p.lang !== before.lang || p.gender !== before.gender || p.look !== before.look)) { location.reload(); return; }
  menu.show();
}
// first launch: create the character before anything else (tests skip it with ?nointro)
if (!setup.done && !params.has('nointro')) { menu.hide(); editProfile({ cancellable: false }); }
else {
  // back from changing the outfit: straight on where you were
  let again = false;
  try { again = sessionStorage.getItem('autoContinue') === '1'; sessionStorage.removeItem('autoContinue'); } catch { /* ignore */ }
  if (again && saved) { menu.hide(); continueGame(); } else offerDaily();
}
if (native) scheduleDailyReminder(nativeKit.LocalNotifications); // keep tomorrow's reminder

/** Online square straight from the menu: no story (paused), no autosave; leaving returns here. */
function playOnline(server) {
  settings.set('serverRegion', server);
  village.chosenRoom = true; // picked on the menu: that room, not the busiest one
  gameCtx.online = true;
  story.pause();
  autosaveOn = false;
  fader.run(() => {
    travel.place('village', 'yardRoad', { force: true });
    tts.preload();
    modes.setBase('play');
    document.body.classList.remove('menu');
  });
}
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

/** Outside school days: practise in the classroom for 1 credit; home life waits until you are back in the yard. */
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

function startNew(then) {
  fader.run(() => {
    saves.clear();
    const requestedDay = Number(params.get('day'));
    const dayIndex = Number.isInteger(requestedDay) && requestedDay > 0
      ? STORY.chapters.findIndex((ch) => ch.day === requestedDay)
      : 0;
    hud.setCredits(wallet.balance); hud.setWords(vocab.size); hud.setBag(inventory.size);
    story.startChapter(dayIndex >= 0 ? dayIndex : 0, () => {
      enterPlay();
      const think = story.chapter.think;
      if (think && !then) labels.think(think, 5, game.t);
      then?.();
    });
  });
}
function continueGame(then) {
  fader.run(() => {
    state.restore(saved);
    player.wear('jacket', !!state.flags['wear-jacket']);
    items.refresh();
    hud.setWords(vocab.size); hud.setBag(inventory.size); hud.setCredits(wallet.balance); hud.setTextbook(inventory.has('kitap'));
    story.resume(world.get(state.location).spawn, () => { enterPlay(); then?.(); });
  });
}


const game = new Game({ ambient: [kahveTalk, talk, ney], shotButton, help, prayer, village, toys, foliage: Foliage, modes, time, lighting, controller, cast, items, world, interactions, actionButton, joystick, marker, camera, labels, dialogue, story, player, ctx });

game.start();
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
let kidScoldAt = -99, kidAskAt = 120;
setInterval(() => {
  const kid = cast.get('kardes');
  if (!kid || kid.location !== 'house' || world.current.id !== 'house' || dialogue.talking || modes.top !== 'play') return;
  const t = game.t, anne = cast.get('anne');
  if (kid.roam.jumping && anne?.location === 'house' && t - kidScoldAt > 45) {
    kidScoldAt = t;
    labels.bubble(anne, 'Ali, yatakta zıplama!', null, 3);
    tts.speak('Ali, yatakta zıplama!', { speaker: 'anne' });
    setTimeout(() => { labels.bubble(kid, 'Tamam anne!', null, 2.5); tts.speak('Tamam anne!', { speaker: 'kardes' }); }, 1800);
  } else if (t > kidAskAt && kid.position.distanceTo(player.position) < 4.5) {
    kidAskAt = t + 240; // not too often: he is a child, not a teacher
    const call = `${playerGender() === 'girl' ? 'Abla' : 'Abi'}, bu ne? Gel bak!`;
    labels.bubble(kid, call, null, 4);
    tts.speak(call, { speaker: 'kardes' });
  }
}, 1000);

// Debug handle for automated play-throughs: open with ?debug
if (params.has('debug')) window.__game = { shop, ads, billing, ney, library, bus, football, squareFootball, talk, chess, camera, drill, settings, glossProbe: gloss, help, intro, prayer, joystick, interactions, village, lessons, textbook, wallet, travel, cast, free, toys, tts, game, story, marker, player, modes, world, dialogue, inventory, vocab, time };
