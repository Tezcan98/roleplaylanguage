/**
 * The square's moderator: word list, Turkish-only check and a System 1 decision model
 * (Jev / Laya protocol, faked here). Run: npm test -w server
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Moderator, guessLanguage } from '../src/Moderator.js';

test('language without a model: other scripts and clear foreign sentences are not Turkish', () => {
  assert.equal(guessLanguage('Merhaba, nasılsın?'), 'tr');
  assert.equal(guessLanguage('Top oynayalım mı?'), 'tr');
  assert.equal(guessLanguage('مرحبا كيف حالك'), 'other');
  assert.equal(guessLanguage('Привет, как дела?'), 'other');
  assert.equal(guessLanguage('hello how are you my friend'), 'other');
  assert.equal(guessLanguage('Ali'), 'unknown', 'a name alone is not held back');
});

test('without a model: swearing and other languages are held back, Turkish goes through', async () => {
  const m = new Moderator();
  assert.deepEqual(await m.check('Merhaba arkadaşlar!'), { ok: true });
  assert.equal((await m.check('siktir git')).reason, 'profanity');
  assert.equal((await m.check('hello how are you')).reason, 'language');
});

/** A fake /v1/systemone server answering from a table (like Jev or laya-serve would). */
function fakeSystemOne(table) {
  const calls = [];
  const fetchImpl = async (url, init) => {
    const body = JSON.parse(init.body);
    calls.push({ url, auth: init.headers.Authorization, body });
    const [turkish, harm, p = 0.9] = table[body.state.message] ?? [0.95, 'none'];
    return { ok: true, json: async () => ({ answers: { turkish: { noul: turkish }, harm: { choice: harm, probabilities: { [harm]: p } } }, usage: { input_tokens: 1, output_tokens: 1 } }) };
  };
  return { calls, fetchImpl };
}

test('Jev / Laya: harmful topics are held back by category, unsure answers are not', async () => {
  const f = fakeSystemOne({
    'Sigara içelim mi?': [0.97, 'drugs'],
    'Telefon numaranı verir misin?': [0.96, 'personal_info'],
    'Bugün hava güzel': [0.98, 'bullying', 0.4], // not sure enough
  });
  const m = new Moderator({ provider: 'systemone', url: 'https://api.typesafe.ai/', apiKey: 'k', fetchImpl: f.fetchImpl });
  assert.deepEqual(await m.check('Sigara içelim mi?'), { ok: false, reason: 'drugs', by: 'model' });
  assert.equal((await m.check('Telefon numaranı verir misin?')).reason, 'personal_info');
  assert.deepEqual(await m.check('Bugün hava güzel'), { ok: true });
  assert.equal(f.calls[0].url, 'https://api.typesafe.ai/v1/systemone');
  assert.equal(f.calls[0].auth, 'Bearer k');
  assert.deepEqual(Object.keys(f.calls[0].body.questions), ['turkish', 'harm']);
  await m.check('Sigara içelim mi?');
  assert.equal(f.calls.length, 3, 'verdicts are cached');
});

test('Jev / Laya: a Latin-script foreign sentence the word lists miss is caught by the model', async () => {
  const f = fakeSystemOne({ 'Vamos a jugar fútbol': [0.03, 'none'] });
  const m = new Moderator({ provider: 'systemone', url: 'http://127.0.0.1:8000', fetchImpl: f.fetchImpl });
  assert.deepEqual(await m.check('Vamos a jugar fútbol'), { ok: false, reason: 'language', by: 'model' });
  assert.equal(f.calls[0].auth, undefined, 'laya-serve needs no key');
});

test('model down: the word list still works; fail-closed holds everything back', async () => {
  const down = async () => { throw new Error('timeout'); };
  const open = new Moderator({ provider: 'systemone', url: 'http://x', fetchImpl: down, log: () => {} });
  assert.deepEqual(await open.check('Merhaba'), { ok: true });
  assert.equal((await open.check('amk')).reason, 'profanity');
  const closed = new Moderator({ provider: 'systemone', url: 'http://x', fetchImpl: down, failClosed: true, log: () => {} });
  assert.equal((await closed.check('Merhaba')).ok, false);
});
