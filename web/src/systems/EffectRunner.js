/**
 * Named side effects that content can trigger (`do: ['quest', 'take:kova']`).
 * Systems register handlers; content only knows the names (Open/Closed).
 */
export class EffectRunner {
  #handlers = new Map();

  register(name, fn) { this.#handlers.set(name, fn); return this; }

  run(list = []) {
    for (const effect of list) {
      const [name, ...args] = effect.split(':');
      const fn = this.#handlers.get(name);
      if (!fn) { console.warn(`[effects] unknown effect "${effect}"`); continue; }
      fn(...args);
    }
  }
}
