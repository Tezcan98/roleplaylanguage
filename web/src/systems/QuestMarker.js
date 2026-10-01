import * as THREE from 'three';

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

  update(dt, t, active) {
    const p = active ? this.resolve() : null;
    this.mesh.visible = !!p;
    if (!p) return;
    this.mesh.position.copy(p);
    this.mesh.position.y += Math.sin(t * 4) * 0.12;
    this.mesh.rotation.y += dt * 2;
  }
}
