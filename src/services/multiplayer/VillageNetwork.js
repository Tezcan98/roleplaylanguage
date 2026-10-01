/**
 * WebSocket client for the multiplayer village square (protocol: server/VillageServer.js).
 * `connect(name)` resolves with the welcome message; events are delivered via `on(type, fn)`.
 */
export class VillageNetwork {
  #ws = null;
  #handlers = new Map();

  constructor(url) { this.url = url; }

  /** Same-origin server (npm start) unless the manifest points somewhere else. */
  static defaultUrl(manifestUrl) {
    if (manifestUrl) return manifestUrl;
    return `${location.protocol === 'https:' ? 'wss' : 'ws'}://${location.host}/ws/village`;
  }

  get connected() { return this.#ws?.readyState === WebSocket.OPEN && !!this.id; }

  on(type, fn) { if (!this.#handlers.has(type)) this.#handlers.set(type, new Set()); this.#handlers.get(type).add(fn); }
  #emit(type, payload) { this.#handlers.get(type)?.forEach((fn) => fn(payload)); }

  connect(name) {
    this.close();
    return new Promise((resolve, reject) => {
      const ws = this.#ws = new WebSocket(this.url);
      const fail = (message) => { reject(new Error(message)); this.close(); };
      const timer = setTimeout(() => fail('timeout'), 6000);
      ws.onopen = () => ws.send(JSON.stringify({ type: 'hello', name }));
      ws.onerror = () => { clearTimeout(timer); fail('unreachable'); };
      ws.onclose = () => { if (this.id) this.#emit('disconnected', {}); this.id = null; };
      ws.onmessage = (e) => {
        let msg;
        try { msg = JSON.parse(e.data); } catch { return; }
        if (msg.type === 'welcome') { clearTimeout(timer); this.id = msg.id; this.name = msg.name; resolve(msg); }
        else if (msg.type === 'error' && !this.id) { clearTimeout(timer); fail(msg.message); }
        else this.#emit(msg.type, msg);
      };
    });
  }

  send(msg) { if (this.#ws?.readyState === WebSocket.OPEN) this.#ws.send(JSON.stringify(msg)); }

  close() {
    if (!this.#ws) return;
    const ws = this.#ws;
    this.#ws = null;
    this.id = null;
    ws.onclose = null;
    ws.close();
  }
}
