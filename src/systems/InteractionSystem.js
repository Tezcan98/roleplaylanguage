const dist = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);

/** "Talk to X" for NPCs standing near the player. */
export class NpcInteractions {
  constructor({ cast, dialogue }) { Object.assign(this, { cast, dialogue }); }
  find(pos) {
    let best = 2.8, npc = null;
    for (const n of this.cast.present()) { const d = dist(n.position, pos); if (d < best) { best = d; npc = n; } }
    return npc && { label: `${npc.def.short} ile konuş`, dist: best, run: () => this.dialogue.open(npc.id) };
  }
}

/** "Take X" for active quest items in reach. */
export class ItemInteractions {
  constructor({ items }) { this.items = items; }
  find(pos) {
    const it = this.items.pickable(pos);
    return it && { label: it.verb, dist: dist(it.mesh.position, pos), run: () => this.items.pick(it) };
  }
}

/** Doors and other fixed spots; behaviour comes from content rules. */
export class HotspotInteractions {
  constructor({ world, rules, story, travel, toasts }) { Object.assign(this, { world, rules, story, travel, toasts }); }
  find(pos) {
    for (const h of this.world.current.hotspots.values()) {
      const rule = this.rules[h.id];
      if (!rule || dist(h.pos, pos) > h.radius) continue;
      const locked = rule.lockedUntil && !this.story.reached(rule.lockedUntil);
      const d = dist(h.pos, pos);
      if (locked) return { label: rule.lockedLabel ?? rule.label, dist: d, run: () => this.toasts.show(...rule.lockedMsg) };
      return { label: rule.label, dist: d, run: () => this.travel.go(...rule.travel, () => this.story.flushIntro()) };
    }
    return null;
  }
}

/**
 * Asks every provider what the player could do here and offers the closest one.
 * New kinds of interaction = new provider; nothing else changes.
 */
export class InteractionSystem {
  constructor(providers, modes) { this.providers = providers; this.modes = modes; this.current = null; }

  update(playerPos) {
    this.current = null;
    if (!this.modes.is('play')) return null;
    for (const p of this.providers) {
      const a = p.find(playerPos);
      if (a && (!this.current || a.dist < this.current.dist)) this.current = a;
    }
    return this.current;
  }

  trigger() { this.current?.run(); }
}
