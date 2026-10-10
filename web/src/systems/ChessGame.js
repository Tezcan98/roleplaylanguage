import * as THREE from 'three';
import { bakeStatic } from '../engine/StaticBatch.js';
import { Chess } from 'chess.js';
import { chessSquare, CHESS } from '../world/locations/VillageSquare.js';
import { el } from '../ui/dom.js';
import { playerName } from '../i18n/Persona.js';

/** Offline score board (you and Dede): real games only, kept on the device. */
const LOCAL_SCORES = 'chessScores';
const loadScores = () => { try { return JSON.parse(localStorage.getItem(LOCAL_SCORES) ?? '{}'); } catch { return {}; } };
const MIN_MOVES = 6; // walking away from the board (resign) counts only after a few moves

/** Turkish piece names (taught while playing). */
export const PIECE_WORDS = { k: ['şah', 'king'], q: ['vezir', 'queen'], r: ['kale', 'rook'], b: ['fil', 'bishop'], n: ['at', 'knight'], p: ['piyon', 'pawn'] };

const CLOCK = 10 * 60_000; // per player, as on the server
const POINTS = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 };
const pointsOf = (g) => { const o = { w: 0, b: 0 }; for (const p of g.board().flat()) if (p) o[p.color] += POINTS[p.type]; return o; };
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
 * the players and starts the game when both colours are there, watches that nobody sits on the
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
  #cursor = null; // the square under you while you carry a piece
  #carry = null;  // the piece in my hands: { from, mesh, legal }
  #lights = [];

  constructor({ host, mf, square, net, vocab, toasts, player, world, onSay = () => {}, onAskDede = () => {} }) {
    Object.assign(this, { mf, square, net, vocab, toasts, player, world, onSay, onAskDede });
    // while you play: your colour, whose turn it is (and Dede's 10 minutes) — nothing else on the screen
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
    const st = this.state ?? {}, mine = this.myColor, theirs = mine === 'w' ? 'b' : 'w';
    return {
      color: mine, phase: st.phase, inLine: (st.queue ?? []).find((q) => q.id === this.myId)?.color ?? null, players: [st.seats?.w?.name, st.seats?.b?.name],
      drawOfferedToMe: !!mine && st.draw?.offer === theirs, drawOfferedByMe: !!mine && st.draw?.offer === mine,
    };
  }

  /** Through Dede: offer a draw / answer the opponent's offer. */
  offerDraw() {
    if (this.online) { this.net.send({ type: 'chess-draw' }); return; }
    const L = this.#local;
    if (L.phase !== 'playing') return;
    // Dede: material from his side; about even (within a pawn) → he accepts
    let edge = 0;
    for (const p of L.game.board().flat()) if (p) edge += (p.color === L.mine ? -1 : 1) * { p: 100, n: 320, b: 330, r: 500, q: 900, k: 0 }[p.type];
    if (edge <= 100) this.#localFinish(null, 'agreed');
    else { L.draw = { offer: null, declined: L.mine }; this.#apply(this.#localState()); }
  }
  answerDraw(accept) { if (this.online) this.net.send({ type: accept ? 'chess-draw-accept' : 'chess-draw-decline' }); }

  #paintBar() {
    const st = this.state, mine = this.myColor;
    const show = !!mine && (st?.phase === 'playing' || st?.phase === 'waiting') && this.world?.current?.id === 'village';
    this.bar.hidden = !show;
    if (!show) return;
    const g = this.game, since = Date.now() - st.at;
    const mmss = (ms) => `${Math.floor(ms / 60000)}:${String(Math.floor(ms / 1000) % 60).padStart(2, '0')}`;
    const myTurn = st.phase === 'playing' && g.turn() === mine;
    let turn = st.phase === 'waiting' ? 'rakip bekleniyor' : myTurn ? (g.isCheck() ? 'Şah! Sıra sende' : 'Sıra sende') : 'Rakibin oynuyor';
    const clock = (c) => mmss(Math.max(0, (st.clocks?.[c] ?? CLOCK) - (st.running === c ? since : 0)));
    const theirs = mine === 'w' ? 'b' : 'w';
    this.bar.textContent = `♟ Sen ${COLOR[mine]} ⏱ ${clock(mine)} · Rakip ⏱ ${clock(theirs)} · ${turn}`;
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
    // my own result, big and clear
    const mine = (before?.seats?.w?.id === this.myId && 'w') || (before?.seats?.b?.id === this.myId && 'b');
    if (!quiet && mine && st.phase === 'over' && before?.phase === 'playing') {
      const win = st.result?.winner, pts = st.result?.points;
      const tr = !win ? 'Berabere!' : win === mine ? '🏆 Kazandın!' : 'Kaybettin. Bir dahakine!';
      this.toasts.show(pts ? `${tr} · ${pts[mine]} – ${pts[mine === 'w' ? 'b' : 'w']} puan` : tr, !win ? 'Draw!' : win === mine ? 'You won!' : 'You lost. Next time!');
    }
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
      if (reason === 'points') { const p = b.result.points ?? {}; return `Süre bitti! Puanlar: beyaz ${p.w}, siyah ${p.b}. ${w ? `${w} kazandı!` : 'Berabere!'}`; }
      if (reason === 'agreed') return 'Beraberlik kabul edildi. İkiniz de iyi oynadınız!';
      if (reason === 'resign') return `${name(winner === 'w' ? 'b' : 'w')} pes etti. ${w} kazandı.`;
      if (reason === 'left') return `${name(winner === 'w' ? 'b' : 'w')} gitti, geri gelmedi. ${w} kazandı.`;
      if (reason === 'limit') return 'Vakit doldu, bu oyun burada biter. Sırada bekleyenler var!';
      return 'Berabere! İkiniz de iyi oynadınız.';
    }
    if (b.phase === 'playing' && a?.phase !== 'playing') {
      if (b.seats.w?.ai || b.seats.b?.ai) return `Haydi bakalım! Ben ${b.seats.w?.ai ? 'beyazım' : 'siyahım'}, sen ${b.seats.w?.ai ? 'siyahsın' : 'beyazsın'}. Herkese on dakika.`;
      return `Beyaz ${name('w')}, siyah ${name('b')}. Herkese on dakika. Başlayın!`;
    }
    if (b.draw?.offer && b.draw.offer !== a?.draw?.offer) return `${name(b.draw.offer)} beraberlik teklif ediyor. ${name(b.draw.offer === 'w' ? 'b' : 'w')}, kabul edersen bana söyle.`;
    if (b.draw?.declined && b.draw.declined !== a?.draw?.declined) {
      const ai = b.seats[b.draw.declined === 'w' ? 'b' : 'w']?.ai;
      return ai ? 'Yok evlat, beraberlik yok! Oyuna devam.' : 'Beraberlik kabul edilmedi. Oyun devam ediyor.';
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

  #resetLocal() { this.#local = { game: new Chess(), phase: 'idle', mine: null, last: null, result: null, turnAt: 0, startedAt: 0, clocks: { w: CLOCK, b: CLOCK }, draw: { offer: null, declined: null } }; }

  #localState() {
    const L = this.#local, me = { id: 'me', name: 'Sen' };
    const seats = L.mine ? { [L.mine]: me, [L.mine === 'w' ? 'b' : 'w']: DEDE } : { w: null, b: null };
    const now = Date.now(), playing = L.phase === 'playing';
    return {
      phase: L.phase, fen: L.game.fen(), turn: L.game.turn(), last: L.last, result: L.result, seats, queue: [], scores: this.#localScores(), draw: { ...L.draw },
      clocks: { ...L.clocks, ...(playing ? { [L.game.turn()]: Math.max(0, L.clocks[L.game.turn()] - (now - L.turnAt)) } : {}) },
      running: playing ? L.game.turn() : null,
    };
  }

  #localStart(color) {
    if (this.#local.phase === 'playing' || this.#local.phase === 'over') return;
    this.#resetLocal();
    Object.assign(this.#local, { phase: 'playing', mine: color === 'b' ? 'b' : 'w', turnAt: Date.now(), startedAt: Date.now() });
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
    L.draw = { offer: null, declined: null };
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
    const now = Date.now();
    const turn = L.game.turn();
    if (L.clocks[turn] - (now - L.turnAt) <= 0) { // time is up: the points decide
      L.clocks[turn] = 0;
      const pts = pointsOf(L.game);
      this.#localFinish(pts.w > pts.b ? 'w' : pts.b > pts.w ? 'b' : null, 'points', pts);
    }
  }

  /** The offline board: you and Dede, most games first (only games really played). */
  #localScores() {
    const s = loadScores(), me = s.me, dede = s.dede;
    return [me && { name: playerName() || 'Sen', games: me.games, wins: me.wins }, dede && { name: 'İsmail Dede', games: dede.games, wins: dede.wins }]
      .filter((r) => r?.games > 0).sort((a, b) => b.games - a.games || b.wins - a.wins);
  }

  #recordLocal(winner, reason) {
    const L = this.#local;
    if (!L.mine || (reason === 'resign' && L.game.history().length < MIN_MOVES)) return; // leaving at once is no game
    const s = loadScores(), mine = L.mine;
    for (const [k, c] of [['me', mine], ['dede', mine === 'w' ? 'b' : 'w']]) {
      const r = s[k] ?? { games: 0, wins: 0 };
      r.games++; if (winner === c) r.wins++;
      s[k] = r;
    }
    try { localStorage.setItem(LOCAL_SCORES, JSON.stringify(s)); } catch { /* private mode: the board just stays as it is */ }
  }

  #localFinish(winner, reason, points = null) {
    const L = this.#local;
    clearInterval(this.#timer);
    this.#recordLocal(winner, reason);
    Object.assign(L, { phase: 'over', result: { winner, reason, ...(points ? { points } : {}) } });
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
    if (this.#cursor) this.#cursor.visible = false;
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
    // the square you stand on lights up: bright yellow if the piece can go there, red if not
    const sq = this.squareAt(p);
    if (!this.#cursor) {
      this.#cursor = new THREE.Mesh(new THREE.BoxGeometry(CHESS.size * 0.96, 0.03, CHESS.size * 0.96), new THREE.MeshBasicMaterial({ transparent: true, opacity: 0.75 }));
      this.square.chessPieces.add(this.#cursor);
    }
    const { x, z } = chessSquare(sq);
    this.#cursor.position.set(x, 0.14, z);
    this.#cursor.material.color.setHex(sq === c.from ? 0xFFFFFF : c.legal.includes(sq) ? 0xFFD21F : 0xE74C3C);
    this.#cursor.visible = true;
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
    // the last move: its two squares tinted, so everyone sees what just moved
    if (last) for (const sq of [last.from, last.to]) {
      const { x, z } = chessSquare(sq);
      const t = new THREE.Mesh(new THREE.BoxGeometry(CHESS.size * 0.96, 0.025, CHESS.size * 0.96), new THREE.MeshBasicMaterial({ color: 0x5DADE2, transparent: true, opacity: 0.45 }));
      t.position.set(x, 0.13, z);
      group.add(t); this.#meshes.push(t);
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
    const g = mf.group(...parts[type]());
    bakeStatic(g); // one mesh per colour (32 pieces were ~130 draw calls)
    return g;
  }
}

export { CHESS };
