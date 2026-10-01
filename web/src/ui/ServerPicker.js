import { el } from './dom.js';
import { gloss } from '../i18n/Gloss.js';

/**
 * Rooms on the village server, named after cities. They all run on one machine; each is
 * its own square, so players who want a quieter square can pick an emptier one.
 */
export const SERVERS = [
  ['ankara', 'Ankara'],
  ['istanbul', 'İstanbul'],
  ['izmir', 'İzmir'],
  ['manisa', 'Manisa'],
];
export const DEFAULT_SERVER = 'ankara';
const REFRESH_MS = 5000;

/** wss://host/ws/village → https://host/health */
export function healthUrl(wsUrl) {
  try {
    const u = new URL(wsUrl);
    u.protocol = u.protocol === 'wss:' ? 'https:' : 'http:';
    u.pathname = '/health';
    u.search = '';
    u.hash = '';
    return u.toString();
  } catch {
    return '';
  }
}

/** Server <select> with live player counts (polled from /health while `start()`ed). */
export class ServerPicker {
  #timer = null;
  #counts = Object.fromEntries(SERVERS.map(([id]) => [id, 0]));

  constructor({ villageServer, value = DEFAULT_SERVER }) {
    this.url = villageServer ? healthUrl(villageServer) : '';
    this.select = el('select', { class: 'server-select', attrs: { 'aria-label': 'Sunucu seç' } });
    this.status = el('p', { class: 'note' });
    this.root = el('div', { class: 'server-picker' }, [this.select, this.status]);
    this.#render(SERVERS.some(([id]) => id === value) ? value : DEFAULT_SERVER);
  }

  get value() { return this.select.value; }
  set value(v) { this.select.value = v; }

  #render(keep = this.value) {
    this.select.replaceChildren(...SERVERS.map(([id, label]) => {
      const n = this.#counts[id] ?? 0;
      return el('option', { text: `${label} — ${n === 0 ? 'boş' : `${n} kişi`}`, attrs: { value: id } });
    }));
    this.select.value = keep;
    const total = Object.values(this.#counts).reduce((a, b) => a + b, 0);
    this.status.textContent = `Çevrimiçi: ${total} · ${gloss('Pick an emptier square if you want it quiet.')}`;
  }

  async refresh() {
    if (!this.url) return;
    try {
      const r = await fetch(this.url, { cache: 'no-store' });
      if (!r.ok) throw new Error(String(r.status));
      const data = await r.json();
      this.#counts = Object.fromEntries(SERVERS.map(([id]) => [id, Number(data.rooms?.[id] ?? 0)]));
      this.#render();
    } catch {
      this.status.textContent = 'Sunucu durumu alınamadı.';
    }
  }

  start() { this.stop(); this.refresh(); this.#timer = setInterval(() => this.refresh(), REFRESH_MS); }
  stop() { clearInterval(this.#timer); this.#timer = null; }
}
