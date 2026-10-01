import * as THREE from 'three';

/** The family cat: wanders around the yard, stops and wags its tail when petted. */
export class Cat {
  constructor(mf, location, area) {
    this.location = location;
    this.area = area;
    const fur = 0xD9924A, g = new THREE.Group();
    g.add(mf.at(mf.rbox(0.28, 0.24, 0.55, fur, 0.1), 0, 0.3, 0));
    const head = mf.at(mf.sphere(0.15, fur, 14), 0, 0.46, 0.3);
    [-0.07, 0.07].forEach((x) => { const e = mf.cone(0.05, 0.1, fur, 4); e.position.set(x, 0.13, 0); head.add(e); });
    [-0.05, 0.05].forEach((x) => head.add(mf.at(mf.sphere(0.022, 0x2E7D32, 8), x, 0.03, 0.13)));
    g.add(head);
    this.legs = [[-0.09, 0.18], [0.09, 0.18], [-0.09, -0.18], [0.09, -0.18]].map(([x, z]) => {
      const l = mf.at(mf.box(0.06, 0.2, 0.06, fur), x, 0.1, z); g.add(l); return l;
    });
    this.tail = new THREE.Group();
    this.tail.position.set(0, 0.36, -0.27);
    this.tail.add(mf.at(mf.cyl(0.025, 0.03, 0.35, fur, 6), 0, 0.17, 0));
    this.tail.rotation.x = -0.6;
    g.add(this.tail);
    this.group = g;
    g.position.set(area.x[0] + 3, 0, area.z[0] + 3);
    location.group.add(g);
    this.target = new THREE.Vector3();
    this.wait = 1;
    this.petted = 0;
  }

  get position() { return this.group.position; }

  pet() { this.petted = 3; }

  update(dt, t, player) {
    const p = this.position;
    if (this.petted > 0) {
      this.petted -= dt;
      this.tail.rotation.z = Math.sin(t * 12) * 0.5;
      const a = Math.atan2(player.position.x - p.x, player.position.z - p.z);
      this.group.rotation.y += (a - this.group.rotation.y) * 0.1;
      return;
    }
    this.tail.rotation.z = Math.sin(t * 2) * 0.2;
    if (this.wait > 0) { this.wait -= dt; return; }
    const d = this.target.distanceTo(p);
    if (d < 0.3) {
      this.wait = 2 + Math.random() * 4;
      this.target.set(this.area.x[0] + Math.random() * (this.area.x[1] - this.area.x[0]), 0, this.area.z[0] + Math.random() * (this.area.z[1] - this.area.z[0]));
      return;
    }
    const step = Math.min(d, 1.3 * dt);
    const dir = this.target.clone().sub(p).setY(0).normalize();
    const before = p.clone();
    p.addScaledVector(dir, step);
    this.location.collision.resolve(p, 0.3);
    if (p.distanceTo(before) < step * 0.3) this.target.copy(p); // stuck → pick a new target
    this.group.rotation.y = Math.atan2(dir.x, dir.z);
    this.legs.forEach((l, i) => { l.rotation.x = Math.sin(t * 14 + (i % 2) * Math.PI) * 0.5; });
  }
}
