/**
 * WebSocket client for the multiplayer village square (protocol: server/VillageServer.js).
 * `connect(name, room, gender)` resolves with the welcome message; events are delivered via `on(type, fn)`.
 */
export class VillageNetwork {
  #ws = null;
  #handlers = new Map();

  constructor(url) { this.url = url; }

  /**
   * Which village server to use:
   * - `?mp=wss://…` in the address wins (`?mp=local` → this page's own server);
   * - on localhost (npm start, tests) the dev server's built-in village is used;
   * - otherwise `villageServer` from assets/manifest.json (GitHub Pages, the Android app);
   * - without one, the page's own host (works when the game and server share a domain).
   */
  static resolveUrl({ manifestUrl = '', override = null, native = false, loc = location } = {}) {
    const local = `${loc.protocol === 'https:' ? 'wss' : 'ws'}://${loc.host}/ws/village`;
    if (override) return override === 'local' ? local : override;
    if (!native && /^(localhost|127\.0\.0\.1)$/.test(loc.hostname)) return local;
    return manifestUrl || local;
  }

  get connected() { return this.#ws?.readyState === WebSocket.OPEN && !!this.id; }

  on(type, fn) { if (!this.#handlers.has(type)) this.#handlers.set(type, new Set()); this.#handlers.get(type).add(fn); }
  #emit(type, payload) { this.#handlers.get(type)?.forEach((fn) => fn(payload)); }

  connect(name, room = 'ankara', gender = 'boy', style = '') {
    this.close();
    return new Promise((resolve, reject) => {
      const ws = this.#ws = new WebSocket(this.url);
      const fail = (message) => { reject(new Error(message)); this.close(); };
      const timer = setTimeout(() => fail('timeout'), 6000);
      ws.onopen = () => ws.send(JSON.stringify({ type: 'hello', name, room, gender, style }));
      ws.onerror = () => { clearTimeout(timer); fail('unreachable'); };
      ws.onclose = () => { if (this.id) this.#emit('disconnected', {}); this.id = null; };
      ws.onmessage = (e) => {
        let msg;
        try { msg = JSON.parse(e.data); } catch { return; }
        if (msg.type === 'welcome') { clearTimeout(timer); this.id = msg.id; this.name = msg.name; this.room = room; this.ice = msg.ice ?? null; resolve(msg); }
        else if (msg.type === 'error' && !this.id) { clearTimeout(timer); fail(msg.message); }
        else this.#emit(msg.type, msg);
      };
    });
  }

  send(msg) { if (this.#ws?.readyState === WebSocket.OPEN) this.#ws.send(JSON.stringify(msg)); }

  /** Test hook: drop the socket as a phone going to sleep would (the 'disconnected' event fires). */
  dropForTest() { this.#ws?.close(); }

  close() {
    if (!this.#ws) return;
    const ws = this.#ws;
    this.#ws = null;
    this.id = null;
    ws.onclose = null;
    ws.close();
  }
}
