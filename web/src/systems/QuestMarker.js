import * as THREE from 'three';

// [up to this many degrees off straight ahead, words] — a pair is [Turkish, English]; ahead and behind have one, the sides one for each hand
const DIRECTIONS = [
  [25, ['tam karşında (ekranda yukarı)', 'straight ahead (up the screen)']],
  [65, [null, ['sol ön tarafında (sol üst)', 'ahead on your left (top left)'], ['sağ ön tarafında (sağ üst)', 'ahead on your right (top right)']]],
  [115, [null, ['sol tarafında', 'on your left'], ['sağ tarafında', 'on your right']]],
  [155, [null, ['sol arkanda (sol alt)', 'behind you on the left (bottom left)'], ['sağ arkanda (sağ alt)', 'behind you on the right (bottom right)']]],
  [181, ['tam arkanda (ekranda aşağı)', 'straight behind you (down the screen)']],
];

/**
 * Golden spinning arrow over the current quest target. If the target is in another
 * location it points at the door that leads there.
 */
export class QuestMarker {
  #tmp = new THREE.Vector3();

  constructor({ scene, story, world, cast, items, player }) {
    Object.assign(this, { story, world, cast, items, player });
    this.mesh = new THREE.Mesh(new THREE.ConeGeometry(0.22, 0.5, 4), new THREE.MeshLambertMaterial({ color: 0xE0B04A, emissive: 0x8A5A12 }));
    this.mesh.rotation.x = Math.PI;
    scene.add(this.mesh);
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
    if (pos || !loc) return pos;
    const door = this.world.exitTowards(loc);
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
    this.mesh.visible = !!p;
    if (!p) return;
    this.mesh.position.copy(p);
    this.mesh.position.y += Math.sin(t * 4) * 0.12;
    this.mesh.rotation.y += dt * 2;
  }
}
