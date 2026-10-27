import { WebSocketServer } from 'ws';
import { createHmac } from 'node:crypto';
import { ChatFilter } from './ChatFilter.js';
import { ChessTable } from './ChessTable.js';
import { DamaTables } from './DamaTables.js';
import { Moderator } from './Moderator.js';

const NAME = /^[\p{L}\p{N}_ .-]{2,16}$/u;
const SHIRTS = [0xE4574A, 0x2F6FDB, 0x3E8E4A, 0xE0B04A, 0x7A3552, 0x16A085, 0xD35400, 0x8E44AD];
const MAX_PER_ROOM = 100;                   // the square holds a crowd (clients draw only the nearest 40)
/** How often a player's moves go to another, by the distance between them (ticks of 100 ms): close by every tick, then less and less. */
const NEAR = 20, MID = 50;                   // metres
const MID_EVERY = 2, FAR_EVERY = 5;          // up to MID: 5 a second; farther: 2 a second (the game carries a figure on between reports up to 0.6 s)
const CALL_RANGE = 6;   // metres: how close you must be to ask someone for a voice chat
const CALL_DROP = 200;  // metres: practically never — a call ends when someone hangs up or leaves the square
const REQUEST_TTL = 20000;
const MAX_CALL = 5;     // voices in one call (each phone sends its voice to every other one)
const ZONES = new Set(['kahve', 'avlu']);   // places where everyone in them hears each other (the kahvehane, the mosque's courtyard)
const MAX_ZONE = 16;                        // voices in one zone (each player connects to every other one)
const ROOM = /^[a-z0-9-]{1,24}$/;
/** Only known looks get through: boy modest / strong, girl covered / open. */
const lookOf = (gender, style) => (gender === 'girl'
  ? { gender: 'girl', style: style === 'open' ? 'open' : 'covered' }
  : { gender: 'boy', style: style === 'strong' ? 'strong' : 'modest' });
/** Bought in the shop: an outfit (HD character). */
const OUTFITS = ['casual', 'suit', 'dress', 'dress2', 'sport', 'jersey', 'sweater', 'summer'];
const outfitOf = (o) => ({ ...(OUTFITS.includes(o?.outfit) ? { outfit: o.outfit } : {}), ...(o?.aura === true ? { aura: true } : {}) });
const RATE = { burst: 60, perSecond: 30 }; // messages per client (10/s states + WebRTC ICE bursts)
const MAX_BALLS = 4;                        // shared balls per room (the square's pitch has two)
const SAY_GAP = 1200;                       // ms between two public speech bubbles
const STRIKES = 3, STRIKE_WINDOW = 10 * 60_000, MUTE = 5 * 60_000; // held-back bubbles → a short silence
const HEARTBEAT = 30000;                    // ms; silent connections are dropped
const VOICE_MIME = /^audio\/(webm|ogg|mp4|aac|mpeg|wav)(;\s*codecs=[\w.]+)?$/;
const VOICE_MAX = 60000;                    // base64 characters in one piece of voice (~10 s at 16 kbit/s is ~27 000)
const BASE64 = /^[A-Za-z0-9+/]+={0,2}$/;
const LAST_PIECE = 15000;                   // ms after a call / a zone during which its last piece of voice is still taken
const SPOKEN = 5;                           // 100 ms frames of speech a piece of voice needs to be kept (the game's VoiceRecorder.js measures them)
const IDLE = 45000;                         // ms without any message from a page that promised a keep-alive (`ka`): its game is frozen (phone locked) — drop it


/**
 * Multiplayer village square.
 * - In public, speech is shown as text only: the client turns push-to-talk into text
 *   (speech-to-text) and the server relays `say` bubbles. No open voice to strangers.
 * - Voice needs consent: A asks B (`call-request`), B accepts, and only then the server relays
 *   WebRTC signalling between exactly those two. A call holds up to MAX_CALL players: asking
 *   someone who is in a call asks to join it (they accept for it), asking from a call invites;
 *   the newcomer calls everyone already in it. Only between games that said `calls: 2` in their
 *   hello — an older game is "busy" while in a call, as before.
 * - Except in a talking zone (the kahvehane, shown on screen as one): whoever walks in hears the
 *   others there and is heard while holding the talk button. Signalling only between two players
 *   in the same zone; the newcomer calls everyone already there.
 *
 * client → server
 *   { type: 'hello', name, room?, gender?, style?, consent?, calls? } join with a username (calls: 2 — can be in a call of more than two) (gender: 'boy' | 'girl', style: 'modest' | 'strong' | 'covered' | 'open';
 *                                         consent: { v, at } — the player agreed to the recording, version v at time at: into the safety log once)
 *   { type: 'state', x, z, rot, moving, sit?, ride? }  own position (~10/s); sit = on a chair or bench, ride = 'horse' | 'scooter' | 'bike' (true / 1: horse, older games)
 *   { type: 'talk', on }                  push-to-talk pressed / released (🎙️ marker)
 *   { type: 'say', text }                 recognised speech (public text bubble)
 *   { type: 'call-request', to }          ask a nearby player for a voice chat
 *   { type: 'call-answer', to, accept }   answer a request
 *   { type: 'call-end' }                  hang up
 *   { type: 'ball', n?, x, z, vx, vz }    kicked shared ball n (0 when left out; relayed, last state kept for newcomers)
 *   { type: 'rtc', to, data }             WebRTC offer / answer / ICE — only to someone in your call
 *   { type: 'call-diag', state, detail? } how the voice connection went (logged, for support)
 *   { type: 'zone', zone }                walked into a talking zone ('kahve' | 'avlu') or out of it (null)
 *   { type: 'zone-rtc', to, data }        WebRTC offer / answer (with its candidates) to someone in the same zone
 *   { type: 'goal', side }                a goal in a schoolyard match ('a' | 'b'), relayed to the room
 *   { type: 'voice', ctx, mime, data, speech }  a piece (≤ ~10 s, base64) of my own voice while my mic is open in a call
 *                                         (ctx 'call'), a talking zone ('zone') or push-to-talk ('ptt'): into the encrypted voice log (48 h) and,
 *                                         for ten minutes, into memory for reports (Reports.js); never relayed. `speech`: how many
 *                                         100 ms frames had speech in them — a piece with less than SPOKEN is not kept (older games send none)
 *   { type: 'report', to, reason? }       report a player in this room ("Şikayet et"; Reports.js)
 *   { type: 'jump' }                      my horse jumped (relayed: { type: 'jump', id })
 *   { type: 'chess-ask', color } | { type: 'chess-dede', color? } | { type: 'chess-leave' } | { type: 'chess-resign' }
 *   | { type: 'chess-move', from, to, promotion? }
 *   { type: 'dama-open', n, npc? } | { type: 'dama-sit', n } | { type: 'dama-move', n, from, to } | { type: 'dama-again', n } | { type: 'dama-leave' }
 *                                         the kahvehane's dama tables (DamaTables): a board put on table n (npc: a villager plays
 *                                         black, the owner moves for him), sitting down opposite, moves checked by the Turkish rules
 *                                         the square's giant chess board, run by İsmail Dede (see ChessTable):
 *                                         ask him for a colour, play against him, leave the line, resign
 *                                         (older clients: chess-sit = ask, chess-stand = leave, chess-new is ignored)
 * server → client
 *   { type: 'welcome', id, name, look, peers, ball?, ice } | { type: 'error', message, code? }  (code 'name-taken': the name is another device's;
 *                                         'name-bad': the moderator won't have it)
 *     ice: WebRTC ICE servers for voice calls (STUN + TURN with short-lived credentials)
 *   { type: 'join', peer } | { type: 'leave', id } | { type: 'states', players }
 *   { type: 'say-blocked', reason, until? }  your bubble was held back (not Turkish / harmful; `until` = muted till)
 *   { type: 'report-ok' } | { type: 'report-failed', reason, until? }  ('limit' | 'again' | 'gone' | 'off' | 'self' | 'paused')
 *   { type: 'error', code: 'offline' }    a player the operator banned after a report: the game quietly plays offline (no message)
 *   { type: 'talk', id, on } | { type: 'say', id, text } | { type: 'ball', id, n, x, z, vx, vz }
 *   { type: 'call-request', from, name, join?, with? } | { type: 'call-declined', id, reason }  (join: they want into
 *                                         my call; with: the names already in theirs; reason 'busy' | 'declined' | 'far' | 'full')
 *   { type: 'call-start', with, initiator, peers? } (peers: everyone already in the call — the newcomer calls each)
 *   | { type: 'call-join', id, name } | { type: 'call-leave', id, reason } | { type: 'call-end', with, reason }
 *   { type: 'rtc', from, data }
 *   { type: 'zone-peers', zone, ids } (call each of them) | { type: 'zone-join', id } | { type: 'zone-leave', id }
 *   | { type: 'zone-full', zone } | { type: 'zone-rtc', from, data }
 *   { type: 'chess', v: 2, phase, fen, turn, check, last, over, result, seats, queue, clocks, running, limit, scores }
 *                                         the board, after every change and while clocks run out (also in welcome)
 */
export class VillageServer {
  #rooms = new Map(); // room → Map(id → client)
  #seq = 0;
  #ticks = 0; // state broadcasts so far (mid / far players every MID_EVERY / FAR_EVERY)

  #perIp = new Map();
  #consents = new Set(); // consents already in the safety log (since this start)
  #chess = new Map(); // room → ChessTable
  #dama = new Map(); // room → DamaTables (the kahvehane's dama tables)
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
  constructor({ server, path = '/ws/village', log = console.log, allowOrigin = () => true, maxPerIp = Infinity, clientIp = (req) => req.socket.remoteAddress, turn = null, chessScores = new Map(), onChessScore = () => {}, moderator = new Moderator({ log }), audit = null, voiceAudit = null, names = null, reports = null } = {}) {
    this.reports = reports; // player reports, what each said lately and the bans (Reports.js), or null
    this.names = names; // unique usernames (NameRegistry), or null: any name, numbered in a room
    this.moderator = moderator; // decides which public bubbles may be shown (word list, language, Jev / Laya)
    this.audit = audit; // the encrypted 90-day safety log (AuditLog.js), or null
    this.voiceAudit = voiceAudit; // …and its 48-hour voice log
    this.log = log;
    this.chessScores = chessScores; // İsmail Dede's score board, shared by every square (name → games, wins…)
    this.onChessScore = onChessScore;
    this.turn = turn?.issue || (turn?.secret && turn.urls?.length) ? turn : null;
    this.wss = new WebSocketServer({
      server, path, maxPayload: 96 * 1024, // (a piece of voice is up to ~40 KB)
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
    this.pruner = setInterval(() => this.reports?.prune(), HEARTBEAT); // what players said more than ten minutes ago
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
    const client = { ws, ip, id: null, name: null, room: null, x: -14.8, z: 0, rot: Math.PI / 2, moving: false, sit: false, ride: false, talking: false, dirty: false, call: null, zone: null, requests: new Map(), tokens: RATE.burst, refilled: Date.now(), lastSay: 0 };
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
    if (msg.type === 'hello') return this.#nameThenHello(c, msg);
    if (!c.id) return;
    const members = this.#room(c.room);
    switch (msg.type) {
      case 'state':
        if (msg.ka) c.ws.keepalive = true; // this page sends its state at least every 10 s
        if ([msg.x, msg.z, msg.rot].every(Number.isFinite)) Object.assign(c, { x: msg.x, z: msg.z, rot: msg.rot, moving: !!msg.moving, sit: !!msg.sit, ride: msg.ride === 'scooter' || msg.ride === 'bike' ? msg.ride : msg.ride ? 'horse' : false, dirty: true, midDirty: true, farDirty: true });
        break;
      case 'talk':
        c.talking = !!msg.on;
        this.#toRoom(c, { type: 'talk', id: c.id, on: c.talking });
        break;
      case 'say':
        if (typeof msg.text !== 'string' || !msg.text.trim() || Date.now() - c.lastSay < SAY_GAP) return;
        c.lastSay = Date.now();
        this.#say(c, msg.text.trim().slice(0, 140));
        break;
      case 'ball': {
        const n = [msg.x, msg.z, msg.vx, msg.vz];
        if (!n.every(Number.isFinite) || Math.abs(msg.x) > 120 || Math.abs(msg.z) > 120 || Math.hypot(msg.vx, msg.vz) > 15) return;
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
        if (!to || to === c || (c.call && c.call === to.call)) return;
        const no = this.#cannotCall(c, to);
        if (no) { this.log(`[village] call ${c.name} → ${to.name}: ${no}`); return this.#send(c, { type: 'call-declined', id: msg.to, reason: no }); }
        if (this.#dist(c, to) > CALL_RANGE) return this.#send(c, { type: 'call-declined', id: msg.to, reason: 'far' });
        to.requests.set(c.id, Date.now());
        const others = c.call ? [...c.call].filter((m) => m !== c).map((m) => m.name) : [];
        this.#send(to, { type: 'call-request', from: c.id, name: c.name, ...(to.call ? { join: true } : {}), ...(others.length ? { with: others } : {}) });
        break;
      }
      case 'call-answer': {
        const from = members.get(msg.to);
        const asked = c.requests.get(msg.to);
        c.requests.delete(msg.to);
        if (!from || !asked || Date.now() - asked > REQUEST_TTL) return;
        const no = msg.accept ? this.#cannotCall(from, c) : 'declined';
        if (no) return this.#send(from, { type: 'call-declined', id: c.id, reason: no });
        const group = from.call ?? c.call;
        if (!group) { // a new call of two (as it always was)
          from.call = c.call = new Set([from, c]);
          this.#send(from, { type: 'call-start', with: c.id, initiator: true });
          this.#send(c, { type: 'call-start', with: from.id, initiator: false });
          this.log(`[village] call ${from.name} ↔ ${c.name}`);
          break;
        }
        const newcomer = group === from.call ? c : from, there = [...group];
        group.add(newcomer);
        newcomer.call = group;
        there.forEach((m) => this.#send(m, { type: 'call-join', id: newcomer.id, name: newcomer.name }));
        this.#send(newcomer, { type: 'call-start', with: there[0].id, initiator: true, peers: there.map((m) => m.id) });
        this.log(`[village] call +${newcomer.name} (${[...group].map((m) => m.name).join(', ')})`);
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
      case 'dama-open': case 'dama-sit': case 'dama-move': case 'dama-again': case 'dama-leave': { // dama in the kahvehane (DamaTables)
        const d = this.#damaOf(c.room), n = msg.n, p = { id: c.id, name: c.name };
        const ok = msg.type === 'dama-open' ? d.open(p, n, msg.npc ?? null)
          : msg.type === 'dama-sit' ? d.sit(p, n)
            : msg.type === 'dama-move' ? d.move(c.id, n, msg)
              : msg.type === 'dama-again' ? d.again(c.id, n)
                : d.leave(c.id);
        if (ok) this.#toAll(c.room, d.state()); else this.#send(c, d.state()); // a refused move snaps back
        break;
      }
      case 'jump': // a horse jumps: the others see it too (the arc itself is drawn on every screen)
        this.#toRoom(c, { type: 'jump', id: c.id });
        break;
      case 'score-reset': // someone reset the score board of this place's pitch
        this.#toRoom(c, { type: 'score-reset', id: c.id });
        break;
      case 'goal': // a match in the schoolyard: the scorer's screen tells the others
        if (msg.side === 'a' || msg.side === 'b') this.#toRoom(c, { type: 'goal', id: c.id, side: msg.side });
        break;
      case 'voice': { // my own voice in a call, a talking zone or push-to-talk: kept for safety, never relayed
        const ctx = ['call', 'zone', 'ptt'].includes(msg.ctx) ? msg.ctx : null;
        if (typeof msg.mime !== 'string' || !VOICE_MIME.test(msg.mime) || typeof msg.data !== 'string' || msg.data.length > VOICE_MAX || !BASE64.test(msg.data)) return;
        if (typeof msg.speech === 'number' && msg.speech < SPOKEN) return; // nobody spoke in it: not kept
        const recent = (last) => (last && Date.now() < last.until ? last.with : null); // the last piece arrives just after hanging up / walking out
        const peer = ctx === 'call' ? (c.call ? [...c.call].filter((m) => m !== c).map((m) => m.name).join(', ') : recent(c.lastCall)) : ctx === 'zone' ? c.zone ?? recent(c.lastZone) : ctx === 'ptt' ? 'meydan' : null; // (push-to-talk: said to everyone in the room)
        if (!peer) return;
        this.voiceAudit?.write({ kind: 'voice', room: c.room, name: c.name, pid: c.pid, gid: c.gid, ip: c.ip, ctx, with: peer, mime: msg.mime, audio: msg.data });
        this.reports?.spoke(c, { mime: msg.mime, data: msg.data, ctx });
        break;
      }
      case 'report': {
        const target = members.get(msg.to);
        if (!this.reports) return this.#send(c, { type: 'report-failed', reason: 'off' });
        if (!target) return this.#send(c, { type: 'report-failed', reason: 'gone' });
        const r = this.reports.report(c, target, typeof msg.reason === 'string' ? msg.reason : '');
        this.#send(c, r.ok ? { type: 'report-ok', name: target.name } : { type: 'report-failed', reason: r.reason, ...(r.until ? { until: r.until } : {}) });
        break;
      }
      case 'call-diag': // the client reports how a voice connection went
        if (typeof msg.state === 'string') this.log(`[village] voice ${c.name}: ${msg.state.slice(0, 20)}${typeof msg.detail === 'string' ? ` (${msg.detail.slice(0, 120)})` : ''}`);
        break;
      case 'call-end':
        this.#endCall(c, 'hangup');
        break;
      case 'zone':
        this.#zone(c, ZONES.has(msg.zone) ? msg.zone : null);
        break;
      case 'zone-rtc': {
        const peer = members.get(msg.to);
        if (c.zone && peer && peer !== c && peer.zone === c.zone) this.#send(peer, { type: 'zone-rtc', from: c.id, data: msg.data });
        break;
      }
      case 'rtc': {
        const peer = members.get(msg.to);
        if (!c.call || !peer || peer === c || peer.call !== c.call) return; // signalling only within a call everyone in it agreed to
        this.#send(peer, { type: 'rtc', from: c.id, data: msg.data });
        break;
      }
      default: break;
    }
  }

  /** A username the moderator lets through first (the word list, and the model when there is one); then the join. */
  async #nameThenHello(c, msg) {
    if (c.id || c.helloing) return;
    const clean = String(msg.name ?? '').trim();
    if (NAME.test(clean) && !/^Oyuncu\d+$/i.test(clean)) { // (the made-up names are fine)
      c.helloing = true;
      const v = await this.moderator.checkName(clean);
      c.helloing = false;
      if (!v.ok) return this.#send(c, { type: 'error', code: 'name-bad', message: 'Bu kullanıcı adı kullanılamaz, başka bir ad seç.' });
    }
    this.#hello(c, msg);
  }

  #hello(c, { name, room = 'village', gender, style, pid, gid, outfit, consent, calls }) {
    if (c.id) return;
    if (typeof room !== 'string' || !ROOM.test(room)) return this.#send(c, { type: 'error', message: 'Geçersiz oda.' });
    const clean = String(name ?? '').trim();
    if (!NAME.test(clean)) return this.#send(c, { type: 'error', message: 'Kullanıcı adı 2-16 harf/rakam olmalı.' });
    if (ChatFilter.blocks(clean)) return this.#send(c, { type: 'error', message: 'Bu kullanıcı adı kullanılamaz.' });
    const members = this.#room(room);
    // the same device again (its old connection not closed yet, e.g. a phone that lost its signal):
    // the new connection takes over — same name, so the chess seat is found again
    if (typeof gid === 'string' && /^[A-Za-z0-9_.:-]{4,64}$/.test(gid)) c.gid = gid; // Play Games player id (safety log)
    if (typeof pid === 'string' && /^[a-z0-9]{8,40}$/.test(pid)) {
      c.pid = pid;
      for (const old of members.values()) if (old.pid === pid) { this.#leave(old); old.id = null; old.ws.terminate(); }
    }
    // banned after a report: not told — the game just plays offline (on the phone, no server)
    if (this.reports?.banned({ pid: c.pid, gid: c.gid, name: clean })) { this.#send(c, { type: 'error', code: 'offline', message: '' }); c.ws.close(1000); return; }
    if (this.names?.claim(clean, c.pid) === 'taken') return this.#send(c, { type: 'error', code: 'name-taken', message: 'Bu kullanıcı adı alınmış, başka bir ad seç.' }); // (unique names: NameRegistry)
    if (members.size >= MAX_PER_ROOM) return this.#send(c, { type: 'error', message: 'Meydan dolu, biraz sonra tekrar dene.' });
    const taken = new Set([...members.values()].map((m) => m.name.toLocaleLowerCase('tr')));
    let unique = clean, n = 2;
    while (taken.has(unique.toLocaleLowerCase('tr'))) unique = `${clean}${n++}`;
    Object.assign(c, { id: `p${++this.#seq}`, name: unique, room, calls: Number.isInteger(calls) ? calls : 1, look: { shirt: SHIRTS[this.#seq % SHIRTS.length], ...lookOf(gender, style), ...outfitOf(outfit) } });
    this.#send(c, { type: 'welcome', id: c.id, name: c.name, look: c.look, peers: [...members.values()].map((m) => this.#public(m)), ...this.#ballsFor(room), chess: this.#table(room).state(), dama: this.#damaOf(room).state(), ice: this.iceFor(c.id) });
    this.#toRoom(c, { type: 'join', peer: this.#public(c) });
    members.set(c.id, c);
    if (this.#table(room).rejoin(c)) this.#toAll(room, this.#table(room).state()); // back at the board after a dropped connection
    this.log(`[village] ${c.name} joined ${room} (${members.size})`);
    // the proof that this player agreed to the recording (ConsentDialog): once per device and agreement
    if (Number.isInteger(consent?.v) && Number.isFinite(consent?.at)) {
      const k = `${c.pid ?? c.name}:${consent.v}:${consent.at}`;
      if (!this.#consents.has(k)) {
        this.#consents.add(k);
        if (this.#consents.size > 50000) this.#consents.clear();
        this.audit?.write({ kind: 'consent', room, name: c.name, pid: c.pid, gid: c.gid, ip: c.ip, v: consent.v, at: new Date(consent.at).toISOString() });
      }
    }
  }

  /**
   * A public bubble goes to the room only once the moderator lets it through. A held-back one
   * is logged and the speaker is told why (never the others); three in ten minutes and the
   * speaker's bubbles are not taken for five minutes.
   */
  async #say(c, text) {
    const now = Date.now();
    const who = { kind: 'say', room: c.room, name: c.name, pid: c.pid, gid: c.gid, ip: c.ip, text };
    this.reports?.said(c, text); // (held back or not: a report sees it)
    if (c.mutedUntil > now) { this.audit?.write({ ...who, shown: false, flag: 'muted' }); return this.#send(c, { type: 'say-blocked', reason: 'muted', until: c.mutedUntil }); }
    const v = await this.moderator.check(text);
    this.audit?.write({ ...who, shown: !!v.ok && !!c.id, ...(v.ok ? {} : { flag: v.reason }) }); // the safety log (AuditLog.js)
    if (!c.id) return; // left meanwhile
    if (v.ok) { this.#toRoom(c, { type: 'say', id: c.id, text }); return; }
    c.strikes = (c.strikes ?? []).filter((t) => now - t < STRIKE_WINDOW).concat(now);
    if (c.strikes.length >= STRIKES) { c.mutedUntil = now + MUTE; c.strikes = []; }
    this.moderator.record({ room: c.room, name: c.name, id: c.id, text, reason: v.reason, by: v.by, muted: c.mutedUntil > now });
    this.#send(c, { type: 'say-blocked', reason: v.reason, ...(c.mutedUntil > now ? { until: c.mutedUntil } : {}) });
  }

  /** Into a talking zone (or out: null). The newcomer gets who is there and calls each of them. */
  #zone(c, zone) {
    if (c.zone === zone) return;
    const members = [...this.#room(c.room).values()];
    if (c.zone) members.forEach((m) => { if (m !== c && m.zone === c.zone) this.#send(m, { type: 'zone-leave', id: c.id }); });
    if (c.zone) c.lastZone = { with: c.zone, until: Date.now() + LAST_PIECE };
    c.zone = null;
    if (!zone) return;
    const there = members.filter((m) => m !== c && m.zone === zone);
    if (there.length >= MAX_ZONE) return this.#send(c, { type: 'zone-full', zone });
    c.zone = zone;
    this.#send(c, { type: 'zone-peers', zone, ids: there.map((m) => m.id) });
    there.forEach((m) => this.#send(m, { type: 'zone-join', id: c.id }));
  }

  /** Why `a` can't ask `b` (or take b's answer) — null when they can: one of them may be in a call of games that take more than two. */
  #cannotCall(a, b) {
    if (a.call && b.call) return 'busy'; // (in two different calls)
    const group = a.call ?? b.call;
    if (!group) return null;
    if (![a, b, ...group].every((m) => m.calls >= 2)) return 'busy'; // an older game in it: one-to-one only
    return group.size >= MAX_CALL ? 'full' : null;
  }

  /** `c` leaves its call; the others go on talking — the last one left alone is told the call is over. */
  #endCall(c, reason) {
    const group = c.call;
    if (!group) return;
    group.delete(c);
    c.call = null;
    const until = Date.now() + LAST_PIECE, others = [...group];
    c.lastCall = { with: others.map((m) => m.name).join(', '), until };
    this.#send(c, { type: 'call-end', with: others[0]?.id, reason });
    if (others.length === 1) {
      const [last] = others;
      group.delete(last);
      last.call = null;
      last.lastCall = { with: c.name, until };
      this.#send(last, { type: 'call-end', with: c.id, reason });
    } else others.forEach((m) => this.#send(m, { type: 'call-leave', id: c.id, reason }));
    this.log(`[village] call -${c.name} (${reason})`);
  }

  #leave(c) {
    if (!c.id) return;
    this.turn?.release?.(c.id);
    const table = this.#chess.get(c.room);
    if (table?.disconnect(c.id, c.name)) this.#toAll(c.room, table.state(), c);
    const dama = this.#dama.get(c.room);
    if (dama?.leave(c.id)) this.#toAll(c.room, dama.state(), c);
    this.#endCall(c, 'left');
    this.#zone(c, null);
    const members = this.#room(c.room);
    if (!members.delete(c.id)) return;
    this.#toRoom(c, { type: 'leave', id: c.id });
    this.log(`[village] ${c.name} left ${c.room} (${members.size})`);
  }

  /**
   * A ban decided after a report: whoever it names loses the connection now, as if the network
   * dropped; when the game tries again it is told to stay offline (#hello).
   */
  kick(ban) {
    for (const members of this.#rooms.values()) {
      for (const c of [...members.values()]) {
        const named = (ban.pid && c.pid === ban.pid) || (ban.gid && c.gid === ban.gid) || ban.name === c.name.toLocaleLowerCase('tr');
        if (!named) continue;
        this.#leave(c);
        c.ws.terminate();
      }
    }
  }

  #dropFarCalls() {
    for (const members of this.#rooms.values()) {
      for (const c of members.values()) {
        const others = c.call ? [...c.call].filter((m) => m !== c) : [];
        if (others.length && others.every((p) => this.#dist(c, p) > CALL_DROP)) this.#endCall(c, 'far');
      }
    }
  }

  /**
   * Moves, in one message per player and tick (100 ms), each only to whom it matters how often: someone
   * within NEAR metres every tick, within MID every MID_EVERY ticks, farther every FAR_EVERY — the far
   * end of the square hardly moves on a phone's screen, and its data was most of what a phone took in.
   * Nobody gets their own moves back. A change since the last time its distance came round is never lost.
   */
  #broadcastStates() {
    const tick = ++this.#ticks, midTick = tick % MID_EVERY === 0, farTick = tick % FAR_EVERY === 0;
    const state = ({ id, x, z, rot, moving, sit, ride }) => ({ id, x, z, rot, moving, sit, ...(ride ? { ride } : {}) });
    for (const members of this.#rooms.values()) {
      const all = [...members.values()];
      if (!all.some((m) => m.dirty || (midTick && m.midDirty) || (farTick && m.farDirty))) continue;
      for (const to of all) {
        if (to.ws.readyState !== 1) continue;
        const players = all.filter((m) => {
          if (m === to) return false;
          const d = this.#dist(m, to);
          return (m.dirty && d <= NEAR) || (midTick && m.midDirty && d <= MID) || (farTick && m.farDirty);
        }).map(state);
        if (players.length) to.ws.send(JSON.stringify({ type: 'states', players }));
      }
      all.forEach((m) => { m.dirty = false; if (midTick) m.midDirty = false; if (farTick) m.farDirty = false; });
    }
  }

  #dist(a, b) { return Math.hypot(a.x - b.x, a.z - b.z); }
  #public({ id, name, look, x, z, rot, talking, sit, ride }) { return { id, name, look, x, z, rot, talking, sit, ...(ride ? { ride } : {}) }; }
  #table(room) {
    if (!this.#chess.has(room)) this.#chess.set(room, new ChessTable({ scores: this.chessScores, onScore: this.onChessScore }));
    return this.#chess.get(room);
  }
  #damaOf(room) { if (!this.#dama.has(room)) this.#dama.set(room, new DamaTables()); return this.#dama.get(room); }
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
    clearInterval(this.pruner);
    this.wss.clients.forEach((ws) => ws.close(1001, 'Server shutting down'));
    this.wss.close();
  }
}
