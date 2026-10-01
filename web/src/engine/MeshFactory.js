import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

/**
 * Primitive + material helpers shared by every procedural builder.
 * A material spec is either a hex colour or `{ tex, repeat, color }`.
 */
export class MeshFactory {
  #materials = new Map();

  /** @param {{ standard?: boolean }} opts — standard: PBR materials (high quality), else Lambert */
  constructor(textures, { standard = true } = {}) {
    this.textures = textures;
    this.standard = standard;
    this.Material = standard ? THREE.MeshStandardMaterial : THREE.MeshLambertMaterial;
    this.base = standard ? { roughness: 0.88, metalness: 0 } : {};
  }

  mat(spec, extra = {}) {
    const key = JSON.stringify([spec, extra]);
    if (this.#materials.has(key)) return this.#materials.get(key);
    let m;
    if (typeof spec === 'number') {
      m = new this.Material({ color: spec, ...this.base, ...extra });
    } else {
      const { tex, repeat = [1, 1], color = this.textures.tint(tex) ?? 0xffffff } = spec;
      const normalMap = this.standard ? this.textures.normal(tex, repeat) : null;
      m = new this.Material({ color, map: this.textures.get(tex, repeat), ...(normalMap ? { normalMap } : {}), ...this.base, ...extra });
    }
    this.#materials.set(key, m);
    return m;
  }

  /** A fresh (uncached) material, for things whose colour changes at runtime. */
  uniqueMat(color, extra = {}) { return new this.Material({ color, ...this.base, ...extra }); }

  shadow(m, cast = true) { m.castShadow = cast; m.receiveShadow = true; return m; }
  mesh(geo, spec) { return this.shadow(new THREE.Mesh(geo, spec instanceof THREE.Material ? spec : this.mat(spec))); }

  box(w, h, d, spec) { return this.mesh(new THREE.BoxGeometry(w, h, d), spec); }
  /** Box with softly rounded edges (characters, cushions). */
  rbox(w, h, d, spec, r = 0.05) { return this.mesh(new RoundedBoxGeometry(w, h, d, 2, Math.min(r, w / 2, h / 2, d / 2)), spec); }
  sphere(r, spec, seg = 12) { return this.mesh(new THREE.SphereGeometry(r, seg, Math.max(6, (seg * 0.75) | 0)), spec); }
  cyl(rt, rb, h, spec, seg = 10) { return this.mesh(new THREE.CylinderGeometry(rt, rb, h, seg), spec); }
  cone(r, h, spec, seg = 8) { return this.mesh(new THREE.ConeGeometry(r, h, seg), spec); }
  /**
   * Hip roof over a w × d footprint (x × z), height h, ridge along the longer side.
   * Each slope gets its own UVs (u along the eaves, v up the slope) so tiles run downhill.
   */
  hipRoof(w, d, h, spec) {
    const alongX = w >= d, L = Math.max(w, d) / 2, S = Math.min(w, d) / 2, r = L - S; // half lengths, half ridge
    const P = (a, y, b) => (alongX ? [a, y, b] : [b, y, a]); // (along, up, across) → (x, y, z)
    const slope = Math.hypot(S, h);
    const pos = [], uv = [];
    const tri = (A, B, C, ua, ub, uc) => { pos.push(...A, ...B, ...C); uv.push(...ua, ...ub, ...uc); };
    for (const side of [1, -1]) { // long slopes: trapezoids
      const e0 = P(-L, 0, side * S), e1 = P(L, 0, side * S), r0 = P(-r, h, 0), r1 = P(r, h, 0);
      const u = (a) => (a + L) / (2 * L);
      if (side > 0) { tri(e0, e1, r1, [u(-L), 0], [u(L), 0], [u(r), 1]); tri(e0, r1, r0, [u(-L), 0], [u(r), 1], [u(-r), 1]); }
      else { tri(e1, e0, r0, [u(L), 0], [u(-L), 0], [u(-r), 1]); tri(e1, r0, r1, [u(L), 0], [u(-r), 1], [u(r), 1]); }
    }
    for (const end of [1, -1]) { // hip ends: triangles
      const a = P(end * L, 0, S), b = P(end * L, 0, -S), top = P(end * r, h, 0);
      if (end > 0) tri(b, a, top, [0, 0], [S / L, 0], [S / L / 2, 1]); else tri(a, b, top, [0, 0], [S / L, 0], [S / L / 2, 1]);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(uv.map((x, i) => (i % 2 ? x * slope / (2 * L) : x)), 2));
    g.computeVertexNormals();
    const m = this.mesh(g, spec);
    m.material.side = THREE.DoubleSide; // eaves seen from below
    return m;
  }
  torus(r, t, spec, seg = 16, arc = Math.PI * 2) { return this.mesh(new THREE.TorusGeometry(r, t, 8, seg, arc), spec); }
  ico(r, spec, detail = 0) { return this.mesh(new THREE.IcosahedronGeometry(r, detail), spec); }

  /** Horizontal plane lying on the ground. */
  ground(w, d, spec, y = 0) {
    const m = this.mesh(new THREE.PlaneGeometry(w, d), spec);
    m.rotation.x = -Math.PI / 2; m.position.y = y; m.castShadow = false;
    return m;
  }
  disc(r, spec, y = 0, seg = 24) {
    const m = this.mesh(new THREE.CircleGeometry(r, seg), spec);
    m.rotation.x = -Math.PI / 2; m.position.y = y; m.castShadow = false;
    return m;
  }

  at(m, x, y, z) { m.position.set(x, y, z); return m; }
  group(...children) { const g = new THREE.Group(); children.forEach((c) => g.add(c)); return g; }
}
