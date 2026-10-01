import { WebSocketServer } from 'ws';

const NAME = /^[\p{L}\p{N}_ .-]{2,16}$/u;
const SHIRTS = [0xE4574A, 0x2F6FDB, 0x3E8E4A, 0xE0B04A, 0x7A3552, 0x16A085, 0xD35400, 0x8E44AD];
const MAX_PER_ROOM = 24;
const CALL_RANGE = 4;   // metres: how close you must be to ask someone for a voice chat
const CALL_DROP = 12;   // metres: a call ends when the two walk this far apart
const REQUEST_TTL = 20000;

const BLOCKED_WORDS = [
  'amk', 'aq', 'orospu', 'sik', 'siktir', 'yarrak', 'piç', 'ibne', 'göt', 'salak',
  'fuck', 'shit', 'bitch', 'asshole', 'cunt', 'dick', 'pussy', 'bastard',
  'كس', 'قحبة', 'شرموط', 'عاهرة', 'خنزير', 'كلب'
];
const WORD_RE = /[\\p{L}\\p{N}]+/gu;
const normalizeWord = (value) => value.normalize('NFKC').toLocaleLowerCase('tr').replace(/[ıİ]/g, 'i');
const containsBlockedWord = (value) => {
  const words = String(value).match(WORD_RE) ?? [];
  return words.some((word) => BLOCKED_WORDS.includes(normalizeWord(word)));
};
const censorText = (value) => String(value).replace(WORD_RE, (word) => BLOCKED_WORDS.includes(normalizeWord(word)) ? '***' : word);

/**
 * Multiplayer village square.
 * - In public, speech is shown as text only: the client turns push-to-talk into text
 *   (speech-to-text) and the server relays `say` bubbles. No open voice to strangers.
 * - Voice is one-to-one and needs consent: A asks B (`call-request`), B accepts, and only
 *   then the server relays WebRTC signalling between exactly those two.
 *
 * client → server
 *   { type: 'hello', name, room? }        join with a username
 *   { type: 'state', x, z, rot, moving }  own position (~10/s)
 *   { type: 'talk', on }                  push-to-talk pressed / released (🎙️ marker)
 *   { type: 'say', text }                 recognised speech (public text bubble)
 *   { type: 'call-request', to }          ask a nearby player for a voice chat
 *   { type: 'call-answer', to, accept }   answer a request
 *   { type: 'call-end' }                  hang up
 *   { type: 'rtc', to, data }             WebRTC offer / answer / ICE — only to your call partner
 * server → client
 *   { type: 'welcome', id, name, look, peers } | { type: 'error', message }
 *   { type: 'join', peer } | { type: 'leave', id } | { type: 'states', players }
 *   { type: 'talk', id, on } | { type: 'say', id, text }
 *   { type: 'call-request', from, name } | { type: 'call-declined', id, reason }
 *   { type: 'call-start', with, initiator } | { type: 'call-end', with, reason }
 *   { type: 'rtc', from, data }
 */
export class VillageServer {
  #rooms = new Map(); // room → Map(id → client)
  #seq = 0;

  constructor({ server, path = '/ws/village', log = console.log } = {}) {
    this.log = log;
    this.wss = new WebSocketServer({ server, path, maxPayload: 64 * 1024 });
    this.wss.on('connection', (ws) => this.#connect(ws));
    this.timer = setInterval(() => { this.#broadcastStates(); this.#dropFarCalls(); }, 100);
  }

  #connect(ws) {
    const client = { ws, id: null, name: null, room: null, x: -14.8, z: 0, rot: Math.PI / 2, moving: false, talking: false, dirty: false, partner: null, requests: new Map() };
    ws.on('message', (raw) => {
      let msg;
      try { msg = JSON.parse(raw); } catch { return; }
      this.#handle(client, msg);
    });
    ws.on('close', () => this.#leave(client));
    ws.on('error', () => this.#leave(client));
  }

  #handle(c, msg) {
    if (msg.type === 'hello') return this.#hello(c, msg);
    if (!c.id) return;
    const members = this.#room(c.room);
    switch (msg.type) {
      case 'state':
        if ([msg.x, msg.z, msg.rot].every(Number.isFinite)) Object.assign(c, { x: msg.x, z: msg.z, rot: msg.rot, moving: !!msg.moving, dirty: true });
        break;
      case 'talk':
        c.talking = !!msg.on;
        this.#toRoom(c, { type: 'talk', id: c.id, on: c.talking });
        break;
      case 'say':
        if (typeof msg.text === 'string' && msg.text.trim()) this.#toRoom(c, { type: 'say', id: c.id, text: censorText(msg.text.trim().slice(0, 140)) });
        break;
      case 'call-request': {
        const to = members.get(msg.to);
        if (!to || to === c) return;
        if (c.partner || to.partner) return this.#send(c, { type: 'call-declined', id: msg.to, reason: 'busy' });
        if (this.#dist(c, to) > CALL_RANGE) return this.#send(c, { type: 'call-declined', id: msg.to, reason: 'far' });
        to.requests.set(c.id, Date.now());
        this.#send(to, { type: 'call-request', from: c.id, name: c.name });
        break;
      }
      case 'call-answer': {
        const from = members.get(msg.to);
        const asked = c.requests.get(msg.to);
        c.requests.delete(msg.to);
        if (!from || !asked || Date.now() - asked > REQUEST_TTL) return;
        if (!msg.accept || c.partner || from.partner) return this.#send(from, { type: 'call-declined', id: c.id, reason: msg.accept ? 'busy' : 'declined' });
        c.partner = from.id;
        from.partner = c.id;
        this.#send(from, { type: 'call-start', with: c.id, initiator: true });
        this.#send(c, { type: 'call-start', with: from.id, initiator: false });
        this.log(`[village] call ${from.name} ↔ ${c.name}`);
        break;
      }
      case 'call-end':
        this.#endCall(c, 'hangup');
        break;
      case 'rtc': {
        if (msg.to !== c.partner) return; // signalling only between the two who agreed
        const peer = members.get(msg.to);
        if (peer) this.#send(peer, { type: 'rtc', from: c.id, data: msg.data });
        break;
      }
      default: break;
    }
  }

  #hello(c, { name, room = 'village' }) {
    if (c.id) return;
    const clean = String(name ?? '').trim();
    if (!NAME.test(clean)) return this.#send(c, { type: 'error', message: 'Kullanıcı adı 2-16 harf/rakam olmalı.' });
    if (containsBlockedWord(clean)) return this.#send(c, { type: 'error', message: 'Bu kullanıcı adı kullanılamaz.' });
    const members = this.#room(room);
    if (members.size >= MAX_PER_ROOM) return this.#send(c, { type: 'error', message: 'Meydan dolu, biraz sonra tekrar dene.' });
    const taken = new Set([...members.values()].map((m) => m.name.toLocaleLowerCase('tr')));
    let unique = clean, n = 2;
    while (taken.has(unique.toLocaleLowerCase('tr'))) unique = `${clean}${n++}`;
    Object.assign(c, { id: `p${++this.#seq}`, name: unique, room, look: { shirt: SHIRTS[this.#seq % SHIRTS.length] } });
    this.#send(c, { type: 'welcome', id: c.id, name: c.name, look: c.look, peers: [...members.values()].map((m) => this.#public(m)) });
    this.#toRoom(c, { type: 'join', peer: this.#public(c) });
    members.set(c.id, c);
    this.log(`[village] ${c.name} joined ${room} (${members.size})`);
  }

  #endCall(c, reason) {
    if (!c.partner) return;
    const peer = this.#room(c.room).get(c.partner);
    c.partner = null;
    this.#send(c, { type: 'call-end', with: peer?.id, reason });
    if (peer && peer.partner === c.id) { peer.partner = null; this.#send(peer, { type: 'call-end', with: c.id, reason }); }
  }

  #leave(c) {
    if (!c.id) return;
    this.#endCall(c, 'left');
    const members = this.#room(c.room);
    if (!members.delete(c.id)) return;
    this.#toRoom(c, { type: 'leave', id: c.id });
    this.log(`[village] ${c.name} left ${c.room} (${members.size})`);
  }

  #dropFarCalls() {
    for (const members of this.#rooms.values()) {
      for (const c of members.values()) {
        const p = c.partner && members.get(c.partner);
        if (p && this.#dist(c, p) > CALL_DROP) this.#endCall(c, 'far');
      }
    }
  }

  #broadcastStates() {
    for (const members of this.#rooms.values()) {
      const players = [...members.values()].filter((m) => m.dirty).map(({ id, x, z, rot, moving }) => ({ id, x, z, rot, moving }));
      if (!players.length) continue;
      members.forEach((m) => { m.dirty = false; });
      const msg = JSON.stringify({ type: 'states', players });
      members.forEach((m) => { if (m.ws.readyState === 1) m.ws.send(msg); });
    }
  }

  #dist(a, b) { return Math.hypot(a.x - b.x, a.z - b.z); }
  #public({ id, name, look, x, z, rot, talking }) { return { id, name, look, x, z, rot, talking }; }
  #room(name) { if (!this.#rooms.has(name)) this.#rooms.set(name, new Map()); return this.#rooms.get(name); }
  #send(c, msg) { if (c.ws.readyState === 1) c.ws.send(JSON.stringify(msg)); }
  #toRoom(from, msg) {
    const data = JSON.stringify(msg);
    this.#room(from.room).forEach((m) => { if (m !== from && m.ws.readyState === 1) m.ws.send(data); });
  }

  close() { clearInterval(this.timer); this.wss.close(); }
}
