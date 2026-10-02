import * as THREE from 'three';
import { Chess } from 'chess.js';
import { chessSquare, CHESS } from '../world/locations/VillageSquare.js';
import { el } from '../ui/dom.js';

/** Turkish piece names (taught while playing). */
export const PIECE_WORDS = { k: ['şah', 'king'], q: ['vezir', 'queen'], r: ['kale', 'rook'], b: ['fil', 'bishop'], n: ['at', 'knight'], p: ['piyon', 'pawn'] };

const CLOCK = 5 * 60_000; // offline: the same five minutes as on the server
const PAUSE = 6000;       // offline: the result stays on the board this long
const DEDE = { id: 'dede', name: 'İsmail Dede', ai: true };
const COLOR = { w: 'beyaz', b: 'siyah' };

/** Dede's offline move: mate if he can, otherwise captures and checks first. */
function dedeMove(g) {
  const score = (m) => (m.san.includes('#') ? 100 : 0) + (m.captured ? { q: 9, r: 5, b: 3, n: 3, p: 1 }[m.captured] * 3 : 0) + (m.san.includes('+') ? 2 : 0) + Math.random() * 2;
  return g.moves({ verbose: true }).sort((a, b) => score(b) - score(a))[0];
}

/**
 * The giant chess board on the village square, run by İsmail Dede. Online the village
 * server owns the table (server/src/ChessTable.js): you ask Dede for a colour, he seats
 * the players and starts the game when both colours are there, keeps the clocks and the
 * score board, and plays you himself when the board is free. Offline nobody else is
 * around, so Dede plays the other colour. Two ways to move: on the 2D board on screen, or
 * on the square itself — on your turn step next to your piece, take it (action key), carry
 * it to a lit square and put it down. Touching a piece while not seated asks Dede for that
 * colour. Walking away never costs you your seat. The 3D pieces follow every move, so
 * people walking by can watch. Dede announces what happens
 * (`onSay`) and the score board behind the board is kept up to date.
 */
export class ChessGame {
  #meshes = [];
  #anim = null;
  #local = null;
  #timer = null;
  #bySquare = new Map();
  #fen = null;
  #glow = null; // red light on a king in check
  #carry = null;  // the piece in my hands: { from, mesh, legal }
  #lights = [];

  constructor({ host, mf, square, net, vocab, toasts, player, world, onSay = () => {}, onAskDede = () => {} }) {
    Object.assign(this, { mf, square, net, vocab, toasts, player, world, onSay, onAskDede });
    // while you play: your colour, the clocks and whose turn it is (nothing else on the screen)
    this.bar = el('div', { class: 'pill chess-bar', attrs: { 'aria-live': 'polite' } });
    this.bar.hidden = true;
    host.append(this.bar);
    setInterval(() => this.#paintBar(), 500);
    this.online = false;
    this.state = null;
    this.#resetLocal();
    square.animated.push((dt) => { this.#animate(dt); this.#follow(); });
    this.#apply(this.#localState(), true);
  }

  get myId() { return this.online ? this.net?.id : 'me'; }
  /** My colour while seated (online: the seat Dede gave me). */
  get myColor() {
    const s = this.state?.seats ?? {};
    return s.w?.id === this.myId ? 'w' : s.b?.id === this.myId ? 'b' : null;
  }
  get game() { return new Chess(this.state.fen); }

  // --- online ---------------------------------------------------------------------

  /** The server's board (welcome, after every change). Old servers (no `v`) still work. */
  applyServer(st) {
    this.online = true;
    if (!st.v) st = { ...st, phase: st.over ? 'over' : st.seats?.w && st.seats?.b ? 'playing' : st.seats?.w || st.seats?.b ? 'waiting' : 'idle', queue: [], clocks: null, scores: [], legacy: true };
    this.#apply(st);
  }

  /** Left the square / lost the connection: back to the board with Dede alone. */
  goOffline() {
    if (!this.online) return;
    this.online = false;
    this.#resetLocal();
    this.#apply(this.#localState(), true);
  }

  // --- actions (from the on-screen board) ----------------------------------------

  ask(color) {
    this.#learnWords();
    if (color === 'free') color = this.state?.seats?.w ? 'b' : 'w'; // the empty seat opposite the waiting player
    if (this.online) { this.net.send({ type: this.state.legacy ? 'chess-sit' : 'chess-ask', color }); return; }
    // nobody else here: Dede takes the other colour
    this.#localStart(color);
  }
  playDede(color = 'w') { this.#learnWords(); if (this.online) this.net.send({ type: 'chess-dede', color }); else this.#localStart(color); }
  leave() { if (this.online) this.net.send({ type: this.state.legacy ? 'chess-stand' : 'chess-leave' }); }
  resign() {
    if (this.online) { this.net.send({ type: 'chess-resign' }); return; }
    if (this.#local.phase === 'playing') this.#localFinish(this.#local.mine === 'w' ? 'b' : 'w', 'resign');
  }

  /** Words for the pieces into the notebook (when Dede seats you). */
  #learnWords() { Object.values(PIECE_WORDS).forEach(([tr, en]) => this.vocab.learn(tr, en)); }

  /** Seated or waiting in line: where I stand (for İsmail Dede's dialogue). */
  get me() {
    const st = this.state ?? {};
    return { color: this.myColor, phase: st.phase, inLine: (st.queue ?? []).find((q) => q.id === this.myId)?.color ?? null, players: [st.seats?.w?.name, st.seats?.b?.name] };
  }

  #paintBar() {
    const st = this.state, mine = this.myColor;
    const show = !!mine && (st?.phase === 'playing' || st?.phase === 'waiting') && this.world?.current?.id === 'village';
    this.bar.hidden = !show;
    if (!show) return;
    const g = this.game, clock = (c) => { const ms = Math.max(0, (st.clocks?.[c] ?? 0) - (st.running === c ? Date.now() - st.at : 0)); return `${Math.floor(ms / 60000)}:${String(Math.floor(ms / 1000) % 60).padStart(2, '0')}`; };
    const turn = st.phase === 'waiting' ? 'rakip bekleniyor' : g.turn() === mine ? (g.isCheck() ? 'Şah! Sıra sende' : 'Sıra sende') : 'Rakibin oynuyor';
    this.bar.textContent = `♟ Sen ${COLOR[mine]} · ⏱ ${clock(mine)} · ${turn}`;
  }

  #move(from, to) {
    const g = this.game;
    if (this.state.phase !== 'playing' || g.turn() !== this.myColor) return;
    if (!g.moves({ square: from, verbose: true }).some((m) => m.to === to)) return;
    if (this.online) { this.net.send({ type: 'chess-move', from, to, promotion: 'q' }); return; }
    this.#localMove({ from, to, promotion: 'q' });
  }

  /** New state: Dede's announcement, the 3D pieces, the score board, the on-screen board. */
  #apply(st, quiet = false) {
    const before = this.state;
    this.state = { ...st, at: Date.now() };
    if (!quiet) { const line = this.#announce(before, this.state); if (line) this.onSay(line); }
    if (st.fen !== before?.fen) this.#render3D(st.fen, st.last);
    if (JSON.stringify(st.scores ?? []) !== JSON.stringify(before?.scores ?? [])) this.square.writeChessScores?.(st.scores ?? []);
    this.#paintBar();
  }

  /** What İsmail Dede says about a change on the board (Turkish; null = nothing). */
  #announce(a, b) {
    const name = (c) => b.seats?.[c]?.name ?? '?';
    if (b.phase === 'over' && a?.phase !== 'over') {
      const { winner, reason } = b.result ?? {};
      const w = winner && name(winner);
      if (reason === 'mate') return `Şah mat! ${w} kazandı. Tebrikler!`;
      if (reason === 'time') return `Süre bitti! Oyunu ${w} kazandı.`;
      if (reason === 'resign') return `${name(winner === 'w' ? 'b' : 'w')} pes etti. ${w} kazandı.`;
      if (reason === 'left') return `${name(winner === 'w' ? 'b' : 'w')} gitti, geri gelmedi. ${w} kazandı.`;
      if (reason === 'limit') return 'Vakit doldu, bu oyun burada biter. Sırada bekleyenler var!';
      return 'Berabere! İkiniz de iyi oynadınız.';
    }
    if (b.phase === 'playing' && a?.phase !== 'playing') {
      if (b.seats.w?.ai || b.seats.b?.ai) return `Haydi bakalım! Ben ${b.seats.w?.ai ? 'beyazım' : 'siyahım'}, sen ${b.seats.w?.ai ? 'siyahsın' : 'beyazsın'}. Herkese beş dakika.`;
      return `Beyaz ${name('w')}, siyah ${name('b')}. Herkese beşer dakika. Başlayın!`;
    }
    if (b.phase === 'waiting' && (a?.phase !== 'waiting' || a.seats?.w?.id !== b.seats?.w?.id || a.seats?.b?.id !== b.seats?.b?.id)) {
      const c = b.seats.w ? 'w' : 'b', other = c === 'w' ? 'b' : 'w';
      return `${name(c)} ${COLOR[c]} olacak. ${COLOR[other][0].toLocaleUpperCase('tr')}${COLOR[other].slice(1)} olacak kim var?`;
    }
    const added = (b.queue ?? []).find((q) => !(a?.queue ?? []).some((x) => x.id === q.id));
    if (added && b.phase !== 'idle') return `${added.name}, sen sıradaki oyunda ${COLOR[added.color]} olursun.`;
    return null;
  }

  // --- offline: you and Dede --------------------------------------------------------

  #resetLocal() { this.#local = { game: new Chess(), phase: 'idle', mine: null, last: null, result: null, clocks: { w: CLOCK, b: CLOCK }, turnAt: 0 }; }

  #localState() {
    const L = this.#local, me = { id: 'me', name: 'Sen' };
    const seats = L.mine ? { [L.mine]: me, [L.mine === 'w' ? 'b' : 'w']: DEDE } : { w: null, b: null };
    const clocks = { ...L.clocks };
    if (L.phase === 'playing') clocks[L.game.turn()] = Math.max(0, clocks[L.game.turn()] - (Date.now() - L.turnAt));
    return { phase: L.phase, fen: L.game.fen(), turn: L.game.turn(), last: L.last, result: L.result, seats, queue: [], clocks, running: L.phase === 'playing' ? L.game.turn() : null, scores: [] };
  }

  #localStart(color) {
    if (this.#local.phase === 'playing' || this.#local.phase === 'over') return;
    this.#resetLocal();
    Object.assign(this.#local, { phase: 'playing', mine: color === 'b' ? 'b' : 'w', turnAt: Date.now() });
    this.#apply(this.#localState());
    clearInterval(this.#timer);
    this.#timer = setInterval(() => this.#localTick(), 500);
    if (this.#local.mine === 'b') setTimeout(() => this.#localDede(), 1200);
  }

  #localMove(m) {
    const L = this.#local, turn = L.game.turn();
    const made = L.game.move(m);
    L.clocks[turn] = Math.max(0, L.clocks[turn] - (Date.now() - L.turnAt));
    L.turnAt = Date.now();
    L.last = { from: made.from, to: made.to, san: made.san };
    if (L.game.isCheckmate()) this.#localFinish(turn, 'mate');
    else if (L.game.isGameOver()) this.#localFinish(null, 'draw');
    else { this.#apply(this.#localState()); if (L.game.turn() !== L.mine) setTimeout(() => this.#localDede(), 1200); }
  }

  #localDede() {
    const L = this.#local;
    if (this.online || L.phase !== 'playing' || L.game.turn() === L.mine) return;
    this.#localMove(dedeMove(L.game));
  }

  #localTick() {
    const L = this.#local;
    if (this.online || L.phase !== 'playing') return;
    const turn = L.game.turn();
    if (L.clocks[turn] - (Date.now() - L.turnAt) <= 0) { L.clocks[turn] = 0; this.#localFinish(turn === 'w' ? 'b' : 'w', 'time'); }
  }

  #localFinish(winner, reason) {
    const L = this.#local;
    clearInterval(this.#timer);
    Object.assign(L, { phase: 'over', result: { winner, reason } });
    this.#apply(this.#localState());
    setTimeout(() => { if (!this.online && this.#local === L) { this.#resetLocal(); this.#apply(this.#localState(), true); } }, PAUSE);
  }

  // --- playing on foot, on the board itself -------------------------------------------

  /** Board square under a world position (null when off the board). */
  squareAt(pos) {
    const file = Math.round((pos.x - CHESS.cx) / CHESS.size + 3.5), rank = Math.round(3.5 - (pos.z - CHESS.cz) / CHESS.size);
    return file >= 0 && file < 8 && rank >= 0 && rank < 8 ? `${'abcdefgh'[file]}${rank + 1}` : null;
  }

  /** Interaction provider: what the action key does on the board right now. */
  find(pos) {
    if (this.world?.current?.id !== 'village' || !this.state) return null;
    const sq = this.squareAt(pos);
    if (!sq) return null;
    const g = this.game, piece = g.get(sq), mine = this.myColor, phase = this.state.phase;
    const act = (label, run) => ({ label, run, dist: 0.1, priority: 3 });
    const c = this.#carry;
    if (c) {
      if (sq === c.from) return act('Taşı yerine bırak', () => this.#dropCarry());
      if (c.legal.includes(sq)) return act(`${PIECE_WORDS[g.get(c.from).type][0]}: ${sq} karesine oyna`, () => this.#move(c.from, sq));
      return act('Bu taş oraya gidemez', () => this.toasts.show('Bu taş oraya gidemez', 'This piece can’t go there'));
    }
    if (mine) {
      if (phase === 'playing' && g.turn() === mine && piece?.color === mine) {
        const legal = g.moves({ square: sq, verbose: true }).map((m) => m.to);
        if (legal.length) return act(`${PIECE_WORDS[piece.type][0]} taşını al`, () => this.#pick(sq, legal));
      }
      return null;
    }
    // not playing: İsmail Dede decides who plays — talk to him
    if (piece) return act('İsmail Dede’ye sor', () => this.onAskDede());
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

  /** The piece in my hands follows me; off the board it goes back to its square (the seat stays mine). */
  #follow() {
    const c = this.#carry;
    if (!c || !this.player) return;
    const p = this.player.position;
    if (this.world?.current?.id !== 'village' || !this.squareAt(p) || this.state?.phase !== 'playing') { this.#dropCarry(); return; }
    c.mesh.position.set(p.x + 0.5, 0.35, p.z);
  }

  // --- the giant pieces on the square ------------------------------------------------

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
    // check: the king's square glows red (and a red light over it), pulsing until the king is safe
    this.#glow = null;
    if (game.isCheck()) {
      const king = board.flat().find((p) => p?.type === 'k' && p.color === game.turn());
      if (king) {
        const { x, z } = chessSquare(king.square);
        const tile = new THREE.Mesh(new THREE.BoxGeometry(CHESS.size * 0.98, 0.03, CHESS.size * 0.98), new THREE.MeshBasicMaterial({ color: 0xFF2A2A, transparent: true, opacity: 0.7 }));
        tile.position.set(x, 0.135, z);
        const light = new THREE.PointLight(0xFF3030, 3, 4.5);
        light.position.set(x, 1.2, z);
        group.add(tile, light);
        this.#meshes.push(tile, light);
        this.#glow = { tile, light };
      }
    }
    if (moved) {
      const from = chessSquare(last.from);
      this.#anim = { mesh: moved, from: new THREE.Vector3(from.x, 0.12, from.z), to: moved.position.clone(), t: 0 };
      moved.position.copy(this.#anim.from);
      // the onlookers on the benches hear what happened (TalkAreas)
      const taken = before ? new Chess(before).get(last.to) : null;
      this.onMove?.({ piece: game.get(last.to)?.type, captured: taken?.type ?? null, check: game.isCheck() && !game.isCheckmate(), mate: game.isCheckmate() });
    }
  }

  #animate(dt) {
    if (this.#glow) { const k = 0.55 + 0.45 * Math.sin(performance.now() / 180); this.#glow.tile.material.opacity = 0.35 + 0.45 * k; this.#glow.light.intensity = 1 + 3 * k; }
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
