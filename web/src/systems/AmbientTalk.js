import { el } from '../ui/dom.js';
import { gloss } from '../i18n/Gloss.js';

const HEAR = 9;   // m from the place: the lines are read aloud and written in the panel with their meaning
const SEE = 20;   // m: closer than this the talk goes on (speech bubbles over their heads)
const PAUSE = 7;  // s between two conversations
const KEEP = 4;   // lines kept in the panel

/**
 * People who talk among themselves (the uncles in the kahvehane). The conversations go on
 * whether or not anyone listens; come close and you hear them — each line spoken in the
 * character's voice and written in a small panel with its meaning. Conversations come in a
 * shuffled order, none repeated before all were heard.
 */
export class AmbientTalk {
  #timer = 2;
  #queue = [];
  #order = [];
  #near = false;

  /** @param {{ place: { location: string, x: number, z: number }, talks: Array<Array<{ who, tr, en }>>, title: [string, string] }} o */
  constructor({ host, world, player, cast, labels, tts, modes, dialogue, place, talks, title }) {
    Object.assign(this, { world, player, cast, labels, tts, modes, dialogue, place, talks });
    this.lines = el('div', { class: 'talk-lines' });
    this.root = el('div', { class: 'talk-panel', attrs: { 'aria-live': 'polite' } }, [
      el('b', { class: 'talk-title' }, [`🎧 ${title[0]}`, el('small', { class: 'en-t', text: ` · ${title[1]}` })]),
      this.lines,
    ]);
    host.append(this.root);
  }

  get listening() { return this.#near; }

  update(dt) {
    const { place } = this, p = this.player.position;
    const here = this.world.current?.id === place.location;
    const d = here ? Math.hypot(p.x - place.x, p.z - place.z) : Infinity;
    const near = d < HEAR;
    if (near !== this.#near) { this.#near = near; if (!near) this.lines.replaceChildren(); }
    this.root.classList.toggle('open', near && this.modes.is('play') && this.lines.children.length > 0);
    if (d > SEE) return;
    this.#timer -= dt;
    if (this.#timer > 0) return;
    if (!this.#queue.length) this.#queue = [...this.#next()];
    const line = this.#queue.shift();
    this.#timer = (line ? this.#say(line) : 0) + (this.#queue.length ? 0.4 : PAUSE);
  }

  #next() {
    if (!this.#order.length) this.#order = this.talks.map((_, i) => i).sort(() => Math.random() - 0.5);
    return this.talks[this.#order.shift()] ?? [];
  }

  /** One line: a bubble for anyone around; voice and panel for whoever is close. Returns how long it lasts (s). */
  #say({ who, tr, en }) {
    const c = this.cast.get(who);
    if (!c || c.location !== this.place.location) return 0;
    const secs = 2.4 + tr.length * 0.065;
    this.labels.bubble(c, tr, null, secs);
    if (!this.#near) return secs;
    if (this.modes.is('play') && !this.dialogue.talking) this.tts.speak(tr, { speaker: who });
    this.lines.append(el('p', { class: 'talk-line' }, [el('b', { text: `${c.def.short}: ` }), tr, el('small', { class: 'en-t', text: gloss(en) })]));
    while (this.lines.children.length > KEEP) this.lines.firstChild.remove();
    return secs;
  }
}
