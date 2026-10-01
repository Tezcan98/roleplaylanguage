import { PITCH } from '../world/locations/SchoolYard.js';

const COOL = 2.5; // s after a goal before another can count

/**
 * Matches on the school pitch: when the ball crosses a goal line between the posts it's a
 * goal — the score board, a cheer and the ball back on the centre spot. Online, the player
 * who kicked last reports it, so every screen counts the goal once.
 */
export class Football {
  #cool = 0;

  constructor({ world, ball, village, toasts, tts }) {
    Object.assign(this, { world, ball, village, toasts, tts });
    this.score = { a: 0, b: 0 }; // a = blue (scores into the right goal), b = red
  }

  update(dt) {
    this.#cool = Math.max(0, this.#cool - dt);
    if (this.#cool > 0 || this.world.current?.id !== 'schoolyard') return;
    const p = this.ball.position;
    if (Math.abs(p.z - PITCH.cz) > PITCH.goalHalf) return;
    const side = p.x > PITCH.x1 + 0.2 ? 'a' : p.x < PITCH.x0 - 0.2 ? 'b' : null;
    if (!side) return;
    const online = this.village.net.connected && this.village.joinedAt === 'schoolyard';
    const mine = !online || Date.now() - (this.village.lastKick ?? 0) < 5000;
    this.#cool = COOL;
    if (!mine) return; // the kicker's screen reports it
    this.scored(side, true);
    if (online) this.village.goal(side);
  }

  /** Count a goal (mine or reported by another player), cheer, put the ball back. */
  scored(side, mine) {
    this.#cool = COOL;
    this.score[side]++;
    this.world.get('schoolyard').writeScore(this.score.a, this.score.b);
    const team = side === 'a' ? 'Mavi' : 'Kırmızı';
    this.toasts.show(`GOOOL! ${team} takım attı · ${this.score.a} - ${this.score.b}`, 'Goal!');
    this.tts.speak('Gol!', { speaker: 'can' });
    if (mine) {
      setTimeout(() => {
        this.ball.setState({ x: 0, z: PITCH.cz, vx: 0, vz: 0 });
        this.village.ballKicked?.(this.ball);
      }, 1200);
    }
  }
}
