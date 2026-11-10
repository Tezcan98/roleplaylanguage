import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { Ball } from '../src/entities/Ball.js';
import { ToySystem } from '../src/systems/ToySystem.js';
import { KickCharge, CHARGE_MS, passReceiver } from '../src/systems/FootballKick.js';
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
  toys.shoot(); assert.ok(ball.vel.length() > 10); assert.ok(ball.hopVel > 0);
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


test('hold fills gradually, clamps at full, and releasing/cancelling never causes a second kick', () => {
  let now = 0; const charge = new KickCharge(() => now);
  assert.equal(charge.release(), null); assert.equal(charge.start(), true);
  assert.equal(charge.start(), false); assert.equal(charge.power, 0.04);
  now = CHARGE_MS / 2; assert.equal(charge.power, 0.5);
  now = CHARGE_MS * 5; assert.equal(charge.power, 1); assert.equal(charge.active, true);
  assert.equal(charge.release(), 1); assert.equal(charge.release(), null);
  charge.start(); now += 800; charge.cancel(); assert.equal(charge.release(), null);
});
test('pass snaps near a tapped friend and keeps every strength on the ground', () => {
  const { toys, ball } = fixture();
  toys.passAim = () => ({ x: 10, z: 3 });
  toys.passTargets = () => [{ position: { x: 10, z: 1 } }, { position: { x: 12, z: 8 } }];
  toys.pass(0.05); const low = ball.vel.length();
  assert.ok(Math.abs(ball.vel.z / ball.vel.x - 1 / 9.3) < 1e-9);
  assert.equal(ball.hop, 0); assert.equal(ball.hopVel, 0);
  toys.pass(1); assert.ok(ball.vel.length() > low * 3);
  assert.equal(ball.hopVel, 0);
});
test('directional help ignores people behind, seated, mounted, invisible, or outside the assist cone', () => {
  const origin = { x: 0, z: 0 }, direction = { x: 1, z: 0 };
  const friend = { position: { x: 8, z: 1 } };
  const targets = [{ position: { x: -4, z: 0 } }, { position: { x: 2, z: 8 } }, { position: { x: 4, z: 0 }, seated: true }, { position: { x: 5, z: 0 }, mount: {} }, { position: { x: 6, z: 0 }, group: { visible: false } }, friend];
  assert.equal(passReceiver(origin, direction, targets), friend);
  assert.equal(passReceiver(origin, direction, targets, { x: 15, z: 10 }), null);
});
test('a charged shot keeps its speed through goal assistance; harder shots also lift more', () => {
  const { toys, ball } = fixture(); toys.shoot(0.1);
  const weak = ball.vel.length(), weakLift = ball.hopVel;
  toys.shoot(1); assert.ok(ball.vel.length() > weak * 1.8); assert.ok(ball.hopVel > weakLift);
  const strong = ball.vel.length();
  const football = new Football({ world: { current: { id: 'village' } }, place: 'village', pitch: { x0: -20, x1: 20, z0: -12, z1: 12, cz: 0 } });
  football.assist(ball, 'shot'); assert.ok(Math.abs(ball.vel.length() - strong) < 1e-9);
});
test('queued kicks retain the selected power, expire, and are cancelled across locations/menus', () => {
  const { toys, ball } = fixture();
  ball.position.x = 3; toys.pass(1); ball.position.x = 0.7; toys.update(0.05, 1); assert.equal(ball.vel.length(), 19);
  ball.vel.set(0,0,0); ball.position.x = 3; toys.shoot(1);
  toys.world.current = { group: { visible: true } }; toys.update(0.05, 2); toys.world.current = ball.location; ball.position.x = 0.7; toys.update(0.05, 3); assert.equal(ball.vel.length(), 0);
  ball.position.x = 3; toys.pass(1); toys.canKick = () => false; toys.update(0.05, 4); toys.canKick = () => true; ball.position.x = 0.7; toys.update(0.05, 5); assert.equal(ball.vel.length(), 0);
});
