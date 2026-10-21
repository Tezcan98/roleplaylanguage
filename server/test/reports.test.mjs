import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Reports, KEEP } from '../src/Reports.js';
import { Mailer } from '../src/Mailer.js';

const A = { name: 'Ali', pid: 'aaaaaaaa1', ip: '1.1.1.1', room: 'ankara' };
const B = { name: 'Veli', pid: 'bbbbbbbb2', gid: 'g-123456', ip: '2.2.2.2', room: 'ankara' };
const gemini = (answer, seen = []) => async (url, o) => { seen.push(JSON.parse(o.body)); return { ok: true, status: 200, json: async () => ({ candidates: [{ content: { parts: [{ text: JSON.stringify(answer) }] } }] }) }; };
const mailbox = () => { const sent = []; return { sent, send: async (m) => { sent.push(m); return true; } }; };

test('a report sends the reported player\'s last ten minutes (text and voice) to Gemini', async () => {
  let now = 1_000_000;
  const seen = [], mailer = mailbox();
  const r = new Reports({ apiKey: 'k', fetchImpl: gemini({ transcript: 'bana numaranı ver', verdict: 'ahlaksiz', reason: 'kişisel bilgi istiyor' }, seen), mailer, key: 'secret', publicUrl: 'https://x.org', log: () => {}, now: () => now });
  r.said(B, 'eski mesaj');
  now += KEEP + 1; // more than ten minutes ago: gone
  r.said(B, 'merhaba');
  r.spoke(B, { mime: 'audio/webm;codecs=opus', data: 'AAAA', ctx: 'call' });
  r.said(A, 'Ali’nin sözü'); // not the reported one
  const res = r.report(A, B, 'ahlaksiz');
  assert.equal(res.ok, true);
  await r.done;
  const parts = seen[0].contents[0].parts;
  assert.match(parts[0].text, /merhaba/);
  assert.doesNotMatch(parts[0].text, /eski mesaj|Ali’nin/);
  assert.deepEqual(parts[1], { inlineData: { mimeType: 'audio/webm', data: 'AAAA' } });
  const item = r.items.at(-1);
  assert.equal(item.verdict, 'ahlaksiz');
  assert.equal(item.transcript, 'bana numaranı ver');
  assert.equal(mailer.sent.length, 1, 'the operator is asked');
  assert.match(mailer.sent[0].text, /do=ban7/);
  assert.equal(r.banned(B), null, 'nobody is banned before the operator decides');
});

test('clean: kept, no mail; nothing said: no Gemini call', async () => {
  const mailer = mailbox(), seen = [];
  const r = new Reports({ apiKey: 'k', fetchImpl: gemini({ transcript: '', verdict: 'temiz', reason: 'sorun yok' }, seen), mailer, log: () => {} });
  r.said(B, 'merhaba');
  r.report(A, B);
  await r.done;
  assert.equal(r.items.at(-1).verdict, 'temiz');
  r.report(A, { name: 'Sessiz', pid: 'cccccccc3', room: 'ankara' });
  await r.done;
  assert.equal(r.items.at(-1).status, 'empty');
  assert.equal(seen.length, 1);
  assert.equal(mailer.sent.length, 0);
});

test('Gemini down: the operator is asked to look', async () => {
  const mailer = mailbox();
  const r = new Reports({ apiKey: 'k', fetchImpl: async () => ({ ok: false, status: 500 }), mailer, log: () => {} });
  r.said(B, 'satılık hesap');
  r.report(A, B);
  await r.done;
  assert.equal(r.items.at(-1).status, 'unchecked');
  assert.equal(mailer.sent.length, 1);
});

test('limits: not yourself, the same player once per half hour, three in ten minutes', () => {
  const r = new Reports({ log: () => {} });
  assert.equal(r.report(A, { ...A, name: 'Ali' }).reason, 'self');
  assert.equal(r.report(A, B).ok, true);
  assert.equal(r.report(A, B).reason, 'again');
  assert.equal(r.report(A, { name: 'X1', room: 'r' }).ok, true);
  assert.equal(r.report(A, { name: 'X2', room: 'r' }).ok, true);
  assert.equal(r.report(A, { name: 'X3', room: 'r' }).reason, 'limit');
});

test('the operator bans from the link; the ban is kept across a restart and runs out', async () => {
  let now = 5_000_000;
  const dir = mkdtempSync(join(tmpdir(), 'reports-'));
  const kicked = [];
  const r = new Reports({ dir, key: 'secret', onBan: (b) => kicked.push(b), log: () => {}, now: () => now });
  const { id } = r.report(A, B, 'ticari');
  await r.done;
  assert.equal(r.decide(id, 'nope'), null);
  assert.match(r.decide(id, 'ban7'), /7 gün/);
  assert.equal(kicked.length, 1);
  const again = new Reports({ dir, log: () => {}, now: () => now });
  assert.ok(again.banned({ pid: B.pid }), 'by device');
  assert.ok(again.banned({ gid: B.gid }), 'by Play Games id');
  assert.ok(again.banned({ name: 'VELİ' }), 'by name (any case)');
  assert.equal(again.banned(A), null);
  now += 7 * 86_400_000 + 1;
  assert.equal(again.banned({ pid: B.pid }), null, 'seven days later');
  assert.equal(again.items.find((x) => x.id === id).status, 'banned-7d');
});

test('the pages need the key', () => {
  const r = new Reports({ key: 'secret', log: () => {} });
  const call = (url) => { const out = {}; r.route({ url }, { writeHead: (s) => { out.status = s; }, end: (b) => { out.body = b; } }); return out; };
  assert.equal(call('/api/reports?key=wrong').status, 403);
  assert.equal(call('/api/reports?key=secret').status, 200);
  assert.equal(call('/api/report-action?id=none&key=secret&do=ban').status, 404);
});

test('Mailer: logs only until it is configured; posts to the mail API', async () => {
  const logs = [];
  assert.equal(await new Mailer({ log: (m) => logs.push(m) }).send({ subject: 's', text: 't' }), false);
  assert.match(logs[0], /not configured/);
  const calls = [];
  const m = new Mailer({ url: 'https://mail.example/send', key: 'k', to: 'op@example.org', fetchImpl: async (u, o) => { calls.push([u, o]); return { ok: true }; } });
  assert.equal(await m.send({ subject: 's', text: 't' }), true);
  assert.equal(calls[0][1].headers.Authorization, 'Bearer k');
  assert.deepEqual(JSON.parse(calls[0][1].body), { to: 'op@example.org', subject: 's', text: 't' });
});

test('five clean reports: three days without reporting', async () => {
  let now = 10_000_000;
  const dir = mkdtempSync(join(tmpdir(), 'reports-'));
  const r = new Reports({ dir, apiKey: 'k', fetchImpl: gemini({ transcript: '', verdict: 'temiz', reason: 'yok' }), log: () => {}, now: () => now });
  for (let i = 0; i < 5; i++) {
    const t = { name: `Hedef${i}`, pid: `hedef0000${i}`, room: 'r' };
    r.said(t, 'merhaba');
    assert.equal(r.report(A, t).ok, true);
    await r.done;
    now += 11 * 60_000; // past the ten-minute limit
  }
  const res = r.report(A, B);
  assert.equal(res.reason, 'paused');
  assert.ok(res.until > now);
  assert.equal(new Reports({ dir, log: () => {}, now: () => now }).report(A, B).reason, 'paused', 'kept across a restart');
  now += 3 * 86_400_000 + 1;
  assert.equal(r.report(A, B).ok, true, 'three days later');
});

test('clean, but three players reported the same one today: the operator gets the voice anyway', async () => {
  let now = 20_000_000;
  const mailer = mailbox();
  const r = new Reports({ apiKey: 'k', fetchImpl: gemini({ transcript: 'selam', verdict: 'temiz', reason: 'yok' }), mailer, log: () => {}, now: () => now });
  r.spoke(B, { mime: 'audio/webm;codecs=opus', data: 'AAAA', ctx: 'zone' });
  const reporters = ['r1aaaaaaa', 'r2aaaaaaa', 'r3aaaaaaa', 'r4aaaaaaa'].map((pid, i) => ({ name: `R${i}`, pid, room: 'r' }));
  for (const [i, rep] of reporters.slice(0, 3).entries()) {
    r.report(rep, B);
    await r.done;
    assert.equal(mailer.sent.length, i < 2 ? 0 : 1);
    now += 60_000;
  }
  assert.match(mailer.sent[0].subject, /3 KİŞİ/);
  assert.deepEqual(mailer.sent[0].attachments.map((a) => [a.contentType, a.content]), [['audio/webm', 'AAAA']]);
  r.report(reporters[3], B); // a fourth the same day: no second mail
  await r.done;
  assert.equal(mailer.sent.length, 1);
});
