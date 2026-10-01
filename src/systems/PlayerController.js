/** Moves the player from input, resolving collisions against the current location. */
export class PlayerController {
  constructor({ player, input, world, modes, cast }) { Object.assign(this, { player, input, world, modes, cast }); }

  update(dt, t) {
    const { player } = this;
    let { x, z } = this.modes.is('play') && !player.seated ? this.input.axis() : { x: 0, z: 0 };
    const mag = Math.min(1, Math.hypot(x, z));
    player.moving = mag > 0.08;
    if (mag > 0.08) {
      const loc = this.world.current, n = Math.hypot(x, z);
      const speed = (loc.indoor ? 3.6 : 5.2) * mag * dt;
      const P = player.position;
      P.x += x / n * speed;
      P.z += z / n * speed;
      loc.collision.resolve(P, 0.35, this.cast.obstacles(loc.id));
      player.turnTo(Math.atan2(x, z), 0.25);
      player.walk(t, mag);
    } else {
      player.walk(t, 0);
    }
    player.update(dt);
  }
}
