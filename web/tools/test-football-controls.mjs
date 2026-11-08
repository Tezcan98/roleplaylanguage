import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { Ball } from '../src/entities/Ball.js';
import { ToySystem } from '../src/systems/ToySystem.js';
import { Football } from '../src/systems/Football.js';
function fixture() {
  const location = { group: { visible: true } };
  const player = { position: { x: 0, z: 0 }, group: { rotation: { y: Math.PI / 2 } }, kick() {} };
  const ball = Object.create(Ball.prototype);
  Object.assign(ball, { mesh: { position: new THREE.Vector3(0.7, 0.22, 0) }, location, radius: 0.22, vel: new THREE.Vector3(), hop: 1, hopVel: 3 });
  ball.update = () => {};
  const kicks = [];
  const toys = new ToySystem({ world: { current: location }, player });
  toys.add(ball, { touch: true, quiet: true, onKick: (_, kind) => kicks.push(kind) });
  return { player, ball, toys, kicks };
}
test('pass is a slower ground kick in the facing direction and notifies multiplayer', () => {
  const { ball, toys, kicks } = fixture();
  assert.equal(toys.pass(), true);
  assert.equal(ball.vel.x, 7); assert.ok(Math.abs(ball.vel.z) < 1e-10);
  assert.equal(ball.hop, 0); assert.equal(ball.hopVel, 0);
  assert.equal(ball.position.y, ball.radius); assert.deepEqual(kicks, ['pass']);
  toys.shoot(); assert.ok(ball.vel.length() > 10); assert.ok(ball.hopVel >= 4);
});
test('passes retain their aim instead of receiving goal assistance', () => {
  const { ball } = fixture(); ball.pass(1, 1);
  const before = ball.vel.clone();
  const f = new Football({});
  f.assist(ball, 'pass');
  assert.ok(ball.vel.equals(before));
});
test('the most recent requested kick wins when a ball comes into reach', () => {
  const { toys, ball, kicks } = fixture();
  ball.position.x = 3; assert.equal(toys.shoot(), false); assert.equal(toys.pass(), false);
  ball.position.x = 0.7; toys.update(0.05, 1);
  assert.deepEqual(kicks, ['pass']);
});
test('no pass on a distant ball, on horseback or while seated', () => {
  const { toys, ball, player } = fixture();
  player.mount = {}; assert.equal(toys.pass(), false); player.mount = null;
  player.seated = true; assert.equal(toys.pass(), false); player.seated = false;
  ball.position.x = 4; assert.equal(toys.pass(), false); toys.update(1, 1);
  ball.position.x = 0.7; toys.update(0.05, 2); assert.equal(ball.vel.length(), 0);
});
