import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { PlayStats } from '../src/PlayStats.js';

const batch = (o = {}) => ({ pid: 'abcdefgh1234', v: '1.0.36', plat: 'app', lang: 'ar', ch: 2, chId: 'd1-afternoon', opens: 1, sec: 60, counts: { chat: 3, 'talk:anne': 2 }, ...o });

test('counts devices, play time, furthest chapter and what was done', () => {
  const s = new PlayStats();
  assert.ok(s.record(batch()));
  assert.ok(s.record(batch({ opens: 0, ch: 5, chId: 'd2-x', counts: { chat: 1 } })));
  assert.ok(s.record(batch({ pid: 'zzzzzzzz9999', plat: 'web', ch: 0, chId: 'd1-morning', counts: { 'talk:anne': 1 } })));
  const r = s.summary();
  assert.equal(r.total.devices, 2);
  assert.equal(r.total.app, 1); assert.equal(r.total.web, 1);
  assert.equal(r.total.spoke, 2);
  assert.equal(r.days[0].active, 2);
  assert.equal(r.days[0].counts.chat, 4);
  assert.equal(r.top['talk:anne'], 3);
  assert.deepEqual(r.reach.map((x) => x.devices), [2, 1, 1, 1, 1, 1]); // everyone reached chapter 0; one got to 5
});

test('refuses junk: bad ids, odd counter names, too many batches', () => {
  const s = new PlayStats();
  assert.equal(s.record({ pid: 'x' }), false);
  assert.equal(s.record(null), false);
  assert.ok(s.record(batch({ counts: { 'Bad Key': 5, ok: 2, big: 99999, neg: -1, 'a/b': 1 } })));
  assert.deepEqual(Object.keys(s.summary().top), ['ok']);
  const t = new PlayStats();
  let ok = 0; for (let i = 0; i < 40; i++) ok += t.record(batch(), '1.2.3.4') ? 1 : 0;
  assert.equal(ok, 20);
});

test('keeps its numbers across a restart', () => {
  const dir = mkdtempSync(join(tmpdir(), 'play-'));
  try {
    const a = new PlayStats({ dir });
    a.record(batch());
    a.flush();
    const b = new PlayStats({ dir });
    const r = b.summary();
    assert.equal(r.total.devices, 1); assert.equal(r.top.chat, 3); assert.equal(r.reach.length, 3);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test('the page needs the key', async () => {
  const s = new PlayStats({ key: 'sirr' });
  s.record(batch());
  const run = (url) => new Promise((resolve) => { const out = { code: 0, body: '' }; s.route({ url, method: 'GET', headers: {} }, { writeHead: (c) => { out.code = c; }, end: (b) => resolve({ ...out, body: String(b ?? '') }) }); });
  assert.equal((await run('/api/stats')).code, 403);
  assert.equal((await run('/api/stats?key=yanlis')).code, 403);
  const page = await run('/api/stats?key=sirr');
  assert.equal(page.code, 200); assert.match(page.body, /Oyun istatistikleri/); assert.match(page.body, /d1-afternoon/);
  assert.equal(JSON.parse((await run('/api/stats?key=sirr&format=json')).body).total.devices, 1);
});
