import * as THREE from 'three';
import { DamaTables } from './DamaTables.js';
import { aiMove } from './DamaRules.js';

const THINK = 900; // ms Rıfat Amca thinks before he moves
const NPC = 'Rıfat Amca';
const CELL = 0.07; // a cell of the boards on the tables (m)

/**
 * Dama in the kahvehane. Take a board from the shelf ("Dama al": you carry the box), sit down at
 * one of the guest tables: the board is put on the table, everyone in the square sees it, and
 * whoever sits down on the stool opposite plays you (online: the village server keeps the tables
 * and checks every move, server/src/DamaTables.js). Or play Rıfat Amca: ask him ("Dama oynamaya
 * var mısın?") or press the button while you wait — he comes over and sits opposite. Getting up
 * ends it (the owner takes the board back). Offline the same tables run here, with Rıfat Amca.
 */
export class DamaClub {
  carrying = false;
  #local = new DamaTables();
  #tables = [];
  #boards = new Map(); // table → { group, key }
  #seat = null;        // { n, side } of the stool the player sits on (kahve tables)
  #wasOnline = false;
  #thinking = false;
  #rifatAway = false;
  #mine = null;        // the table you were at (to tell when the other one got up)
  #box = null;

  constructor({ world, mf, net, player, view, cast, toasts, myName, sitAt }) {
    Object.assign(this, { world, mf, net, player, view, cast, toasts, myName, sitAt });
    net?.on('dama', (st) => this.apply(st));
    net?.on('welcome', (w) => this.apply(w.dama ?? { tables: [] }));
    view.onMove = (from, to) => { const t = this.mine(); if (t) this.#send('dama-move', { n: t.n, from, to }); };
    view.onAgain = () => { const t = this.mine(); if (t) this.#send('dama-again', { n: t.n }); };
    view.onNpc = () => this.playRifat();
    view.onClose = () => { if (this.player.seated) this.player.sit(false); else this.#send('dama-leave'); };
  }

  get online() { return !!this.net?.connected; }
  get myId() { return this.online ? this.net.id : 'me'; }
  get tables() { return this.#tables; }
  /** The table you play at, or null. */
  mine() { const id = this.myId; return this.#tables.find((t) => t.white?.id === id || t.black?.id === id) ?? null; }

  #loc() { return this.world.get('village'); }
  #here() { return this.world.current?.id === 'village'; }

  #send(type, payload = {}) {
    if (this.online) { this.net.send({ type, ...payload }); return; }
    const d = this.#local, p = { id: 'me', name: this.myName() };
    const ok = type === 'dama-open' ? d.open(p, payload.n, payload.npc ?? null)
      : type === 'dama-sit' ? d.sit(p, payload.n)
        : type === 'dama-move' ? d.move('me', payload.n, payload)
          : type === 'dama-again' ? d.again('me', payload.n)
            : d.leave('me');
    if (ok) this.apply(d.state());
  }

  /** The tables as the server (or the offline copy) says. */
  apply(st) {
    this.#tables = st?.tables ?? [];
    this.#draw();
    this.#sync();
  }

  /** "Dama al" at the shelf: the box in your hands until you sit down at a table. */
  take() {
    if (this.carrying || this.mine()) return;
    this.carrying = true;
    const mf = this.mf;
    this.#box = mf.group(mf.at(mf.box(0.36, 0.06, 0.36, 0x5B3A29), 0, 0, 0), mf.at(mf.box(0.3, 0.005, 0.3, { tex: 'damaBoard' }), 0, 0.033, 0));
    this.#box.position.set(0, 0.95, 0.32);
    this.player.group.add(this.#box);
    this.toasts.show('Dama aldın! Bir masaya otur.', 'You took a dama board. Sit down at a table.');
  }

  #drop() { this.carrying = false; this.#box?.removeFromParent(); this.#box = null; }

  /** Rıfat Amca comes over: to the table you wait at, or with you to a free one. */
  playRifat() {
    if (!this.#here()) return;
    let t = this.mine(), n, rifatSide;
    if (t?.black && !t.black.npc) return; // playing someone already
    if (t) { n = t.n; rifatSide = 1 - (this.#seat?.side ?? 0); this.#send('dama-leave'); }
    else {
      n = this.#freeTable();
      if (n == null) { this.toasts.show('Şu an boş masa yok.', 'No free table right now.'); return; }
      this.sitAt(`kahve${n * 2 + 1}`); rifatSide = 1;
    }
    this.#drop();
    this.#send('dama-open', { n, npc: NPC });
    const rifat = this.cast?.get('rifat');
    if (rifat && this.#loc()) { rifat.station(this.#loc(), `kahve${n * 2 + 1 + rifatSide}`, 'sitBench'); this.#rifatAway = true; }
  }

  /** The nearest guest table with no board on it. */
  #freeTable() {
    const used = new Set(this.#tables.map((t) => t.n)), all = this.#loc()?.kahveTables ?? [], p = this.player.position;
    let best = null, d = Infinity;
    all.forEach((tb, n) => { const dd = Math.hypot(tb.x - p.x, tb.z - p.z); if (!used.has(n) && dd < d) { best = n; d = dd; } });
    return best;
  }

  update() {
    // online ↔ offline: the tables come from the other side now
    if (this.online !== this.#wasOnline) { this.#wasOnline = this.online; if (!this.online) this.apply(this.#local.state()); }
    // which kahve stool you sit on
    const m = this.#here() && this.player.seated ? /^kahve(\d+)$/.exec(this.player.seatAnchor ?? '') : null;
    const seat = m ? { n: Math.floor((Number(m[1]) - 1) / 2), side: (Number(m[1]) - 1) % 2 } : null;
    if (seat?.n !== this.#seat?.n || seat?.side !== this.#seat?.side) {
      const old = this.#seat;
      this.#seat = seat;
      if (old && this.mine()) this.#send('dama-leave'); // got up (or moved): the game is over
      if (seat) {
        const t = this.#tables.find((x) => x.n === seat.n);
        if (t && !t.black && t.white.id !== this.myId) this.#send('dama-sit', { n: seat.n }); // opposite a waiting board
        else if (!t && this.carrying) { this.#send('dama-open', { n: seat.n }); this.#drop(); }
        else if (t?.black && !this.mine()) this.toasts.show('Bu masada dama oynanıyor.', 'A game of dama is on at this table.');
      }
    }
    // Rıfat Amca's move
    const t = this.mine();
    if (t?.black?.npc && t.white.id === this.myId && t.board && !t.over && t.turn === -1 && !this.#thinking) {
      this.#thinking = true;
      const n = t.n, board = t.board;
      setTimeout(() => {
        this.#thinking = false;
        const now = this.mine();
        if (now?.n !== n || now.turn !== -1 || now.over || now.board !== board) return;
        const reply = aiMove(board, -1);
        if (reply) this.#send('dama-move', { n, from: reply.from, to: reply.to });
      }, THINK);
    }
  }

  /** The board on screen follows your table; Rıfat Amca goes back to his seat after a game with him. */
  #sync() {
    const t = this.mine();
    if (t) {
      this.view.show(t, t.white.id === this.myId ? 1 : -1);
      if (this.#mine?.black && !t.black && !this.#mine.black.npc) this.toasts.show('Rakibin masadan kalktı.', 'Your opponent got up.');
    } else {
      if (this.view.isOpen) this.view.close();
      if (this.#mine && this.#mine.white.id !== this.myId && this.player.seated) this.toasts.show('Masanın sahibi dama tahtasını kaldırdı.', 'The owner took the board away.');
    }
    if (this.#rifatAway && !t?.black?.npc) {
      this.#rifatAway = false;
      const rifat = this.cast?.get('rifat');
      if (rifat && this.#loc()) rifat.station(this.#loc(), 'amca3', 'sitBench');
    }
    this.#mine = t;
  }

  /** The boards on the kahvehane's tables, as they stand (everyone sees them). */
  #draw() {
    const loc = this.#loc();
    if (!loc?.kahveTables) return;
    const keep = new Set();
    for (const t of this.#tables) {
      const tb = loc.kahveTables[t.n];
      if (!tb) continue;
      keep.add(t.n);
      const key = JSON.stringify(t.board);
      const had = this.#boards.get(t.n);
      if (had?.key === key) continue;
      had?.group.removeFromParent();
      const group = this.#boardMesh(t.board);
      group.position.set(tb.x - 0.15, 0.775, tb.z);
      loc.group.add(group);
      this.#boards.set(t.n, { group, key });
    }
    for (const [n, b] of this.#boards) if (!keep.has(n)) { b.group.removeFromParent(); this.#boards.delete(n); }
  }

  /** A board with its pieces: white's side towards the west stool. Without a game yet: the start. */
  #boardMesh(board) {
    const mf = this.mf, g = new THREE.Group();
    g.add(mf.at(mf.box(CELL * 8 + 0.04, 0.02, CELL * 8 + 0.04, 0x5B3A29), 0, 0, 0));
    g.add(mf.at(mf.box(CELL * 8, 0.004, CELL * 8, { tex: 'damaBoard' }), 0, 0.012, 0));
    const b = board ?? Array.from({ length: 64 }, (_, i) => { const r = (i / 8) | 0; return r === 1 || r === 2 ? 1 : r === 5 || r === 6 ? -1 : 0; });
    b.forEach((v, i) => {
      if (!v) return;
      const r = (i / 8) | 0, c = i % 8, king = Math.abs(v) === 2;
      const piece = mf.cyl(CELL * 0.38, CELL * 0.38, king ? 0.032 : 0.016, v > 0 ? 0xF3EEE2 : 0x1E1E1E, 12);
      g.add(mf.at(piece, (r - 3.5) * CELL, 0.014 + (king ? 0.016 : 0.008), (c - 3.5) * CELL));
    });
    return g;
  }
}
