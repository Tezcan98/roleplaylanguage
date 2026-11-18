/**
 * A villager who rides along (the first evening's ride with Elif, content/story.js d1-ride): she gets on the
 * horse next to yours and keeps beside you, a little behind, at your pace — she waits when you stop and
 * catches up when you gallop. `start(npcId)` puts her on a free horse of this place, `stop()` takes her off
 * (she stands beside it; the horse walks back to its post on its own).
 */
export class RideCompanion {
  constructor({ animals, cast, player }) {
    Object.assign(this, { animals, cast, player });
    this.on = null;
  }

  get riding() { return !!this.on; }

  start(npcId, place = 'village') {
    if (this.on) return true;
    const npc = this.cast.get(npcId);
    const free = this.animals.horses(place).filter((a) => !a.rider);
    if (!npc || !free.length) return false;
    const horse = free.sort((a, b) => dist(a.group.position, npc.position) - dist(b.group.position, npc.position))[0];
    horse.rider = npc; horse.play?.('idle');
    npc.position.x = horse.group.position.x; npc.position.z = horse.group.position.z; npc.group.rotation.y = horse.group.rotation.y;
    npc.setMount(horse);
    this.on = { npc, horse };
    return true;
  }

  stop() {
    if (!this.on) return;
    const { npc, horse } = this.on;
    this.on = null;
    npc.setMount(null);
    horse.rider = null; horse.target = null; horse.wait = 4;
    const r = horse.group.rotation.y; // she steps down beside it
    npc.position.x = horse.group.position.x + Math.cos(r) * 1.0; npc.position.z = horse.group.position.z - Math.sin(r) * 1.0;
  }

  #sideNow = 1;
  #side(npc, p, h) {
    const at = (k) => ({ x: p.x - Math.sin(h) * 1.6 + Math.cos(h) * 2.2 * k, z: p.z - Math.cos(h) * 1.6 - Math.sin(h) * 2.2 * k });
    const blocked = (q) => { const c = { x: q.x, y: 0, z: q.z }; npc.loc?.collision?.resolve(c, 0.6, []); return Math.hypot(c.x - q.x, c.z - q.z) > 0.2; };
    let want = at(this.#sideNow);
    if (blocked(want)) { const other = at(-this.#sideNow); if (!blocked(other)) { this.#sideNow = -this.#sideNow; want = other; } }
    return want;
  }

  update(dt) {
    if (!this.on) return;
    const { npc } = this.on, p = this.player.position, h = this.player.group.rotation.y;
    // beside the player, a little behind: on the side that is free (a stall or a wall on one side: the other)
    const want = this.#side(npc, p, h);
    const dx = want.x - npc.position.x, dz = want.z - npc.position.z, d = Math.hypot(dx, dz);
    if (d > 0.4) {
      const speed = Math.min(d * 2.2, 11); // a canter to catch up, a walk when near
      const step = Math.min(d, speed * dt);
      npc.position.x += (dx / d) * step; npc.position.z += (dz / d) * step;
      npc.loc?.collision?.resolve(npc.position, 0.5, [[p.x, p.z, 1.2]]);
      npc.turnTo(Math.atan2(dx, dz), 0.15);
    } else {
      npc.turnTo(h, 0.05);
    }
  }
}

const dist = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
