import * as THREE from 'three';

/**
 * Primitive + material helpers shared by every procedural builder.
 * A material spec is either a hex colour or `{ tex, repeat, color }`.
 */
export class MeshFactory {
  #materials = new Map();

  constructor(textures) { this.textures = textures; }

  mat(spec, extra = {}) {
    const key = JSON.stringify([spec, extra]);
    if (this.#materials.has(key)) return this.#materials.get(key);
    let m;
    if (typeof spec === 'number') {
      m = new THREE.MeshLambertMaterial({ color: spec, ...extra });
    } else {
      const { tex, repeat = [1, 1], color = 0xffffff } = spec;
      m = new THREE.MeshLambertMaterial({ color, map: this.textures.get(tex, repeat), ...extra });
    }
    this.#materials.set(key, m);
    return m;
  }

  /** A fresh (uncached) material, for things whose colour changes at runtime. */
  uniqueMat(color, extra = {}) { return new THREE.MeshLambertMaterial({ color, ...extra }); }

  shadow(m, cast = true) { m.castShadow = cast; m.receiveShadow = true; return m; }
  mesh(geo, spec) { return this.shadow(new THREE.Mesh(geo, spec instanceof THREE.Material ? spec : this.mat(spec))); }

  box(w, h, d, spec) { return this.mesh(new THREE.BoxGeometry(w, h, d), spec); }
  sphere(r, spec, seg = 12) { return this.mesh(new THREE.SphereGeometry(r, seg, Math.max(6, (seg * 0.75) | 0)), spec); }
  cyl(rt, rb, h, spec, seg = 10) { return this.mesh(new THREE.CylinderGeometry(rt, rb, h, seg), spec); }
  cone(r, h, spec, seg = 8) { return this.mesh(new THREE.ConeGeometry(r, h, seg), spec); }
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
