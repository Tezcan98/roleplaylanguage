const SEE = 7;    // m: only this close the talk goes on (speech bubbles over their heads covered the screen from afar)
const PAUSE = 30; // s between two conversations (seldom: it is background, not the game)

/**
 * People who talk among themselves (the uncles in the kahvehane). Their conversations show
 * as speech bubbles over their heads when you are around — quietly: no voice, nothing else
 * on the screen. Conversations come in a shuffled order, none repeated before all were heard.
 */
export class AmbientTalk {
  #timer = 2;
  #queue = [];
  #order = [];

  /** @param {{ place: { location: string, x: number, z: number }, talks: Array<Array<{ who, tr, en }>> }} o */
  constructor({ world, player, cast, labels, place, talks }) {
    Object.assign(this, { world, player, cast, labels, place, talks });
  }

  update(dt) {
    const { place } = this, p = this.player.position;
    if (this.world.current?.id !== place.location || Math.hypot(p.x - place.x, p.z - place.z) > SEE) return;
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

  /** One line as a bubble over the speaker's head. Returns how long it lasts (s). */
  #say({ who, tr, en }) {
    const c = this.cast.get(who);
    if (!c || c.location !== this.place.location) return 0;
    const secs = 2.4 + tr.length * 0.065;
    this.labels.bubble(c, tr, null, secs, en);
    return secs;
  }
}
