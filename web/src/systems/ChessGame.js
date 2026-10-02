import * as THREE from 'three';
import { Chess } from 'chess.js';
import { chessSquare, CHESS } from '../world/locations/VillageSquare.js';

/** Turkish piece names (taught while playing). */
export const PIECE_WORDS = { k: ['şah', 'king'], q: ['vezir', 'queen'], r: ['kale', 'rook'], b: ['fil', 'bishop'], n: ['at', 'knight'], p: ['piyon', 'pawn'] };

/**
 * The giant chess board on the village square. Online, the village server owns the game
 * (two seats, everyone in the square sees the pieces move); offline you play white against
 * a simple computer. Two ways to play:
 *  - on the square itself: step next to a piece and press the action key — the first one to
 *    touch a colour plays it; on your turn you take the piece, carry it to a lit square and
 *    put it down there (only moves the piece is allowed). Walking off the board warns you,
 *    then gives your seat up;
 *  - on the 2D board on screen (the "Satranç oyna" spot).
 * The 3D pieces follow every move, so people walking by can watch.
 */
export class ChessGame {
  #meshes = [];
  #bySquare = new Map();
  #fen = null;
  #anim = null;
  #carry = null;  // { from, mesh, legal }
  #warned = false;
  #walking = false; // seated and has stepped on the board (playing on foot, not on the 2D screen)
  #lights = [];

  constructor({ mf, square, view, net, vocab, toasts, player, world }) {
    Object.assign(this, { mf, square, view, net, vocab, toasts, player, world });
    this.online = false;
    this.state = null;
    this.local = new Chess();
    square.animated.push((dt) => { this.#animate(dt); this.#onBoard(); });
    this.#render3D(this.local.fen(), null);
  }

  get myId() { return this.net?.id ?? 'me'; }
  get game() { return this.online && this.state ? new Chess(this.state.fen) : this.local; }
  /** My colour: online the seat I took, offline always white. */
  get myColor() {
    if (!this.online) return 'w';
    const s = this.state?.seats ?? {};
    return s.w?.id === this.myId ? 'w' : s.b?.id === this.myId ? 'b' : null;
  }

  /** The server's board (welcome, after every change). */
  applyServer(state) {
    const before = this.state?.fen;
    this.online = true;
    this.state = state;
    if (state.fen !== before) this.#render3D(state.fen, state.last);
    if (this.view.isOpen) this.#show();
  }

  /** Left the square / lost the connection: back to a local game against the computer. */
  goOffline() {
    this.online = false;
    this.state = null;
    this.#render3D(this.local.fen(), null);
    if (this.view.isOpen) this.#show();
  }

  open() {
    Object.values(PIECE_WORDS).forEach(([tr, en]) => this.vocab.learn(tr, en));
    this.view.open({
      onMove: (from, to) => this.#move(from, to),
      onSit: (color) => this.net.send({ type: 'chess-sit', color }),
      onStand: () => this.net.send({ type: 'chess-stand' }),
      onNew: () => (this.online ? this.net.send({ type: 'chess-new' }) : this.#newLocal()),
    });
    this.#show();
  }

  #show() {
    const g = this.game;
    const s = this.online ? this.state : { seats: { w: { id: 'me', name: 'Sen' }, b: { id: 'cpu', name: 'Bilgisayar' } }, last: null };
    this.view.render({
      game: g, online: this.online, myColor: this.myColor, seats: s.seats, last: s.last ?? this.localLast ?? null,
      over: g.isCheckmate() ? 'checkmate' : g.isDraw() ? 'draw' : null,
    });
  }

  #move(from, to) {
    const g = this.game;
    if (g.turn() !== this.myColor) return;
    const legal = g.moves({ square: from, verbose: true }).find((m) => m.to === to);
    if (!legal) return;
    if (this.online) { this.net.send({ type: 'chess-move', from, to, promotion: 'q' }); return; }
    const m = this.local.move({ from, to, promotion: 'q' });
    this.localLast = { from: m.from, to: m.to, san: m.san };
    this.#render3D(this.local.fen(), this.localLast);
    this.#show();
    if (!this.local.isGameOver()) setTimeout(() => this.#cpuMove(), 700);
  }

  /** A simple opponent: checkmate if it can, otherwise captures and checks first. */
  #cpuMove() {
    if (this.online || this.local.turn() !== 'b' || this.local.isGameOver()) return;
    const moves = this.local.moves({ verbose: true });
    const score = (m) => (m.san.includes('#') ? 100 : 0) + (m.captured ? { q: 9, r: 5, b: 3, n: 3, p: 1 }[m.captured] * 3 : 0) + (m.san.includes('+') ? 2 : 0) + Math.random() * 2;
    const best = moves.sort((a, b) => score(b) - score(a))[0];
    const m = this.local.move(best);
    this.localLast = { from: m.from, to: m.to, san: m.san };
    this.#render3D(this.local.fen(), this.localLast);
    if (this.view.isOpen) this.#show();
  }

  // --- playing on the square itself -------------------------------------------------------

  /** Board square under a world position (null when off the board). */
  squareAt(pos) {
    const file = Math.round((pos.x - CHESS.cx) / CHESS.size + 3.5), rank = Math.round(3.5 - (pos.z - CHESS.cz) / CHESS.size);
    return file >= 0 && file < 8 && rank >= 0 && rank < 8 ? `${'abcdefgh'[file]}${rank + 1}` : null;
  }

  /** Interaction provider: what the action key does on the board right now. */
  find(pos) {
    if (this.world?.current?.id !== 'village') return null;
    const sq = this.squareAt(pos);
    if (!sq) return null;
    const g = this.game, piece = g.get(sq), mine = this.myColor;
    const name = (p) => PIECE_WORDS[p.type][0];
    const act = (label, run) => ({ label, run, dist: 0.1, priority: 3 });
    if (this.online && !mine) {
      if (piece && !this.state?.seats?.[piece.color]) return act(`${piece.color === 'w' ? 'Beyaz' : 'Siyah'} taşlarla oyna`, () => { this.net.send({ type: 'chess-sit', color: piece.color }); this.toasts.show(`${piece.color === 'w' ? 'Beyaz' : 'Siyah'} taşlar senin!`, 'You play this colour'); });
      return null;
    }
    const c = this.#carry;
    if (c) {
      if (sq === c.from) return act('Taşı yerine bırak', () => this.#dropCarry());
      if (c.legal.includes(sq)) return act(`${name(g.get(c.from))}: ${sq} karesine oyna`, () => this.#move(c.from, sq));
      return act('Bu taş oraya gidemez', () => this.toasts.show('Bu taş oraya gidemez', 'This piece can’t go there'));
    }
    if (mine && g.turn() === mine && piece?.color === mine && !g.isGameOver()) {
      const legal = g.moves({ square: sq, verbose: true }).map((m) => m.to);
      if (legal.length) return act(`${name(piece)} taşını al`, () => this.#pick(sq, legal));
    }
    return null;
  }

  /** Take a piece: it follows the player, its squares light up. */
  #pick(sq, legal) {
    const mesh = this.#bySquare.get(sq);
    if (!mesh) return;
    this.#carry = { from: sq, mesh, legal };
    const { x, z } = chessSquare(sq);
    this.player.position.x = x; this.player.position.z = z;
    this.#light(legal);
    this.toasts.show(`${PIECE_WORDS[this.game.get(sq).type][0]} senin elinde: yeşil karelerden birine götür`, 'Carry it to a green square');
  }

  #dropCarry() {
    const c = this.#carry;
    if (!c) return;
    const { x, z } = chessSquare(c.from);
    c.mesh.position.set(x, 0.12, z);
    this.#carry = null;
    this.#light([]);
  }

  #light(squares) {
    const group = this.square.chessPieces;
    this.#lights.forEach((m) => group.remove(m));
    this.#lights = squares.map((sq) => {
      const { x, z } = chessSquare(sq);
      const m = new THREE.Mesh(new THREE.BoxGeometry(CHESS.size * 0.9, 0.02, CHESS.size * 0.9), new THREE.MeshBasicMaterial({ color: 0x3E8E4A, transparent: true, opacity: 0.55 }));
      m.position.set(x, 0.13, z);
      group.add(m);
      return m;
    });
  }

  /** Every frame on the square: carry the picked piece; leaving the board warns, then gives the seat up. */
  #onBoard() {
    if (this.world?.current?.id !== 'village' || !this.player) return;
    const p = this.player.position;
    if (this.#carry) { this.#carry.mesh.position.set(p.x + 0.5, 0.35, p.z); }
    const half = CHESS.size * 4;
    const out = Math.max(Math.abs(p.x - CHESS.cx) - half, Math.abs(p.z - CHESS.cz) - half);
    if (!this.myColor || this.view.isOpen) this.#walking = false;
    else if (out <= 0) this.#walking = true;
    if (!this.#carry && !(this.online && this.#walking)) { this.#warned = false; return; }
    if (out <= 0.4) { this.#warned = false; return; }
    if (!this.#warned) { this.#warned = true; this.toasts.show('Oyundan çıkıyorsunuz! Tahtaya dönersen devam edersin.', 'You are leaving the game! Step back on the board to keep playing.'); return; }
    if (out > 2.5) {
      this.#dropCarry();
      if (this.online && this.myColor) this.net.send({ type: 'chess-stand' });
      this.#warned = false;
      this.#walking = false;
      this.toasts.show('Oyundan çıktın. Yerin boşaldı.', 'You left the game; your seat is free.');
    }
  }

  #newLocal() { this.local = new Chess(); this.localLast = null; this.#render3D(this.local.fen(), null); this.#show(); }

  /** Rebuild the giant pieces from a FEN; the piece that just moved slides into place. */
  #render3D(fen, last) {
    const group = this.square.chessPieces;
    if (!group) return;
    this.#meshes.forEach((m) => group.remove(m));
    this.#meshes = [];
    this.#bySquare.clear();
    this.#dropCarry();
    const before = this.#fen, game = new Chess(fen);
    this.#fen = fen;
    const board = game.board();
    let moved = null;
    board.forEach((row) => row.forEach((p) => {
      if (!p) return;
      const mesh = this.#piece(p.type, p.color);
      const { x, z } = chessSquare(p.square);
      mesh.position.set(x, 0.12, z);
      if (p.color === 'b') mesh.rotation.y = Math.PI;
      group.add(mesh);
      this.#meshes.push(mesh);
      this.#bySquare.set(p.square, mesh);
      if (last && p.square === last.to) moved = mesh;
    }));
    if (moved) {
      const from = chessSquare(last.from);
      this.#anim = { mesh: moved, from: new THREE.Vector3(from.x, 0.12, from.z), to: moved.position.clone(), t: 0 };
      moved.position.copy(this.#anim.from);
      // tell the onlookers what happened (İsmail Dede on the benches comments)
      const taken = before ? new Chess(before).get(last.to) : null;
      this.onMove?.({ piece: game.get(last.to)?.type, captured: taken?.type ?? null, check: game.isCheck() && !game.isCheckmate(), mate: game.isCheckmate() });
    }
  }

  #animate(dt) {
    const a = this.#anim;
    if (!a) return;
    a.t = Math.min(1, a.t + dt * 1.6);
    a.mesh.position.lerpVectors(a.from, a.to, a.t);
    a.mesh.position.y = 0.12 + Math.sin(a.t * Math.PI) * 0.6; // a little hop
    if (a.t >= 1) this.#anim = null;
  }

  /** Blocky giant pieces, about knee to shoulder high. */
  #piece(type, color) {
    const { mf } = this;
    const c = color === 'w' ? 0xF4EFE6 : 0x2B2B2B;
    const base = (h = 0.18) => mf.at(mf.cyl(0.36, 0.42, h, c, 16), 0, h / 2, 0);
    const parts = {
      p: () => [base(), mf.at(mf.cyl(0.16, 0.26, 0.45, c, 12), 0, 0.4, 0), mf.at(mf.sphere(0.19, c, 12), 0, 0.75, 0)],
      r: () => [base(), mf.at(mf.cyl(0.27, 0.31, 0.75, c, 12), 0, 0.55, 0), mf.at(mf.cyl(0.34, 0.3, 0.2, c, 12), 0, 1.0, 0),
        ...[0, 1, 2, 3].map((i) => mf.at(mf.box(0.14, 0.16, 0.14, c), Math.cos(i * Math.PI / 2) * 0.24, 1.18, Math.sin(i * Math.PI / 2) * 0.24))],
      n: () => [base(), mf.at(mf.box(0.36, 0.7, 0.3, c), 0, 0.53, 0), mf.at(mf.box(0.3, 0.32, 0.6, c), 0, 0.98, 0.14), mf.at(mf.box(0.1, 0.18, 0.1, c), 0.09, 1.2, -0.05), mf.at(mf.box(0.1, 0.18, 0.1, c), -0.09, 1.2, -0.05)],
      b: () => [base(), mf.at(mf.cyl(0.13, 0.27, 0.8, c, 12), 0, 0.58, 0), mf.at(mf.sphere(0.21, c, 12), 0, 1.08, 0), mf.at(mf.sphere(0.07, c, 8), 0, 1.33, 0)],
      q: () => [base(0.22), mf.at(mf.cyl(0.16, 0.3, 1.0, c, 12), 0, 0.72, 0), mf.at(mf.cyl(0.3, 0.18, 0.2, c, 12), 0, 1.3, 0), mf.at(mf.sphere(0.12, c, 10), 0, 1.48, 0)],
      k: () => [base(0.22), mf.at(mf.cyl(0.17, 0.31, 1.1, c, 12), 0, 0.77, 0), mf.at(mf.cyl(0.3, 0.2, 0.2, c, 12), 0, 1.4, 0),
        // a crown with points and a ball on top (no cross)
        ...[0, 1, 2, 3, 4, 5].map((i) => mf.at(mf.box(0.07, 0.18, 0.07, 0xE0B04A), Math.cos(i * Math.PI / 3) * 0.2, 1.6, Math.sin(i * Math.PI / 3) * 0.2)),
        mf.at(mf.sphere(0.1, 0xE0B04A, 10), 0, 1.66, 0)],
    };
    return mf.group(...parts[type]());
  }
}

export { CHESS };
