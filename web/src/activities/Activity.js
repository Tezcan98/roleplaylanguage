/**
 * An interactive exercise shown inside a dialogue (or later a textbook / classroom).
 * Contract: `mount(container, spec)` resolves once with a result; `destroy()` cancels.
 * New exercise types (listen, speak, word order…) implement this and get registered —
 * DialogueController does not change (Open/Closed, Liskov).
 */
export class Activity {
  constructor(services = {}) { this.services = services; this.root = null; }
  /** @returns {Promise<{option?: object}>} */
  mount(container, spec) { throw new Error('mount() not implemented'); }
  /** Keyboard shortcut hook (1-9). Return true if handled. */
  key(n) { return false; }
  destroy() { this.root?.remove(); this.root = null; }
}

export class ActivityRegistry {
  #types = new Map();
  constructor(services) { this.services = services; }
  register(type, Cls) { this.#types.set(type, Cls); return this; }
  create(type) {
    const Cls = this.#types.get(type);
    if (!Cls) throw new Error(`Unknown activity type: ${type}`);
    return new Cls(this.services);
  }
}
