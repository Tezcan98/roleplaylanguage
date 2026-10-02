import * as THREE from 'three';

const UI_GESTURE_BLOCKERS = '#joy, #act, button, input, textarea, select, .overlay, .card, .ptt, .callbar';

export class CameraController {
  #pos = new THREE.Vector3();
  #look = new THREE.Vector3(0, 1, -2);
  #tmp = new THREE.Vector3();
  #touch = { active: false, id: null, x: 0, y: 0 };
  #yaw = 0;
  #pitch = 0;

  constructor(ctx) {
    this.ctx = ctx;
    this.camera = ctx.camera;
    this.camera.position.set(0, 9, 14);

    const start = (e) => {
      if (e.pointerType !== 'touch' || this.fixed || e.isPrimary === false) return;
      if (e.target instanceof Element && e.target.closest(UI_GESTURE_BLOCKERS)) return;
      this.#touch = { active: true, id: e.pointerId, x: e.clientX, y: e.clientY };
    };
    const move = (e) => {
      if (!this.#touch.active || e.pointerId !== this.#touch.id || this.fixed) return;
      const dx = e.clientX - this.#touch.x;
      const dy = e.clientY - this.#touch.y;
      this.#touch.x = e.clientX;
      this.#touch.y = e.clientY;
      this.#yaw -= dx * 0.009;
      this.#pitch = THREE.MathUtils.clamp(this.#pitch + dy * 0.004, -0.45, 0.45);
    };
    const end = (e) => {
      if (e.pointerId === this.#touch.id) this.#touch.active = false;
    };

    document.addEventListener('pointerdown', start, { passive: true });
    document.addEventListener('pointermove', move, { passive: true });
    document.addEventListener('pointerup', end, { passive: true });
    document.addEventListener('pointercancel', end, { passive: true });
  }

  resetView() {
    this.#yaw = 0;
    this.#pitch = 0;
    this.#touch.active = false;
  }

  #orbit(target) {
    if (!this.#yaw && !this.#pitch) return;
    const dx = this.#pos.x - target.x;
    const dz = this.#pos.z - target.z;
    const c = Math.cos(this.#yaw);
    const s = Math.sin(this.#yaw);
    this.#pos.x = target.x + dx * c - dz * s;
    this.#pos.z = target.z + dx * s + dz * c;
    this.#pos.y += this.#pitch * 8;
  }

  snap(target, indoor) {
    this.resetView();
    const k = this.ctx.portrait ? 1.35 : 1;
    this.camera.position.set(
      target.x * (indoor ? 0.7 : 1),
      (indoor ? 7.2 : 8) * k,
      target.z + (indoor ? 7.5 : 10) * k,
    );
    this.#look.set(target.x, 1, target.z);
    this.camera.lookAt(this.#look);
  }

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

    const P = player.position;
    const portrait = this.ctx.portrait;
    const rig = location.cameraRig;

    if (rig === 'indoor' || rig === 'classroom') {
      const k = portrait ? 1.35 : 1;
      const maxZ = location.cameraMaxZ ?? 11;
      if (partner) {
        const N = partner.position;
        const mx = (P.x + N.x) / 2;
        const mz = (P.z + N.z) / 2;
        this.#pos.set(mx, 3.6 * k, mz + 5 * k);
        this.#look.lerp(this.#tmp.set(mx, 1.1, mz), 0.08);
      } else {
        this.#pos.set(P.x * 0.7, 7.2 * k, Math.min(P.z + 7.5 * k, maxZ));
        this.#look.lerp(this.#tmp.set(P.x * 0.85, 0.8, P.z - 0.5), 0.1);
      }
    } else if (partner) {
      const N = partner.position;
      const mid = this.#tmp.copy(P).add(N).multiplyScalar(0.5);
      const side = new THREE.Vector3(N.z - P.z, 0, -(N.x - P.x)).normalize();
      const dd = portrait ? 6 : 4.5;
      this.#pos.copy(mid).addScaledVector(side, dd);
      if (this.#pos.z < mid.z) this.#pos.copy(mid).addScaledVector(side, -dd);
      this.#pos.y = 2.6;
      this.#look.lerp(new THREE.Vector3(mid.x, portrait ? 0.6 : 1.3, mid.z), 0.08);
    } else {
      const k = portrait ? 1.45 : 1;
      this.#pos.set(P.x, 8 * k, P.z + 10 * k);
      this.#look.lerp(this.#tmp.set(P.x, 1, P.z), 0.12);
    }

    this.#orbit(this.#look);
    cam.position.lerp(this.#pos, 0.09);
    cam.lookAt(this.#look);
  }
}
