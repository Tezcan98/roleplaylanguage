/** Per-device preferences in localStorage (optional: the game works without storage). */
export class Settings {
  #key = 'yilmaz-ailesi-settings';
  #data;

  constructor() {
    try { this.#data = JSON.parse(localStorage.getItem(this.#key)) ?? {}; } catch { this.#data = {}; }
  }

  get(name, fallback) { return name in this.#data ? this.#data[name] : fallback; }

  set(name, value) {
    this.#data[name] = value;
    try { localStorage.setItem(this.#key, JSON.stringify(this.#data)); } catch { /* storage unavailable */ }
  }
}
