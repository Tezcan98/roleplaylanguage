/** Minimal pub/sub. Systems talk through events instead of holding references to each other. */
export class EventBus {
  #handlers = new Map();

  on(type, fn) {
    if (!this.#handlers.has(type)) this.#handlers.set(type, new Set());
    this.#handlers.get(type).add(fn);
    return () => this.#handlers.get(type)?.delete(fn);
  }

  once(type, fn) {
    const off = this.on(type, (p) => { off(); fn(p); });
    return off;
  }

  emit(type, payload) {
    const set = this.#handlers.get(type);
    if (!set) return;
    for (const fn of [...set]) {
      try { fn(payload); } catch (e) { console.error(`[bus] ${type}`, e); }
    }
  }
}
