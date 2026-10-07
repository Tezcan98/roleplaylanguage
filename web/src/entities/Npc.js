import { Character } from './Character.js';
import { Behaviors } from './Behaviors.js';

/**
 * Villagers are HD characters on the square (Character.setHd), blocky everywhere else — only for
 * a player who is HD too (bought in the shop): `HD_VILLAGERS.on`, set by main.js.
 */
export const HD_PLACES = new Set(['village']);
export const HD_VILLAGERS = { on: false };
/** The HD model and dressing for a villager's blocky look. */
export function villagerHd(look) {
  const woman = !!(look.skirt || look.headscarf || look.bun);
  return {
    key: woman ? 'hd.casual.girl' : look.vest ? 'hd.suit.boy' : 'hd.casual.boy',
    opts: { covered: !!look.headscarf, scarfColor: look.headscarf ?? null, dress: !!look.skirt, look },
  };
}

/** A non-player character: stands at an anchor in a location and runs a behaviour. */
export class Npc extends Character {
  constructor(id, def, deps) {
    super(id, def.look, deps);
    this.def = def;
    this.location = null;
    this.home = { x: 0, z: 0, rot: 0 };
    this.behavior = Behaviors.stand;
    this.talking = false;
    this.roam = { leg: 0, wait: 1, jumping: false };
  }

  get name() { return this.def.name; }

  /** Seated characters turn only their head towards the player. */
  #headTowards(player) {
    let d = Math.atan2(player.position.x - this.position.x, player.position.z - this.position.z) - this.group.rotation.y;
    while (d > Math.PI) d -= Math.PI * 2;
    while (d < -Math.PI) d += Math.PI * 2;
    return d;
  }

  /** Put the NPC somewhere. Only called behind a fade or while the player is elsewhere. */
  station(location, anchor, behaviorName = 'stand') {
    this.location = location.id;
    this.loc = location;
    this.home = location.anchors.get(anchor);
    if (!this.home) throw new Error(`${this.id}: unknown anchor ${location.id}.${anchor}`);
    this.place(this.home);
    this.setBehavior(behaviorName);
    this.#hdFor(location.id);
  }

  /** After the player became HD (or stopped being): the villagers follow. */
  refreshHd() { if (this.location) this.#hdFor(this.location); }

  /** HD on the square, blocky elsewhere; sitting behaviours sit the HD body down. */
  #hdFor(place) {
    const on = HD_VILLAGERS.on && HD_PLACES.has(place);
    if (!on && !this.hdOn) return;
    this.hdOn = on;
    const { key, opts } = villagerHd(this.appearance);
    this.seated = on && !!this.behavior.seated;
    this.setHd(this.models, key, on, opts);
  }

  setBehavior(name) {
    const r = this.rig;
    r.body.position.y = 0;
    r.body.position.z = 0;
    r.body.rotation.x = 0;
    r.head.rotation.y = 0;
    r.armL.rotation.z = r.armR.rotation.z = 0;
    r.legL.rotation.x = r.legR.rotation.x = 0;
    Object.keys(r.props).forEach((p) => this.showProp(p, false));
    this.behavior = Behaviors[name] ?? Behaviors.stand;
    (this.behavior.props || []).forEach((p) => this.showProp(p, true));
    if (this.hdOn) { this.seated = !!this.behavior.seated; this.replayHd(); }
  }

  /**
   * Walk the route: go to each stop, wait there (jump on the bed, or strike the stop's
   * `pose`, facing `rot`), then on to the next. Stops with `wait: 0` are just waypoints.
   */
  #roam(dt, t) {
    const b = this.behavior, route = this.def[b.routeKey ?? 'route'], st = this.roam;
    if (!route?.length) return;
    const stop = route[st.leg % route.length];
    const dx = stop.x - this.position.x, dz = stop.z - this.position.z, d = Math.hypot(dx, dz);
    if (d > 0.05) {
      const step = Math.min(d, 1.3 * dt);
      this.position.x += (dx / d) * step; this.position.z += (dz / d) * step;
      this.turnTo(Math.atan2(dx, dz), 0.2);
      b.pose(this.rig, t);
      this.walk(t, 1);
      this.position.y = 0;
      st.jumping = false;
      return;
    }
    st.wait -= dt;
    st.jumping = !!stop.jump;
    if (stop.rot !== undefined) this.turnTo(stop.rot, 0.2);
    if (stop.jump) { this.position.y = 0.42 + Math.abs(Math.sin(t * 6)) * 0.45; b.jump(this.rig, t); } // on the bed
    else { this.position.y = 0; this.walk(t, 0); b.poses?.[stop.pose]?.(this.rig, t); }
    if (st.wait <= 0) { st.leg++; st.wait = route[st.leg % route.length].wait ?? 1 + Math.random() * 2; }
  }

  /**
   * A child out in the garden with you, but free: he plays on his own (runs to a spot, hops,
   * looks around, runs somewhere else) and only now and then comes over to you for a moment.
   */
  #follow(dt, t, player) {
    const st = this.roam;
    st.visitIn = (st.visitIn ?? 25 + Math.random() * 25) - dt;
    if (st.visitIn < 0) { st.visit = 6 + Math.random() * 4; st.visitIn = 35 + Math.random() * 30; st.target = null; }
    if (st.visit > 0) { st.visit -= dt; this.#goTo(player.position, 1.8, dt, t, player) || this.#idle(dt, t, player.position); return; }
    if (!st.target) { // somewhere to play in this place
      const b = this.loc?.collision?.bounds ?? { x: [-6, 6], z: [-6, 6] };
      st.target = { x: b.x[0] + 1 + Math.random() * (b.x[1] - b.x[0] - 2), z: b.z[0] + 1 + Math.random() * (b.z[1] - b.z[0] - 2) };
      st.wait = 3 + Math.random() * 4;
    }
    if (this.#goTo(st.target, 0.4, dt, t, player)) return;
    st.wait -= dt;
    this.#idle(dt, t, null);
    if (st.wait <= 0) st.target = null;
  }

  /** Run towards `p` until `near` metres away; true while still running. */
  #goTo(p, near, dt, t, player) {
    const dx = p.x - this.position.x, dz = p.z - this.position.z, d = Math.hypot(dx, dz);
    if (d <= near) return false;
    const step = Math.min(d - near, Math.min(5, 1.5 + d) * dt);
    const before = { x: this.position.x, z: this.position.z };
    this.position.x += (dx / d) * step; this.position.z += (dz / d) * step;
    this.loc?.collision?.resolve(this.position, 0.25, [[player.position.x, player.position.z, 0.6]]);
    if (Math.hypot(this.position.x - before.x, this.position.z - before.z) < step * 0.2 && this.roam.target) this.roam.target = null; // stuck on something: play elsewhere
    this.turnTo(Math.atan2(dx, dz), 0.2);
    this.walk(t, 1);
    this.position.y = 0;
    return true;
  }

  /** Standing about: a happy hop now and then, looking at `look` if given. */
  #idle(dt, t, look) {
    if (look) this.faceTowards(look, 0.08);
    const hop = Math.sin(t * 0.9 + this.position.x) > 0.93;
    if (hop) { this.position.y = Math.abs(Math.sin(t * 6)) * 0.3; this.behavior.jump(this.rig, t); return; }
    this.position.y = 0;
    this.walk(t, 0);
  }

  update(dt, t, player) {
    super.update(dt);
    if (this.behavior.roam && !this.talking) { this.#roam(dt, t); return; }
    if (this.behavior.follow && !this.talking) { this.#follow(dt, t, player); return; }
    if (this.behavior.roam || this.behavior.follow) { this.position.y = 0; this.roam.jumping = false; }
    const b = this.behavior, near = b.turnToPlayerWithin && Math.hypot(player.position.x - this.position.x, player.position.z - this.position.z) < b.turnToPlayerWithin;
    if (this.talking || near) {
      if (!b.seated) this.faceTowards(player.position, 0.15);
      (b.talk ?? Behaviors.stand.pose)(this.rig, t);
    } else {
      this.turnTo(this.home.rot, 0.05);
      b.pose(this.rig, t);
    }
    this.rig.head.position.y = 1.84 + (this.talking ? Math.abs(Math.sin(t * 8)) * 0.02 : 0);
    if (b.ownsHead) return;
    if (b.seated && this.talking) this.rig.head.rotation.y = Math.max(-0.9, Math.min(0.9, this.#headTowards(player)));
    else this.rig.head.rotation.y *= 0.9;
  }
}
