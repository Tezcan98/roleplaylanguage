import { el, ICONS } from './dom.js';
import { gloss } from '../i18n/Gloss.js';
import { coin } from './coin.js';

/** Item pictures (emoji that every phone has; the bucket is drawn — 🪣 is too new for older iPhones). */
const BUCKET = '<svg viewBox="0 0 24 24" width="1em" height="1em" aria-hidden="true"><path d="M5 8h14l-1.6 12.2a1.6 1.6 0 0 1-1.6 1.4H8.2a1.6 1.6 0 0 1-1.6-1.4z" fill="#7FA7C8" stroke="#3E5F7A" stroke-width="1.2"/><ellipse cx="12" cy="8" rx="7" ry="1.8" fill="#A9C8E0" stroke="#3E5F7A" stroke-width="1.2"/><path d="M5.5 8C6 3 18 3 18.5 8" fill="none" stroke="#555" stroke-width="1.3"/></svg>';
const ICON = {
  ekmek: '🍞', sut: '🥛', simit: '🥯', ayran: '🥤', peynir: '🧀', yumurta: '🥚', tost: '🥪', kek: '🧁', meyvesuyu: '🧃', su: '💧',
  elma: '🍎', portakal: '🍊', armut: '🍐', muz: '🍌', domates: '🍅', patates: '🥔',
  mektup: '✉️', zarf: '📩', kart: '🗒️', cay: '☕', kitap: '📕', mont: '🧥', anahtar: '🔧', camasir: '👕', kova: BUCKET,
};
const COLS = 6, ROWS = 4; // 24 slots, like a page of a game's inventory

/**
 * The bag as a game inventory (the "Çanta" button, I on a keyboard): a grid of slots with each
 * thing's picture and how many; tap one to see its Turkish name and meaning and hear it said.
 * The money and the credits at the bottom.
 */
export class InventoryView {
  #pop = null;
  #pick = null;

  constructor(host, { modes, inventory, items, wallet, speak }) {
    Object.assign(this, { modes, inventory, items, wallet, speak });
    this.grid = el('div', { class: 'inv-grid' });
    this.info = el('div', { class: 'inv-info' });
    this.money = el('div', { class: 'inv-money' });
    this.root = el('div', { class: 'overlay dim inv-overlay', on: { click: (e) => { if (e.target === this.root) this.close(); } } }, [
      el('div', { class: 'inv' }, [
        el('div', { class: 'inv-head' }, [
          el('b', { text: 'Envanter' }), el('small', { class: 'en-t', text: ` · ${gloss('Inventory')}` }),
          el('button', { class: 'inv-x', html: ICONS.close, attrs: { type: 'button', 'aria-label': 'Kapat' }, on: { click: () => this.close() } }),
        ]),
        this.grid, this.info, this.money,
      ]),
    ]);
    host.append(this.root);
  }

  get isOpen() { return this.root.classList.contains('open'); }
  toggle() { if (this.isOpen) this.close(); else this.open(); }

  open() {
    if (!this.#pop) this.#pop = this.modes.push('overlay');
    this.root.classList.add('open');
    this.render();
  }

  close() { this.root.classList.remove('open'); this.#pop?.(); this.#pop = null; this.#pick = null; }

  render() {
    const things = this.inventory.entries().filter(([kind]) => kind !== 'para'); // the money is shown below
    if (this.#pick && !things.some(([k]) => k === this.#pick)) this.#pick = null;
    const slots = things.map(([kind, n]) => {
      const pic = ICON[kind] ?? '📦';
      return el('button', {
        class: `inv-slot${this.#pick === kind ? ' on' : ''}`, attrs: { type: 'button', 'aria-label': this.items.info(kind).tr },
        on: { click: () => { this.#pick = kind; this.render(); this.speak?.(this.items.info(kind).tr); } },
      }, [el('span', { class: 'inv-pic', html: pic.startsWith('<svg') ? pic : null, text: pic.startsWith('<svg') ? null : pic }), n > 1 && el('span', { class: 'inv-n', text: String(n) })]);
    });
    while (slots.length < COLS * ROWS) slots.push(el('div', { class: 'inv-slot blank' }));
    this.grid.replaceChildren(...slots);
    if (this.#pick) {
      const i = this.items.info(this.#pick), n = this.inventory.count(this.#pick);
      this.info.replaceChildren(
        el('b', { text: `${n > 1 ? `${n} ` : ''}${i.tr}` }), el('small', { class: 'en-t', text: ` · ${gloss(i.en)}` }),
        el('button', { class: 'inv-say', html: ICONS.speaker, attrs: { type: 'button', 'aria-label': 'Dinle' }, on: { click: () => this.speak?.(i.tr) } }),
      );
    } else {
      this.info.replaceChildren(el('span', { text: things.length ? 'Bir eşyaya dokun.' : 'Çantan boş.' }), el('small', { class: 'en-t', text: ` · ${gloss(things.length ? 'Tap a thing.' : 'Your bag is empty.')}` }));
    }
    this.money.replaceChildren(
      el('span', { class: 'inv-cash' }, [`💰 ${this.inventory.count('para')} ₺`]),
      el('span', { class: 'inv-cash' }, [coin(), ` ${this.wallet.balance}`]),
    );
  }
}
