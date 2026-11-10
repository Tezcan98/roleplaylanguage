import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Purchases } from '../src/Purchases.js';

const mailer = () => { const sent = []; return { enabled: true, sent, send: async (m) => { sent.push(m); return true; } }; };

test('a pack purchase mails the operator once per transaction', async () => {
  const m = mailer(), p = new Purchases({ mailer: m, log: () => {} });
  assert.equal(await p.record({ id: 'credits_100', tx: 'GPA.1', v: '1.0.37', pid: 'abc' }, '1.1.1.1', 'DE'), true);
  assert.equal(await p.record({ id: 'credits_100', tx: 'GPA.1' }, '1.1.1.1'), true);
  assert.equal(m.sent.length, 1);
  assert.match(m.sent[0].subject, /100 altın/);
  assert.match(m.sent[0].text, /DE/);
});

test('unknown products are refused; a flood of mails is capped', async () => {
  const m = mailer(); let t = 0;
  const p = new Purchases({ mailer: m, log: () => {}, now: () => t });
  assert.equal(await p.record({ id: 'hack' }, '2.2.2.2'), false);
  for (let i = 0; i < 50; i++) { t += 61000; await p.record({ id: 'credits_50', tx: `t${i}` }, `ip${i}`); }
  assert.equal(m.sent.length, 30);
});
