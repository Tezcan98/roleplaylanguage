import { EV } from '../core/events.js';

/** Bag contents, stored as kind → count in GameState.inventory. */
export class Inventory {
  constructor(state, bus) { this.state = state; this.bus = bus; }

  count(kind) { return this.state.inventory[kind] || 0; }
  has(kind) { return this.count(kind) > 0; }
  entries() { return Object.entries(this.state.inventory).filter(([, n]) => n > 0); }
  /** Things in the bag (the money is counted on its own, in the HUD). */
  get size() { return this.entries().reduce((s, [k, n]) => s + (k === 'para' ? 0 : n), 0); }

  add(kind, n = 1) {
    this.state.inventory[kind] = this.count(kind) + n;
    this.bus.emit(EV.INVENTORY, { kind, count: this.count(kind) });
  }

  remove(kind, n = Infinity) {
    const left = Math.max(0, this.count(kind) - n);
    if (left) this.state.inventory[kind] = left; else delete this.state.inventory[kind];
    this.bus.emit(EV.INVENTORY, { kind, count: left });
  }
}
