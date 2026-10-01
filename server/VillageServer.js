import { WebSocketServer } from 'ws';

const NAME = /^[\p{L}\p{N}_ .-]{2,16}$/u;
const SHIRTS = [0xE4574A, 0x2F6FDB, 0x3E8E4A, 0xE0B04A, 0x7A3552, 0x16A085, 0xD35400, 0x8E44AD];
const MAX_PER_ROOM = 24;

/**
 * Multiplayer village square. Keeps who is in which room, relays positions, push-to-talk
 * state, speech transcripts and WebRTC signalling (voice goes peer-to-peer).
 *
 * client → server
 *   { type: 'hello', name, room? }        join a room with a username
 *   { type: 'state', x, z, rot, moving }  own position (~10/s)
 *   { type: 'talk', on }                  push-to-talk pressed / released
 *   { type: 'say', text }                 what the speech recogniser heard (bubble)
 *   { type: 'rtc', to, data }             WebRTC offer / answer / ICE for one peer
 * server → client
 *   { type: 'welcome', id, name, look, peers: [peer] } | { type: 'error', message }
 *   { type: 'join', peer } | { type: 'leave', id }
 *   { type: 'states', players: [{ id, x, z, rot, moving }] }   (10/s)
 *   { type: 'talk', id, on } | { type: 'say', id, text } | { type: 'rtc', from, data }
 */
export class VillageServer {
  #rooms = new Map(); // room → Map(id → client)
  #seq = 0;

  constructor({ server, path = '/ws/village', log = console.log } = {}) {
    this.log = log;
    this.wss = new WebSocketServer({ server, path, maxPayload: 64 * 1024 });
    this.wss.on('connection', (ws) => this.#connect(ws));
    this.timer = setInterval(() => this.#broadcastStates(), 100);
  }

  #connect(ws) {
    const client = { ws, id: null, name: null, room: null, x: -14.8, z: 0, rot: Math.PI / 2, moving: false, talking: false, dirty: false };
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
    switch (msg.type) {
      case 'state':
        if ([msg.x, msg.z, msg.rot].every(Number.isFinite)) Object.assign(c, { x: msg.x, z: msg.z, rot: msg.rot, moving: !!msg.moving, dirty: true });
        break;
      case 'talk':
        c.talking = !!msg.on;
        this.#toRoom(c, { type: 'talk', id: c.id, on: c.talking });
        break;
      case 'say':
        if (typeof msg.text === 'string' && msg.text.trim()) this.#toRoom(c, { type: 'say', id: c.id, text: msg.text.trim().slice(0, 140) });
        break;
      case 'rtc': {
        const peer = this.#room(c.room).get(msg.to);
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

  #leave(c) {
    if (!c.id) return;
    const members = this.#room(c.room);
    if (!members.delete(c.id)) return;
    this.#toRoom(c, { type: 'leave', id: c.id });
    this.log(`[village] ${c.name} left ${c.room} (${members.size})`);
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

  #public({ id, name, look, x, z, rot, talking }) { return { id, name, look, x, z, rot, talking }; }
  #room(name) { if (!this.#rooms.has(name)) this.#rooms.set(name, new Map()); return this.#rooms.get(name); }
  #send(c, msg) { if (c.ws.readyState === 1) c.ws.send(JSON.stringify(msg)); }
  #toRoom(from, msg) {
    const data = JSON.stringify(msg);
    this.#room(from.room).forEach((m) => { if (m !== from && m.ws.readyState === 1) m.ws.send(data); });
  }

  close() { clearInterval(this.timer); this.wss.close(); }
}
