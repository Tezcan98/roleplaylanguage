import * as THREE from 'three';

// hour → colour keyframes
const TOP = [[0, 0x050A1C], [5, 0x0E1A3A], [6.3, 0x4A6FA5], [8, 0x3F8FD8], [17, 0x3F8FD8], [18.8, 0x4A5FA0], [20.3, 0x1A1F45], [21.5, 0x050A1C], [24, 0x050A1C]];
const HORIZON = [[0, 0x0B1026], [5, 0x1B2A4A], [6.3, 0xF3B58A], [8, 0xCFE8F7], [17, 0xCFE8F7], [18.8, 0xF6A26B], [20.3, 0x3B3565], [21.5, 0x0B1026], [24, 0x0B1026]];
const ROOM = new THREE.Color(0x2A1E15);

function sample(keys, h) {
  for (let i = 0; i < keys.length - 1; i++) {
    const [h0, c0] = keys[i], [h1, c1] = keys[i + 1];
    if (h >= h0 && h <= h1) return new THREE.Color(c0).lerp(new THREE.Color(c1), (h - h0) / (h1 - h0));
  }
  return new THREE.Color(keys[0][1]);
}

/**
 * Drives sun, sky dome, fog, lamps and fireflies from the in-game clock.
 * The shadow camera follows the player so shadows stay sharp.
 */
/** Point lights for lamps: the most any place has (the house: 4). */
const MAX_LAMPS = 4;

export class DayNightLighting {
  #lamps = [];
  #used = 0;
  #dir = new THREE.Vector3();

  constructor(ctx, time, { sky, fireflies } = {}) {
    Object.assign(this, { ctx, time, sky, fireflies });
    this.follow = new THREE.Vector3();
  }

  /**
   * Called on location change: the location's lamps light up. Always the same MAX_LAMPS point
   * lights (the unused ones dark): when the number of lights changes, three.js recompiles every
   * material's shader — the stall on entering a new place (house 4 lamps, yard none, classroom 2).
   */
  bind(location) {
    if (!this.#lamps.length) {
      this.#lamps = Array.from({ length: MAX_LAMPS }, () => { const l = new THREE.PointLight(0xFFD08A, 0, 9, 1.6); this.ctx.scene.add(l); return l; });
    }
    const spots = location.lamps || [];
    this.#lamps.forEach((l, i) => { if (spots[i]) l.position.copy(spots[i]); else l.position.set(0, -100, 0); });
    this.#used = Math.min(spots.length, MAX_LAMPS);
    this.location = location;
  }

  update(dt, t) {
    const { scene, hemi, sun } = this.ctx;
    const h = this.time.hour % 24;
    const top = sample(TOP, h), horizon = sample(HORIZON, h);
    const day = THREE.MathUtils.clamp(Math.sin((h - 6) / 14 * Math.PI) * 2, 0, 1);
    const night = 1 - THREE.MathUtils.smoothstep(day, 0, 0.25);
    const indoor = this.location?.indoor;

    // sun arc east → west; at night the "sun" light becomes dim moonlight
    const a = (h - 6) / 14 * Math.PI;
    this.#dir.set(Math.cos(a), Math.max(0.2, Math.sin(a)), 0.4).normalize();
    const lightDir = night > 0.5 ? new THREE.Vector3(-0.5, 0.8, 0.3).normalize() : this.#dir;
    sun.target.position.copy(this.follow);
    sun.position.copy(this.follow).addScaledVector(lightDir, 40);
    sun.intensity = (indoor ? 1.2 : 3) * day + 0.35 * night;
    const warm = day > 0 && day < 0.6 ? 1 - day / 0.6 : 0; // golden hour
    sun.color.set(night > 0.5 ? 0x9FB4FF : 0xFFF4DC).lerp(new THREE.Color(0xFFB27A), warm * 0.6);
    hemi.intensity = 0.5 + 1.9 * day;
    hemi.color.set(0xffffff).lerp(new THREE.Color(0x8090C0), night);

    if (indoor) {
      scene.background = ROOM;
      scene.fog.color.copy(ROOM);
      scene.fog.near = 30; scene.fog.far = 60;
      (this.location.windows || []).forEach((m) => m.color.copy(horizon).lerp(top, 0.3));
    } else {
      scene.background = horizon;
      scene.fog.color.copy(horizon);
      scene.fog.near = 30; scene.fog.far = 80 + night * 30;
    }
    this.sky?.update(dt, { visible: !indoor, top, horizon, sunDir: this.#dir, day, night, center: this.follow });
    this.fireflies?.update(t, indoor ? 0 : night);
    const lampOn = THREE.MathUtils.clamp((0.35 - day) * 4, 0, 1);
    this.#lamps.forEach((l, i) => { l.intensity = i < this.#used ? 14 * lampOn : 0; });
    (this.location?.glows || []).forEach((m) => { m.emissive?.set(0xFFC66B).multiplyScalar(0.9 * lampOn); });
  }
}
