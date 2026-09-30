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

import { LocationManager } from './world/LocationManager.js';
import { HouseInterior } from './world/locations/HouseInterior.js';
import { Yard } from './world/locations/Yard.js';

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

import { ActivityRegistry } from './activities/Activity.js';
import { ChoiceActivity } from './activities/ChoiceActivity.js';
import { DialogueController } from './dialogue/DialogueController.js';
import { WebSpeechTTS } from './services/TextToSpeech.js';

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

import { STORY } from './content/story.js';
import { NPCS, PLAYER_LOOK } from './content/characters.js';
import { DIALOGUES } from './content/dialogues.js';
import { ITEMS } from './content/items.js';
import { HOTSPOTS, LINKS } from './content/hotspots.js';

async function loadManifest() {
  try { const r = await fetch('assets/manifest.json', { cache: 'no-cache' }); return r.ok ? await r.json() : {}; } catch { return {}; }
}

const manifest = await loadManifest();
const host = document.getElementById('ui');

// --- core ---
const bus = new EventBus();
const state = new GameState();
const modes = new ModeStack();

// --- engine ---
const ctx = new RenderContext();
const textures = new TextureFactory(ctx.renderer);
await textures.loadOverrides(manifest.textures);
const mf = new MeshFactory(textures);
const models = new ModelLibrary(manifest.models);
const kit = { mf, props: new PropFactory(models) };
const camera = new CameraController(ctx);

// --- world ---
const time = new TimeSystem(state, bus);
const lighting = new DayNightLighting(ctx, time);
const world = new LocationManager({ scene: ctx.scene, bus, lighting, kit });
world.register(new HouseInterior()).register(new Yard());
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
const npcs = new Map(Object.entries(NPCS).map(([id, def]) => [id, new Npc(id, def, { mf, models })]));
const cast = new CastDirector({ npcs, world, player });
const travel = new TravelService({ world, player, cast, camera, fader, state });
const story = new StoryDirector({ story: STORY, state, bus, time, cast, travel, cards, toasts });
const items = new ItemSystem({ defs: ITEMS, world, kit, state, inventory, vocab, bus, story });
const gameCtx = new GameContext({ state, inventory, story, world });
story.setContext(gameCtx);
const controller = new PlayerController({ player, input, world, modes, cast });

// --- dialogue ---
const tts = new WebSpeechTTS();
const activities = new ActivityRegistry({ tts }).register('choice', ChoiceActivity);
const effects = new EffectRunner();
const dialogueView = new DialogueView(host, {
  onClose: () => dialogue.close(),
  onSpeak: () => dialogue.speak(),
  onToggleEn: () => dialogueView.setEnPressed(!document.body.classList.toggle('hide-en')),
});
const dialogue = new DialogueController({ dialogues: DIALOGUES, cast, view: dialogueView, activities, effects, vocab, speech: tts, modes, bus, input });
dialogue.setContext(gameCtx);

let pendingFinish = false;
effects
  .register('quest', (id) => story.complete(id))
  .register('take', (kind) => inventory.remove(kind))
  .register('wear', (what) => player.wear(what))
  .register('finish', () => { pendingFinish = true; });

// --- interaction ---
const interactions = new InteractionSystem([
  new NpcInteractions({ cast, dialogue }),
  new ItemInteractions({ items }),
  new HotspotInteractions({ world, rules: HOTSPOTS, story, travel, toasts }),
], modes);
const actionButton = new ActionButton(host, () => interactions.trigger());
input.onKey((e) => { if (modes.is('play') && ['e', 'E', 'Enter'].includes(e.key)) { e.preventDefault(); interactions.trigger(); } });
const marker = new QuestMarker({ scene: ctx.scene, story, world, cast, items, player });

const hud = new Hud(host, {
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
bus.on(EV.INVENTORY, () => { hud.setBag(inventory.size); refreshQuest(); });
bus.on(EV.QUEST, refreshQuest);
bus.on(EV.ITEM_PICKED, ({ item, isNew }) => {
  effects.run(item.onPick);
  const note = `${isNew ? 'Yeni kelime: ' : ''}${item.tr} = ${item.en}`;
  if (item.goal) toasts.show(`${item.tr[0].toLocaleUpperCase('tr')}${item.tr.slice(1)}: ${inventory.count(item.kind)}/${item.goal}`, isNew ? note : '');
  else toasts.show(`${item.verb.replace(/ al$/, '')} aldın!`, note);
});
bus.on(EV.DIALOGUE_CLOSE, () => {
  if (!pendingFinish) return;
  pendingFinish = false;
  const outro = story.chapter.outro;
  setTimeout(() => cards.show({ ...outro, text: outro.text(vocab.size) }), 500);
});

// --- menu scene, then start ---
cast.apply(STORY.chapters[0].cast);
travel.place('yard', 'houseDoor', { silent: true });
new MainMenu(host, {
  onStart: () => fader.run(() => story.startChapter(0, () => {
    modes.setBase('play');
    document.body.classList.remove('menu');
    const think = story.chapter.think;
    if (think) labels.think(think, 5, game.t);
  })),
});

const game = new Game({ modes, time, lighting, controller, cast, items, world, interactions, actionButton, joystick, marker, camera, labels, dialogue, story, player, ctx });
game.start();

// Debug handle for automated play-throughs: open with ?debug
if (new URLSearchParams(location.search).has('debug')) window.__game = { game, story, marker, player, modes, world, dialogue, inventory, vocab, time };
