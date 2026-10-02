import * as THREE from 'three';

/**
 * Camera rigs per situation. `update` picks the rig from the current mode and location
 * and eases the camera towards it.
 */
export class CameraController {
  #pos = new THREE.Vector3();
  #look = new THREE.Vector3(0, 1, -2);
  #tmp = new THREE.Vector3();

  constructor(ctx) { this.ctx = ctx; this.camera = ctx.camera; this.camera.position.set(0, 9, 14); this.viewMode = 0; }
  cycleView() { this.viewMode = (this.viewMode + 1) % 3; return this.viewMode; }
  resetView() { this.viewMode = 0; }

  /** Jump straight to a framing (used after a scene change behind the fade). */
  snap(target, indoor) {
    const k = this.ctx.portrait ? 1.35 : 1;
    this.camera.position.set(target.x * (indoor ? 0.7 : 1), (indoor ? 7.2 : 8) * k, target.z + (indoor ? 7.5 : 10) * k);
    this.#look.set(target.x, 1, target.z);
    this.camera.lookAt(this.#look);
  }

  /** Pin the camera to a fixed shot (e.g. the lesson) until `clearFixed()`. */
  setFixed(pos, look) { this.fixed = { pos: pos.clone(), look: look.clone() }; }
  clearFixed() { this.fixed = null; }

  update(t, { menu, player, partner, location }) {
    const cam = this.camera;
    if (this.fixed) {
      cam.position.lerp(this.fixed.pos, 0.08);
      this.#look.lerp(this.fixed.look, 0.08);
      cam.lookAt(this.#look);
      return;
    }
    if (menu) {
      const a = t * 0.12;
      cam.position.set(Math.sin(a) * 20, 9, Math.cos(a) * 20 - 2);
      cam.lookAt(0, 1, -2);
      return;
    }
    const P = player.position, portrait = this.ctx.portrait, view = this.viewMode;
    const rig = location.cameraRig;
    if (rig === 'indoor' || rig === 'classroom') {
      const k = portrait ? 1.35 : 1;
      const maxZ = location.cameraMaxZ ?? 11;
      if (partner) {
        const N = partner.position, mx = (P.x + N.x) / 2, mz = (P.z + N.z) / 2;
        this.#pos.set(mx, 3.6 * k, mz + 5 * k);
        this.#look.lerp(this.#tmp.set(mx, 1.1, mz), 0.08);
      } else {
        this.#pos.set(P.x * 0.7, 7.2 * k, Math.min(P.z + 7.5 * k, maxZ));
        this.#look.lerp(this.#tmp.set(P.x * 0.85, 0.8, P.z - 0.5), 0.1);
      }
    } else if (partner) {
      const N = partner.position, mid = this.#tmp.copy(P).add(N).multiplyScalar(0.5);
      const side = new THREE.Vector3(N.z - P.z, 0, -(N.x - P.x)).normalize();
      const dd = portrait ? 6 : 4.5;
      this.#pos.copy(mid).addScaledVector(side, dd);
      if (this.#pos.z < mid.z) this.#pos.copy(mid).addScaledVector(side, -dd);
      this.#pos.y = 2.6;
      this.#look.lerp(new THREE.Vector3(mid.x, portrait ? 0.6 : 1.3, mid.z), 0.08);
    } else {
      const k = portrait ? 1.45 : 1;
      if (view === 1) {
        this.#pos.set(P.x + 9 * k, 5.8 * k, P.z + 5 * k);
      } else if (view === 2) {
        this.#pos.set(P.x, 12 * k, P.z + 6 * k);
      } else {
        this.#pos.set(P.x, 8 * k, P.z + 10 * k);
      }
      this.#look.lerp(this.#tmp.set(P.x, view === 2 ? 0.5 : 1, P.z), 0.12);
    }
    cam.position.lerp(this.#pos, 0.07);
    cam.lookAt(this.#look);
  }
}
