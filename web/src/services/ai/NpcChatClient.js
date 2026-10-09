/**
 * Client for the village server's free conversation endpoint (server/src/NpcChat.js).
 * The server owns the character prompts and the Gemini key; this only sends the player's
 * line with the last turns and returns { reply, meaning, correction, words }.
 */
const PERSONAS = new Set(['manav', 'bakkal', 'elif', 'can', 'zehra', 'ogretmen', 'anne', 'baba', 'dede', 'nine', 'kardes', 'cayci']);
const KEEP_TURNS = 10;

export class NpcChatClient {
  #history = new Map(); // npc → [{ role: 'user' | 'model', text }]
  #enabled = null;

  /** @param {{ url: string, lang: () => string, player: () => string }} o */
  constructor({ url, lang, player, ids = () => ({}) }) { Object.assign(this, { url, lang, player, ids }); } // ids(): { pid, gid } for the safety log

  /** wss://host/ws/village → https://host/api/npc-chat */
  static urlFor(villageUrl) {
    return villageUrl ? villageUrl.replace(/^ws/, 'http').replace(/\/ws\/village$/, '/api/npc-chat') : '';
  }

  hasPersona(npc) { return PERSONAS.has(npc); }

  /** Asks the server once whether chat is switched on (a Gemini key is configured). */
  async enabled() {
    if (this.#enabled !== null) return this.#enabled;
    try {
      const r = await fetch(this.url, { cache: 'no-store' });
      this.#enabled = r.ok && (await r.json()).enabled === true;
    } catch { this.#enabled = false; }
    return this.#enabled;
  }

  async reply(npc, message) {
    const history = this.#history.get(npc) ?? [];
    const r = await fetch(this.url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ npc, message, history, lang: this.lang(), player: this.player(), ...this.ids() }),
    });
    if (r.status === 429) throw Object.assign(new Error('limit'), { code: 'limit' });
    if (!r.ok) throw new Error(`chat ${r.status}`);
    const data = await r.json();
    history.push({ role: 'user', text: message }, { role: 'model', text: data.reply });
    this.#history.set(npc, history.slice(-KEEP_TURNS));
    return data;
  }
}
