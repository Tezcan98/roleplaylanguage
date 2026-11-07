import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { recordAge, ageSummary, ageBody } from '../src/AgeStats.js';
import { PlayStats } from '../src/PlayStats.js';
import { AgeAnalysis } from '../../web/src/services/AgeAnalysis.js';
const t = Date.parse('2026-11-07T12:00:00Z');
const sample = (extra = {}) => ({ band: '25-34', v: 1, at: t - 1000, sec: 60, counts: { quest: 1, 'q:test': 1, 'textbook:solved': 1, chat: 200 }, ...extra });

test('age analysis rejects minors, exact ages, missing consent and invalid versions', () => {
  for (const extra of [{ band: '13-17' }, { band: '34' }, { v: 2 }, { at: 0 }, { at: t + 999999 }]) {
    const d = {}; recordAge(d, sample(extra), t); assert.equal(d.age, undefined);
  }
});

test('only approved counters are saved; withdrawal deletes all age observations; old clients do not revoke', () => {
  const d = {}; recordAge(d, sample(), t);
  assert.deepEqual(d.age.days['2026-11-07'], { sec: 60, quest: 1, exercise: 1, quests: { 'q:test': 1 } });
  recordAge(d, undefined, t); assert.ok(d.age);
  recordAge(d, null, t); assert.equal(d.age, undefined);
});

test('new age/consent starts a new observation; expired ages are removed after 30 days', () => {
  const d = {}; recordAge(d, sample(), t);
  recordAge(d, sample({ band: '35-44', sec: 10, counts: {} }), t);
  assert.equal(d.age.days['2026-11-07'].sec, 10);
  assert.equal(ageSummary([d], t + 30 * 86400000).total, 0);
  assert.equal(d.age, undefined);
});

test('retention requires a completed next day, reports suppress small behavior samples', () => {
  const ds = Array.from({ length: 10 }, () => { const d = {}; recordAge(d, sample(), t); recordAge(d, sample(), t + 86400000); return d; });
  const partial = ageSummary(ds, t + 86400000).rows[1];
  assert.equal(partial.eligible, 0);
  const r = ageSummary(ds, t + 2 * 86400000).rows[1];
  assert.equal(r.next, 10); assert.equal(r.eligible, 10); assert.equal(r.questPlayers, 10); assert.equal(r.quests.test, 10);
  const small = ageSummary(ds.slice(0, 1), t).rows[1];
  assert.deepEqual(small, { band: '25-34', devices: 1, suppressed: true });
  assert.match(ageBody(ageSummary(ds.slice(0, 1), t)), /Yeterli veri yok/);
});

test('play stats persist age separately, never append it to journals, and erase on withdrawal', () => {
  const dir = mkdtempSync(join(tmpdir(), 'age-stats-'));
  try {
    const s = new PlayStats({ dir }), msg = { pid: 'abcdefgh1234', counts: { quest: 99 }, sec: 999, age: sample({ at: Date.now() }) };
    s.record(msg); s.flush();
    const file = JSON.parse(readFileSync(join(dir, 'devices.json'), 'utf8'));
    assert.equal(Object.values(file)[0].age.days[Object.keys(Object.values(file)[0].age.days)[0]].quest, 1, 'no retroactive use of general counters');
    assert.doesNotMatch(readFileSync(join(dir, `${s.summary().today}.jsonl`), 'utf8'), /25-34|"age"/);
    const reloaded = new PlayStats({ dir }); assert.equal(reloaded.summary().age.total, 1);
    reloaded.record({ ...msg, age: null }); reloaded.flush();
    assert.ok(Object.values(JSON.parse(readFileSync(join(dir, 'devices.json'), 'utf8'))).every((d) => !d.age));
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test('client never attributes pre-consent or withdrawn pending events, including failed requests', () => {
  let choice = null;
  const a = new AgeAnalysis({ get: () => choice });
  a.tick(); a.count('quest', 50); assert.equal(a.take().sample, null);
  choice = { band: '25-34', v: 1, at: t };
  a.tick(); a.count('quest', 1); a.count('chat', 5);
  const first = a.take(); assert.deepEqual(first.sample.counts, { quest: 1 }); assert.equal(first.sample.sec, 1);
  a.retry(first); assert.equal(a.take().sample.sec, 1);
  choice = { v: 1, declined: true };
  a.retry(first); assert.equal(a.take().sample, null);
  choice = { band: '35-44', v: 1, at: t + 1 };
  a.retry(first); assert.equal(a.take().sample.sec, 0);
});

test('withdrawal during an in-flight batch is sent afterwards, even with no new gameplay', async () => {
  const { Stats } = await import('../../web/src/services/Stats.js');
  const originals = { document: globalThis.document, addEventListener: globalThis.addEventListener, setInterval: globalThis.setInterval };
  const values = { deviceId: 'abcdefgh1234', ageAnalysis: { v: 1, band: '25-34', at: t } }, sent = [];
  let finish;
  try {
    globalThis.document = { addEventListener() {} };
    globalThis.addEventListener = () => {};
    globalThis.setInterval = () => 0;
    const stats = new Stats({ settings: { get: (k, fallback) => values[k] ?? fallback, set: (k, v) => { values[k] = v; } }, bus: { on() {} }, chapters: [], modes: {}, lang: () => 'tr', version: () => 'test', post: async (_, body) => { sent.push(body); if (sent.length === 1) return new Promise((resolve) => { finish = resolve; }); return true; } });
    const request = stats.flush();
    values.ageAnalysis = { v: 1, declined: true };
    await stats.ageChanged();
    assert.equal(sent.length, 1);
    finish(true); await request;
    assert.equal(sent.length, 2); assert.equal(sent[1].age, null);
  } finally {
    for (const [k, v] of Object.entries(originals)) { if (v === undefined) delete globalThis[k]; else globalThis[k] = v; }
  }
});
