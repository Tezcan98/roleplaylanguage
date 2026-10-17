// A copy of web/src/systems/DamaRules.js (the game runs the same rules offline): change both together.
/**
 * Türk daması (Turkish draughts) on an 8×8 board, as played in every kahvehane. Pure rules, no
 * drawing (ui/DamaView.js draws it; the tests run it in node).
 *
 * The board is 64 cells, index = row * 8 + col, row 0 at the bottom (white's side). A cell holds
 * 0 (empty), 1 / 2 (a white man / a white dama), −1 / −2 (black). White starts and moves up.
 * - A man (taş) steps one cell forward or sideways — never back, never diagonally.
 * - It takes by jumping over an enemy next to it (forward or sideways) onto the empty cell behind;
 *   from there it goes on taking if it can. Taken pieces come off at once.
 * - Taking is a must, and of all the ways to take you must choose one that takes the most pieces.
 * - A man that ends its move on the far row becomes a dama: it moves any distance in a straight
 *   line (like a rook) and takes from afar — over one enemy with empty cells before and after it,
 *   landing on any empty cell behind — but never turns straight back in the middle of a take.
 * - Whoever cannot move (no pieces, or all blocked) loses.
 */
export const SIZE = 8;
const DIRS = [[0, 1], [0, -1], [1, 0], [-1, 0]]; // up, down, right, left (dx, dy)
const at = (c, r) => (c >= 0 && c < SIZE && r >= 0 && r < SIZE ? r * SIZE + c : -1);
const side = (v) => Math.sign(v);

/** The starting position: each side's 16 men on its second and third rows. */
export function startBoard() {
  const b = new Array(SIZE * SIZE).fill(0);
  for (let c = 0; c < SIZE; c++) { b[at(c, 1)] = b[at(c, 2)] = 1; b[at(c, 5)] = b[at(c, 6)] = -1; }
  return b;
}

/** The directions a piece may go: a man forward and sideways, a dama all four. */
const dirsOf = (v) => (Math.abs(v) === 2 ? DIRS : DIRS.filter(([, dy]) => dy !== -side(v)));

/** Every way `from` can take, each as { path: [from, …landings], caps: [taken cells] } (only the longest per branch). */
function takes(b, from, v, back = null) {
  const out = [];
  const c0 = from % SIZE, r0 = (from / SIZE) | 0;
  for (const [dx, dy] of dirsOf(v)) {
    if (back && dx === -back[0] && dy === -back[1]) continue; // a dama never turns straight back
    if (Math.abs(v) === 1) {
      const mid = at(c0 + dx, r0 + dy), land = at(c0 + 2 * dx, r0 + 2 * dy);
      if (mid < 0 || land < 0 || side(b[mid]) !== -side(v) || b[land] !== 0) continue;
      out.push(...branch(b, from, mid, land, v, [dx, dy]));
    } else {
      let k = 1, mid = -1;
      for (; ; k++) { // over the empty cells to the first piece
        const i = at(c0 + k * dx, r0 + k * dy);
        if (i < 0) break;
        if (b[i] === 0) continue;
        if (side(b[i]) === -side(v)) mid = i;
        break;
      }
      if (mid < 0) continue;
      for (let j = k + 1; ; j++) { // any empty cell behind it
        const land = at(c0 + j * dx, r0 + j * dy);
        if (land < 0 || b[land] !== 0) break;
        out.push(...branch(b, from, mid, land, v, [dx, dy]));
      }
    }
  }
  return out;
}

/** One take, then whatever follows from where it lands. */
function branch(b, from, mid, land, v, dir) {
  const nb = b.slice(); nb[from] = 0; nb[mid] = 0; nb[land] = v;
  const more = takes(nb, land, v, dir);
  if (!more.length) return [{ path: [from, land], caps: [mid] }];
  return more.map((m) => ({ path: [from, ...m.path], caps: [mid, ...m.caps] }));
}

/** All legal moves for `turn` (1 white, −1 black): { from, to, path, caps }. Takes only if any (the longest). */
export function legalMoves(b, turn) {
  let all = [];
  for (let i = 0; i < b.length; i++) if (side(b[i]) === turn) all.push(...takes(b, i, b[i]));
  if (all.length) {
    const most = Math.max(...all.map((m) => m.caps.length));
    return all.filter((m) => m.caps.length === most).map((m) => ({ from: m.path[0], to: m.path[m.path.length - 1], ...m }));
  }
  for (let i = 0; i < b.length; i++) {
    if (side(b[i]) !== turn) continue;
    const c0 = i % SIZE, r0 = (i / SIZE) | 0, far = Math.abs(b[i]) === 2;
    for (const [dx, dy] of dirsOf(b[i])) {
      for (let k = 1; k <= (far ? SIZE : 1); k++) {
        const t = at(c0 + k * dx, r0 + k * dy);
        if (t < 0 || b[t] !== 0) break;
        all.push({ from: i, to: t, path: [i, t], caps: [] });
      }
    }
  }
  return all;
}

/** The board after a move (a man ending on the far row becomes a dama). */
export function play(b, m) {
  const nb = b.slice(), v = nb[m.from];
  nb[m.from] = 0;
  for (const c of m.caps) nb[c] = 0;
  const row = (m.to / SIZE) | 0;
  nb[m.to] = Math.abs(v) === 1 && row === (v > 0 ? SIZE - 1 : 0) ? 2 * side(v) : v;
  return nb;
}

/** Pieces left: { men, damas } of a side. */
export function count(b, turn) {
  let men = 0, damas = 0;
  for (const v of b) if (side(v) === turn) { if (Math.abs(v) === 2) damas++; else men++; }
  return { men, damas };
}

/** How good the board is for `turn`: material (a dama is worth three), men further up a little. */
function score(b, turn) {
  let s = 0;
  for (let i = 0; i < b.length; i++) {
    const v = b[i];
    if (!v) continue;
    const row = (i / SIZE) | 0, up = v > 0 ? row : SIZE - 1 - row;
    s += side(v) * (Math.abs(v) === 2 ? 3.2 : 1 + up * 0.04);
  }
  return s * turn;
}

function search(b, turn, depth, alpha, beta) {
  const moves = legalMoves(b, turn);
  if (!moves.length) return -100 - depth; // no move: lost (sooner is worse)
  if (depth === 0) return score(b, turn);
  let best = -Infinity;
  for (const m of moves) {
    const v = -search(play(b, m), -turn, depth - 1, -beta, -alpha);
    if (v > best) best = v;
    if (best > alpha) alpha = best;
    if (alpha >= beta) break;
  }
  return best;
}

/**
 * The uncle's move: a short look ahead (`depth` half-moves), and now and then a slip, so a child
 * can beat him. Returns null when he cannot move.
 */
export function aiMove(b, turn, { depth = 3, slip = 0.2, rnd = Math.random } = {}) {
  const moves = legalMoves(b, turn);
  if (!moves.length) return null;
  const rated = moves.map((m) => ({ m, v: -search(play(b, m), -turn, depth - 1, -Infinity, Infinity) + rnd() * 0.3 }))
    .sort((x, y) => y.v - x.v);
  if (rated.length > 1 && rnd() < slip && rated[1].v > rated[0].v - 1.5) return rated[1].m; // not always the best
  return rated[0].m;
}
