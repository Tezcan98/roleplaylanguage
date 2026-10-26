/** Our page that embeds YouTube's player (site/sinema/oynatici.html); `?sinema=<url>` points a test build at another copy. */
const RELAY = new URLSearchParams(location.search).get('sinema') ?? 'https://anadoluailesi.com.tr/sinema/oynatici.html';

/**
 * The cinema's video (systems/Cinema.js): an iframe with our player page laid over the cinema screen
 * where the camera shows it (`place`), playing a few seconds of a cartoon from its official YouTube
 * channel at a time. `play` resolves 'ended' when the clip is over, or 'error' / 'timeout' when
 * YouTube can't play it (offline, blocked) — the cinema then falls back to its own films.
 */
export class ClipScreen {
  #frame = null;
  #ready = null;
  #wait = null; // { resolve, timer } of the clip playing
  #playing = false;

  constructor(host) {
    this.host = host;
    addEventListener('message', (e) => this.#on(e));
  }

  /** Loads the player page (once); resolves when it is ready, false if it doesn't come up. */
  open() {
    if (this.#frame) return this.#ready.promise;
    const f = this.#frame = document.createElement('iframe');
    f.className = 'cinema-video';
    f.src = RELAY;
    f.allow = 'autoplay; encrypted-media';
    f.referrerPolicy = 'strict-origin-when-cross-origin';
    f.setAttribute('title', 'Sinema');
    f.hidden = true;
    this.host.append(f);
    let resolve;
    const promise = new Promise((r) => { resolve = r; });
    this.#ready = { promise, resolve };
    setTimeout(() => resolve(false), 12000);
    return promise;
  }

  /** Where the screen is on the page (px): left, top, width, height. */
  place({ x, y, w, h }) {
    const s = this.#frame?.style;
    if (!s) return;
    s.left = `${x}px`; s.top = `${y}px`; s.width = `${w}px`; s.height = `${h}px`;
  }

  get playing() { return this.#playing; }

  play(clip, rate = 1) {
    this.#finish('stopped');
    this.#frame.hidden = false;
    this.#playing = true;
    this.#frame.contentWindow?.postMessage({ type: 'clip', id: clip.id, start: clip.start, end: clip.end, rate }, new URL(RELAY, location.href).origin);
    return new Promise((resolve) => {
      // the clip's length at that speed, plus a margin for loading (an ad before it, a slow line)
      const timer = setTimeout(() => this.#finish('timeout'), ((clip.end - clip.start) / rate) * 1000 + 15000);
      this.#wait = { resolve, timer, started: false };
    });
  }

  stop() {
    this.#frame?.contentWindow?.postMessage({ type: 'stop' }, '*');
    this.#finish('stopped');
  }

  hide() { this.stop(); if (this.#frame) this.#frame.hidden = true; }

  #finish(how) {
    const w = this.#wait;
    this.#playing = false;
    if (!w) return;
    this.#wait = null;
    clearTimeout(w.timer);
    w.resolve(how);
  }

  #on(e) {
    const m = e.data;
    if (!this.#frame || e.source !== this.#frame.contentWindow || !m?.cinema) return;
    if (m.type === 'ready') this.#ready.resolve(true);
    else if (m.type === 'ended') this.#finish('ended');
    else if (m.type === 'error') this.#finish('error');
  }
}
