import * as THREE from 'three';

/** Glowing points drifting over the garden at night (bloom makes them shine). */
export class Fireflies {
  constructor(scene, { area, count = 70 }) {
    this.base = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      this.base.set([area.x[0] + Math.random() * (area.x[1] - area.x[0]), 0.4 + Math.random() * 1.8, area.z[0] + Math.random() * (area.z[1] - area.z[0])], i * 3);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(this.base.slice(), 3));
    this.points = new THREE.Points(g, new THREE.PointsMaterial({
      color: 0xFFE98A, size: 0.16, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    }));
    this.points.visible = false;
    scene.add(this.points);
  }

  update(t, strength) {
    this.points.visible = strength > 0.05;
    if (!this.points.visible) return;
    this.points.material.opacity = strength;
    const p = this.points.geometry.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const b = i * 3;
      p.setXYZ(i, this.base[b] + Math.sin(t * 0.5 + i) * 0.6, this.base[b + 1] + Math.sin(t * 1.3 + i * 2) * 0.25, this.base[b + 2] + Math.cos(t * 0.4 + i) * 0.6);
    }
    p.needsUpdate = true;
  }
}
