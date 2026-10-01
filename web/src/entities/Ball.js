import * as THREE from 'three';

/** A football that can be kicked around; rolls, bounces off walls and slows down. */
export class Ball {
  constructor(mf, location, { x, z }) {
    this.location = location;
    this.radius = 0.22;
    this.vel = new THREE.Vector3();
    this.hop = 0;
    this.hopVel = 0;
    const tex = mf.mat({ tex: 'ball' });
    this.mesh = mf.mesh(new THREE.IcosahedronGeometry(this.radius, 2), tex);
    this.mesh.position.set(x, this.radius, z);
    location.group.add(this.mesh);
  }

  get position() { return this.mesh.position; }

  /** Kick away from `from`; `power` 0..1 (a running player kicks harder than a walking one). */
  kick(from, power = 1) {
    const dir = new THREE.Vector3(this.position.x - from.x, 0, this.position.z - from.z).normalize();
    this.vel.copy(dir.multiplyScalar((4 + 5 * power) * (0.9 + Math.random() * 0.2)));
    this.hopVel = power > 0.6 ? 2 + Math.random() * 2 : 0;
  }

  get moving() { return this.vel.lengthSq() > 1e-3; }

  /** Network snapshot / restore (multiplayer square: everyone plays with the same ball). */
  state() { const { x, z } = this.position; return { x, z, vx: this.vel.x, vz: this.vel.z }; }
  setState({ x, z, vx = 0, vz = 0 }) {
    if (![x, z, vx, vz].every(Number.isFinite)) return;
    this.position.x = x; this.position.z = z;
    this.vel.set(vx, 0, vz);
  }

  update(dt) {
    if (this.vel.lengthSq() < 1e-4 && this.hop <= 0) return;
    const p = this.position, before = p.clone();
    p.x += this.vel.x * dt;
    p.z += this.vel.z * dt;
    this.location.collision.resolve(p, this.radius);
    // bounce: if the collision pushed us, reflect along the push direction
    const pushed = new THREE.Vector3(p.x - before.x - this.vel.x * dt, 0, p.z - before.z - this.vel.z * dt);
    if (pushed.lengthSq() > 1e-6) {
      const n = pushed.normalize();
      this.vel.addScaledVector(n, -1.6 * this.vel.dot(n));
    }
    this.vel.multiplyScalar(Math.pow(0.35, dt)); // rolling friction
    this.hopVel -= 18 * dt;
    this.hop = Math.max(0, this.hop + this.hopVel * dt);
    if (this.hop === 0) this.hopVel = Math.abs(this.hopVel) > 2 ? -this.hopVel * 0.45 : 0;
    p.y = this.radius + this.hop;
    const dist = Math.hypot(p.x - before.x, p.z - before.z);
    if (dist > 1e-5) this.mesh.rotateOnWorldAxis(new THREE.Vector3(p.z - before.z, 0, -(p.x - before.x)).normalize(), dist / this.radius);
    if (this.vel.lengthSq() < 1e-3) this.vel.set(0, 0, 0);
  }
}
