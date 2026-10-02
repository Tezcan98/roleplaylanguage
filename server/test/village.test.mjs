/**
 * Village server protocol tests with real WebSocket clients (no browser). Run: npm test -w server
 */
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import WebSocket from 'ws';
import { createHmac } from 'node:crypto';
import { VillageServer } from '../src/VillageServer.js';
import { ChatFilter } from '../src/ChatFilter.js';
import { originAllowed, parseOrigins } from '../src/origins.js';

let http, village, url;
const TURN = { secret: 'test-secret', urls: ['turn:example.org:3478?transport=udp'] };
const ORIGINS = parseOrigins('https://tezcan98.github.io,http://localhost:*');

before(async () => {
  http = createServer();
  village = new VillageServer({ server: http, log: () => {}, allowOrigin: (o) => originAllowed(o, ORIGINS), maxPerIp: 6, turn: TURN });
  await new Promise((r) => http.listen(0, '127.0.0.1', r));
  url = `ws://127.0.0.1:${http.address().port}/ws/village`;
});
after(() => { village.close(); http.close(); });

/** A connected client that records every message it gets. */
function client({ origin = 'https://tezcan98.github.io' } = {}) {
  const ws = new WebSocket(url, { origin });
  const inbox = [];
  ws.on('message', (d) => inbox.push(JSON.parse(d)));
  const c = {
    ws, inbox,
    open: () => new Promise((res, rej) => { ws.once('open', res); ws.once('error', rej); ws.once('unexpected-response', (_, r) => rej(new Error(`HTTP ${r.statusCode}`))); }),
    send: (m) => ws.send(JSON.stringify(m)),
    next: (type, ms = 2000) => new Promise((res, rej) => {
      const t0 = Date.now();
      const tick = () => {
        const i = inbox.findIndex((m) => m.type === type);
        if (i >= 0) return res(inbox.splice(i, 1)[0]);
        if (Date.now() - t0 > ms) return rej(new Error(`no "${type}" within ${ms} ms; got ${JSON.stringify(inbox)}`));
        setTimeout(tick, 10);
      };
      tick();
    }),
    close: () => new Promise((r) => { if (ws.readyState === WebSocket.CLOSED) return r(); ws.once('close', r); ws.close(); }),
  };
  return c;
}
async function join(name, room = 'test') {
  const c = client();
  await c.open();
  c.send({ type: 'hello', name, room });
  c.welcome = await c.next('welcome');
  return c;
}
const silence = (ms = 150) => new Promise((r) => setTimeout(r, ms));

test('chat filter: whole words, digit tricks, normal words untouched', () => {
  assert.equal(ChatFilter.blocks('siktir'), true);
  assert.equal(ChatFilter.blocks('S1kt1r git'), true);
  assert.equal(ChatFilter.clean('merhaba amk nasılsın'), 'merhaba *** nasılsın');
  assert.equal(ChatFilter.blocks('sikke ampul salak köpek كلب'), false);
});

test('origins: GitHub Pages and localhost allowed, other sites refused', () => {
  assert.equal(originAllowed('https://tezcan98.github.io', ORIGINS), true);
  assert.equal(originAllowed('http://localhost:8080', ORIGINS), true);
  assert.equal(originAllowed('https://evil.example', ORIGINS), false);
  assert.equal(originAllowed('https://tezcan98.github.io.evil.example', ORIGINS), false);
  assert.equal(originAllowed(undefined, ORIGINS), true); // non-browser client
});

test('a foreign website cannot connect', async () => {
  await assert.rejects(client({ origin: 'https://evil.example' }).open(), /403/);
});

test('join: welcome, unique names, peers see each other', async () => {
  const a = await join('Ayşe');
  const b = await join('ayşe');
  assert.equal(a.welcome.name, 'Ayşe');
  assert.equal(b.welcome.name, 'ayşe2');
  assert.deepEqual(b.welcome.peers.map((p) => p.name), ['Ayşe']);
  assert.equal((await a.next('join')).peer.name, 'ayşe2');
  assert.equal(village.stats().rooms.test, 2);
  await b.close();
  assert.equal((await a.next('leave')).id, b.welcome.id);
  await a.close();
});

test('bad usernames and rooms are refused', async () => {
  for (const [hello, re] of [[{ name: 'x' }, /2-16/], [{ name: 'orospu' }, /kullanılamaz/], [{ name: 'Ali', room: '../../etc' }, /oda/]]) {
    const c = client();
    await c.open();
    c.send({ type: 'hello', room: 'test', ...hello });
    assert.match((await c.next('error')).message, re);
    await c.close();
  }
});

test('positions are broadcast; public speech is filtered and rate-limited', async () => {
  const a = await join('Ali', 'say');
  const b = await join('Veli', 'say');
  a.send({ type: 'state', x: 1, z: 2, rot: 0, moving: true });
  const s = await b.next('states');
  assert.deepEqual(s.players[0], { id: a.welcome.id, x: 1, z: 2, rot: 0, moving: true, sit: false });
  a.send({ type: 'state', x: 1, z: 2, rot: 0, moving: false, sit: true }); // sat down at a tea table
  assert.equal((await b.next('states')).players[0].sit, true);
  a.send({ type: 'say', text: '  Merhaba amk  ' });
  a.send({ type: 'say', text: 'too soon' });
  assert.equal((await b.next('say')).text, 'Merhaba ***');
  await silence();
  assert.equal(b.inbox.filter((m) => m.type === 'say').length, 0, 'second bubble within the gap is dropped');
  await a.close(); await b.close();
});

test('voice: request needs consent, signalling only between partners, only a huge distance ends the call', async () => {
  const a = await join('Can', 'call');
  const b = await join('Zehra', 'call');
  const c = await join('Mert', 'call');
  for (const p of [a, b, c]) p.send({ type: 'state', x: 0, z: 0, rot: 0, moving: false });
  await silence();

  // rtc before a call is never relayed
  a.send({ type: 'rtc', to: b.welcome.id, data: { sdp: 'x' } });
  await silence();
  assert.equal(b.inbox.some((m) => m.type === 'rtc'), false);

  a.send({ type: 'call-request', to: b.welcome.id });
  assert.equal((await b.next('call-request')).name, 'Can');
  b.send({ type: 'call-answer', to: a.welcome.id, accept: true });
  assert.equal((await a.next('call-start')).initiator, true);
  assert.equal((await b.next('call-start')).initiator, false);

  a.send({ type: 'rtc', to: b.welcome.id, data: { sdp: 'offer' } });
  assert.deepEqual((await b.next('rtc')).data, { sdp: 'offer' });
  c.send({ type: 'rtc', to: b.welcome.id, data: { sdp: 'intruder' } });
  c.send({ type: 'call-request', to: b.welcome.id });
  assert.equal((await c.next('call-declined')).reason, 'busy');
  await silence();
  assert.equal(b.inbox.some((m) => m.type === 'rtc'), false, 'a third player cannot inject signalling');

  a.send({ type: 'state', x: 30, z: 0, rot: 0, moving: true }); // across the square: the call goes on
  await silence();
  assert.equal(a.inbox.some((m) => m.type === 'call-end'), false, 'walking across the square keeps the call');
  a.send({ type: 'state', x: 250, z: 0, rot: 0, moving: true });
  assert.equal((await a.next('call-end', 3000)).reason, 'far');
  assert.equal((await b.next('call-end')).reason, 'far');

  // declining, and answering a request that was never made
  c.send({ type: 'call-answer', to: b.welcome.id, accept: true });
  b.send({ type: 'state', x: 1, z: 0, rot: 0, moving: false });
  await silence();
  b.send({ type: 'call-request', to: c.welcome.id });
  await c.next('call-request');
  c.send({ type: 'call-answer', to: b.welcome.id, accept: false });
  assert.equal((await b.next('call-declined')).reason, 'declined');
  await Promise.all([a, b, c].map((p) => p.close()));
});

test('too far away to ask', async () => {
  const a = await join('Uzak', 'far');
  const b = await join('Yakın', 'far');
  a.send({ type: 'state', x: 20, z: 0, rot: 0, moving: false });
  await silence();
  a.send({ type: 'call-request', to: b.welcome.id });
  assert.equal((await a.next('call-declined')).reason, 'far');
  await a.close(); await b.close();
});

test('flooding: excess messages dropped, a heavy flood is disconnected', async () => {
  const a = await join('Hızlı', 'flood');
  const closed = new Promise((r) => a.ws.once('close', (code) => r(code)));
  for (let i = 0; i < 400; i++) a.send({ type: 'talk', on: i % 2 === 0 });
  assert.equal(await closed, 1008);
});

test('per-IP connection limit', async () => {
  const cs = Array.from({ length: 6 }, () => client());
  await Promise.all(cs.map((c) => c.open()));
  await assert.rejects(client().open(), /429/);
  await Promise.all(cs.map((c) => c.close()));
  await silence();
  const again = client();
  await again.open();
  await again.close();
});

test('shared ball: kicks are relayed, newcomers get where it stopped; nonsense is ignored', async () => {
  const a = await join('Topçu', 'ball');
  const b = await join('Kaleci', 'ball');
  a.send({ type: 'ball', x: 1, z: 2, vx: 5, vz: 0 });
  assert.deepEqual(await b.next('ball'), { type: 'ball', id: a.welcome.id, n: 0, x: 1, z: 2, vx: 5, vz: 0 });
  a.send({ type: 'ball', x: 4, z: 2, vx: 0, vz: 0 }); // came to rest
  await b.next('ball');
  a.send({ type: 'ball', x: 1e9, z: 0, vx: 0, vz: 0 });
  a.send({ type: 'ball', x: 0, z: 0, vx: 99, vz: 0 });
  a.send({ type: 'ball', n: 9, x: 0, z: 0, vx: 0, vz: 0 });
  await silence();
  assert.equal(b.inbox.some((m) => m.type === 'ball'), false);
  const c = await join('Yeni', 'ball');
  assert.deepEqual(c.welcome.ball, { x: 4, z: 2, vx: 0, vz: 0 });
  // a second ball in the same room is kept apart
  a.send({ type: 'ball', n: 1, x: 7, z: 3, vx: 2, vz: 0 });
  assert.deepEqual(await b.next('ball'), { type: 'ball', id: a.welcome.id, n: 1, x: 7, z: 3, vx: 2, vz: 0 });
  const d = await join('Dördüncü', 'ball');
  assert.deepEqual(d.welcome.balls, [{ x: 4, z: 2, vx: 0, vz: 0 }, { x: 7, z: 3, vx: 0, vz: 0 }]);
  await Promise.all([a, b, c].map((p) => p.close()));
});

test('gender travels in the look (anything else counts as boy)', async () => {
  const a = client(); await a.open();
  a.send({ type: 'hello', name: 'Meryem', room: 'look', gender: 'girl' });
  assert.equal((await a.next('welcome')).look.gender, 'girl');
  const b = client(); await b.open();
  b.send({ type: 'hello', name: 'Ali', room: 'look', gender: '<script>' });
  const w = await b.next('welcome');
  assert.equal(w.look.gender, 'boy');
  assert.equal(w.look.style, 'modest');
  assert.equal(w.peers[0].look.gender, 'girl');
  assert.equal(w.peers[0].look.style, 'covered');
  await a.close(); await b.close();
});

test('welcome hands out STUN + a TURN credential that coturn accepts (HMAC of the username)', async () => {
  const a = await join('Sesli', 'ice');
  const turn = a.welcome.ice.find((s) => String(s.urls).includes('turn:'));
  assert.ok(a.welcome.ice.some((s) => String(s.urls).startsWith('stun:')));
  const [expiry, id] = turn.username.split(':');
  assert.equal(id, a.welcome.id);
  assert.ok(Number(expiry) > Date.now() / 1000 + 3600, 'valid for hours');
  assert.equal(turn.credential, createHmac('sha1', TURN.secret).update(turn.username).digest('base64'));
  await a.close();
});

test('TURN relay refuses private, loopback and link-local peers', async () => {
  const { blockedPeer } = await import('../src/TurnRelay.js');
  for (const ip of ['127.0.0.1', '127.0.0.53', '10.1.2.3', '192.168.1.5', '172.20.0.1', '169.254.1.1', '100.64.0.1', '0.0.0.0', '::1', 'fe80::1']) assert.equal(blockedPeer(ip), true, ip);
  for (const ip of ['31.58.245.116', '8.8.8.8', '178.240.232.77', '172.32.0.1']) assert.equal(blockedPeer(ip), false, ip);
});

test('giant chess: İsmail Dede seats who asks for a colour, the game starts with both, only the side to move may move', async () => {
  const w = await join('Beyaz', 'chess');
  const b = await join('Siyah', 'chess');
  const v = await join('İzleyen', 'chess');
  assert.equal(v.welcome.chess.fen.split(' ')[0], 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR');
  w.send({ type: 'chess-ask', color: 'w' });
  let s = await v.next('chess');
  assert.deepEqual([s.phase, s.seats.w.name, s.seats.b], ['waiting', 'Beyaz', null]);
  v.send({ type: 'chess-move', from: 'e2', to: 'e4' }); // a watcher can't move
  assert.equal((await v.next('chess')).last, null);
  b.send({ type: 'chess-ask', color: 'b' }); // black arrives: the game starts
  s = await v.next('chess');
  assert.deepEqual([s.phase, s.seats.b.name, s.running], ['playing', 'Siyah', 'w']);
  b.send({ type: 'chess-move', from: 'e7', to: 'e5' }); // not black's turn
  assert.equal((await b.next('chess')).turn, 'w');
  w.send({ type: 'chess-move', from: 'e2', to: 'e5' }); // illegal
  assert.equal((await w.next('chess')).last, null);
  w.send({ type: 'chess-move', from: 'e2', to: 'e4' });
  s = await v.next('chess');
  assert.deepEqual([s.last.from, s.last.to, s.turn], ['e2', 'e4', 'b']);
  v.send({ type: 'chess-ask', color: 'w' }); // during a game: in line for the next one
  assert.deepEqual((await v.next('chess')).queue.map((q) => q.name), ['İzleyen']);
  b.send({ type: 'chess-resign' });
  s = await v.next('chess');
  assert.deepEqual([s.phase, s.result.winner, s.result.reason], ['over', 'w', 'resign']);
  assert.ok(s.scores.some((r) => r.name === 'Beyaz' && r.games === 1 && r.wins === 1));
  await w.close(); await b.close(); await v.close();
});

test('giant chess: walking off or dropping out keeps the seat for a while (same name comes back to it)', async () => {
  const w = await join('Ayten', 'chess2');
  const b = await join('Burak', 'chess2');
  w.send({ type: 'chess-ask', color: 'w' }); await b.next('chess');
  b.send({ type: 'chess-ask', color: 'b' }); await b.next('chess');
  b.inbox.length = 0;
  await w.close();
  let s = await b.next('chess');
  assert.deepEqual([s.phase, s.seats.w.name, s.seats.w.gone], ['playing', 'Ayten', true]);
  const back = await join('Ayten', 'chess2');
  s = await back.next('chess');
  assert.equal(s.seats.w.id, back.welcome.id);
  back.send({ type: 'chess-move', from: 'd2', to: 'd4' });
  for (let i = 0; i < 5 && s.last?.to !== 'd4'; i++) s = await b.next('chess'); // the rejoin broadcast may come first
  assert.equal(s.last.to, 'd4');
  await back.close(); await b.close();
});
