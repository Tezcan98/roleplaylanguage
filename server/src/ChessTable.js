/**
 * The giant chess board of one village square: two seats (white / black), the game, and the
 * state everyone in the room sees. Moves are validated with chess.js; only the player in
 * the seat whose turn it is may move.
 */
import { Chess } from 'chess.js';

export class ChessTable {
  constructor() { this.reset(); this.seats = { w: null, b: null }; }

  reset() { this.game = new Chess(); this.last = null; }

  /** Take a free seat ('w' / 'b'); a player sits in one seat at most. */
  sit(player, color) {
    if (!['w', 'b'].includes(color) || this.seats[color]) return false;
    this.stand(player.id);
    this.seats[color] = { id: player.id, name: player.name };
    return true;
  }

  stand(id) {
    let changed = false;
    for (const c of ['w', 'b']) if (this.seats[c]?.id === id) { this.seats[c] = null; changed = true; }
    return changed;
  }

  /** @returns {boolean} whether the move was legal and made */
  move(id, { from, to, promotion }) {
    const turn = this.game.turn();
    if (this.seats[turn]?.id !== id || this.game.isGameOver()) return false;
    try {
      const m = this.game.move({ from: String(from), to: String(to), promotion: ['q', 'r', 'b', 'n'].includes(promotion) ? promotion : 'q' });
      this.last = { from: m.from, to: m.to, san: m.san };
      return true;
    } catch { return false; }
  }

  /** A seated player may start a new game once this one is over (or nobody has moved yet). */
  restart(id) {
    const seated = ['w', 'b'].some((c) => this.seats[c]?.id === id);
    if (!seated || !(this.game.isGameOver() || this.game.history().length === 0 || !this.seats.w || !this.seats.b)) return false;
    this.reset();
    return true;
  }

  state() {
    const g = this.game;
    const over = g.isCheckmate() ? 'checkmate' : g.isDraw() || g.isStalemate() ? 'draw' : null;
    return { type: 'chess', fen: g.fen(), turn: g.turn(), check: g.isCheck(), over, seats: this.seats, last: this.last };
  }
}
