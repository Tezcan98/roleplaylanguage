/**
 * The arrow over a way out (the task is in another place, QuestMarker `doorSpot`): reaching it uses it, as if the button — "Eve dön",
 * "Sınıfa gir"… — had been pressed. Nothing happens at a locked door (it would only repeat its message). Ambient system
 * (update every frame). Off in test mode (?debug) unless asked for (?firststeps).
 */
const NEAR = 1.1; // metres from the door's spot
const WAIT = 4000; // ms: the trip takes a moment, and a failed one is not tried again at once

export class AutoDoor {
  #until = 0;

  constructor({ marker, player, interactions, rules, modes, ctx, enabled = true }) {
    Object.assign(this, { marker, player, interactions, rules, modes, ctx, enabled });
  }

  update() {
    if (!this.enabled || !this.modes.is('play') || this.player.seated || this.player.mount || performance.now() < this.#until) return;
    const door = this.marker.doorSpot;
    if (!door) return;
    const p = this.player.position;
    if (Math.hypot(door.pos.x - p.x, door.pos.z - p.z) > NEAR) return;
    const rule = this.rules[door.id];
    if (!rule || rule.available?.(this.ctx) === false || rule.locked?.(this.ctx)) return;
    this.#until = performance.now() + WAIT;
    this.interactions.use(door.id, rule);
  }
}
