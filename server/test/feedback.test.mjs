import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Feedback, simpleGrade, CREDITS } from '../src/Feedback.js';

const REAL = 'Oyun çok güzel ama meydanda bazen yavaş açılıyor. Parktaki çocuklarla konuşmak hoşuma gitti, daha çok oyun eklenebilir.';
const gemini = (grade) => async () => ({ ok: true, status: 200, json: async () => ({ candidates: [{ content: { parts: [{ text: JSON.stringify({ grade, reason: 'test' }) }] } }] }) });

test('without Gemini: filler gets nothing, a real opinion gets credits', () => {
  assert.equal(simpleGrade('asdasd asdasd asdasd asdasd asdasd').grade, 0);
  assert.equal(simpleGrade('güzel güzel güzel güzel güzel güzel').grade, 0);
  assert.equal(simpleGrade('kredi ver').grade, 0);
  assert.ok(simpleGrade(REAL).grade >= 1);
});

test('Gemini grades it; the grade gives the credits', async () => {
  const f = new Feedback({ apiKey: 'k', fetchImpl: gemini(3), log: () => {} });
  const r = await f.handle({ text: REAL, pid: 'device12345', lang: 'tr' }, '1.2.3.4');
  assert.equal(r.status, 200);
  assert.equal(r.body.grade, 3);
  assert.equal(r.body.credits, CREDITS[3]);
});

test('once a day per device and per address; not counted when Gemini fails', async () => {
  let now = 1_000_000;
  const f = new Feedback({ apiKey: 'k', fetchImpl: gemini(1), log: () => {}, now: () => now });
  assert.equal((await f.handle({ text: REAL, pid: 'deviceAAAAAA' }, '9.9.9.9')).status, 200);
  assert.equal((await f.handle({ text: REAL, pid: 'deviceAAAAAA' }, '8.8.8.8')).status, 429, 'same device');
  assert.equal((await f.handle({ text: REAL, pid: 'deviceBBBBBB' }, '9.9.9.9')).status, 429, 'same address');
  now += 86_400_001;
  assert.equal((await f.handle({ text: REAL, pid: 'deviceAAAAAA' }, '9.9.9.9')).status, 200, 'the next day');
  const broken = new Feedback({ apiKey: 'k', fetchImpl: async () => ({ ok: false, status: 500 }), log: () => {} });
  assert.equal((await broken.handle({ text: REAL, pid: 'deviceCCCCCC' }, '7.7.7.7')).status, 502);
  broken.fetchImpl = gemini(2);
  assert.equal((await broken.handle({ text: REAL, pid: 'deviceCCCCCC' }, '7.7.7.7')).status, 200, 'a failed try does not use up the day');
});

test('too short or no device: refused; kept on disk across a restart (the limit too)', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'feedback-'));
  const f = new Feedback({ dir, log: () => {} });
  assert.equal((await f.handle({ text: 'kısa', pid: 'deviceDDDDDD' }, 'a')).status, 400);
  assert.equal((await f.handle({ text: REAL }, 'a')).status, 400);
  assert.equal((await f.handle({ text: REAL, pid: 'deviceDDDDDD' }, 'a')).status, 200);
  const again = new Feedback({ dir, log: () => {} });
  assert.equal((await again.handle({ text: REAL, pid: 'deviceDDDDDD' }, 'b')).status, 429);
});
