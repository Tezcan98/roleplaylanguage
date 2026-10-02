import { Character } from './Character.js';
import { Behaviors } from './Behaviors.js';

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

  /** Stay near the player: catch up when they walk off, hop about while they stand still. */
  #follow(dt, t, player) {
    const dx = player.position.x - this.position.x, dz = player.position.z - this.position.z, d = Math.hypot(dx, dz);
    const st = this.roam;
    if (d > 2.2) {
      const step = Math.min(d - 1.8, Math.min(6, 1.5 + d) * dt);
      this.position.x += (dx / d) * step; this.position.z += (dz / d) * step;
      this.loc?.collision?.resolve(this.position, 0.25, [[player.position.x, player.position.z, 0.6]]);
      this.turnTo(Math.atan2(dx, dz), 0.2);
      this.walk(t, 1);
      this.position.y = 0;
      st.wait = 2 + Math.random() * 3;
      return;
    }
    this.faceTowards(player.position, 0.08);
    st.wait -= dt;
    if (st.wait < 0 && st.wait > -1.2) { this.position.y = Math.abs(Math.sin(t * 6)) * 0.3; this.behavior.jump(this.rig, t); return; } // a happy hop
    if (st.wait <= -1.2) st.wait = 2 + Math.random() * 3;
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
