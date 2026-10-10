import * as THREE from 'three';

/** Grass tufts and flowers as instanced meshes, swaying in the wind (vertex shader). */
export class Foliage {
  static #wind = { value: 0 };

  static tick(t) { Foliage.#wind.value = t; }

  /** Patch a material so vertices above the ground sway with world position and time. */
  static #sway(mat, strength) {
    mat.onBeforeCompile = (shader) => {
      shader.uniforms.uTime = Foliage.#wind;
      shader.vertexShader = `uniform float uTime;\n${shader.vertexShader}`.replace('#include <begin_vertex>', `#include <begin_vertex>
        vec4 wp = instanceMatrix * vec4(0., 0., 0., 1.);
        float w = sin(uTime * 1.8 + wp.x * 0.35 + wp.z * 0.25) * 0.5 + sin(uTime * 3.1 + wp.x) * 0.2;
        transformed.x += w * ${strength.toFixed(2)} * position.y;
        transformed.z += w * ${(strength * 0.5).toFixed(2)} * position.y;`);
    };
    return mat;
  }

  static #tuftGeometry() {
    const blades = [];
    for (let i = 0; i < 4; i++) {
      const g = new THREE.PlaneGeometry(0.08, 0.42, 1, 2);
      const pos = g.attributes.position;
      for (let v = 0; v < pos.count; v++) if (pos.getY(v) > 0.1) pos.setX(v, pos.getX(v) * 0.15); // pointy tip
      g.translate(0, 0.21, 0);
      g.rotateZ((Math.random() - 0.5) * 0.5);
      g.rotateY(i / 4 * Math.PI + Math.random() * 0.4);
      g.translate((Math.random() - 0.5) * 0.12, 0, (Math.random() - 0.5) * 0.12);
      blades.push(g);
    }
    const merged = mergeGeometries(blades);
    const colors = new Float32Array(merged.attributes.position.count * 3);
    const base = new THREE.Color(0x4E8A2F), tip = new THREE.Color(0xA7D46C), c = new THREE.Color();
    for (let v = 0; v < merged.attributes.position.count; v++) {
      c.copy(base).lerp(tip, Math.min(1, merged.attributes.position.getY(v) / 0.42));
      colors.set([c.r, c.g, c.b], v * 3);
    }
    merged.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    return merged;
  }

  /**
   * Scatter grass and flowers inside `area` avoiding `blocked(x, z)`. A big area is cut into
   * cells of about `cell` metres, each its own instanced mesh, so what the camera doesn't see
   * isn't drawn (one mesh for a whole yard was drawn in full from anywhere).
   * @returns {THREE.Group}
   */
  static meadow({ area, count = 5000, flowers = 400, blocked = () => false, cell = 16 }) {
    const W = area.x[1] - area.x[0], D = area.z[1] - area.z[0];
    const nx = Math.max(1, Math.round(W / cell)), nz = Math.max(1, Math.round(D / cell));
    if (nx * nz > 1) {
      const g = new THREE.Group();
      for (let i = 0; i < nx; i++) for (let k = 0; k < nz; k++) {
        const sub = { x: [area.x[0] + W * i / nx, area.x[0] + W * (i + 1) / nx], z: [area.z[0] + D * k / nz, area.z[0] + D * (k + 1) / nz] };
        g.add(Foliage.meadow({ area: sub, count: Math.round(count / (nx * nz)), flowers: Math.round(flowers / (nx * nz)), blocked, cell: Infinity }));
      }
      return g;
    }
    const g = new THREE.Group();
    const place = (n, mesh, scale) => {
      const m = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3(), p = new THREE.Vector3();
      let i = 0;
      for (let tries = 0; i < n && tries < n * 4; tries++) {
        const x = area.x[0] + Math.random() * (area.x[1] - area.x[0]), z = area.z[0] + Math.random() * (area.z[1] - area.z[0]);
        if (blocked(x, z)) continue;
        q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.random() * Math.PI * 2);
        s.setScalar(scale[0] + Math.random() * (scale[1] - scale[0]));
        mesh.setMatrixAt(i++, m.compose(p.set(x, 0, z), q, s));
      }
      mesh.count = i;
      mesh.instanceMatrix.needsUpdate = true;
      mesh.computeBoundingSphere?.(); // (for frustum culling: only this cell's tufts)
      mesh.receiveShadow = true;
      g.add(mesh);
      return mesh;
    };
    const grassMat = Foliage.#sway(new THREE.MeshLambertMaterial({ vertexColors: true, side: THREE.DoubleSide }), 0.35);
    place(count, new THREE.InstancedMesh(Foliage.#tuftGeometry(), grassMat, count), [0.7, 1.4]);

    const stem = new THREE.CylinderGeometry(0.012, 0.012, 0.3, 4).translate(0, 0.15, 0);
    const head = new THREE.IcosahedronGeometry(0.06, 0).translate(0, 0.32, 0);
    const flowerGeo = mergeGeometries([stem, head]);
    const fc = new Float32Array(flowerGeo.attributes.position.count * 3).fill(1);
    const stemCount = stem.index.count;
    for (let v = 0; v < stemCount; v++) fc.set([0.3, 0.55, 0.2], v * 3);
    flowerGeo.setAttribute('color', new THREE.BufferAttribute(fc, 3));
    const flowerMesh = new THREE.InstancedMesh(flowerGeo, Foliage.#sway(new THREE.MeshLambertMaterial({ vertexColors: true }), 0.25), flowers);
    place(flowers, flowerMesh, [0.8, 1.3]);
    const palette = [0xE4574A, 0xF4D03F, 0xFFFFFF, 0x9B59B6, 0xF7A8B8].map((h) => new THREE.Color(h));
    for (let i = 0; i < flowerMesh.count; i++) flowerMesh.setColorAt(i, palette[i % palette.length]);
    if (flowerMesh.instanceColor) flowerMesh.instanceColor.needsUpdate = true;
    return g;
  }
}

/** Minimal merge (same attributes, non-indexed or indexed) to avoid another import. */
function mergeGeometries(list) {
  const geos = list.map((g) => (g.index ? g.toNonIndexed() : g));
  const names = Object.keys(geos[0].attributes);
  const out = new THREE.BufferGeometry();
  for (const n of names) {
    const size = geos[0].attributes[n].itemSize;
    const arr = new Float32Array(geos.reduce((s, g) => s + g.attributes[n].array.length, 0));
    let o = 0;
    for (const g of geos) { arr.set(g.attributes[n].array, o); o += g.attributes[n].array.length; }
    out.setAttribute(n, new THREE.BufferAttribute(arr, size));
  }
  return out;
}
