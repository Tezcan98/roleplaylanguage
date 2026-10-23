import { EV } from '../core/events.js';

/**
 * How the game is played, anonymously (the numbers page: server/src/PlayStats.js): counts of what happens — places,
 * talks, activities, words, chat lines — and play time, never what was said. Sent in small batches: every minute,
 * and when the page is hidden. Not sent for the developer's own device (🔑 on), tests (?debug / ?nointro) or localhost.
 */
const URL = 'https://anadoluailesi.com.tr/api/play-event';
const EVERY = 60_000;
const KEY = /^[a-z0-9:._-]{1,40}$/;

export class Stats {
  #counts = {};
  #sec = 0;
  #opens = 1; // this start of the game
  #busy = false;

  /** @param {{ bus, settings, modes, chapters: string[], native: boolean, lang: () => string, version: () => string, post: (url, body) => Promise<boolean> }} o */
  constructor({ bus, settings, modes, chapters, native, lang, version, post, enabled = true }) {
    Object.assign(this, { bus, settings, modes, chapters, native, lang, version, post });
    if (!enabled) return;
    if (!settings.get('deviceId')) settings.set('deviceId', Array.from(crypto.getRandomValues(new Uint8Array(12)), (b) => (b % 36).toString(36)).join('')); // (as the square and the ad numbers make it: one per device)
    const on = (ev, fn) => bus.on(ev, (d) => { try { fn(d ?? {}); } catch { /* never in the game's way */ } });
    on(EV.LOCATION, (d) => this.count(`loc:${d.id}`));
    on(EV.DIALOGUE_OPEN, (d) => this.count(`talk:${d.npc}`));
    on(EV.FREE_ACTION, (d) => this.count(`act:${d.id}`));
    on(EV.HOTSPOT, (d) => this.count(`spot:${d.id}`));
    on(EV.WORD, () => this.count('word'));
    on(EV.QUEST_DONE, () => this.count('quest'));
    on(EV.CREDITS, (d) => { if (d.reason && d.reason !== 'dev' && d.reason !== 'spend') this.count(`cr:${d.reason}`); });
    on(EV.CHAPTER, (d) => { const i = chapters.indexOf(d.chapter?.id); if (i > (settings.get('statsCh', -1))) settings.set('statsCh', i); });
    setInterval(() => { if (!document.hidden && modes.is('play')) this.#sec++; }, 1000);
    setInterval(() => this.flush(), EVERY);
    addEventListener('pagehide', () => this.flush());
    document.addEventListener('visibilitychange', () => { if (document.hidden) this.flush(); });
  }

  /** One more of `key` ("chat", "ride", "talk:ali"…). */
  count(key, n = 1) { if (KEY.test(key)) this.#counts[key] = (this.#counts[key] ?? 0) + n; }

  async flush() {
    if (this.#busy || this.settings.get('devCodes', false)) return;
    const counts = this.#counts, sec = this.#sec, opens = this.#opens;
    if (!Object.keys(counts).length && !sec && !opens) return;
    this.#counts = {}; this.#sec = 0; this.#opens = 0;
    this.#busy = true;
    const ch = this.settings.get('statsCh', -1);
    const body = { pid: this.settings.get('deviceId'), v: this.version() || 'web', plat: this.native ? 'app' : 'web', lang: this.lang(), ch, chId: this.chapters[ch] ?? '', ...(opens ? { opens } : {}), ...(sec ? { sec: Math.min(sec, 3600) } : {}), counts };
    const ok = await this.post(URL, body).catch(() => false);
    if (!ok) { // not sent: counted again next time
      for (const [k, n] of Object.entries(counts)) this.#counts[k] = (this.#counts[k] ?? 0) + n;
      this.#sec += sec; this.#opens += opens;
    }
    this.#busy = false;
  }
}
