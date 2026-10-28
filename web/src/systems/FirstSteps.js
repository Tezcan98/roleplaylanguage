import { EV } from '../core/events.js';

/** The part of the square the first chapter lets you walk in: the park and the way to the west gate (home); the rest comes after it. */
const ZONE_EAST = -24; // metres: past this the way is shut for now
const ZONE_NORTH = -14; // …and this (the library, the stable and the cinema lie beyond)
const GAP = 30_000; // ms between two times the card comes up

/**
 * The first minutes: a new game starts in the park of the village square, and the whole square — the mosque, the tea
 * garden, the library, the cinema, the chess — lay open at once, so people wandered off and did not know what to do. Until
 * the first chapter is done only the west strip of the square is free (the park, and the road home). Walking on past it
 * puts you back and the card says why, warmly; its other button, "Ben köy meydanında çevrimiçi oynamak istiyorum", opens the
 * whole square for good (setting `freeRoam`). Once the first chapter is over (or when it is opened) it never closes again.
 * Ambient system (update every frame). Off in test mode (?debug) unless asked for (?firststeps).
 */
export class FirstSteps {
  #asking = false;
  #nextAt = 0;

  constructor({ world, player, story, settings, choice, bus, enabled = true }) {
    Object.assign(this, { world, player, story, settings, choice, enabled });
    bus.on(EV.CHAPTER, ({ chapter }) => { if (chapter?.id !== 'd1-morning') settings.set('firstStepsDone', true); });
  }

  get active() {
    return this.enabled && this.world.current?.id === 'village' && this.story.chapter?.id === 'd1-morning'
      && !this.settings.get('firstStepsDone', false) && !this.settings.get('freeRoam', false);
  }

  update() {
    if (this.#asking || !this.active) return;
    const p = this.player.position;
    let out = false;
    if (p.x > ZONE_EAST) { p.x = ZONE_EAST; out = true; }
    if (p.z < ZONE_NORTH) { p.z = ZONE_NORTH; out = true; }
    if (!out || performance.now() < this.#nextAt) return;
    this.#ask();
  }

  async #ask() {
    this.#asking = true;
    const stay = await this.choice.ask({
      title: 'Önce annenle konuş',
      text: 'Annen seni bekliyor. Önce eve git, annenle konuş; köy meydanının geri kalanı sonra açılacak.',
      en: 'Your mom is waiting for you. Go home and talk to her first; the rest of the village square opens afterwards.',
      yes: 'Tamam, eve gidiyorum',
      no: 'Ben köy meydanında çevrimiçi oynamak istiyorum',
    });
    if (!stay) this.settings.set('freeRoam', true);
    this.#nextAt = performance.now() + GAP;
    this.#asking = false;
  }
}
