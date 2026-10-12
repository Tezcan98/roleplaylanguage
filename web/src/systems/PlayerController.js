/** On horseback: this many times faster than walking (systems/Animals.js). */
const RIDE_SPEED = 1.9;
/** Running: this many times faster than walking. */
const RUN = 1.7;

/** Moves the player from input, resolving collisions against the current location. */
export class PlayerController {
  #vel = { x: 0, z: 0 }; // on a scooter (`mount.glide`): it keeps rolling

  constructor({ player, input, world, modes, cast, camera }) { Object.assign(this, { player, input, world, modes, cast, camera }); }

  update(dt, t) {
    const { player } = this;
    let { x, z } = this.modes.is('play') && !player.posed ? this.input.axis() : { x: 0, z: 0 };
    let mag = Math.min(1, Math.hypot(x, z));
    if (player.seated) {
      if (mag > 0.3) player.sit(false); // pushing the stick stands Ahmet up (e.g. from the sofra)
      else { x = z = mag = 0; }
    }
    player.moving = mag > 0.08;
    if (player.mount?.glide) return this.#glide(dt, x, z, mag);
    this.#vel.x = this.#vel.z = 0;
    if (mag > 0.08) {
      const yaw = this.camera?.yaw ?? 0; // the view is turned: "up" means away from the camera
      if (yaw) { const c = Math.cos(yaw), s = Math.sin(yaw); [x, z] = [x * c - z * s, x * s + z * c]; }
      const loc = this.world.current, n = Math.hypot(x, z);
      const run = 1; // running is off for now: `this.input.running ? RUN : 1` (Shift / 🏃 by the joystick)
      const speed = (loc.indoor ? 3.6 : 5.2) * (player.mount ? player.mount.speed ?? RIDE_SPEED : 1) * run * mag * dt;
      const P = player.position;
      P.x += x / n * speed;
      P.z += z / n * speed;
      loc.collision.resolve(P, 0.35, this.cast.obstacles(loc.id));
      player.turnTo(Math.atan2(x, z), 0.25);
      player.walk(run > 1 ? t * 1.6 : t, mag); // the legs swing faster when running
    } else {
      player.walk(t, 0);
    }
    player.update(dt);
  }

  /** A scooter: the speed comes up in a second or so, it rolls on when let go, and it turns in a curve. */
  #glide(dt, x, z, mag) {
    const { player } = this, v = this.#vel, loc = this.world.current, P = player.position;
    let tx = 0, tz = 0;
    if (mag > 0.08) {
      const yaw = this.camera?.yaw ?? 0;
      if (yaw) { const c = Math.cos(yaw), s = Math.sin(yaw); [x, z] = [x * c - z * s, x * s + z * c]; }
      const n = Math.hypot(x, z), top = 5.2 * player.mount.speed * mag;
      tx = x / n * top; tz = z / n * top;
    }
    const k = Math.min(1, dt * (mag > 0.08 ? 1.4 : 0.6));
    v.x += (tx - v.x) * k; v.z += (tz - v.z) * k;
    const x0 = P.x, z0 = P.z;
    P.x += v.x * dt; P.z += v.z * dt;
    loc.collision.resolve(P, 0.35, this.cast.obstacles(loc.id));
    if (dt > 0) { v.x = (P.x - x0) / dt; v.z = (P.z - z0) / dt; } // a wall stops it
    if (Math.hypot(v.x, v.z) > 0.4) player.turnTo(Math.atan2(v.x, v.z), 0.2);
    player.update(dt);
  }
}
