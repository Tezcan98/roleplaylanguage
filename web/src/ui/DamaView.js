import { el, ICONS } from './dom.js';
import { gloss, withGloss } from '../i18n/Gloss.js';
import { legalMoves, count, SIZE } from '../systems/DamaRules.js';

const STEP = 240; // ms per jump when a take of several pieces is shown

/** What Rıfat Amca says while you play him (Turkish, its meaning), one picked at random. */
const LINES = {
  start: [['Hadi bakalım! Beyazlar senin, sen başla. Taşlar ileri ve yana gider, geri gitmez; yiyebiliyorsan yemek zorundasın.', 'Come on then! White is yours, you start. Pieces go forward and sideways, never back; if you can take, you must.']],
  iTake: [['Yedim! Dikkat et evlat.', 'I took one! Be careful, child.'], ['Bunu da yedim!', 'I took this one too!']],
  youTake: [['Aferin, güzel hamle!', 'Well done, nice move!'], ['Vay, taşımı yedin!', 'Wow, you took my piece!']],
  myDama: [['Benim taşım dama oldu!', 'My piece became a dama!']],
  yourDama: [['Dama oldun! Artık uzağa gidebilirsin.', 'You got a dama! Now it can go far.']],
  mustTake: [['Unutma: yiyebiliyorsan yemek zorundasın.', 'Remember: if you can take, you must.']],
  win: [['Kazandın! Tebrikler evlat, iyi oynadın.', 'You won! Congratulations, child, you played well.']],
  lose: [['Bu sefer ben kazandım. Bir daha oynayalım mı?', 'This time I won. Shall we play again?']],
  draw: [['Berabere! İkimiz de iyi oynadık.', "It's a draw! We both played well."]],
};
const pick = (k) => LINES[k][Math.floor(Math.random() * LINES[k].length)];

/**
 * The dama board on screen for the table you sit at (systems/DamaClub.js owns the tables): drawn
 * from your side (black sees the board turned round), your pieces that can move are marked — only
 * those that take when a take is waiting. Tap a piece, then a lit cell: `onMove(from, to)`.
 * Waiting for someone to sit down opposite: the board with a button to play Rıfat Amca instead.
 * Playing him, he talks (`say`); online, the other player's name is shown.
 */
export class DamaView {
  #pop = null;
  #t = null;
  #color = 1;
  #sel = -1;
  #shown = null; // the board as drawn now (a take of several pieces is shown jump by jump)
  #lastKey = '';
  #anim = 0;

  constructor(host, { modes, vocab, say = () => {}, onMove = () => {}, onAgain = () => {}, onNpc = () => {}, onClose = () => {} }) {
    Object.assign(this, { modes, vocab, say, onMove, onAgain, onNpc, onClose });
    this.title = el('h2', { class: 'ctitle', text: 'Dama' });
    this.board = el('div', { class: 'dama-board', attrs: { role: 'grid' } });
    this.status = el('div', { class: 'dama-status' });
    this.line = el('div', { class: 'dama-line' });
    this.score = el('div', { class: 'dama-score' });
    this.again = el('button', { class: 'btn', text: withGloss('Yeni oyun', 'New game'), attrs: { type: 'button' }, on: { click: () => this.onAgain() } });
    this.npcBtn = el('button', { class: 'btn primary', text: withGloss('Rıfat Amca ile oyna', 'Play with Uncle Rıfat'), attrs: { type: 'button' }, on: { click: () => this.onNpc() } });
    this.root = el('div', { class: 'overlay dim dama' }, [el('div', { class: 'card' }, [
      el('div', { class: 'dama-head' }, [
        this.title,
        el('button', { class: 'iconbtn light', html: ICONS.close, attrs: { type: 'button', 'aria-label': 'Masadan kalk' }, on: { click: () => this.onClose() } }),
      ]),
      this.line, this.board, el('div', { class: 'dama-foot' }, [this.status, this.score]), this.npcBtn, this.again,
    ])]);
    host.append(this.root);
  }

  get isOpen() { return this.root.classList.contains('open'); }

  /** The table to show (`t` as DamaTables.state() lists it) and which side you play (1 white, −1 black). */
  show(t, color) {
    const fresh = !this.isOpen || this.#t?.n !== t.n;
    if (!this.isOpen) {
      if (!this.#pop) this.#pop = this.modes.push('overlay');
      this.root.classList.add('open');
      for (const [tr, en] of [['dama', 'Turkish draughts; also a piece that reached the far row'], ['taş', 'piece, stone'], ['yemek', 'to take (a piece); to eat'], ['sıra', 'turn']]) this.vocab?.learn(tr, en);
    }
    const prev = this.#t;
    this.#t = t; this.#color = color;
    const npc = !!t.black?.npc;
    this.title.textContent = t.black ? `Dama · ${color === 1 ? t.black.name : t.white.name}` : 'Dama';
    // what happened since the last time: Rıfat Amca says something about it
    const key = t.board ? `${t.n}|${JSON.stringify(t.last?.path ?? null)}|${t.over}` : '';
    if (key !== this.#lastKey) {
      this.#lastKey = key;
      if (t.board && npc) {
        if (!t.last && (fresh || prev?.over || !prev?.board)) this.#talk('start');
        else if (t.over) this.#talk(t.over === 'draw' ? 'draw' : (t.over === 'white') === (color === 1) ? 'win' : 'lose');
        else if (t.last?.caps.length) this.#talk(t.last.by === color ? 'youTake' : 'iTake');
        else if (t.last && prev?.board && Math.abs(prev.board[t.last.path[0]]) === 1 && Math.abs(t.board[t.last.path.at(-1)]) === 2) this.#talk(t.last.by === color ? 'yourDama' : 'myDama');
      } else if (!npc) this.line.replaceChildren(t.black ? `${t.white.name} ⚪ – ⚫ ${t.black.name}` : el('span', {}, ['Karşına biri oturunca oyun başlar.', el('small', { class: 'en-t', text: ` · ${gloss('The game starts when someone sits down opposite you.')}` })]));
      if (t.over === 'draw') this.vocab?.learn('berabere', 'a draw');
      else if (t.over && (t.over === 'white') === (color === 1)) this.vocab?.learn('kazanmak', 'to win');
      this.#animate(prev, t);
    }
    this.render();
  }

  close() { this.root.classList.remove('open'); this.#pop?.(); this.#pop = null; this.#t = null; this.#lastKey = ''; this.#sel = -1; }

  #talk(k) {
    const [tr, en] = pick(k);
    this.line.replaceChildren(el('b', { text: 'Rıfat Amca: ' }), tr, el('small', { class: 'en-t', text: ` · ${gloss(en)}` }));
    this.say(tr, en);
  }

  /** A take over several pieces: each jump in turn (the final position comes from the table). */
  async #animate(prev, t) {
    const run = ++this.#anim;
    this.#shown = null;
    const path = t.last?.path;
    if (!prev?.board || !t.board || !path || path.length < 3) return;
    let b = prev.board.slice();
    for (let k = 1; k < path.length - 1; k++) {
      b = b.slice(); b[path[k]] = b[path[k - 1]]; b[path[k - 1]] = 0; b[t.last.caps[k - 1]] = 0;
      this.#shown = b; this.render();
      await new Promise((r) => setTimeout(r, STEP));
      if (run !== this.#anim) return;
    }
    this.#shown = null; this.render();
  }

  render() {
    const t = this.#t;
    if (!t) return;
    const b = this.#shown ?? t.board, waiting = !t.black;
    const mine = !!t.board && !t.over && t.turn === this.#color && !this.#shown;
    const moves = mine ? legalMoves(t.board, this.#color) : [];
    const movable = new Set(moves.map((m) => m.from)), targets = new Set(moves.filter((m) => m.from === this.#sel).map((m) => m.to));
    const last = new Set(t.last?.path ?? []);
    const cells = [];
    for (let k = 0; k < SIZE; k++) {
      const r = this.#color === 1 ? SIZE - 1 - k : k; // your side at the bottom
      for (let j = 0; j < SIZE; j++) {
        const c = this.#color === 1 ? j : SIZE - 1 - j, i = r * SIZE + c, v = b?.[i] ?? 0;
        const cls = ['cell', (r + c) % 2 ? 'l' : 'd'];
        if (last.has(i) && !this.#shown) cls.push('last');
        if (i === this.#sel) cls.push('sel');
        if (targets.has(i)) cls.push('to');
        if (movable.has(i) && this.#sel < 0) cls.push('can');
        const piece = v ? el('span', { class: `piece ${v > 0 ? 'w' : 'b'}${Math.abs(v) === 2 ? ' king' : ''}` }) : null;
        cells.push(el('button', { class: cls.join(' '), attrs: { type: 'button', 'data-i': String(i), 'aria-label': `${'abcdefgh'[c]}${r + 1}` }, on: { click: () => this.#tap(i, moves) } }, piece ? [piece] : []));
      }
    }
    this.board.replaceChildren(...cells);
    this.board.classList.toggle('waiting', waiting);
    if (b) { const w = count(b, 1), k = count(b, -1); this.score.textContent = `⚪ ${w.men + w.damas}  ·  ⚫ ${k.men + k.damas}`; } else this.score.textContent = '';
    const won = t.over && t.over !== 'draw' && (t.over === 'white') === (this.#color === 1);
    this.status.replaceChildren(...(waiting ? ['Rakip bekleniyor…']
      : t.over ? [t.over === 'draw' ? 'Berabere.' : won ? '🏆 Kazandın!' : 'Kaybettin.']
        : mine ? ['Sıra sende', el('small', { class: 'en-t', text: ` · ${gloss('Your turn')}` })]
          : [`${this.#color === 1 ? t.black.name : t.white.name} düşünüyor…`]));
    this.again.hidden = !t.over;
    this.npcBtn.hidden = !waiting;
  }

  #tap(i, moves) {
    const t = this.#t;
    if (!moves.length) return;
    const m = moves.find((x) => x.from === this.#sel && x.to === i);
    if (m) { this.#sel = -1; this.onMove(m.from, m.to); this.render(); return; }
    if (moves.some((x) => x.from === i)) this.#sel = i;
    else if (Math.sign(t.board[i]) === this.#color && moves.some((x) => x.caps.length) && t.black?.npc) this.#talk('mustTake'); // a take is waiting elsewhere
    else this.#sel = -1;
    this.render();
  }
}
