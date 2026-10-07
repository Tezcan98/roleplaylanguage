const COOL = 2.5; // s after a goal before another can count

/**
 * Matches on a pitch (the schoolyard's, the square's): when a ball crosses a goal line between
 * the posts it's a goal — the score board, a cheer and the ball back on the centre spot. A
 * fenced pitch keeps its balls in, except through the doors in the fence (the ball can roll out
 * onto the square there). Online,
 * the player who kicked last reports a goal, so every screen counts it once.
 */
export class Football {
  #cool = 0;
  #prevX = new Map(); // ball → x a frame ago (a goal must come in over the line from the pitch)
  #prevPos = new Map(); // ball → where it was a frame ago (which side of the fence it is on)

  /** `place` = location id; `pitch` = { x0, x1, z0, z1, goalHalf, cz, fence? }; `writeScore(a, b)` = its board. */
  constructor({ place, pitch, balls, writeScore, world, village, toasts }) {
    Object.assign(this, { place, pitch, balls, writeScore, world, village, toasts });
    this.score = { a: 0, b: 0 }; // a = blue (scores into the right goal), b = red
  }

  /**
   * The wire fence: a ball bounces off it from either side, but where there is no wire (the doors
   * on the north side) it rolls straight through, out onto the square or back in.
   */
  #fence(ball) {
    const f = this.pitch.fence, p = ball.position, m = ball.radius + 0.1;
    const was = this.#prevPos.get(ball) ?? { x: p.x, z: p.z };
    this.#prevPos.set(ball, { x: p.x, z: p.z });
    if (!f || Math.hypot(p.x - was.x, p.z - was.z) > 1.5) return; // no fence, or a jump (put back, a position from the network)
    const open = (x) => (f.gaps ?? []).some(([a, b]) => x > a + ball.radius && x < b - ball.radius);
    // [line, axis, the other coordinate's range, crossing allowed here?]
    const sides = [[f.x0, 'x', [f.z0, f.z1]], [f.x1, 'x', [f.z0, f.z1]], [f.z0, 'z', [f.x0, f.x1], open], [f.z1, 'z', [f.x0, f.x1]]];
    for (const [line, axis, [lo, hi], through] of sides) {
      const other = axis === 'x' ? p.z : p.x;
      if (other < lo - m || other > hi + m) continue; // beside this stretch of fence
      const before = was[axis] - line, now = p[axis] - line;
      const crossed = Math.sign(before) !== Math.sign(now) || Math.abs(now) < m;
      if (!crossed || Math.abs(before) < 1e-6 || through?.(axis === 'x' ? p.z : p.x)) continue;
      const side = Math.sign(before); // stay on the side it came from, bounce back
      p[axis] = line + side * m;
      const v = ball.vel[axis];
      if (Math.sign(v) !== side) ball.vel[axis] = -v * 0.6;
      this.#prevPos.set(ball, { x: p.x, z: p.z });
    }
  }

  update(dt) {
    this.#cool = Math.max(0, this.#cool - dt);
    if (this.world.current?.id !== this.place) return;
    const { x0, x1, cz, goalHalf } = this.pitch;
    for (const ball of this.balls) {
      this.#fence(ball);
      if (this.#cool > 0) { this.#prevX.set(ball, ball.position.x); continue; }
      const p = ball.position, prev = this.#prevX.get(ball) ?? p.x;
      this.#prevX.set(ball, p.x);
      if (Math.abs(p.z - cz) > goalHalf || Math.abs(p.x - prev) > 1.5) continue; // a jump (put back, or a position from the network) is no shot
      // in over the goal line from the pitch side, and inside the net (not from behind or the side)
      const side = prev <= x1 + 0.2 && p.x > x1 + 0.2 && p.x < x1 + 0.9 ? 'a' : prev >= x0 - 0.2 && p.x < x0 - 0.2 && p.x > x0 - 0.9 ? 'b' : null;
      if (!side) continue;
      const online = this.village.net.connected && this.village.joinedAt === this.place;
      const mine = !online || Date.now() - (this.village.lastKick ?? 0) < 5000;
      this.#cool = COOL;
      if (!mine) continue; // the kicker's screen reports it
      this.scored(side, true, ball);
      if (online) this.village.goal(side);
    }
  }

  /**
   * Help for both teams: a kick that goes roughly towards a goal bends to its middle (and is never
   * too weak to get there). Kicks the other way, or across the pitch, stay as they were.
   */
  assist(ball) {
    if (!this.has(ball.position)) return;
    const v = ball.vel, speed = Math.hypot(v.x, v.z);
    if (speed < 0.5) return;
    const p = ball.position, { x0, x1, cz } = this.pitch;
    const gx = v.x > 0 ? x1 + 0.4 : x0 - 0.4;
    let tx = gx - p.x, tz = cz - p.z;
    const d = Math.hypot(tx, tz); tx /= d; tz /= d;
    const ux = v.x / speed, uz = v.z / speed;
    if (ux * tx + uz * tz < 0.35) return; // not towards that goal
    const k = 0.65, nx = ux * (1 - k) + tx * k, nz = uz * (1 - k) + tz * k, n = Math.hypot(nx, nz);
    const s = Math.max(speed, Math.min(9, 3 + d * 0.5)); // strong enough to arrive
    v.x = nx / n * s; v.z = nz / n * s;
  }

  /** Is the player on this pitch (inside its fence, or near its lines)? */
  has(pos) {
    if (this.world.current?.id !== this.place) return false;
    const f = this.pitch.fence ?? { x0: this.pitch.x0 - 1.5, x1: this.pitch.x1 + 1.5, z0: this.pitch.z0 - 1.5, z1: this.pitch.z1 + 1.5 };
    return pos.x > f.x0 && pos.x < f.x1 && pos.z > f.z0 && pos.z < f.z1;
  }

  /** Score back to 0 - 0 (`mine`: tell the others in this place). */
  reset(mine) {
    this.score = { a: 0, b: 0 };
    this.writeScore(0, 0);
    this.toasts.show('Skor sıfırlandı · 0 - 0', 'Score reset');
    if (mine && this.village.net.connected && this.village.joinedAt === this.place) this.village.net.send({ type: 'score-reset' });
  }

  /** Count a goal (mine or reported by another player), cheer, put the ball back. */
  scored(side, mine, ball = null) {
    this.#cool = COOL;
    this.score[side]++;
    this.writeScore(this.score.a, this.score.b);
    const team = side === 'a' ? 'Mavi' : 'Kırmızı';
    this.toasts.show(`GOOOL! ${team} takım attı · ${this.score.a} - ${this.score.b}`, 'Goal!');
    if (mine && ball) {
      setTimeout(() => {
        const i = this.balls.indexOf(ball);
        ball.setState({ x: (this.pitch.x0 + this.pitch.x1) / 2, z: this.pitch.cz + (i ? 1.5 : 0), vx: 0, vz: 0 });
        this.village.ballKicked?.(ball);
      }, 1200);
    }
  }
}
