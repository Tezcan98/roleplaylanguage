/**
 * İsmail Dede's chess board on its own, with a fake clock. Run: npm test -w server
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Chess } from 'chess.js';
import { ChessTable, dedeMove } from '../src/ChessTable.js';

function table(rules = {}) {
  const clock = { t: 1000 };
  const t = new ChessTable({ now: () => clock.t, rules });
  return { t, clock, at: (ms) => { clock.t += ms; return t.tick(); } };
}
const A = { id: 'a', name: 'Ali' }, B = { id: 'b', name: 'Ayşe' }, C = { id: 'c', name: 'Can' };

test('asking for a taken colour waits for the next game; the line is seated after the pause', () => {
  const { t, at } = table({ pause: 1000 });
  t.ask(A, 'w');
  t.ask(C, 'w'); // white is taken: waits
  assert.equal(t.phase, 'waiting');
  t.ask(B, 'b');
  assert.equal(t.phase, 'playing');
  assert.deepEqual(t.queue.map((q) => q.name), ['Can']);
  assert.equal(t.leave('b'), false, 'no leaving a seat during a game (only resign)');
  t.resign('b');
  assert.equal(t.phase, 'over');
  assert.equal(at(1500), true);
  assert.deepEqual([t.phase, t.seats.w?.name, t.seats.b], ['waiting', 'Can', null]);
});

test('no clock, but whoever does not move for three minutes loses', () => {
  const { t, at } = table({ idle: 10_000 });
  t.ask(A, 'w'); t.ask(B, 'b');
  t.move('a', { from: 'e2', to: 'e4' });
  at(9000);
  assert.equal(t.state().idleLeft, 1000, 'black has a second left');
  assert.equal(t.state().clocks, undefined);
  assert.equal(at(2000), true);
  assert.deepEqual(t.result, { winner: 'w', reason: 'idle' });
  assert.equal(t.board()[0].games, 1);
});

test('a draw offered through Dede: the other player accepts or declines; moving on declines', () => {
  const { t } = table();
  t.ask(A, 'w'); t.ask(B, 'b');
  assert.equal(t.offerDraw('a'), true);
  assert.equal(t.state().draw.offer, 'w');
  assert.equal(t.answerDraw('a', true), false, 'you cannot accept your own offer');
  assert.equal(t.answerDraw('b', false), true);
  assert.deepEqual(t.state().draw, { offer: null, declined: 'w' });
  t.offerDraw('a');
  t.move('a', { from: 'e2', to: 'e4' }); // white offered and moved: the offer stands
  assert.equal(t.state().draw.offer, 'w');
  t.move('b', { from: 'e7', to: 'e5' }); // black played on instead of answering
  assert.equal(t.state().draw.offer, null);
  t.offerDraw('b');
  assert.equal(t.answerDraw('a', true), true);
  assert.deepEqual(t.result, { winner: null, reason: 'agreed' });
});

test('a draw against Dede: he accepts when it is about even, not when he is winning', () => {
  const { t } = table();
  t.askDede(A, 'w');
  assert.equal(t.offerDraw('a'), true);
  assert.deepEqual(t.result, { winner: null, reason: 'agreed' }, 'even position at the start');
  const { t: t2 } = table();
  t2.askDede(A, 'w');
  t2.game.remove('d1'); // white has lost the queen
  t2.offerDraw('a');
  assert.equal(t2.phase, 'playing');
  assert.equal(t2.state().draw.declined, 'w');
});

test('playing Dede: only on a free board; he answers by himself; the game gives way to people waiting', () => {
  const { t, at } = table({ aiDelay: 100, aiYield: 5000 });
  t.ask(C, 'w');
  assert.equal(t.askDede(A), false, 'someone is waiting for the board');
  t.leave('c');
  assert.equal(t.askDede(A), true);
  t.move('a', { from: 'e2', to: 'e4' });
  assert.equal(t.game.turn(), 'b');
  at(150);
  assert.equal(t.game.turn(), 'w', 'Dede moved');
  t.ask(B, 'w'); // waiting now
  at(6000);
  assert.deepEqual([t.phase, t.result.reason], ['over', 'limit']);
  assert.equal(t.board().some((r) => r.name === 'İsmail Dede'), false, 'Dede is not on his own score board');
});

test('a dropped player has a little while to come back, then loses', () => {
  const { t, at } = table({ rejoin: 1000 });
  t.ask(A, 'w'); t.ask(B, 'b');
  t.disconnect('a', 'Ali');
  assert.equal(t.phase, 'playing');
  assert.equal(t.rejoin({ id: 'a2', name: 'Ali' }), true);
  t.disconnect('a2', 'Ali');
  at(1500);
  assert.deepEqual(t.result, { winner: 'b', reason: 'left' });
});

test('Dede mates when he can and does not give his queen away', () => {
  const mate = new Chess('6k1/5ppp/8/8/8/8/5PPP/3Q2K1 w - - 0 1'); // Qd8#
  assert.equal(dedeMove(mate).san, 'Qd8#');
  const hang = new Chess('4k3/8/8/3p4/8/8/8/3QK3 w - - 0 1');
  for (let i = 0; i < 10; i++) assert.notEqual(dedeMove(hang).to, 'd4', 'the queen would be taken on d4');
});
