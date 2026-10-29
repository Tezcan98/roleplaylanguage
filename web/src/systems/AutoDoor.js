/**
 * The arrow over a way out (the task is in another place, QuestMarker `doorSpot`): reaching it uses it, as if the button — "Eve dön",
 * "Sınıfa gir"… — had been pressed. Nothing happens at a locked door (it would only repeat its message). Ambient system
 * (update every frame). A way out that is first seen with the player standing on it (they just came in by it) waits until they have walked away from it. Off in test mode (?debug) unless asked for (?firststeps).
 */
const NEAR = 1.1; // metres from the door's spot
const LEAVE = 2.2; // metres: a way out that is first seen closer than this (you arrived on it) is used only after you have walked away from it
const WAIT = 4000; // ms: the trip takes a moment, and a failed one is not tried again at once

export class AutoDoor {
  #until = 0;
  #seen = ''; // the way out last seen (its id and spot)
  #armed = false; // false until the player has been away from it

  constructor({ marker, player, interactions, rules, modes, ctx, enabled = true }) {
    Object.assign(this, { marker, player, interactions, rules, modes, ctx, enabled });
  }

  update() {
    if (!this.enabled || !this.modes.is('play') || this.player.seated || this.player.mount || performance.now() < this.#until) return;
    const door = this.marker.doorSpot;
    if (!door) return;
    const p = this.player.position, dist = Math.hypot(door.pos.x - p.x, door.pos.z - p.z), key = `${door.id}@${door.pos.x.toFixed(1)},${door.pos.z.toFixed(1)}`;
    if (key !== this.#seen) { this.#seen = key; this.#armed = dist > LEAVE; } // (coming in through a door puts you on the way back out: not used until you walk away from it)
    else if (dist > LEAVE) this.#armed = true;
    if (!this.#armed || dist > NEAR) return;
    const rule = this.rules[door.id];
    if (!rule || rule.available?.(this.ctx) === false || rule.locked?.(this.ctx)) return;
    this.#until = performance.now() + WAIT;
    this.interactions.use(door.id, rule);
  }
}
