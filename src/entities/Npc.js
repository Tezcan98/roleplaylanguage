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
  }

  get name() { return this.def.name; }

  /** Put the NPC somewhere. Only called behind a fade or while the player is elsewhere. */
  station(location, anchor, behaviorName = 'stand') {
    this.location = location.id;
    this.home = location.anchors.get(anchor);
    if (!this.home) throw new Error(`${this.id}: unknown anchor ${location.id}.${anchor}`);
    this.place(this.home);
    this.setBehavior(behaviorName);
  }

  setBehavior(name) {
    Object.keys(this.rig.props).forEach((p) => this.showProp(p, false));
    this.behavior = Behaviors[name] ?? Behaviors.stand;
    (this.behavior.props || []).forEach((p) => this.showProp(p, true));
  }

  update(dt, t, player) {
    super.update(dt);
    const b = this.behavior, near = b.turnToPlayerWithin && Math.hypot(player.position.x - this.position.x, player.position.z - this.position.z) < b.turnToPlayerWithin;
    if (this.talking || near) {
      this.faceTowards(player.position, 0.15);
      (b.talk ?? Behaviors.stand.pose)(this.rig, t);
    } else {
      this.turnTo(this.home.rot, 0.05);
      b.pose(this.rig, t);
    }
    if (this.talking) this.rig.head.position.y = 1.84 + Math.abs(Math.sin(t * 8)) * 0.02;
  }
}
