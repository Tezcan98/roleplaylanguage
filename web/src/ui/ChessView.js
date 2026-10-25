import { Chess } from 'chess.js';
import { el, ICONS } from './dom.js';
import { gloss } from '../i18n/Gloss.js';

const GLYPH = { k: '♚', q: '♛', r: '♜', b: '♝', n: '♞', p: '♟' };
const NAMES = { k: 'şah', q: 'vezir', r: 'kale', b: 'fil', n: 'at', p: 'piyon' };
const COLOR = { w: 'beyaz', b: 'siyah' };

/**
 * The giant chess board on screen, for a phone (walking the pieces over the square's board with the
 * joystick was too hard): drawn from your side, tap one of your pieces, then a lit square —
 * `onMove(from, to)`. The last move and a king in check are marked. Closing it only puts it away
 * (the game goes on; the chess bar at the top opens it again).
 */
export class ChessView {
  #pop = null;
  #st = null;
  #color = 'w';
  #sel = null;

  constructor(host, { modes, onMove = () => {} }) {
    Object.assign(this, { modes, onMove });
    this.title = el('h2', { class: 'ctitle', text: 'Satranç' });
    this.board = el('div', { class: 'chess-board', attrs: { role: 'grid' } });
    this.status = el('p', { class: 'chess-status' });
    this.clocks = el('p', { class: 'chess-clocks' });
    this.root = el('div', { class: 'overlay dim chess' }, [el('div', { class: 'card' }, [
      el('div', { class: 'dama-head' }, [
        this.title,
        el('button', { class: 'iconbtn light', html: ICONS.close, attrs: { type: 'button', 'aria-label': 'Tahtayı kapat (oyun sürer)' }, on: { click: () => this.close() } }),
      ]),
      this.board, this.status, this.clocks,
      el('p', { class: 'chess-words' }, [`${Object.values(NAMES).join(' · ')}`, el('small', { class: 'en-t', text: ` · ${gloss('king · queen · rook · bishop · knight · pawn')}` })]),
    ])]);
    host.append(this.root);
  }

  get isOpen() { return this.root.classList.contains('open'); }

  open() {
    if (this.isOpen) return;
    this.#pop = this.modes.push('overlay');
    this.root.classList.add('open');
    this.render();
    this.onToggle?.();
  }

  close() { this.root.classList.remove('open'); this.#pop?.(); this.#pop = null; this.#sel = null; this.onToggle?.(); }

  /** The table's state (ChessGame) and my colour; redrawn when open. */
  update(st, color) {
    if (st?.fen !== this.#st?.fen) this.#sel = null;
    this.#st = st; this.#color = color;
    if (this.isOpen) this.render();
  }

  /** The clocks line (called every half second while open). */
  setClocks(text) { this.clocks.textContent = text; }

  render() {
    const st = this.#st;
    if (!st) return;
    const g = new Chess(st.fen), mine = this.#color, other = mine === 'w' ? 'b' : 'w';
    const myTurn = st.phase === 'playing' && g.turn() === mine;
    const moves = myTurn ? g.moves({ verbose: true }) : [];
    const targets = new Set(moves.filter((m) => m.from === this.#sel).map((m) => m.to));
    const movable = new Set(moves.map((m) => m.from));
    const checked = g.isCheck() ? g.board().flat().find((p) => p?.type === 'k' && p.color === g.turn())?.square : null;
    const cells = [];
    for (let row = 0; row < 8; row++) {
      for (let col = 0; col < 8; col++) {
        const file = mine === 'w' ? col : 7 - col, rank = mine === 'w' ? 7 - row : row; // my side at the bottom
        const sq = `${'abcdefgh'[file]}${rank + 1}`, p = g.get(sq);
        const cls = ['sq', (file + rank) % 2 ? 'l' : 'd'];
        if (st.last && (st.last.from === sq || st.last.to === sq)) cls.push('last');
        if (sq === this.#sel) cls.push('sel');
        if (targets.has(sq)) cls.push('to');
        if (!this.#sel && movable.has(sq)) cls.push('can');
        if (sq === checked) cls.push('check');
        cells.push(el('button', {
          class: cls.join(' '), text: p ? GLYPH[p.type] : '',
          attrs: { type: 'button', 'data-sq': sq, ...(p ? { 'data-c': p.color, 'aria-label': `${sq} ${COLOR[p.color]} ${NAMES[p.type]}` } : { 'aria-label': sq }) },
          on: { click: () => this.#tap(sq, moves) },
        }));
      }
    }
    this.board.replaceChildren(...cells);
    const opp = st.seats?.[other]?.name ?? 'Rakip';
    this.title.textContent = `Satranç · ${opp}`;
    const res = st.result, over = st.phase === 'over';
    this.status.replaceChildren(...(over ? [!res?.winner ? 'Berabere.' : res.winner === mine ? '🏆 Kazandın!' : 'Kaybettin. Bir dahakine!']
      : st.phase === 'waiting' ? ['Rakip bekleniyor…']
        : myTurn ? [g.isCheck() ? 'Şah! Sıra sende' : 'Sıra sende', el('small', { class: 'en-t', text: ` · ${gloss(g.isCheck() ? 'Check! Your move' : 'Your move')}` }), ` — sen ${COLOR[mine]}`]
          : [`${opp} düşünüyor…`]));
  }

  #tap(sq, moves) {
    if (!moves.length) return;
    if (this.#sel && moves.some((m) => m.from === this.#sel && m.to === sq)) { const from = this.#sel; this.#sel = null; this.onMove(from, sq); this.render(); return; }
    this.#sel = moves.some((m) => m.from === sq) ? sq : null;
    this.render();
  }
}
