const dist = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
const PLAYER_R = 0.35;
const KICK_COOLDOWN = 0.25;   // s between two kicks of the same ball
const WORDS_EVERY = 45;       // s: the "top / vurmak / gol" words and thought at most this often
const SHOT_RANGE = 1.6;       // m: a hard shot reaches a ball this close

/**
 * Moving things the player can play with. The cat is petted with the action button
 * (InteractionSystem provider); balls are physical: walking into one kicks it.
 */
export class ToySystem {
  #last = null;
  #wordsAt = -Infinity;

  constructor({ world, player, free, tts }) {
    Object.assign(this, { world, player, free, tts });
    this.toys = [];
  }

  /**
   * `touch: true` → kicked by running into it; `onKick(toy)` after a kick (multiplayer sync);
   * `quiet: true` → no words or thought on a kick (the square and the schoolyard: just play).
   */
  add(toy, { action, range = 1.4, onUse, touch = false, onKick, quiet = false }) {
    this.toys.push({ toy, action, range, onUse, touch, onKick, quiet, cool: 0 });
    return toy;
  }

  /** The ball close enough for a hard shot (or null). */
  shotBall() {
    if (this.player.seated) return null;
    const p = this.player.position;
    return this.toys.find((e) => e.touch && e.toy.location === this.world.current && dist(e.toy.position, p) < SHOT_RANGE) ?? null;
  }

  /** Hard shot (⚡ button / F key): the ball flies the way the player faces. */
  shoot() {
    const entry = this.shotBall();
    if (!entry) return false;
    const rot = this.player.group.rotation.y;
    entry.toy.shoot(Math.sin(rot), Math.cos(rot));
    entry.cool = KICK_COOLDOWN * 2;
    entry.onKick?.(entry.toy);
    return true;
  }

  find(pos) {
    const here = this.world.current;
    let best = null;
    for (const t of this.toys) {
      if (t.touch || t.toy.location !== here) continue;
      const d = dist(t.toy.position, pos);
      if (d < t.range && (!best || d < best.dist)) {
        best = { label: this.free.label(t.action), dist: d, run: () => { t.onUse(t.toy); this.free.perform(t.action); } };
      }
    }
    return best;
  }

  update(dt, t) {
    const p = this.player.position;
    const speed = this.#last && dt > 0 ? dist(p, this.#last) / dt : 0;
    this.#last = { x: p.x, z: p.z };
    for (const entry of this.toys) {
      const { toy } = entry;
      if (!toy.location.group.visible) continue;
      entry.cool = Math.max(0, entry.cool - dt);
      if (entry.touch && toy.location === this.world.current && !this.player.seated) this.#touch(entry, speed, t);
      toy.update(dt, t, this.player);
    }
  }

  #touch(entry, speed, t) {
    const { toy } = entry, p = this.player.position;
    const d = dist(toy.position, p), reach = toy.radius + PLAYER_R;
    if (d >= reach) return;
    if (speed > 0.5 && entry.cool <= 0) {
      toy.kick(p, Math.min(1, speed / 6));
      entry.cool = KICK_COOLDOWN;
      entry.onKick?.(toy);
      if (!entry.quiet && t - this.#wordsAt > WORDS_EVERY) { this.#wordsAt = t; this.free.perform(entry.action); }
    } else if (d > 1e-4) { // standing still against it: nudge it out of the way instead of walking through
      toy.position.x = p.x + (toy.position.x - p.x) / d * reach;
      toy.position.z = p.z + (toy.position.z - p.z) / d * reach;
    }
  }
}
