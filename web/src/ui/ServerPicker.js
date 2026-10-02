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

const MAX_PLAYERS = 24; // per square (server/src/VillageServer.js)

/** City cards with live player counts and a crowd meter (polled from /health while `start()`ed). */
export class ServerPicker {
  #timer = null;
  #touched = false; // the player clicked a card (then their choice stays)
  #counts = Object.fromEntries(SERVERS.map(([id]) => [id, 0]));
  #value;

  constructor({ villageServer, value = DEFAULT_SERVER, onChange }) {
    this.url = villageServer ? healthUrl(villageServer) : '';
    this.onChange = onChange;
    this.#value = SERVERS.some(([id]) => id === value) ? value : DEFAULT_SERVER;
    this.cards = el('div', { class: 'server-cards', attrs: { role: 'radiogroup', 'aria-label': 'Sunucu' } });
    this.status = el('p', { class: 'note' });
    this.root = el('div', { class: 'server-picker' }, [this.cards, this.status]);
    this.#render();
  }

  get value() { return this.#value; }
  set value(v) { if (SERVERS.some(([id]) => id === v)) { this.#value = v; this.#render(); } }

  #render() {
    this.cards.replaceChildren(...SERVERS.map(([id, label]) => {
      const n = this.#counts[id] ?? 0;
      const level = n === 0 ? 'empty' : n < 6 ? 'calm' : n < 15 ? 'lively' : 'busy';
      const word = { empty: ['Boş', gloss('Empty')], calm: ['Sakin', gloss('Quiet')], lively: ['Hareketli', gloss('Lively')], busy: ['Kalabalık', gloss('Crowded')] }[level];
      const on = id === this.#value;
      return el('button', {
        class: `server-card lvl-${level}${on ? ' on' : ''}`, attrs: { type: 'button', role: 'radio', 'aria-checked': String(on), 'data-server': id },
        on: { click: () => { this.#touched = true; this.#value = id; this.#render(); this.onChange?.(id); } },
      }, [
        el('span', { class: 'sc-city', text: label }),
        el('span', { class: 'sc-count', text: `👥 ${n}` }),
        el('span', { class: 'sc-meter' }, [el('i', { style: { width: `${Math.min(100, (n / MAX_PLAYERS) * 100)}%` } })]),
        el('span', { class: 'sc-level' }, [word[0], el('small', { class: 'en-t', text: ` · ${word[1]}` })]),
      ]);
    }));
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
      // until the player picks one: the square where people are (friends find each other)
      if (!this.#touched) {
        const [best] = SERVERS.map(([id]) => id).sort((a, b) => this.#counts[b] - this.#counts[a]);
        if (this.#counts[best] > this.#counts[this.#value]) { this.#value = best; this.onChange?.(best); }
      }
      this.#render();
    } catch {
      this.status.textContent = `Sunucu durumu alınamadı · ${gloss('Could not reach the server.')}`;
    }
  }

  start() { this.stop(); this.refresh(); this.#timer = setInterval(() => this.refresh(), REFRESH_MS); }
  stop() { clearInterval(this.#timer); this.#timer = null; }
}
