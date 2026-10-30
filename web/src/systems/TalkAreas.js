import { TALKS } from '../content/index.js';
import { TALK_SPOTS } from '../world/locations/VillageSquare.js';

const NEAR = 16;  // m: villagers' speech bubbles show to anyone this close
const VOICE = 9;  // m: …and they are heard this close
const PAUSE = 7;  // s between two conversations

/**
 * Sitting places in the square where people talk: the tea garden and the benches round the
 * chess board. The regulars chat among themselves all day — speech bubbles over their heads, and
 * out loud when you are close by (`speak`, only while no conversation of yours is open). The place you sit in gets its turn
 * first. (No running commentary on the chess moves: players found it noisy.)
 */
export class TalkAreas {
  #timer = 3;
  #queue = [];
  #order = {};
  #listening = null;

  /** `quiet()`: true while nothing should be said (a chess game of yours: no bubbles, no voices around the board). */
  constructor({ world, player, cast, labels, speak = null, quiet = () => false }) {
    Object.assign(this, { world, player, cast, labels, speak, quiet }); // speak(text, who): their voice, near them
  }

  /** Which sitting place the player is in (seated inside it), or null. */
  get listening() { return this.#listening; }

  #spotAt(pos) {
    for (const [id, s] of Object.entries(TALK_SPOTS)) if (Math.hypot(pos.x - s.x, pos.z - s.z) < s.r) return id;
    return null;
  }

  update(dt) {
    const inSquare = this.world.current?.id === 'village';
    const here = inSquare && this.player.seated ? this.#spotAt(this.player.position) : null;
    if (here !== this.#listening) { this.#listening = here; if (here) this.#timer = Math.min(this.#timer, 1.5); }
    if (!inSquare || this.quiet()) return;
    this.#timer -= dt;
    if (this.#timer > 0) return;
    // talk goes on in both places; the one you sit in gets its turn first
    const spot = this.#listening ?? (Math.random() < 0.5 ? 'cay' : 'chess');
    if (!this.#queue.length) {
      this.#queue = this.#nextTalk(spot).map((l) => ({ ...l, spot }));
      if (!this.#queue.length) { this.#timer = PAUSE; return; }
    }
    const line = this.#queue.shift();
    this.#timer = this.#say(line) + (this.#queue.length ? 0.6 : PAUSE);
  }

  /** The next conversation of a place (shuffled, none repeated until all were heard). */
  #nextTalk(spot) {
    const all = TALKS[spot] ?? [];
    if (!this.#order[spot]?.length) this.#order[spot] = all.map((_, i) => i).sort(() => Math.random() - 0.5);
    return all[this.#order[spot].shift()] ?? [];
  }

  /** A villager says a line: a bubble over the head for anyone near. Returns its length in s. */
  #say({ who, tr, en }) {
    const c = this.cast.get(who);
    const secs = 2.2 + tr.length * 0.07;
    if (!c?.visible || c.location !== 'village') return 0;
    const d = Math.hypot(c.position.x - this.player.position.x, c.position.z - this.player.position.z);
    if (d < NEAR) this.labels.bubble(c, tr, null, secs, en);
    if (d < VOICE) this.speak?.(tr, who);
    return secs;
  }
}
