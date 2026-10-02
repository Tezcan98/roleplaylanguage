import { Chess } from 'chess.js';
import { el } from './dom.js';
import { gloss } from '../i18n/Gloss.js';

// the king is drawn as a crown (the usual ♚ glyph carries a cross)
const CROWN = '<svg viewBox="0 0 24 24" width="80%" height="80%"><path d="M3 18 L4.5 7 L9 12 L12 5 L15 12 L19.5 7 L21 18 Z" fill="currentColor" stroke="#000" stroke-width="0.8"/><rect x="3" y="18.5" width="18" height="2.8" rx="1" fill="currentColor" stroke="#000" stroke-width="0.8"/></svg>';
const GLYPH = { k: '', q: '♛', r: '♜', b: '♝', n: '♞', p: '♟' };
const FILES = 'abcdefgh';
const mmss = (ms) => { const s = Math.ceil(Math.max(0, ms) / 1000); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; };

/**
 * On-screen board for the giant chess game, İsmail Dede's table: who plays white and black
 * with their clocks, Dede's line of people waiting, his score board, and what you can ask
 * him ("Beyaz olacağım", "Dede, benimle oynar mısın?"). Tap a piece, its legal squares light
 * up, tap one to move. Every text is Turkish with its meaning.
 */
export class ChessView {
  #pop = null;
  #sel = null;
  #tick = null;

  constructor(host, { modes }) {
    this.modes = modes;
    this.title = el('h2', { class: 'ctitle', text: '♟ Dev satranç · İsmail Dede' });
    this.seats = el('div', { class: 'chess-seats' });
    this.status = el('p', { class: 'chess-status' });
    this.board = el('div', { class: 'chess-board' });
    this.asks = el('div', { class: 'row chess-asks' });
    this.queue = el('p', { class: 'chess-queue' });
    this.scores = el('div', { class: 'chess-scores' });
    this.words = el('p', { class: 'chess-words en-t' });
    this.actions = el('div', { class: 'row' });
    this.root = el('div', { class: 'overlay dim chess' }, [el('div', { class: 'card' }, [
      this.title, this.seats, this.status, this.board, this.asks, this.queue, this.scores, this.words, this.actions,
    ])]);
    host.append(this.root);
  }

  get isOpen() { return this.root.classList.contains('open'); }

  open(handlers) {
    this.h = handlers;
    if (!this.#pop) this.#pop = this.modes.push('overlay');
    this.root.classList.add('open');
    clearInterval(this.#tick);
    this.#tick = setInterval(() => this.#clocks(), 500);
  }

  close() {
    this.root.classList.remove('open'); this.#pop?.(); this.#pop = null; this.#sel = null;
    clearInterval(this.#tick); this.#tick = null;
  }

  render(st) {
    this.st = st;
    const { phase, seats = {}, myColor, myId, online, queue = [], scores = [], result } = st;
    const game = new Chess(st.fen);
    const btn = (text, cls, fn) => el('button', { class: cls, text, attrs: { type: 'button' }, on: { click: fn } });
    const inLine = queue.find((q) => q.id === myId);

    // seats with clocks
    const seat = (c, label) => el('div', { class: `chess-seat${st.running === c ? ' on' : ''}` }, [
      el('b', { text: `${label}: ` }),
      el('span', { text: seats[c] ? `${seats[c].name}${seats[c].gone ? ' (bağlantı koptu)' : ''}` : 'boş' }),
      st.clocks ? el('span', { class: 'chess-clock', attrs: { 'data-c': c } }) : null,
    ]);
    this.seats.replaceChildren(seat('w', 'Beyaz'), seat('b', 'Siyah'));
    this.#clocks();

    // status: what is going on, in Turkish with its meaning
    let tr, en;
    const turn = game.turn();
    if (phase === 'over') {
      const w = result?.winner;
      tr = w ? `Oyun bitti: ${seats[w]?.name ?? (w === 'w' ? 'Beyaz' : 'Siyah')} kazandı.` : 'Oyun bitti: berabere.';
      en = w ? gloss('The game is over. Dede starts the next one in a moment.') : gloss('The game is over: a draw. Dede starts the next one in a moment.');
    } else if (phase === 'playing' && myColor) {
      tr = turn === myColor ? (game.isCheck() ? 'Şah! Sıra sende.' : 'Sıra sende.') : 'Rakibin düşünüyor…';
      en = turn === myColor ? (game.isCheck() ? gloss('Check! Your move.') : gloss('Your move.')) : gloss('Your opponent is thinking…');
    } else if (phase === 'playing') {
      tr = inLine ? 'Oyun sürüyor. Sıradaki oyunu bekliyorsun.' : 'Oyun sürüyor, izliyorsun.';
      en = inLine ? gloss('A game is on. You are waiting for the next one.') : gloss('A game is on — you are watching.');
    } else if (phase === 'waiting' && myColor) {
      tr = 'Rakibini bekliyorsun. Diğer renk gelince oyun başlar.';
      en = gloss('Waiting for your opponent. The game starts when someone takes the other colour.');
    } else {
      tr = online ? 'Dedeye hangi renk olacağını söyle.' : 'Bir renk seç, İsmail Dede seninle oynasın.';
      en = online ? gloss('Tell Dede which colour you want to be.') : gloss('Pick a colour and İsmail Dede will play with you.');
    }
    this.status.replaceChildren(el('span', { text: tr }), el('small', { class: 'en-t', text: ` · ${en}` }));

    // the board (black at the bottom when I play black)
    const flip = myColor === 'b';
    const canMove = phase === 'playing' && myColor && turn === myColor;
    const legal = this.#sel && canMove ? game.moves({ square: this.#sel, verbose: true }).map((m) => m.to) : [];
    const cells = [];
    for (let row = 0; row < 8; row++) for (let col = 0; col < 8; col++) {
      const file = flip ? 7 - col : col, rank = flip ? row : 7 - row;
      const sq = `${FILES[file]}${rank + 1}`;
      const p = game.get(sq);
      const last = st.last;
      const cls = ['sq', (file + rank) % 2 ? 'l' : 'd', sq === this.#sel ? 'sel' : '', legal.includes(sq) ? 'to' : '', last && (sq === last.from || sq === last.to) ? 'last' : ''].join(' ');
      cells.push(el('button', { class: cls, ...(p?.type === 'k' ? { html: CROWN } : { text: p ? GLYPH[p.type] : '' }), attrs: { type: 'button', 'data-sq': sq, ...(p ? { 'data-c': p.color } : {}) }, on: { click: () => this.#tap(sq, game, canMove ? myColor : null) } }));
    }
    this.board.replaceChildren(...cells);

    // what you can ask Dede
    const asks = [];
    const seated = !!myColor;
    if (!seated && !inLine && phase !== 'over') {
      ['w', 'b'].forEach((c) => {
        const label = c === 'w' ? 'Beyaz' : 'Siyah';
        if (online && phase !== 'playing' && seats[c]) return; // taken: the other colour is the one to ask for
        asks.push(btn(`${label} olacağım`, 'chipbtn primary', () => this.h.onAsk(c)));
      });
      if (online && phase === 'idle' && !queue.length && !st.legacy) asks.push(btn('Dede, benimle oynar mısın?', 'chipbtn', () => this.h.onDede('w')));
    }
    if (online && (inLine || (seated && phase === 'waiting'))) asks.push(btn('Vazgeç', 'chipbtn', () => this.h.onLeave()));
    if (seated && phase === 'playing' && !st.legacy) asks.push(btn('Pes et', 'chipbtn danger', () => this.h.onResign()));
    this.asks.replaceChildren(...asks);

    // Dede's line and score board
    this.queue.textContent = queue.length ? `Sırada: ${queue.map((q) => `${q.name} (${q.color === 'w' ? 'beyaz' : 'siyah'})`).join(', ')}` : '';
    this.scores.replaceChildren(...(online && !st.legacy ? [
      el('b', { text: 'Skor tablosu' }), el('small', { class: 'en-t', text: ` · ${gloss('Score board kept by Dede: games / wins')}` }),
      scores.length
        ? el('ol', {}, scores.map((r) => el('li', {}, [el('span', { text: r.name }), el('span', { class: 'n', text: `${r.games} maç · ${r.wins} galibiyet` })])))
        : el('p', { class: 'note', text: 'Henüz kimse oynamadı.' }),
    ] : []));
    this.words.textContent = `şah = ${gloss('king')} · vezir = ${gloss('queen')} · kale = ${gloss('rook')} · fil = ${gloss('bishop')} · at = ${gloss('knight')} · piyon = ${gloss('pawn')}`;
    this.actions.replaceChildren(el('button', { class: 'btn sm', text: 'Kapat', attrs: { type: 'button' }, on: { click: () => this.close() } }));
  }

  /** Count the clocks down between two updates from the board. */
  #clocks() {
    const st = this.st;
    if (!st?.clocks) return;
    this.seats.querySelectorAll('.chess-clock').forEach((n) => {
      const c = n.dataset.c;
      n.textContent = ` ⏱ ${mmss(st.clocks[c] - (st.running === c ? Date.now() - st.at : 0))}`;
    });
  }

  #tap(sq, game, myColor) {
    if (!myColor) return;
    const p = game.get(sq);
    if (this.#sel && this.#sel !== sq && game.moves({ square: this.#sel, verbose: true }).some((m) => m.to === sq)) {
      const from = this.#sel;
      this.#sel = null;
      this.h.onMove(from, sq);
      return;
    }
    this.#sel = p && p.color === myColor ? sq : null;
    this.render(this.st);
  }
}
