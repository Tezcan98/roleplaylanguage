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
import { ListModal } from './ui/ListModal.js';
import { DialogueView } from './ui/DialogueView.js';

import {
  STORY, NPCS, PLAYER_LOOK, VOICES, DIALOGUES, ITEMS, KIND_NAMES, HOTSPOTS, LINKS, FREE_ACTIONS, HOUSE_RULES,
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
const quality = params.get('quality') ?? settings.get('quality', 'medium');
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
const player = new Player('ahmet', PLAYER_LOOK, { mf, models });
ctx.scene.add(player.group);
lighting.follow = player.position;
const npcs = new Map(Object.entries(NPCS).map(([id, def]) => [id, new Npc(id, def, { mf, models })]));
const cast = new CastDirector({ npcs, world, player });
const travel = new TravelService({ world, player, cast, camera, fader, state });
const story = new StoryDirector({ story: STORY, state, bus, time, cast, travel, cards, toasts, fader });
const items = new ItemSystem({ defs: ITEMS, names: KIND_NAMES, world, kit, state, inventory, vocab, bus, story });
const gameCtx = new GameContext({ state, inventory, story, world, time, vocab, player });
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
  fallback: new WebSpeechTTS('tr-TR'),
  voices: VOICES,
  enabled: () => settings.get('neuralVoices', true),
});
// ?fakemic → scripted answers (tests); manifest.sttEndpoint → Whisper server; else browser STT
const recognizer = params.has('fakemic') ? new ScriptedRecognizer()
  : manifest.sttEndpoint ? new RemoteSpeechRecognizer(manifest.sttEndpoint) : new WebSpeechRecognizer('tr-TR');
const speech = new SpeechEvaluator({ recognizer, detector: new LanguageDetector(), matcher: new AnswerMatcher() });
const wallet = new CreditWallet(state, bus);
const gate = new ClassAccessGate({ host, modes, wallet, ads: new MockAdProvider(host, modes) });
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
const dialogue = new DialogueController({ dialogues: DIALOGUES, cast, view: dialogueView, activities, effects, vocab, tts, modes, bus, input });
dialogue.setContext(gameCtx);

effects
  .register('quest', (id) => story.complete(id))
  .register('chapter', () => story.nextChapter())
  .register('take', (kind, n) => inventory.remove(kind, n ? Number(n) : Infinity))
  .register('give', (kind, n) => {
    inventory.add(kind, n ? Number(n) : 1);
    const { tr, en } = items.info(kind);
    toasts.show(`+${n ?? 1} ${tr}`, en);
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
toys.add(new Ball(mf, yard, { x: 3, z: 4 }), { action: 'ball', range: 1.2, onUse: (b) => b.kick(player.position) });
toys.add(new Cat(mf, yard, { x: [-6, 14], z: [-2, 18] }), { action: 'cat', range: 1.5, onUse: (c) => { c.pet(); tts.speak('Miyav!', { speaker: 'default' }); } });

// --- school: credits, ads, multiplayer lesson ---
const lessons = new LessonController({
  lessons: LESSONS, bots: CLASSMATE_BOTS, gate, activities, cast, world, travel, player, camera, tts, labels, modes, effects, state,
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
  .register('credits', (n) => { wallet.add(Number(n), 'reward'); toasts.show(`+${n} kredi`, 'Credits earned'); });

// --- multiplayer village square (server: tools/serve.mjs or server/index.mjs) ---
const villageNet = new VillageNetwork(VillageNetwork.defaultUrl(manifest.villageServer));
const village = new VillageMultiplayer({
  bus, net: villageNet, voice: new VoiceChat({ net: villageNet }),
  remotes: new RemotePlayers({ mf, baseLook: PLAYER_LOOK }),
  world, player, settings, labels, toasts,
  ptt: new PushToTalk(host, { onChange: (on) => village.talk(on) }),
  calls: new CallUI(host, modes),
  usernames: new UsernameDialog(host, modes),
  recognizer: params.has('fakemic') ? new ScriptedRecognizer() : new WebSpeechRecognizer('tr-TR'),
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

const hud = new Hud(host, {
  onBookOpen: () => textbook.open(),
  onBook: () => list.open('Kelime defteri', vocab.entries(), 'Henüz kelime yok. Biriyle konuş!'),
  onBag: () => list.open('Çanta', inventory.entries().map(([kind, n]) => {
    const i = items.info(kind);
    return n > 1 ? [`${n} ${i.tr}`, `${n} ${i.en}`] : [i.tr, i.en];
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
  const note = `${isNew ? 'Yeni kelime: ' : ''}${item.tr} = ${item.en}`;
  const name = item.bagTr ?? item.tr;
  if (item.goal) toasts.show(`${name[0].toLocaleUpperCase('tr')}${name.slice(1)}: ${inventory.count(item.kind)}/${item.goal}`, isNew ? note : '');
  else toasts.show(`${item.verb.replace(/ al$/, '')} aldın!`, note);
});

// --- menu scene, then start ---
cast.apply(STORY.chapters[0].cast);
travel.place('yard', 'houseDoor', { silent: true });
// --- save / continue ---
const saves = new LocalSaveRepository();
const saved = params.has('fresh') ? null : saves.load();
let autosaveOn = false;
new AutoSave({ bus, state, repo: saves, enabled: () => autosaveOn });
const enterPlay = () => {
  tts.preload();
  modes.setBase('play');
  document.body.classList.remove('menu');
  autosaveOn = true;
};
new MainMenu(host, {
  settings,
  hasSave: !!saved,
  onStart: () => fader.run(() => {
    saves.clear();
    const requestedDay = Number(params.get('day'));
    const dayIndex = Number.isInteger(requestedDay) && requestedDay > 0
      ? STORY.chapters.findIndex((ch) => ch.day === requestedDay)
      : 0;
    story.startChapter(dayIndex >= 0 ? dayIndex : 0, () => {
      enterPlay();
      const think = story.chapter.think;
      if (think) labels.think(think, 5, game.t);
    });
  }),
  onContinue: () => fader.run(() => {
    state.restore(saved);
    player.wear('jacket', !!state.flags['wear-jacket']);
    items.refresh();
    hud.setWords(vocab.size); hud.setBag(inventory.size); hud.setCredits(wallet.balance); hud.setTextbook(inventory.has('kitap'));
    story.resume(world.get(state.location).spawn, enterPlay);
  }),
});

const game = new Game({ prayer, village, toys, foliage: Foliage, modes, time, lighting, controller, cast, items, world, interactions, actionButton, joystick, marker, camera, labels, dialogue, story, player, ctx });
game.start();

// Debug handle for automated play-throughs: open with ?debug
if (params.has('debug')) window.__game = { prayer, joystick, interactions, village, lessons, textbook, wallet, travel, cast, free, toys, tts, game, story, marker, player, modes, world, dialogue, inventory, vocab, time };
