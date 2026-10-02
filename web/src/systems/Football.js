const COOL = 2.5; // s after a goal before another can count

/**
 * Matches on a pitch (the schoolyard's, the square's): when a ball crosses a goal line between
 * the posts it's a goal — the score board, a cheer and the ball back on the centre spot. A
 * fenced pitch keeps its balls in (the doors in the fence are for people, not balls). Online,
 * the player who kicked last reports a goal, so every screen counts it once.
 */
export class Football {
  #cool = 0;
  #prevX = new Map(); // ball → x a frame ago (a goal must come in over the line from the pitch)

  /** `place` = location id; `pitch` = { x0, x1, z0, z1, goalHalf, cz, fence? }; `writeScore(a, b)` = its board. */
  constructor({ place, pitch, balls, writeScore, world, village, toasts }) {
    Object.assign(this, { place, pitch, balls, writeScore, world, village, toasts });
    this.score = { a: 0, b: 0 }; // a = blue (scores into the right goal), b = red
  }

  /** A ball (stray, or pushed through a door) that is outside the fence goes back in. */
  #fence(ball) {
    const f = this.pitch.fence, p = ball.position, m = ball.radius + 0.1;
    if (!f || p.x < f.x0 - 1.5 || p.x > f.x1 + 1.5 || p.z < f.z0 - 1.5 || p.z > f.z1 + 1.5) return; // far away: not ours
    if (p.x < f.x0 + m) { p.x = f.x0 + m; ball.vel.x = Math.abs(ball.vel.x) * 0.6; }
    if (p.x > f.x1 - m) { p.x = f.x1 - m; ball.vel.x = -Math.abs(ball.vel.x) * 0.6; }
    if (p.z < f.z0 + m) { p.z = f.z0 + m; ball.vel.z = Math.abs(ball.vel.z) * 0.6; }
    if (p.z > f.z1 - m) { p.z = f.z1 - m; ball.vel.z = -Math.abs(ball.vel.z) * 0.6; }
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
