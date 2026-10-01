import { el } from './dom.js';
import { gloss } from '../i18n/Gloss.js';

const GLYPH = { k: '♚', q: '♛', r: '♜', b: '♝', n: '♞', p: '♟' };
const FILES = 'abcdefgh';

/**
 * On-screen board for the giant chess game: tap a piece, its legal squares light up, tap one
 * to move. Seat buttons online; piece names in Turkish with their meanings.
 */
export class ChessView {
  #pop = null;
  #sel = null;

  constructor(host, { modes }) {
    this.modes = modes;
    this.title = el('h2', { class: 'ctitle', text: '♟ Dev satranç' });
    this.status = el('p', { class: 'chess-status' });
    this.seats = el('div', { class: 'chess-seats' });
    this.board = el('div', { class: 'chess-board' });
    this.words = el('p', { class: 'chess-words en-t' });
    this.actions = el('div', { class: 'row' });
    this.root = el('div', { class: 'overlay dim chess' }, [el('div', { class: 'card' }, [
      this.title, this.seats, this.status, this.board, this.words, this.actions,
    ])]);
    host.append(this.root);
  }

  get isOpen() { return this.root.classList.contains('open'); }

  open(handlers) {
    this.h = handlers;
    if (!this.#pop) this.#pop = this.modes.push('overlay');
    this.root.classList.add('open');
  }

  close() { this.root.classList.remove('open'); this.#pop?.(); this.#pop = null; this.#sel = null; }

  render({ game, online, myColor, seats, last, over }) {
    this.last = { game, online, myColor, seats, last, over };
    const turn = game.turn();
    const name = (c) => seats[c]?.name ?? null;
    // seats
    const seat = (c, label) => el('div', { class: 'chess-seat' }, [
      el('b', { text: `${label}: ` }),
      name(c) ? el('span', { text: name(c) }) : online && !myColor ? el('button', { class: 'chipbtn primary', text: `${label} ol`, attrs: { type: 'button' }, on: { click: () => this.h.onSit(c) } }) : el('span', { text: 'boş' }),
    ]);
    this.seats.replaceChildren(seat('w', 'Beyaz'), seat('b', 'Siyah'));
    // status line in Turkish with its meaning
    let tr, en;
    if (over === 'checkmate') { const winner = turn === 'w' ? 'Siyah' : 'Beyaz'; tr = `Şah mat! ${winner} kazandı.`; en = gloss('Checkmate!'); }
    else if (over === 'draw') { tr = 'Berabere.'; en = gloss('Draw.'); }
    else if (myColor && turn === myColor) { tr = game.isCheck() ? 'Şah! Sıra sende.' : 'Sıra sende.'; en = game.isCheck() ? gloss('Check! Your move.') : gloss('Your move.'); }
    else if (myColor) { tr = 'Rakibin düşünüyor…'; en = gloss('Your opponent is thinking…'); }
    else { tr = online ? 'İzliyorsun. Boş bir yere oturabilirsin.' : 'Oyun'; en = online ? gloss('You are watching. You can take a free seat.') : ''; }
    this.status.replaceChildren(el('span', { text: tr }), en && el('small', { class: 'en-t', text: ` · ${en}` }));
    // board (black at the bottom when I play black)
    const flip = myColor === 'b';
    const legal = this.#sel ? game.moves({ square: this.#sel, verbose: true }).map((m) => m.to) : [];
    const cells = [];
    for (let row = 0; row < 8; row++) for (let col = 0; col < 8; col++) {
      const file = flip ? 7 - col : col, rank = flip ? row : 7 - row;
      const sq = `${FILES[file]}${rank + 1}`;
      const p = game.get(sq);
      const cls = ['sq', (file + rank) % 2 ? 'l' : 'd', sq === this.#sel ? 'sel' : '', legal.includes(sq) ? 'to' : '', last && (sq === last.from || sq === last.to) ? 'last' : ''].join(' ');
      cells.push(el('button', { class: cls, text: p ? GLYPH[p.type] : '', attrs: { type: 'button', 'data-sq': sq, ...(p ? { 'data-c': p.color } : {}) }, on: { click: () => this.#tap(sq, game, myColor) } }));
    }
    this.board.replaceChildren(...cells);
    this.words.textContent = `şah = ${gloss('king')} · vezir = ${gloss('queen')} · kale = ${gloss('rook')} · fil = ${gloss('bishop')} · at = ${gloss('knight')} · piyon = ${gloss('pawn')}`;
    this.actions.replaceChildren(
      online && myColor ? el('button', { class: 'btn alt sm', text: 'Kalk', attrs: { type: 'button' }, on: { click: () => this.h.onStand() } }) : null,
      over || !online ? el('button', { class: 'btn alt sm', text: 'Yeni oyun', attrs: { type: 'button' }, on: { click: () => this.h.onNew() } }) : null,
      el('button', { class: 'btn sm', text: 'Kapat', attrs: { type: 'button' }, on: { click: () => this.close() } }),
    );
  }

  #tap(sq, game, myColor) {
    if (!myColor || game.turn() !== myColor) return;
    const p = game.get(sq);
    if (this.#sel && this.#sel !== sq && game.moves({ square: this.#sel, verbose: true }).some((m) => m.to === sq)) {
      const from = this.#sel;
      this.#sel = null;
      this.h.onMove(from, sq);
      return;
    }
    this.#sel = p && p.color === myColor ? sq : null;
    this.render(this.last);
  }
}
