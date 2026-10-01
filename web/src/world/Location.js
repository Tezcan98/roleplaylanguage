import * as THREE from 'three';
import { CollisionWorld } from '../engine/CollisionWorld.js';

/**
 * A place the player can be in. Subclasses only describe geometry, colliders, named anchors
 * (spots where characters stand) and hotspots (spots where something can be done).
 * What a hotspot *does* lives in content, not here.
 */
export class Location {
  constructor({ id, name, indoor = false, bounds, cameraRig = indoor ? 'indoor' : 'outdoor', cameraMaxZ, spawn = 'door' }) {
    Object.assign(this, { id, name, indoor, cameraRig, cameraMaxZ });
    /** Anchor used when a saved game resumes here. */
    this.spawn = spawn;
    this.group = new THREE.Group();
    this.group.name = id;
    this.group.visible = false;
    this.collision = new CollisionWorld(bounds);
    this.anchors = new Map();
    this.hotspots = new Map();
    this.lamps = [];
    this.windows = [];
    this.glows = [];
    this.animated = [];
  }

  /** @param {{mf: import('../engine/MeshFactory.js').MeshFactory, props: import('../engine/ModelLibrary.js').PropFactory}} kit */
  build(kit) { throw new Error(`${this.constructor.name}.build() not implemented`); }

  add(obj) { this.group.add(obj); return obj; }

  /** Add a swappable prop (procedural now, GLB later) at x,y,z with rotation ry. */
  prop(kit, id, x, y, z, ry, build) {
    const p = kit.props.create(id, build);
    p.position.set(x, y, z);
    p.rotation.y = ry || 0;
    return this.add(p);
  }

  anchor(name, x, z, rot = 0) { this.anchors.set(name, { x, z, rot }); }
  hotspot(id, x, z, radius = 1.8, markerY = 2.4) {
    this.hotspots.set(id, { id, location: this.id, pos: new THREE.Vector3(x, 0, z), radius, markerY });
  }

  setActive(on) { this.group.visible = on; }
  /** Short visual effect for a free action ('tv', 'water'…); locations override as needed. */
  play(anim) {}
  update(dt, t) { this.animated.forEach((fn) => fn(dt, t)); }
}
