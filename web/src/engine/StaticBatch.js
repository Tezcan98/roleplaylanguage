import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

/**
 * Static batching: every mesh under `root` that never changes after it is built is merged into
 * one mesh per material (and shadow flags). A place built from hundreds of boxes, spheres and
 * cylinders then costs a few dozen draw calls instead of a thousand or two (each one drawn again
 * for the sun's shadow) — on phones that was the main cause of stutter.
 *
 * Left as they are: hidden subtrees (shown later), anything marked `userData.live` (moved, shown
 * or hidden, swapped for a model later), skinned and instanced meshes, transparent materials,
 * vertex colours and multi-material meshes.
 * @returns {{ before: number, after: number }} mesh counts
 */
export function bakeStatic(root) {
  root.updateMatrixWorld(true);
  const toRoot = new THREE.Matrix4().copy(root.matrixWorld).invert();
  const groups = new Map(), taken = [];
  const walk = (o) => {
    if (!o.visible || o.userData.live) return;
    if (o.isMesh && ok(o)) {
      const key = `${o.material.uuid}|${o.castShadow ? 1 : 0}${o.receiveShadow ? 1 : 0}`;
      let geo = o.geometry.index ? o.geometry.toNonIndexed() : o.geometry.clone();
      geo.applyMatrix4(new THREE.Matrix4().multiplyMatrices(toRoot, o.matrixWorld));
      geo = clean(geo);
      if (o.matrixWorld.determinant() < 0) flip(geo); // mirrored: keep the faces pointing out
      const g = groups.get(key) ?? { mat: o.material, cast: o.castShadow, receive: o.receiveShadow, geos: [] };
      g.geos.push(geo); groups.set(key, g);
      taken.push(o);
    }
    for (const c of [...o.children]) walk(c);
  };
  for (const c of [...root.children]) walk(c);
  if (taken.length < 2) return { before: taken.length, after: taken.length };
  for (const o of taken) o.parent.remove(o);
  const out = new THREE.Group(); out.name = 'static';
  for (const { mat, cast, receive, geos } of groups.values()) {
    const merged = geos.length === 1 ? geos[0] : mergeGeometries(geos);
    if (!merged) continue;
    const m = new THREE.Mesh(merged, mat);
    m.castShadow = cast; m.receiveShadow = receive; m.matrixAutoUpdate = false;
    out.add(m);
  }
  root.add(out);
  return { before: taken.length, after: groups.size };
}

function ok(o) {
  const m = o.material;
  return !o.isSkinnedMesh && !o.isInstancedMesh && !Array.isArray(m) && m && !m.transparent && !m.vertexColors
    && o.geometry?.attributes?.position && !Object.keys(o.geometry.morphAttributes ?? {}).length;
}

/** Only position, normal and uv, so every piece can be merged with the others. */
function clean(geo) {
  const g = new THREE.BufferGeometry();
  if (!geo.attributes.normal) geo.computeVertexNormals();
  g.setAttribute('position', geo.attributes.position);
  g.setAttribute('normal', geo.attributes.normal);
  g.setAttribute('uv', geo.attributes.uv ?? new THREE.Float32BufferAttribute(new Float32Array(geo.attributes.position.count * 2), 2));
  return g;
}

/** Reverses the winding of every triangle (non-indexed). */
function flip(geo) {
  for (const a of Object.values(geo.attributes)) {
    const n = a.itemSize, arr = a.array;
    for (let i = 0; i < a.count; i += 3) for (let k = 0; k < n; k++) { const t = arr[(i + 1) * n + k]; arr[(i + 1) * n + k] = arr[(i + 2) * n + k]; arr[(i + 2) * n + k] = t; }
  }
}
