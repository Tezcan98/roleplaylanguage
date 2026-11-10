import * as THREE from 'three';

/** A quick tap on the pitch sets the pass aim; camera drags and pinches do not. */
export class PassAim {
  constructor({ canvas, camera, world, enabled, inside, selected, receiverAt = () => null, receiverValid = () => true, holding = () => false }) {
    Object.assign(this, { canvas, camera, world, enabled, inside, selected, receiverAt, receiverValid, holding });
    this.pointers = new Map();
    this.ray = new THREE.Raycaster();
    this.plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    const material = new THREE.MeshBasicMaterial({ color: 0x8AFF80, side: THREE.DoubleSide, transparent: true, opacity: 0.9, depthWrite: false });
    this.ring = new THREE.Mesh(new THREE.RingGeometry(0.48, 0.6, 28), material);
    this.ring.rotation.x = -Math.PI / 2; this.ring.visible = false;
    world.scene.add(this.ring);
    canvas.addEventListener('pointerdown', (e) => {
      if (!enabled() || (e.pointerType === 'mouse' && e.button !== 0)) return;
      this.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY, at: performance.now(), location: world.current, drag: false });
      if (this.pointers.size > 1) for (const p of this.pointers.values()) p.drag = true;
    });
    addEventListener('pointermove', (e) => {
      const p = this.pointers.get(e.pointerId);
      if (p && Math.hypot(e.clientX - p.x, e.clientY - p.y) > 12) p.drag = true;
    });
    addEventListener('pointerup', (e) => {
      const p = this.pointers.get(e.pointerId); this.pointers.delete(e.pointerId);
      if (!p || p.drag || !enabled() || p.location !== world.current || performance.now() - p.at > 400) return;
      if (e.target !== canvas) return;
      const rect = canvas.getBoundingClientRect();
      this.ray.setFromCamera(new THREE.Vector2((e.clientX - rect.left) / rect.width * 2 - 1, 1 - (e.clientY - rect.top) / rect.height * 2), camera);
      const hit = this.ray.ray.intersectPlane(this.plane, new THREE.Vector3());
      if (hit && inside(hit)) this.aim = { x: hit.x, z: hit.z, receiver: receiverAt(hit), until: performance.now() + 3000, location: world.current };
    });
    addEventListener('pointercancel', (e) => this.pointers.delete(e.pointerId));
    addEventListener('blur', () => this.clear());
    document.addEventListener('visibilitychange', () => { if (document.hidden) this.clear(); });
  }
  target() {
    if (this.aim?.location !== this.world.current || this.aim.until <= performance.now()) return null;
    const receiver = this.aim.receiver;
    if (receiver && this.receiverValid(receiver)) return { ...this.aim, x: receiver.position.x, z: receiver.position.z };
    return { ...this.aim, receiver: null };
  }
  clear() { this.aim = null; this.pointers.clear(); this.ring.visible = false; }
  update() {
    if (!this.enabled()) { this.clear(); return; }
    if (this.holding() && this.aim?.until > performance.now()) this.aim.until = performance.now() + 3000;
    const target = this.selected();
    const p = target?.position ?? target;
    this.ring.visible = !!p;
    if (p) this.ring.position.set(p.x, 0.09, p.z);
  }
}
