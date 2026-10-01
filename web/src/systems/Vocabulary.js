import { EV } from '../core/events.js';

/** Words the player has met, stored in GameState.words (tr → en). */
export class Vocabulary {
  constructor(state, bus) { this.state = state; this.bus = bus; }

  get size() { return Object.keys(this.state.words).length; }
  entries() { return Object.entries(this.state.words); }

  /** @returns {boolean} true when the word is new */
  learn(tr, en) {
    if (!tr) return false;
    const isNew = !(tr in this.state.words);
    this.state.words[tr] = en;
    if (isNew) this.bus.emit(EV.WORD, { tr, en, size: this.size });
    return isNew;
  }
}
