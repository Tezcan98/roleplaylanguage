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

  /** Walk the route: go to each stop, wait there (or jump on the bed), then on to the next. */
  #roam(dt, t) {
    const route = this.def.route, st = this.roam;
    if (!route?.length) return;
    const stop = route[st.leg % route.length];
    const dx = stop.x - this.position.x, dz = stop.z - this.position.z, d = Math.hypot(dx, dz);
    if (d > 0.05) {
      const step = Math.min(d, 1.3 * dt);
      this.position.x += (dx / d) * step; this.position.z += (dz / d) * step;
      this.turnTo(Math.atan2(dx, dz), 0.2);
      this.walk(t, 1);
      this.position.y = 0;
      st.jumping = false;
      return;
    }
    st.wait -= dt;
    st.jumping = !!stop.jump;
    if (stop.jump) { this.position.y = 0.42 + Math.abs(Math.sin(t * 6)) * 0.45; this.behavior.jump(this.rig, t); } // on the bed
    else { this.position.y = 0; this.walk(t, 0); }
    if (st.wait <= 0) { st.leg++; st.wait = route[st.leg % route.length].wait ?? 1 + Math.random() * 2; }
  }

  update(dt, t, player) {
    super.update(dt);
    if (this.behavior.roam && !this.talking) { this.#roam(dt, t); return; }
    if (this.behavior.roam) { this.position.y = 0; this.roam.jumping = false; }
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
