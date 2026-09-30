const dist = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);

/**
 * Moving things the player can play with (ball, cat). Also acts as an interaction
 * provider for InteractionSystem.
 */
export class ToySystem {
  constructor({ world, player, free, tts }) {
    Object.assign(this, { world, player, free, tts });
    this.toys = [];
  }

  add(toy, { action, range = 1.4, onUse }) { this.toys.push({ toy, action, range, onUse }); return toy; }

  find(pos) {
    const here = this.world.current;
    let best = null;
    for (const t of this.toys) {
      if (t.toy.location !== here) continue;
      const d = dist(t.toy.position, pos);
      if (d < t.range && (!best || d < best.dist)) {
        best = { label: this.free.label(t.action), dist: d, run: () => { t.onUse(t.toy); this.free.perform(t.action); } };
      }
    }
    return best;
  }

  update(dt, t) { this.toys.forEach(({ toy }) => { if (toy.location.group.visible) toy.update(dt, t, this.player); }); }
}
