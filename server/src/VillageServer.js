import { WebSocketServer } from 'ws';
import { createHmac } from 'node:crypto';
import { ChatFilter } from './ChatFilter.js';
import { ChessTable } from './ChessTable.js';

const NAME = /^[\p{L}\p{N}_ .-]{2,16}$/u;
const SHIRTS = [0xE4574A, 0x2F6FDB, 0x3E8E4A, 0xE0B04A, 0x7A3552, 0x16A085, 0xD35400, 0x8E44AD];
const MAX_PER_ROOM = 24;
const CALL_RANGE = 6;   // metres: how close you must be to ask someone for a voice chat
const CALL_DROP = 200;  // metres: practically never — a call ends when someone hangs up or leaves the square
const REQUEST_TTL = 20000;
const ROOM = /^[a-z0-9-]{1,24}$/;
/** Only known looks get through: boy modest / strong, girl covered / open. */
const lookOf = (gender, style) => (gender === 'girl'
  ? { gender: 'girl', style: style === 'open' ? 'open' : 'covered' }
  : { gender: 'boy', style: style === 'strong' ? 'strong' : 'modest' });
const RATE = { burst: 60, perSecond: 30 }; // messages per client (10/s states + WebRTC ICE bursts)
const MAX_BALLS = 4;                        // shared balls per room (the square's pitch has two)
const SAY_GAP = 1200;                       // ms between two public speech bubbles
const HEARTBEAT = 30000;                    // ms; silent connections are dropped
const IDLE = 45000;                         // ms without any message from a page that promised a keep-alive (`ka`): its game is frozen (phone locked) — drop it


/**
 * Multiplayer village square.
 * - In public, speech is shown as text only: the client turns push-to-talk into text
 *   (speech-to-text) and the server relays `say` bubbles. No open voice to strangers.
 * - Voice is one-to-one and needs consent: A asks B (`call-request`), B accepts, and only
 *   then the server relays WebRTC signalling between exactly those two.
 *
 * client → server
 *   { type: 'hello', name, room?, gender?, style? } join with a username (gender: 'boy' | 'girl', style: 'modest' | 'strong' | 'covered' | 'open')
 *   { type: 'state', x, z, rot, moving, sit? }  own position (~10/s); sit = on a chair or bench
 *   { type: 'talk', on }                  push-to-talk pressed / released (🎙️ marker)
 *   { type: 'say', text }                 recognised speech (public text bubble)
 *   { type: 'call-request', to }          ask a nearby player for a voice chat
 *   { type: 'call-answer', to, accept }   answer a request
 *   { type: 'call-end' }                  hang up
 *   { type: 'ball', n?, x, z, vx, vz }    kicked shared ball n (0 when left out; relayed, last state kept for newcomers)
 *   { type: 'rtc', to, data }             WebRTC offer / answer / ICE — only to your call partner
 *   { type: 'call-diag', state, detail? } how the voice connection went (logged, for support)
 *   { type: 'goal', side }                a goal in a schoolyard match ('a' | 'b'), relayed to the room
 *   { type: 'chess-ask', color } | { type: 'chess-dede', color? } | { type: 'chess-leave' } | { type: 'chess-resign' }
 *   | { type: 'chess-move', from, to, promotion? }
 *                                         the square's giant chess board, run by İsmail Dede (see ChessTable):
 *                                         ask him for a colour, play against him, leave the line, resign
 *                                         (older clients: chess-sit = ask, chess-stand = leave, chess-new is ignored)
 * server → client
 *   { type: 'welcome', id, name, look, peers, ball?, ice } | { type: 'error', message }
 *     ice: WebRTC ICE servers for voice calls (STUN + TURN with short-lived credentials)
 *   { type: 'join', peer } | { type: 'leave', id } | { type: 'states', players }
 *   { type: 'talk', id, on } | { type: 'say', id, text } | { type: 'ball', id, n, x, z, vx, vz }
 *   { type: 'call-request', from, name } | { type: 'call-declined', id, reason }
 *   { type: 'call-start', with, initiator } | { type: 'call-end', with, reason }
 *   { type: 'rtc', from, data }
 *   { type: 'chess', v: 2, phase, fen, turn, check, last, over, result, seats, queue, clocks, running, limit, scores }
 *                                         the board, after every change and while clocks run out (also in welcome)
 */
export class VillageServer {
  #rooms = new Map(); // room → Map(id → client)
  #seq = 0;

  #perIp = new Map();
  #chess = new Map(); // room → ChessTable
  #balls = new Map(); // room → [last state of each ball] (the kicker also reports where it stops)

  /**
   * @param {object} o
   * @param {import('node:http').Server} o.server  HTTP server to attach to
   * @param {(origin: string|undefined) => boolean} [o.allowOrigin]  browser origins allowed to connect (default: all)
   * @param {number} [o.maxPerIp]  simultaneous connections per IP (default: unlimited)
   * @param {(req: import('node:http').IncomingMessage) => string} [o.clientIp]
   */
  /**
   * @param {object} [o.turn]  { secret, urls: string[] } → TURN credentials in the TURN REST style
   *   (username "<expiry>:<id>", password HMAC-SHA1(secret, username)), valid for a day
   * @param {Map} [o.chessScores]  chess score board to start from; `onChessScore()` after every game (to save it)
   */
  constructor({ server, path = '/ws/village', log = console.log, allowOrigin = () => true, maxPerIp = Infinity, clientIp = (req) => req.socket.remoteAddress, turn = null, chessScores = new Map(), onChessScore = () => {} } = {}) {
    this.log = log;
    this.chessScores = chessScores; // İsmail Dede's score board, shared by every square (name → games, wins…)
    this.onChessScore = onChessScore;
    this.turn = turn?.issue || (turn?.secret && turn.urls?.length) ? turn : null;
    this.wss = new WebSocketServer({
      server, path, maxPayload: 32 * 1024,
      verifyClient: ({ origin, req }, done) => {
        if (!allowOrigin(origin)) { this.log(`[village] refused origin ${origin}`); return done(false, 403, 'Origin not allowed'); }
        if ((this.#perIp.get(clientIp(req)) ?? 0) >= maxPerIp) return done(false, 429, 'Too many connections');
        done(true);
      },
    });
    this.wss.on('connection', (ws, req) => this.#connect(ws, clientIp(req)));
    this.timer = setInterval(() => { this.#tickChess(); this.#broadcastStates(); this.#dropFarCalls(); }, 100);
    this.heartbeat = setInterval(() => this.wss.clients.forEach((ws) => {
      if (!ws.alive) return ws.terminate();
      if (ws.keepalive && Date.now() - ws.lastMsg > IDLE) return ws.terminate(); // the socket answers pings, but the game stands still
      ws.alive = false;
      ws.ping();
    }), HEARTBEAT);
  }

  /**
   * ICE servers for one player: public STUN, plus our TURN relay when there is one —
   * either a TurnRelay (issue/release) or coturn's shared secret (TURN REST credentials, 24 h).
   */
  iceFor(id) {
    const ice = [{ urls: 'stun:stun.l.google.com:19302' }];
    if (this.turn?.issue) ice.push(this.turn.issue(id));
    else if (this.turn) {
      const username = `${Math.floor(Date.now() / 1000) + 86400}:${id}`;
      const credential = createHmac('sha1', this.turn.secret).update(username).digest('base64');
      ice.push({ urls: this.turn.urls, username, credential });
    }
    return ice;
  }

  /** Numbers for the /health endpoint. */
  stats() {
    const rooms = Object.fromEntries([...this.#rooms].filter(([, m]) => m.size).map(([r, m]) => [r, m.size]));
    return { connections: this.wss.clients.size, players: Object.values(rooms).reduce((a, b) => a + b, 0), rooms };
  }

  #connect(ws, ip) {
    const client = { ws, ip, id: null, name: null, room: null, x: -14.8, z: 0, rot: Math.PI / 2, moving: false, sit: false, talking: false, dirty: false, partner: null, requests: new Map(), tokens: RATE.burst, refilled: Date.now(), lastSay: 0 };
    this.#perIp.set(ip, (this.#perIp.get(ip) ?? 0) + 1);
    ws.alive = true;
    ws.on('pong', () => { ws.alive = true; });
    ws.lastMsg = Date.now();
    ws.on('message', (raw) => {
      ws.lastMsg = Date.now();
      if (!this.#allow(client)) return;
      let msg;
      try { msg = JSON.parse(raw); } catch { return; }
      if (msg && typeof msg === 'object') this.#handle(client, msg);
    });
    ws.once('close', () => {
      const n = (this.#perIp.get(ip) ?? 1) - 1;
      if (n > 0) this.#perIp.set(ip, n); else this.#perIp.delete(ip);
    });
    ws.on('close', () => this.#leave(client));
    ws.on('error', () => this.#leave(client));
  }

  /** Token bucket: a flooding client loses messages, a client flooding far beyond that is cut off. */
  #allow(c) {
    const now = Date.now();
    c.tokens = Math.min(RATE.burst, c.tokens + ((now - c.refilled) / 1000) * RATE.perSecond);
    c.refilled = now;
    if (c.tokens >= 1) { c.tokens -= 1; return true; }
    if (c.tokens < -RATE.burst) { this.log(`[village] flood from ${c.name ?? c.ip}, closing`); c.ws.close(1008, 'Too many messages'); }
    c.tokens -= 1;
    return false;
  }

  /** Welcome: where the room's balls stopped (`ball` = ball 0, for older clients). */
  #ballsFor(room) {
    const list = this.#balls.get(room);
    if (!list) return {};
    const balls = Array.from({ length: list.length }, (_, i) => (list[i] ? { ...list[i], vx: 0, vz: 0 } : null));
    return { ball: balls[0] ?? undefined, balls };
  }

  #handle(c, msg) {
    if (msg.type === 'hello') return this.#hello(c, msg);
    if (!c.id) return;
    const members = this.#room(c.room);
    switch (msg.type) {
      case 'state':
        if (msg.ka) c.ws.keepalive = true; // this page sends its state at least every 10 s
        if ([msg.x, msg.z, msg.rot].every(Number.isFinite)) Object.assign(c, { x: msg.x, z: msg.z, rot: msg.rot, moving: !!msg.moving, sit: !!msg.sit, dirty: true });
        break;
      case 'talk':
        c.talking = !!msg.on;
        this.#toRoom(c, { type: 'talk', id: c.id, on: c.talking });
        break;
      case 'say':
        if (typeof msg.text !== 'string' || !msg.text.trim() || Date.now() - c.lastSay < SAY_GAP) return;
        c.lastSay = Date.now();
        this.#toRoom(c, { type: 'say', id: c.id, text: ChatFilter.clean(msg.text.trim().slice(0, 140)) });
        break;
      case 'ball': {
        const n = [msg.x, msg.z, msg.vx, msg.vz];
        if (!n.every(Number.isFinite) || Math.abs(msg.x) > 40 || Math.abs(msg.z) > 40 || Math.hypot(msg.vx, msg.vz) > 15) return;
        const i = msg.n ?? 0;
        if (!Number.isInteger(i) || i < 0 || i >= MAX_BALLS) return;
        const ball = { x: msg.x, z: msg.z, vx: msg.vx, vz: msg.vz };
        if (!this.#balls.has(c.room)) this.#balls.set(c.room, []);
        this.#balls.get(c.room)[i] = ball;
        this.#toRoom(c, { type: 'ball', id: c.id, n: i, ...ball });
        break;
      }
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
      case 'chess-draw': case 'chess-draw-accept': case 'chess-draw-decline': { // a draw offered / answered through Dede
        const t = this.#table(c.room);
        const ok = msg.type === 'chess-draw' ? t.offerDraw(c.id) : t.answerDraw(c.id, msg.type === 'chess-draw-accept');
        if (ok) this.#toAll(c.room, t.state());
        break;
      }
      case 'chess-ask': case 'chess-sit': case 'chess-dede': case 'chess-leave': case 'chess-stand': case 'chess-resign': case 'chess-move': {
        const t = this.#table(c.room);
        const ok = msg.type === 'chess-ask' || msg.type === 'chess-sit' ? t.ask(c, msg.color)
          : msg.type === 'chess-dede' ? t.askDede(c, msg.color)
            : msg.type === 'chess-leave' || msg.type === 'chess-stand' ? t.leave(c.id)
              : msg.type === 'chess-resign' ? t.resign(c.id)
                : t.move(c.id, msg);
        if (ok) this.#toAll(c.room, t.state()); else this.#send(c, t.state()); // a refused move snaps back
        break;
      }
      case 'goal': // a match in the schoolyard: the scorer's screen tells the others
        if (msg.side === 'a' || msg.side === 'b') this.#toRoom(c, { type: 'goal', id: c.id, side: msg.side });
        break;
      case 'call-diag': // the client reports how a voice connection went
        if (typeof msg.state === 'string') this.log(`[village] voice ${c.name}: ${msg.state.slice(0, 20)}${typeof msg.detail === 'string' ? ` (${msg.detail.slice(0, 120)})` : ''}`);
        break;
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

  #hello(c, { name, room = 'village', gender, style, pid }) {
    if (c.id) return;
    if (typeof room !== 'string' || !ROOM.test(room)) return this.#send(c, { type: 'error', message: 'Geçersiz oda.' });
    const clean = String(name ?? '').trim();
    if (!NAME.test(clean)) return this.#send(c, { type: 'error', message: 'Kullanıcı adı 2-16 harf/rakam olmalı.' });
    if (ChatFilter.blocks(clean)) return this.#send(c, { type: 'error', message: 'Bu kullanıcı adı kullanılamaz.' });
    const members = this.#room(room);
    // the same device again (its old connection not closed yet, e.g. a phone that lost its signal):
    // the new connection takes over — same name, so the chess seat is found again
    if (typeof pid === 'string' && /^[a-z0-9]{8,40}$/.test(pid)) {
      c.pid = pid;
      for (const old of members.values()) if (old.pid === pid) { this.#leave(old); old.id = null; old.ws.terminate(); }
    }
    if (members.size >= MAX_PER_ROOM) return this.#send(c, { type: 'error', message: 'Meydan dolu, biraz sonra tekrar dene.' });
    const taken = new Set([...members.values()].map((m) => m.name.toLocaleLowerCase('tr')));
    let unique = clean, n = 2;
    while (taken.has(unique.toLocaleLowerCase('tr'))) unique = `${clean}${n++}`;
    Object.assign(c, { id: `p${++this.#seq}`, name: unique, room, look: { shirt: SHIRTS[this.#seq % SHIRTS.length], ...lookOf(gender, style) } });
    this.#send(c, { type: 'welcome', id: c.id, name: c.name, look: c.look, peers: [...members.values()].map((m) => this.#public(m)), ...this.#ballsFor(room), chess: this.#table(room).state(), ice: this.iceFor(c.id) });
    this.#toRoom(c, { type: 'join', peer: this.#public(c) });
    members.set(c.id, c);
    if (this.#table(room).rejoin(c)) this.#toAll(room, this.#table(room).state()); // back at the board after a dropped connection
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
    this.turn?.release?.(c.id);
    const table = this.#chess.get(c.room);
    if (table?.disconnect(c.id, c.name)) this.#toAll(c.room, table.state(), c);
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
      const players = [...members.values()].filter((m) => m.dirty).map(({ id, x, z, rot, moving, sit }) => ({ id, x, z, rot, moving, sit }));
      if (!players.length) continue;
      members.forEach((m) => { m.dirty = false; });
      const msg = JSON.stringify({ type: 'states', players });
      members.forEach((m) => { if (m.ws.readyState === 1) m.ws.send(msg); });
    }
  }

  #dist(a, b) { return Math.hypot(a.x - b.x, a.z - b.z); }
  #public({ id, name, look, x, z, rot, talking, sit }) { return { id, name, look, x, z, rot, talking, sit }; }
  #table(room) {
    if (!this.#chess.has(room)) this.#chess.set(room, new ChessTable({ scores: this.chessScores, onScore: this.onChessScore }));
    return this.#chess.get(room);
  }
  /** Chess clocks run out and İsmail Dede moves even when nobody sends anything. */
  #tickChess() { for (const [room, t] of this.#chess) if (t.tick()) this.#toAll(room, t.state()); }
  /** Everyone in the room (optionally except one). */
  #toAll(room, msg, except = null) {
    const data = JSON.stringify(msg);
    this.#room(room).forEach((m) => { if (m !== except && m.ws.readyState === 1) m.ws.send(data); });
  }
  #room(name) { if (!this.#rooms.has(name)) this.#rooms.set(name, new Map()); return this.#rooms.get(name); }
  #send(c, msg) { if (c.ws.readyState === 1) c.ws.send(JSON.stringify(msg)); }
  #toRoom(from, msg) {
    const data = JSON.stringify(msg);
    this.#room(from.room).forEach((m) => { if (m !== from && m.ws.readyState === 1) m.ws.send(data); });
  }

  close() {
    clearInterval(this.timer);
    clearInterval(this.heartbeat);
    this.wss.clients.forEach((ws) => ws.close(1001, 'Server shutting down'));
    this.wss.close();
  }
}
