import { EV } from '../core/events.js';

const TRIGGERS = [EV.QUEST, EV.CHAPTER, EV.INVENTORY, EV.WORD, EV.FLAG, EV.CREDITS, EV.LOCATION];

/** Saves the game state shortly after anything meaningful changes (debounced). */
export class AutoSave {
  #timer = null;

  constructor({ bus, state, repo, enabled = () => true }) {
    Object.assign(this, { state, repo, enabled });
    TRIGGERS.forEach((ev) => bus.on(ev, () => this.schedule()));
  }

  schedule() {
    if (!this.enabled()) return;
    clearTimeout(this.#timer);
    this.#timer = setTimeout(() => this.repo.save(this.state.snapshot()), 400);
  }
}
