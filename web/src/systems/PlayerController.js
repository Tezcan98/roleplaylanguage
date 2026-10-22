/** On horseback: this many times faster than walking (systems/Animals.js). */
const RIDE_SPEED = 1.9;
/** Running: this many times faster than walking. */
const RUN = 1.7;

/** Moves the player from input, resolving collisions against the current location. */
export class PlayerController {
  #vel = { x: 0, z: 0 }; // on a scooter (`mount.glide`): it keeps rolling
  #air = null; // a horse's jump: the speed it took off with — in the air it goes on that way, whatever the stick says
  #last = null;

  /**
   * `boost`: how many times faster the player goes now (Urfa biberi from the shop: 1.5 for half an hour).
   * `slow`: the same, for places that need careful steps (the giant chess board: ChessGame.slowFactor).
   */
  constructor({ player, input, world, modes, cast, camera, boost = () => 1, slow = () => 1 }) { Object.assign(this, { player, input, world, modes, cast, camera, boost, slow }); }

  update(dt, t) {
    const { player } = this;
    if (player.dancing) return; // in the wedding's halay (systems/HalayDance.js moves the player)
    let { x, z } = this.modes.is('play') && !player.posed ? this.input.axis() : { x: 0, z: 0 };
    let mag = Math.min(1, Math.hypot(x, z));
    if (player.seated) {
      if (mag > 0.3) player.sit(false); // pushing the stick stands Ahmet up (e.g. from the sofra)
      else { x = z = mag = 0; }
    }
    if (player.jumping) return this.#flying(dt);
    this.#air = null;
    player.moving = mag > 0.08;
    if (player.mount?.glide) return this.#glide(dt, x, z, mag);
    this.#vel.x = this.#vel.z = 0;
    const from = { x: player.position.x, z: player.position.z };
    if (mag > 0.08) {
      const yaw = this.camera?.yaw ?? 0; // the view is turned: "up" means away from the camera
      if (yaw) { const c = Math.cos(yaw), s = Math.sin(yaw); [x, z] = [x * c - z * s, x * s + z * c]; }
      const loc = this.world.current, n = Math.hypot(x, z);
      const run = 1; // running is off for now: `this.input.running ? RUN : 1` (Shift / 🏃 by the joystick)
      const speed = (loc.indoor ? 3.6 : 5.2) * (player.mount ? player.mount.speed ?? RIDE_SPEED : 1) * run * this.boost() * this.slow() * mag * dt;
      const P = player.position;
      P.x += x / n * speed;
      P.z += z / n * speed;
      loc.collision.resolve(P, 0.35, this.cast.obstacles(loc.id));
      const want = Math.atan2(x, z);
      if (player.mount) { // riding: a thumb on the joystick drifts a little every frame, and the whole horse swayed with it — small changes of direction are ignored, the rest turns by time
        const d = Math.atan2(Math.sin(want - player.group.rotation.y), Math.cos(want - player.group.rotation.y));
        if (Math.abs(d) > 0.14) player.turnTo(want, 1 - Math.exp(-dt * 5));
      } else player.turnTo(want, 0.25);
      player.walk(run > 1 ? t * 1.6 : t, mag); // the legs swing faster when running
    } else {
      player.walk(t, 0);
    }
    if (dt > 0) this.#last = { x: (player.position.x - from.x) / dt, z: (player.position.z - from.z) / dt }; // (a jump takes off with it)
    player.update(dt);
  }

  /** In the air on horseback: on at the take-off speed and heading (a jump from a gallop goes far, from a standstill straight up). */
  #flying(dt) {
    const { player } = this, P = player.position, loc = this.world.current;
    if (!this.#air) this.#air = this.#last && dt > 0 ? { ...this.#last } : { x: 0, z: 0 };
    P.x += this.#air.x * dt; P.z += this.#air.z * dt;
    loc.collision.resolve(P, 0.35, this.cast.obstacles(loc.id));
    player.update(dt);
  }

  /** A scooter: the speed comes up in a second or so, it rolls on when let go, and it turns in a curve. */
  #glide(dt, x, z, mag) {
    const { player } = this, v = this.#vel, loc = this.world.current, P = player.position;
    let tx = 0, tz = 0;
    if (mag > 0.08) {
      const yaw = this.camera?.yaw ?? 0;
      if (yaw) { const c = Math.cos(yaw), s = Math.sin(yaw); [x, z] = [x * c - z * s, x * s + z * c]; }
      const n = Math.hypot(x, z), top = 5.2 * player.mount.speed * this.boost() * mag;
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
