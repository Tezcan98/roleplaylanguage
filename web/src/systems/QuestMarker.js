import * as THREE from 'three';

// [up to this many degrees off straight ahead, words] — a pair is [Turkish, English]; ahead and behind have one, the sides one for each hand
const DIRECTIONS = [
  [25, ['tam karşında (ekranda yukarı)', 'straight ahead (up the screen)']],
  [65, [null, ['sol ön tarafında (sol üst)', 'ahead on your left (top left)'], ['sağ ön tarafında (sağ üst)', 'ahead on your right (top right)']]],
  [115, [null, ['sol tarafında', 'on your left'], ['sağ tarafında', 'on your right']]],
  [155, [null, ['sol arkanda (sol alt)', 'behind you on the left (bottom left)'], ['sağ arkanda (sağ alt)', 'behind you on the right (bottom right)']]],
  [181, ['tam arkanda (ekranda aşağı)', 'straight behind you (down the screen)']],
];

/** A flat arrow, its tip up (+y). */
function arrowShape() {
  const s = new THREE.Shape();
  s.moveTo(-0.16, 0.25); s.lineTo(-0.16, -0.45); s.lineTo(0.16, -0.45); s.lineTo(0.16, 0.25);
  s.lineTo(0.42, 0.25); s.lineTo(0, 0.8); s.lineTo(-0.42, 0.25); s.closePath();
  return s;
}

const holo = (color, opacity) => new THREE.MeshBasicMaterial({ color, transparent: true, opacity, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false, toneMapped: false });

/**
 * Golden spinning arrow over the current quest target. If the target is in another location, a big
 * hologram arrow over the way out that leads there instead (seen from far away), with a ring of light on
 * the ground. `point` is that spot (or null); `atDoor`: it is the way out.
 */
export class QuestMarker {
  #tmp = new THREE.Vector3();
  point = null;
  atDoor = false;
  doorSpot = null; // the hotspot of the way out the arrow shows (when the target is in another place), else null

  constructor({ scene, story, world, cast, items, player }) {
    Object.assign(this, { story, world, cast, items, player });
    this.mesh = new THREE.Mesh(new THREE.ConeGeometry(0.22, 0.5, 4), new THREE.MeshLambertMaterial({ color: 0xE0B04A, emissive: 0x8A5A12 }));
    this.mesh.rotation.x = Math.PI;
    scene.add(this.mesh);
    // the way out: two crossed arrows pointing down (seen from every side), a brighter edge round each
    const flat = new THREE.ShapeGeometry(arrowShape()).rotateZ(Math.PI), edgePts = arrowShape().getPoints().map((v) => new THREE.Vector3(-v.x, -v.y, 0));
    this.exitFill = holo(0x5FE0FF, 0.5);
    const edgeMat = new THREE.LineBasicMaterial({ color: 0xB8F4FF, transparent: true, opacity: 0.95, blending: THREE.AdditiveBlending, depthWrite: false, fog: false, toneMapped: false });
    this.exit = new THREE.Group();
    for (const ry of [0, Math.PI / 2]) {
      const g = new THREE.Group();
      g.add(new THREE.Mesh(flat, this.exitFill), new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(edgePts), edgeMat));
      g.rotation.y = ry;
      this.exit.add(g);
    }
    this.exit.scale.setScalar(1.8);
    this.ring = new THREE.Mesh(new THREE.RingGeometry(0.85, 1.15, 40).rotateX(-Math.PI / 2), holo(0x5FE0FF, 0.6));
    scene.add(this.exit, this.ring);
  }

  /** @returns {THREE.Vector3|null} */
  resolve() {
    const t = this.story.target();
    if (!t) return null;
    const here = this.world.current.id;
    let loc = null, pos = null;
    if (t.npc) {
      const n = this.cast.get(t.npc); loc = n?.location;
      if (loc === here) pos = this.#tmp.copy(n.position).setY(2.75 * n.group.scale.y);
    } else if (t.item || t.kind) {
      const P = this.player.position;
      const candidates = (t.item ? [this.items.get(t.item)] : this.items.ofKind(t.kind)).filter((i) => i && this.items.exists(i));
      candidates.sort((a, b) => a.mesh.position.distanceTo(P) - b.mesh.position.distanceTo(P));
      const it = candidates.find((i) => i.location === here) ?? candidates[0];
      loc = it?.location;
      if (it && loc === here) pos = this.#tmp.copy(it.mesh.position).setY(it.mesh.position.y + 0.8);
    } else if (t.hotspot) {
      const h = this.world.all().map((l) => l.hotspots.get(t.hotspot)).find(Boolean);
      loc = h?.location;
      if (h && loc === here) pos = this.#tmp.copy(h.pos).setY(h.markerY);
    }
    this.atDoor = !pos && !!loc;
    this.doorSpot = null;
    if (pos || !loc) return pos;
    const door = this.world.exitTowards(loc);
    this.doorSpot = door ?? null;
    return door ? this.#tmp.copy(door.pos).setY(door.markerY) : null;
  }

  /**
   * Words for "where to go", from where the player stands and how the view is turned (left / right are the
   * screen's): { name, here: bool, place, dir, en, metres, door }. Null when there is no target or it can't be found.
   * @param {number} yaw  the camera's turn (engine/CameraController.js)
   */
  describe(yaw = 0) {
    const t = this.story.target();
    if (!t) return null;
    const here = this.world.current, P = this.player.position;
    let loc = null, name = '', spot = null;
    if (t.npc) {
      const n = this.cast.get(t.npc); loc = n?.location; name = n?.name ?? '';
      if (n && loc === here.id) spot = n.position;
    } else if (t.item || t.kind) {
      const list = (t.item ? [this.items.get(t.item)] : this.items.ofKind(t.kind)).filter((i) => i && this.items.exists(i));
      list.sort((a, b) => a.mesh.position.distanceTo(P) - b.mesh.position.distanceTo(P));
      const it = list.find((i) => i.location === here.id) ?? list[0];
      loc = it?.location; name = it?.name ?? '';
      if (it && loc === here.id) spot = it.mesh.position;
    } else if (t.hotspot) {
      const h = this.world.all().map((l) => l.hotspots.get(t.hotspot)).find(Boolean);
      loc = h?.location;
      if (h && loc === here.id) spot = h.pos;
    }
    if (!loc) return null;
    const there = this.world.get(loc);
    const aim = spot ?? this.world.exitTowards(loc)?.pos;
    if (!aim) return null;
    const dx = aim.x - P.x, dz = aim.z - P.z, c = Math.cos(yaw), s = Math.sin(yaw);
    const sx = dx * c + dz * s, sz = -dx * s + dz * c; // on the screen: x to the right, z down
    const turn = Math.atan2(sx, -sz) * 180 / Math.PI; // 0: straight ahead (up the screen), 90: right, ±180: behind
    const dir = DIRECTIONS.find(([max]) => Math.abs(turn) <= max) ?? DIRECTIONS.at(-1);
    const side = turn < 0 ? 1 : 2; // [1] left words, [2] right words (ahead and behind have one)
    const words = dir[1].length === 2 ? dir[1] : dir[1][side];
    return { name, here: !!spot, place: there?.name ?? '', from: here.name, dir: words[0], en: words[1], metres: Math.round(Math.hypot(dx, dz)), near: Math.hypot(dx, dz) < 3 };
  }

  update(dt, t, active) {
    const p = active ? this.resolve() : null;
    this.point = p && (this.point ?? new THREE.Vector3()).copy(p);
    const door = !!p && this.atDoor;
    this.mesh.visible = !!p && !door;
    this.exit.visible = this.ring.visible = door;
    if (!p) return;
    if (door) {
      this.exit.position.set(p.x, p.y + 1.1 + Math.sin(t * 3) * 0.18, p.z);
      this.exit.rotation.y += dt * 0.8;
      this.exitFill.opacity = 0.45 + Math.sin(t * 6) * 0.1 + (Math.random() < 0.04 ? 0.2 : 0); // (a hologram's flicker)
      this.ring.position.set(p.x, 0.06, p.z);
      this.ring.scale.setScalar(1 + ((t * 0.8) % 1) * 0.5);
      this.ring.material.opacity = 0.7 * (1 - ((t * 0.8) % 1));
      return;
    }
    this.mesh.position.copy(p);
    this.mesh.position.y += Math.sin(t * 4) * 0.12;
    this.mesh.rotation.y += dt * 2;
  }
}
