/**
 * The giant chess board of one village square, run by İsmail Dede (the old man by the
 * board). Nobody grabs a seat on their own: you tell Dede which colour you want ("Beyaz
 * olacağım") and he seats you; the game starts as soon as both colours are taken, and
 * whoever asks while a game is on waits in his line for the next one. Only the two
 * players move; walking away from the board changes nothing (a dropped connection gets a
 * grace period to come back under the same name, then the game is lost).
 * Each player has a 10-minute clock. When someone's time runs out, Dede counts the pieces on
 * the board (pawn 1, knight and bishop 3, rook 5, queen 9): more points wins, equal is a draw.
 * A game against Dede himself gives way to people who are waiting. Either player can offer a draw through
 * Dede; the other accepts or declines (Dede himself accepts when the position is about even).
 * Dede keeps the score board: who has played the most games (shared by all squares).
 * Moves are validated with chess.js.
 */
import { Chess } from 'chess.js';

export const CHESS_RULES = {
  clock: 10 * 60_000,    // ms per player
  aiYield: 2 * 60_000,   // a game against Dede ends this long after someone starts waiting for the board
  aiDelay: 1200,         // ms Dede "thinks" before a move
  rejoin: 180_000,       // ms a dropped player has to come back (same name) — phones drop out often
  pause: 6000,           // ms the result stays on the board before the next game
};
const VALUE = { p: 100, n: 320, b: 330, r: 500, q: 900, k: 0 };
const POINTS = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 };
/** Points of each side's pieces on the board (what Dede counts when time runs out). */
export function points(game) { const out = { w: 0, b: 0 }; for (const p of game.board().flat()) if (p) out[p.color] += POINTS[p.type]; return out; }
const DEDE = { id: 'dede', name: 'İsmail Dede', ai: true };
const other = (c) => (c === 'w' ? 'b' : 'w');

/** Dede's move: mate if he can, otherwise the move that leaves him best off in material (a little random). */
export function dedeMove(game) {
  const me = game.turn();
  let best = null, bestScore = -Infinity;
  for (const m of game.moves({ verbose: true })) {
    const g = new Chess(game.fen());
    g.move(m);
    if (g.isCheckmate()) return m;
    let score = Math.random() * 40 + (m.san.includes('+') ? 30 : 0);
    for (const p of g.board().flat()) if (p) score += (p.color === me ? 1 : -1) * VALUE[p.type];
    // don't leave a piece where it can be taken for free
    const reply = g.moves({ verbose: true }).filter((r) => r.to === m.to && r.captured);
    if (reply.length) score -= VALUE[m.piece] * 0.8;
    if (score > bestScore) { bestScore = score; best = m; }
  }
  return best;
}

export class ChessTable {
  /** @param {{ scores?: Map, onScore?: () => void, rules?: object, now?: () => number }} o */
  constructor({ scores = new Map(), onScore = () => {}, rules = {}, now = () => Date.now() } = {}) {
    Object.assign(this, { scores, onScore, now });
    this.rules = { ...CHESS_RULES, ...rules };
    this.seats = { w: null, b: null };
    this.queue = []; // { id, name, color } waiting for the next game
    this.#clear();
  }

  #clear() {
    this.game = new Chess();
    this.last = null;
    this.phase = 'idle';   // idle → waiting (one seat taken) → playing → over → idle
    this.result = null;    // { winner: 'w' | 'b' | null, reason }
    this.clocks = { w: this.rules.clock, b: this.rules.clock };
    this.turnAt = 0;       // when the side to move started thinking
    this.draw = { offer: null, declined: null }; // colour that offers a draw / whose offer was just declined
    this.startedAt = 0;
    this.overAt = 0;
    this.waitingSince = 0; // someone is in the line while Dede plays
    this.aiAt = 0;
  }

  get playing() { return this.phase === 'playing'; }
  #seatOf(id) { return ['w', 'b'].find((c) => this.seats[c]?.id === id) ?? null; }

  /** Tell Dede "I'll be white / black". Returns whether anything changed. */
  ask(player, color) {
    if (!['w', 'b'].includes(color) || !player?.id) return false;
    if (this.#seatOf(player.id)) {
      if (this.playing || this.phase === 'over') return false;
      this.leave(player.id); // changing her mind before the start
    }
    this.queue = this.queue.filter((q) => q.id !== player.id);
    this.queue.push({ id: player.id, name: player.name, color });
    if (this.playing && this.seats.b?.ai && !this.waitingSince) this.waitingSince = this.now();
    this.#fill();
    return true;
  }

  /** "Dede, benimle oynar mısın?" — only when the board is free and nobody is waiting. */
  askDede(player, color = 'w') {
    if (!player?.id || this.phase !== 'idle' || this.queue.length) return false;
    const mine = color === 'b' ? 'b' : 'w';
    this.seats[mine] = { id: player.id, name: player.name };
    this.seats[other(mine)] = { ...DEDE };
    this.#start();
    return true;
  }

  /** Leave the line or a seat before the game starts. During a game use resign(). */
  leave(id) {
    const before = this.queue.length;
    this.queue = this.queue.filter((q) => q.id !== id);
    const c = this.#seatOf(id);
    if (c && !this.playing && this.phase !== 'over') {
      this.seats[c] = null;
      if (!this.seats.w && !this.seats.b) this.phase = 'idle';
      this.#fill();
      return true;
    }
    return this.queue.length !== before;
  }

  resign(id) {
    const c = this.#seatOf(id);
    if (!c || !this.playing) return false;
    this.#finish(other(c), 'resign');
    return true;
  }

  /** "Dede, beraberlik teklif ediyorum." To a player: it waits for the answer; Dede answers at once. */
  offerDraw(id) {
    const c = this.#seatOf(id);
    if (!c || !this.playing || this.draw.offer === c) return false;
    if (this.seats[other(c)]?.ai) {
      // Dede: material from his side; about even (within a pawn) → he accepts
      let edge = 0;
      for (const p of this.game.board().flat()) if (p) edge += (p.color === c ? -1 : 1) * VALUE[p.type];
      if (edge <= 100) this.#finish(null, 'agreed');
      else this.draw = { offer: null, declined: c };
      return true;
    }
    this.draw = { offer: c, declined: null };
    return true;
  }

  /** The other player answers a draw offer. */
  answerDraw(id, accept) {
    const c = this.#seatOf(id);
    if (!c || !this.playing || this.draw.offer !== other(c)) return false;
    if (accept) this.#finish(null, 'agreed');
    else this.draw = { offer: null, declined: other(c) };
    return true;
  }

  /** A player's connection dropped: out of the line; a seat is kept a little while. */
  disconnect(id, name) {
    let changed = this.leave(id);
    const c = this.#seatOf(id);
    if (c && this.playing) { this.seats[c] = { ...this.seats[c], gone: this.now(), name }; changed = true; }
    return changed;
  }

  /** Same name back in the room within the grace period: the seat is theirs again. */
  rejoin(player) {
    const c = ['w', 'b'].find((k) => this.seats[k]?.gone && this.seats[k].name === player.name);
    if (!c || !this.playing) return false;
    this.seats[c] = { id: player.id, name: player.name };
    return true;
  }

  /** @returns {boolean} whether the move was legal and made */
  move(id, { from, to, promotion }) {
    const turn = this.game.turn();
    if (!this.playing || this.seats[turn]?.id !== id || this.seats[turn]?.ai) return false;
    this.#tick(this.now());
    if (!this.playing) return true; // the flag fell just now: the state changed
    return this.#play({ from: String(from), to: String(to), promotion: ['q', 'r', 'b', 'n'].includes(promotion) ? promotion : 'q' });
  }

  /** Called ~10× a second: clocks, Dede's moves, dropped players, the next game. Returns whether the state changed. */
  tick() { return this.#tick(this.now()); }

  #tick(now) {
    if (this.phase === 'over') {
      if (now - this.overAt < this.rules.pause) return false;
      this.seats = { w: null, b: null };
      this.#clear();
      this.#fill();
      return true;
    }
    if (!this.playing) return false;
    const turn = this.game.turn();
    if (this.clocks[turn] - (now - this.turnAt) <= 0) { // time is up: the points on the board decide
      this.clocks[turn] = 0;
      const pts = points(this.game);
      this.#finish(pts.w > pts.b ? 'w' : pts.b > pts.w ? 'b' : null, 'points', pts);
      return true;
    }
    for (const c of ['w', 'b']) {
      if (this.seats[c]?.gone && now - this.seats[c].gone > this.rules.rejoin) { this.#finish(other(c), 'left'); return true; }
    }
    if (this.seats.w?.ai || this.seats.b?.ai) {
      if (this.waitingSince && now - this.waitingSince > this.rules.aiYield) { this.#finish(null, 'limit'); return true; }
    }
    if (this.seats[turn]?.ai && now >= this.aiAt) return this.#play(dedeMove(this.game));
    return false;
  }

  #play(m) {
    const now = this.now(), turn = this.game.turn();
    let made;
    try { made = this.game.move(m); } catch { return false; }
    this.clocks[turn] = Math.max(0, this.clocks[turn] - (now - this.turnAt));
    this.turnAt = now;
    if (this.draw.offer !== turn) this.draw = { offer: null, declined: null }; // moving on answers an offer with no
    this.last = { from: made.from, to: made.to, san: made.san, piece: made.piece, captured: made.captured ?? null };
    if (this.game.isCheckmate()) this.#finish(turn, 'mate');
    else if (this.game.isGameOver()) this.#finish(null, 'draw');
    else if (this.seats[this.game.turn()]?.ai) this.aiAt = now + this.rules.aiDelay;
    return true;
  }

  /** Seat the line: the first one asking for each colour; the game starts when both colours are there. */
  #fill() {
    if (this.playing || this.phase === 'over') return;
    for (const c of ['w', 'b']) {
      if (this.seats[c]) continue;
      const i = this.queue.findIndex((q) => q.color === c && q.id !== this.seats[other(c)]?.id);
      if (i >= 0) { const [q] = this.queue.splice(i, 1); this.seats[c] = { id: q.id, name: q.name }; }
    }
    if (this.seats.w && this.seats.b) this.#start();
    else this.phase = this.seats.w || this.seats.b ? 'waiting' : 'idle';
  }

  #start() {
    this.game = new Chess();
    this.last = null;
    this.result = null;
    this.phase = 'playing';
    this.draw = { offer: null, declined: null };
    this.clocks = { w: this.rules.clock, b: this.rules.clock };
    this.startedAt = this.turnAt = this.now();
    this.waitingSince = this.queue.length && (this.seats.w.ai || this.seats.b.ai) ? this.now() : 0;
    if (this.seats.w.ai) this.aiAt = this.now() + this.rules.aiDelay;
  }

  #finish(winner, reason, pts = null) {
    this.phase = 'over';
    this.overAt = this.now();
    this.result = { winner, reason, ...(pts ? { points: pts } : {}) };
    for (const c of ['w', 'b']) {
      const s = this.seats[c];
      if (!s || s.ai) continue;
      const key = s.name.toLocaleLowerCase('tr');
      const row = this.scores.get(key) ?? { name: s.name, games: 0, wins: 0, draws: 0, losses: 0 };
      row.name = s.name;
      row.games++;
      if (!winner) row.draws++; else if (winner === c) row.wins++; else row.losses++;
      this.scores.set(key, row);
    }
    this.onScore();
  }

  /** Score board: most games first, then most wins. */
  board(n = 8) {
    return [...this.scores.values()].sort((a, b) => b.games - a.games || b.wins - a.wins || a.name.localeCompare(b.name, 'tr')).slice(0, n)
      .map(({ name, games, wins }) => ({ name, games, wins }));
  }

  state() {
    const g = this.game, now = this.now();
    const clocks = { ...this.clocks };
    if (this.playing) clocks[g.turn()] = Math.max(0, clocks[g.turn()] - (now - this.turnAt));
    const seat = (s) => (s ? { id: s.id, name: s.name, ...(s.ai ? { ai: true } : {}), ...(s.gone ? { gone: true } : {}) } : null);
    return {
      type: 'chess', v: 2, phase: this.phase, fen: g.fen(), turn: g.turn(), check: g.isCheck(), last: this.last,
      // `over` as the first clients read it ('checkmate' | 'draw' | null)
      over: this.phase === 'over' ? (this.result.reason === 'mate' ? 'checkmate' : this.result.winner ? 'won' : 'draw') : null,
      result: this.result, seats: { w: seat(this.seats.w), b: seat(this.seats.b) },
      queue: this.queue.map(({ id, name, color }) => ({ id, name, color })),
      clocks, running: this.playing ? g.turn() : null, draw: { ...this.draw },
      scores: this.board(),
    };
  }
}
