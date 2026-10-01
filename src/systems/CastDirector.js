/**
 * Places NPCs according to the chapter's cast list and keeps them updated.
 * Characters only change place when a chapter starts (behind the fade) — nobody teleports
 * in front of the player.
 */
export class CastDirector {
  constructor({ npcs, world, player }) {
    this.npcs = npcs;            // Map id → Npc
    this.world = world;
    this.player = player;
    npcs.forEach((n) => world.scene.add(n.group));
  }

  /** @param {Record<string, [locationId: string, anchor: string, behavior?: string] | null>} cast */
  apply(cast) {
    this.npcs.forEach((npc, id) => {
      const spot = cast[id];
      if (!spot) { npc.location = null; return; }
      const [loc, anchor, behavior] = spot;
      npc.station(this.world.get(loc), anchor, behavior);
    });
    this.refreshVisibility();
  }

  /** Move one character (only while the player can't see it happen, e.g. behind a fade). */
  move(id, locId, anchor, behavior) {
    this.npcs.get(id).station(this.world.get(locId), anchor, behavior);
    this.refreshVisibility();
  }

  get(id) { return this.npcs.get(id); }
  present(locId = this.world.current?.id) { return [...this.npcs.values()].filter((n) => n.location === locId); }
  where(id) { return this.npcs.get(id)?.location ?? null; }
  obstacles(locId) { return this.present(locId).map((n) => [n.position.x, n.position.z, 0.45]); }

  refreshVisibility() {
    const here = this.world.current?.id;
    this.npcs.forEach((n) => { n.visible = n.location === here; });
  }

  update(dt, t) { this.present().forEach((n) => n.update(dt, t, this.player)); }
}
