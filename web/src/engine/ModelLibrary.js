import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { clone as cloneSkinned } from 'three/addons/utils/SkeletonUtils.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';

/**
 * Loads GLB models listed in assets/manifest.json. Each entry is either a path string or
 * `{ path, rotateY, fit }`. Unlisted ids simply have no model and keep their procedural look.
 */
export class ModelLibrary {
  #loader = new GLTFLoader().setMeshoptDecoder(MeshoptDecoder); // gltf-transform --compress meshopt
  #cache = new Map();

  constructor(entries = {}) {
    this.entries = Object.fromEntries(
      Object.entries(entries).filter(([, v]) => v).map(([k, v]) => [k, typeof v === 'string' ? { path: v } : v]),
    );
  }

  has(id) { return id in this.entries; }
  options(id) { return this.entries[id] ?? {}; }

  /** @returns {Promise<{scene: THREE.Object3D, animations: THREE.AnimationClip[]}>} a fresh clone */
  async load(id) {
    const e = this.entries[id];
    if (!e) throw new Error(`No model for ${id}`);
    if (!this.#cache.has(id)) this.#cache.set(id, this.#loader.loadAsync(e.path));
    const gltf = await this.#cache.get(id);
    const scene = cloneSkinned(gltf.scene);
    scene.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
    if (e.rotateY) scene.rotation.y = THREE.MathUtils.degToRad(e.rotateY);
    return { scene, animations: gltf.animations };
  }
}

/** Scale and move `model` so it sits inside `box` (bottom-centre aligned). */
export function fitToBox(model, box, mode = 'contain') {
  const holder = new THREE.Group();
  holder.add(model);
  const mb = new THREE.Box3().setFromObject(holder);
  const ms = mb.getSize(new THREE.Vector3());
  const rs = box.getSize(new THREE.Vector3());
  const k = mode === 'height'
    ? rs.y / Math.max(ms.y, 1e-4)
    : Math.min(rs.x / Math.max(ms.x, 1e-4), rs.y / Math.max(ms.y, 1e-4), rs.z / Math.max(ms.z, 1e-4));
  holder.scale.setScalar(k);
  const c = mb.getCenter(new THREE.Vector3()).multiplyScalar(k);
  const rc = box.getCenter(new THREE.Vector3());
  holder.position.set(rc.x - c.x, box.min.y - mb.min.y * k, rc.z - c.z);
  return holder;
}

/**
 * Builds props through a fallback-first pipeline: the procedural mesh is shown at once,
 * and if a GLB with the same id exists it replaces the fallback, fitted to the same size.
 */
export class PropFactory {
  constructor(models) { this.models = models; }

  create(id, buildFallback) {
    const holder = new THREE.Group();
    holder.name = id;
    const fallback = buildFallback();
    holder.add(fallback);
    if (!this.models.has(id)) return holder;
    holder.userData.live = true; // swapped for the model when it loads (not batched)
    fallback.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(fallback);
    this.models.load(id).then(({ scene }) => {
      const opts = this.models.options(id);
      holder.remove(fallback);
      holder.add(opts.fit === 'none' ? scene : fitToBox(scene, box, opts.fit));
    }).catch((e) => console.warn(`[models] ${id}:`, e.message));
    return holder;
  }
}
