import * as THREE from 'three';

// hour → sky colour keyframes (outdoor)
const SKY = [
  [0, 0x0B1026], [5, 0x1B2A4A], [6.3, 0xF3B58A], [8, 0x9ED2F5], [17, 0x9ED2F5],
  [18.8, 0xF08A5D], [20.3, 0x2B2F5A], [21.5, 0x0B1026], [24, 0x0B1026],
];
const ROOM = new THREE.Color(0x2A1E15);

function sample(keys, h) {
  for (let i = 0; i < keys.length - 1; i++) {
    const [h0, c0] = keys[i], [h1, c1] = keys[i + 1];
    if (h >= h0 && h <= h1) return new THREE.Color(c0).lerp(new THREE.Color(c1), (h - h0) / (h1 - h0));
  }
  return new THREE.Color(keys[0][1]);
}

/** Drives sun, sky, fog, stars and lamps from the in-game clock. */
export class DayNightLighting {
  #lamps = [];

  constructor(ctx, time) {
    this.ctx = ctx;
    this.time = time;
    this.stars = this.#makeStars();
    this.moon = new THREE.Mesh(new THREE.SphereGeometry(2.2, 16, 12), new THREE.MeshBasicMaterial({ color: 0xF4F1DE, fog: false }));
    ctx.scene.add(this.stars, this.moon);
  }

  #makeStars() {
    const n = 500, pos = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2, e = 0.15 + Math.random() * 1.3, r = 90;
      pos.set([Math.cos(a) * Math.cos(e) * r, Math.sin(e) * r, Math.sin(a) * Math.cos(e) * r], i * 3);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    return new THREE.Points(g, new THREE.PointsMaterial({ color: 0xffffff, size: 0.6, fog: false, transparent: true }));
  }

  /** Called on location change: builds point lights for the location's lamps. */
  bind(location) {
    this.#lamps.forEach((l) => l.parent?.remove(l));
    this.#lamps = (location.lamps || []).map((p) => {
      const l = new THREE.PointLight(0xFFD08A, 0, 9, 1.6);
      l.position.copy(p);
      location.group.add(l);
      return l;
    });
    this.location = location;
  }

  update() {
    const { scene, hemi, sun } = this.ctx;
    const h = this.time.hour % 24;
    const sky = sample(SKY, h);
    const day = THREE.MathUtils.clamp(Math.sin((h - 6) / 14 * Math.PI) * 2, 0, 1); // 0 at night, 1 midday
    const night = 1 - THREE.MathUtils.smoothstep(day, 0, 0.25);
    const indoor = this.location?.indoor;

    // sun arc (east → west), moon on the opposite side
    const a = (h - 6) / 14 * Math.PI;
    sun.position.set(Math.cos(a) * 30, Math.max(6, Math.sin(a) * 32), 12);
    sun.intensity = (indoor ? 1.2 : 3) * day + 0.35 * night;
    sun.color.set(day > 0.2 ? 0xfff4dc : 0x9FB4FF);
    if (night > 0.5) sun.position.set(-20, 26, 10);
    hemi.intensity = 0.5 + 1.9 * day;
    hemi.color.set(0xffffff).lerp(new THREE.Color(0x8090C0), night);

    if (indoor) {
      scene.background.copy(ROOM);
      scene.fog.color.copy(ROOM);
      scene.fog.near = 30; scene.fog.far = 60;
      (this.location.windows || []).forEach((m) => m.color.copy(sky).lerp(new THREE.Color(0xffffff), 0.25 * day));
    } else {
      scene.background.copy(sky);
      scene.fog.color.copy(sky);
      scene.fog.near = 35; scene.fog.far = 75 + night * 40;
    }
    this.stars.visible = !indoor && night > 0.05;
    this.stars.material.opacity = night;
    this.moon.visible = !indoor && night > 0.3;
    this.moon.position.set(-40, 45, -60);
    const lampOn = THREE.MathUtils.clamp((0.35 - day) * 4, 0, 1);
    this.#lamps.forEach((l) => { l.intensity = 14 * lampOn; });
    (this.location?.glows || []).forEach((m) => m.emissive?.setScalar(0.9 * lampOn));
  }
}
