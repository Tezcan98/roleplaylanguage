// A copy of web/src/systems/DamaTables.js (the game runs the same rules offline): change both together.
import { startBoard, legalMoves, play } from './DamaRules.js';

/**
 * The dama tables of the kahvehane: who sits at which table, the position, whose turn, the result.
 * The same class runs on the village server (server/src/DamaTables.js is a copy, with
 * DamaRules.js) and in the game when it is offline, so both follow the very same rules.
 *
 * A table's life: someone takes a board from the shelf and sits at a table (`open`: they play
 * white) → someone sits down opposite (`sit`: black) and the game starts — or the owner asks Rıfat
 * Amca (`open` with `npc`: the owner moves for him too) → moves (`move`, checked against the rules)
 * → the end (no move left, or a long time without a take: a draw) → `again`, or getting up
 * (`leave`: the owner takes the board away; the other one leaves the seat free).
 */
export const DAMA_TABLES = 12; // content/square.js KAHVE_TABLES
export const DRAW_AFTER = 60;  // half-moves without a take or a man's step

export class DamaTables {
  #t = new Map(); // table number → { white, black, board, turn, last, over, quiet }

  #at(id) { for (const [n, t] of this.#t) if (t.white?.id === id || t.black?.id === id) return n; return null; }
  #ok(n) { return Number.isInteger(n) && n >= 0 && n < DAMA_TABLES; }

  /** The table where `id` plays, or null. */
  tableOf(id) { return this.#at(id); }

  /** A board put on table `n`; `npc`: the name of a villager who plays black (the owner moves for him). */
  open(p, n, npc = null) {
    if (!this.#ok(n) || this.#t.has(n) || this.#at(p.id) !== null) return false;
    const t = { white: { id: p.id, name: p.name }, black: null, board: null, turn: 1, last: null, over: null, quiet: 0 };
    if (typeof npc === 'string' && npc) { t.black = { id: `npc:${p.id}`, name: npc.slice(0, 24), npc: true }; t.board = startBoard(); }
    this.#t.set(n, t);
    return true;
  }

  /** Sitting down opposite a waiting board: the game starts. */
  sit(p, n) {
    const t = this.#t.get(n);
    if (!t || t.black || t.white.id === p.id || this.#at(p.id) !== null) return false;
    t.black = { id: p.id, name: p.name };
    Object.assign(t, { board: startBoard(), turn: 1, last: null, over: null, quiet: 0 });
    return true;
  }

  /** A move by `id` (the owner of an npc table moves both sides): from → to, the rest found by the rules. */
  move(id, n, { from, to } = {}) {
    const t = this.#t.get(n);
    if (!t?.board || t.over) return false;
    const mover = t.turn === 1 ? t.white : t.black;
    if (!mover || (mover.id !== id && !(mover.npc && t.white.id === id))) return false;
    const m = legalMoves(t.board, t.turn).find((x) => x.from === from && x.to === to);
    if (!m) return false;
    const man = Math.abs(t.board[m.from]) === 1;
    t.board = play(t.board, m);
    t.last = { path: m.path, caps: m.caps, by: t.turn };
    t.quiet = m.caps.length || man ? 0 : t.quiet + 1;
    t.turn = -t.turn;
    if (!legalMoves(t.board, t.turn).length) t.over = t.turn === 1 ? 'black' : 'white';
    else if (t.quiet >= DRAW_AFTER) t.over = 'draw';
    return true;
  }

  /** Once a game is over: another one, the same two players. */
  again(id, n) {
    const t = this.#t.get(n);
    if (!t?.over || !t.black || (t.white.id !== id && t.black.id !== id)) return false;
    Object.assign(t, { board: startBoard(), turn: 1, last: null, over: null, quiet: 0 });
    return true;
  }

  /** `id` gets up: the owner takes the board away; the other player leaves the seat free. */
  leave(id) {
    const n = this.#at(id);
    if (n === null) return false;
    const t = this.#t.get(n);
    if (t.white.id === id) this.#t.delete(n);
    else Object.assign(t, { black: null, board: null, turn: 1, last: null, over: null, quiet: 0 });
    return true;
  }

  /** Everything, as sent to every player in the room. */
  state() {
    return { type: 'dama', tables: [...this.#t].map(([n, t]) => ({ n, white: t.white, black: t.black, board: t.board, turn: t.turn, last: t.last, over: t.over })) };
  }
}
