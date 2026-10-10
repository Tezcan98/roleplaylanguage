import { EV } from '../core/events.js';

const dist = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);

/** "Talk to X" for NPCs near the player; the quest's target person wins when in range (e.g. around the sofra). */
export class NpcInteractions {
  constructor({ cast, dialogue, story }) { Object.assign(this, { cast, dialogue, story }); }
  find(pos) {
    const range = 2.8, wanted = this.story?.target()?.npc;
    let best = null;
    for (const n of this.cast.present()) {
      const d = dist(n.position, pos);
      if (d >= range) continue;
      const isTarget = n.id === wanted;
      if (!best || (isTarget && !best.isTarget) || (isTarget === best.isTarget && d < best.d)) best = { n, d, isTarget };
    }
    if (!best) return null;
    const { n, d, isTarget } = best;
    // people right next to you outrank free-roam spots; from further away the closest thing wins
    const priority = isTarget ? 1.5 : d < 0.9 ? 1 : 0;
    return { label: `${n.def.short} ile konuş`, dist: d, priority, run: () => this.dialogue.open(n.id) };
  }
}

/** "Take X" for active quest items in reach. */
export class ItemInteractions {
  constructor({ items }) { this.items = items; }
  find(pos) {
    const it = this.items.pickable(pos);
    return it && { label: it.verb, dist: dist(it.mesh.position, pos), priority: 2, run: () => this.items.pick(it) };
  }
}

/**
 * Doors, beds, the TV… Behaviour comes from content rules:
 * `{ label, travel?: [loc, anchor], use?: effects[], available?(ctx), locked?(ctx) → [msg, en] | null }`.
 */
export class HotspotInteractions {
  constructor({ world, rules, story, travel, toasts, effects, bus, ctx }) {
    Object.assign(this, { world, rules, story, travel, toasts, effects, bus, ctx });
  }

  find(pos) {
    let best = null;
    for (const h of this.world.current.hotspots.values()) {
      const rule = this.rules[h.id];
      const d = dist(h.pos, pos);
      if (!rule || d > h.radius || rule.available?.(this.ctx) === false) continue;
      // the current quest's target wins; free-roam fun yields to story actions
      const priority = this.story.target()?.hotspot === h.id ? 2 : rule.use?.every((e) => e.startsWith('free:')) ? 0 : 1;
      if (best && (best.priority > priority || (best.priority === priority && best.dist < d))) continue;
      const label = typeof rule.label === 'function' ? rule.label(this.ctx) : rule.label;
      const locked = rule.locked?.(this.ctx);
      best = locked
        ? { label: rule.lockedLabel ?? label, dist: d, priority, run: () => this.toasts.show(...locked) }
        : { label, dist: d, priority, run: () => this.use(h.id, rule) };
    }
    return best;
  }

  use(id, rule) {
    this.bus.emit(EV.HOTSPOT, { id });
    if (rule.travel) this.travel.go(...rule.travel, () => this.story.flushIntro());
    if (rule.use) this.effects.run(rule.use);
  }
}

/**
 * Asks every provider what the player could do here and offers the most important,
 * then closest one (priority: quest item / quest hotspot 2 > people and doors 1 > free-roam fun 0).
 * New kinds of interaction = new provider; nothing else changes.
 */
export class InteractionSystem {
  constructor(providers, modes) { this.providers = providers; this.modes = modes; this.current = null; this.others = []; }

  update(playerPos) {
    this.current = null;
    this.others = [];
    if (!this.modes.is('play')) return null;
    const all = [];
    for (const p of this.providers) {
      const a = p.find(playerPos);
      if (a) all.push(a);
    }
    all.sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0) || a.dist - b.dist);
    this.current = all[0] ?? null;
    // the next things you could do here too (another person came up while you talk to someone…): their own buttons
    this.others = all.slice(1).filter((a, i, list) => a.label !== this.current.label && list.findIndex((b) => b.label === a.label) === i).slice(0, 2);
    return this.current;
  }

  trigger() { this.current?.run(); }
}
