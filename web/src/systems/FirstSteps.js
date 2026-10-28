import { el } from '../ui/dom.js';
import { ui, glossDir, turkishOnly } from '../i18n/Gloss.js';

/** The part of the square near the park and the road home: walk past it before the first tasks are done and the note comes. */
const ZONE_EAST = -24; // metres
const ZONE_NORTH = -14;
const GAP = 60_000; // ms before the note may come again
const SHOWN = 14; // seconds it stays
/** The first tasks, all at home: until they are begun, a player in the square is told where to go. */
const FIRST = new Set(['talk-mom', 'take-jacket', 'go-out']);

/**
 * The first minutes: a new game starts in the park of the village square and the whole square is open, so people wandered off not
 * knowing what to do. Nothing is shut: when you walk away from the park and the road home before the first tasks (at home) are
 * done, a small note comes at the top — "Annen seni bekliyor. Görevleri yapmak için eve gitmelisin." — with one button, "Tamam".
 * It does not stop the game. Ambient system (update every frame). Off in test mode (?debug) unless asked for (?firststeps).
 */
export class FirstSteps {
  #nextAt = 0;
  #left = 0;

  constructor({ host, world, player, story, enabled = true }) {
    Object.assign(this, { world, player, story, enabled });
    this.text = el('span', {});
    this.root = el('div', { class: 'home-note', attrs: { hidden: '', role: 'status' } }, [
      this.text,
      el('button', { class: 'btn sm', text: 'Tamam', attrs: { type: 'button' }, on: { click: () => this.#hide() } }),
    ]);
    host.append(this.root);
  }

  get active() {
    return this.enabled && this.world.current?.id === 'village' && this.story.chapter?.id === 'd1-morning' && FIRST.has(this.story.quest?.id);
  }

  #hide() { this.root.hidden = true; this.#left = 0; this.#nextAt = performance.now() + GAP; }

  update(dt) {
    if (this.#left > 0) { if ((this.#left -= dt) <= 0 || !this.active) this.#hide(); return; }
    if (!this.active || performance.now() < this.#nextAt) return;
    const p = this.player.position;
    if (p.x <= ZONE_EAST && p.z >= ZONE_NORTH) return;
    const tr = 'Annen seni bekliyor. Görevleri yapmak için eve gitmelisin.';
    const g = ui('', 'Your mom is waiting for you. Go home to do the tasks.');
    this.text.replaceChildren(tr, ...(g ? [el('small', { class: 'en-t', text: g, attrs: { dir: turkishOnly() ? 'ltr' : glossDir() } })] : []));
    this.root.hidden = false;
    this.#left = SHOWN;
  }
}
