/**
 * Composition root: builds every object and wires dependencies. Nothing else in the
 * codebase calls `new` on a system — swapping an implementation happens here only.
 */
import { EventBus } from './core/EventBus.js';
import { EV } from './core/events.js';
import { GameState } from './core/GameState.js';
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
import { SchoolYard } from './world/locations/SchoolYard.js';
import { Classroom } from './world/locations/Classroom.js';
import { VillageSquare } from './world/locations/VillageSquare.js';

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
import { isNativeApp, loadNativeAdapters, wireAppLifecycle } from './platform/native.js';
import { ClassAccessGate } from './services/monetization/ClassAccessGate.js';
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
import { ActionButton } from './ui/ActionButton.js';
import { Fader } from './ui/Fader.js';
import { CardOverlay } from './ui/CardOverlay.js';
import { MainMenu } from './ui/MainMenu.js';
import { WordDrill } from './systems/WordDrill.js';
import { SERVERS, healthUrl } from './ui/ServerPicker.js';
import { ChoiceCard } from './ui/ChoiceCard.js';
import { setupLandscape } from './ui/Landscape.js';
import { ListModal } from './ui/ListModal.js';
import { DialogueView } from './ui/DialogueView.js';

import { gloss, wordNote, loadGlossLang, glossLang } from './i18n/Gloss.js';
import { setPlayerGender, playerGender, playerName, personalizeContent } from './i18n/Persona.js';
import { NpcChatClient } from './services/ai/NpcChatClient.js';
import { CharacterSetup } from './ui/CharacterSetup.js';
import {
  STORY, NPCS, PLAYER_LOOK, PLAYER_LOOK_GIRL, PLAYER_LOOKS, lookKey, VOICES, DIALOGUES, ITEMS, KIND_NAMES, HOTSPOTS, LINKS, FREE_ACTIONS, HOUSE_RULES,
  LESSONS, CLASSMATE_BOTS, TEXTBOOK, MEALS, PRAYER_STEPS, PRAYER_WORDS,
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
setupLandscape(host); // phones: played sideways
// boy (Ahmet) or girl (Meryem): the content is rewritten once, before any system reads it
setPlayerGender(params.get('gender') ?? settings.get('gender', 'boy'));
personalizeContent(STORY, DIALOGUES, FREE_ACTIONS, HOUSE_RULES, LESSONS, CLASSMATE_BOTS, TEXTBOOK, ITEMS);
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
const playerLook = lookKey(playerGender(), params.get('look') ?? settings.get('look', ''));
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
const controller = new PlayerController({ player, input, world, modes, cast });

// --- dialogue ---
const progressShown = new Set();
const tts = new CharacterVoices({
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
const wallet = new CreditWallet(state, bus);
const gate = new ClassAccessGate({ host, modes, wallet, ads: native ? new nativeKit.AdMobAdProvider({ rewardedId: manifest.admob?.rewardedId }) : new MockAdProvider(host, modes) });
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
const villageServer = VillageNetwork.resolveUrl({ manifestUrl: manifest.villageServer, override: params.get('mp'), native });
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
  .register('sit', (anchor) => {
    const a = world.get('house').anchors.get(anchor);
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
const prayer = new PrayerScene({
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
// balls are kicked by running into them; the square's ball is shared by everyone online
toys.add(new Ball(mf, yard, { x: 3, z: 4 }), { action: 'ball', touch: true });
toys.add(new Ball(mf, world.get('schoolyard'), { x: -3, z: 2 }), { action: 'ball', touch: true });
const villageBall = toys.add(new Ball(mf, world.get('village'), { x: 4, z: 3 }), { action: 'ball', touch: true, onKick: (b) => village.ballKicked(b) });
toys.add(new Cat(mf, yard, { x: [-6, 14], z: [-2, 18] }), { action: 'cat', range: 1.5, onUse: (c) => { c.pet(); tts.speak('Miyav!', { speaker: 'default' }); } });

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
  remotes: new RemotePlayers({ mf, baseLook: PLAYER_LOOK, looks: PLAYER_LOOKS }), ball: villageBall,
  rooms: SERVERS, healthUrl: healthUrl(villageServer), choice: new ChoiceCard(host, modes),
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

// --- interaction ---
const interactions = new InteractionSystem([
  village, // "voice chat with X" next to another player in the square
  toys,
  new NpcInteractions({ cast, dialogue, story }),
  new ItemInteractions({ items }),
  new HotspotInteractions({ world, rules: HOTSPOTS, story, travel, toasts, effects, bus, ctx: gameCtx }),
], modes);
const actionButton = new ActionButton(host, () => interactions.trigger());
input.onKey((e) => { if (modes.is('play') && ['e', 'E', 'Enter'].includes(e.key)) { e.preventDefault(); interactions.trigger(); } });
const marker = new QuestMarker({ scene: ctx.scene, story, world, cast, items, player });

// word notebook with "practice" (a quick quiz over the learned words)
const drill = new WordDrill(host, { modes, vocab, activities, tts, state, effects, toasts });
const openWords = () => list.open('Kelime defteri', vocab.entries().map(([tr, en]) => [tr, gloss(en)]), 'Henüz kelime yok. Biriyle konuş!',
  drill.available ? { label: '🧠 Kelime pratiği yap', run: () => drill.open() } : null);
const hud = new Hud(host, {
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

/** Online square straight from the menu: no story (paused), no autosave; leaving returns here. */
function playOnline(server) {
  settings.set('serverRegion', server);
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

/** Outside school days: practise at school for 1 credit; home life waits until you are back. */
async function schoolPractice() {
  story.pause();
  const paid = await lessons.practice({
    onDone: () => travel.go('yard', 'gate', () => { cast.apply(story.chapter.cast); story.resumeStory(); toasts.show('Eve döndün', gloss('Back home — your day continues where you left it')); }),
  });
  if (!paid) story.resumeStory();
}

// the garden gate is the street: school or the village square (the one the quest needs comes first)
const streetChoice = new ChoiceCard(host, modes);
effects.register('street', async () => {
  const schoolDay = gameCtx.targetHotspot === 'yard.gate';
  const night = time.isNight;
  const SCHOOL = {
    day: { label: '🏫 Okula git', en: 'Go to school', value: 'school' },
    practice: { label: '🏫 Okula git: pratik (1 kredi)', en: 'Practise at school for 1 credit', value: 'practice' },
    closed: { label: '🏫 Okul (gece kapalı)', en: 'The school is closed at night.', value: null, disabled: true },
  };
  const school = schoolDay ? SCHOOL.day : night ? SCHOOL.closed : SCHOOL.practice;
  const square = { label: '🏘️ Köy meydanına git', en: 'Go to the village square', value: 'square' };
  const toSquare = gameCtx.targetNpcLoc === 'village' || story.target()?.hotspot?.startsWith('village.');
  const pick = await streetChoice.pick({ title: 'Nereye gidiyorsun?', en: 'Where are you going?', options: toSquare ? [square, school] : [school, square] });
  if (pick === 'school') effects.run(['chapter']);
  else if (pick === 'practice') schoolPractice();
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


const game = new Game({ help, prayer, village, toys, foliage: Foliage, modes, time, lighting, controller, cast, items, world, interactions, actionButton, joystick, marker, camera, labels, dialogue, story, player, ctx });

game.start();
if (native) wireAppLifecycle(nativeKit.App, { dialogue, tts, village });

// headscarves: off at home, on outside and for the prayer (mom, and Meryem if she wears one)
const coverable = [player, ...[...npcs.values()].filter((n) => n.def.look?.homeUncovered)];
setInterval(() => coverable.forEach((c) => {
  if (!(c === player ? PLAYER_LOOKS[playerLook] : c.def.look)?.homeUncovered) return;
  const at = c === player ? world.current?.id : c.location;
  c.setCovered(at !== 'house' || !!prayer.active);
}), 300);

// the little brother: mom tells him off for jumping on the bed; now and then he calls you over to ask what something is
let kidScoldAt = -99, kidAskAt = 40;
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
    kidAskAt = t + 90;
    const call = `${playerGender() === 'girl' ? 'Abla' : 'Abi'}, bu ne? Gel bak!`;
    labels.bubble(kid, call, null, 4);
    tts.speak(call, { speaker: 'kardes' });
  }
}, 1000);

// Debug handle for automated play-throughs: open with ?debug
if (params.has('debug')) window.__game = { drill, settings, glossProbe: gloss, help, intro, prayer, joystick, interactions, village, lessons, textbook, wallet, travel, cast, free, toys, tts, game, story, marker, player, modes, world, dialogue, inventory, vocab, time };
