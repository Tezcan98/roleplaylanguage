import { el, ICONS } from './dom.js';
import { gloss } from '../i18n/Gloss.js';
import { MARKETS, sayNumber } from '../content/goods.js';

const SLOTS = 12; // a 4 × 3 shelf, like an MMO shop window: empty slots stay dark

/**
 * The grocer's / greengrocer's shop window: the shelf as a grid of slots (icon and price), tap
 * one to see what it is and buy it with the game money in the bag. `buy(kind, price)` pays
 * (main.js: the 'buy' effect); `money()` is what is in the bag.
 */
export class MarketView {
  #pop = null;
  #shop = null;
  #pick = null;

  constructor(host, { modes, items, vocab, money, buy }) {
    Object.assign(this, { modes, items, vocab, money, buy });
    this.title = el('b', { class: 'mk-title' });
    this.grid = el('div', { class: 'mk-grid' });
    this.info = el('div', { class: 'mk-info' });
    this.purse = el('div', { class: 'mk-purse' });
    this.root = el('div', { class: 'overlay dim market', on: { click: (e) => { if (e.target === this.root) this.close(); } } }, [
      el('div', { class: 'mk-win' }, [
        el('div', { class: 'mk-head' }, [this.title, el('button', { class: 'mk-x', html: ICONS.close, attrs: { type: 'button', 'aria-label': 'Kapat' }, on: { click: () => this.close() } })]),
        this.grid, this.info, this.purse,
      ]),
    ]);
    host.append(this.root);
  }

  get isOpen() { return this.root.classList.contains('open'); }

  open(id) {
    const shop = MARKETS[id];
    if (!shop) return;
    this.#shop = shop; this.#pick = null;
    if (!this.#pop) this.#pop = this.modes.push('overlay');
    this.root.classList.add('open');
    this.vocab?.learn('alışveriş', 'shopping');
    this.render();
  }

  close() { this.root.classList.remove('open'); this.#pop?.(); this.#pop = null; }

  render() {
    const shop = this.#shop, money = this.money();
    this.title.replaceChildren(shop.title, el('small', { class: 'en-t', text: ` · ${gloss(shop.en)}` }));
    const slots = shop.goods.map(([kind, price, icon], i) => el('button', {
      class: `mk-slot${this.#pick === i ? ' on' : ''}${money < price ? ' poor' : ''}`, attrs: { type: 'button', 'aria-label': this.items.info(kind).tr },
      on: { click: () => { this.#pick = i; this.render(); } },
    }, [el('span', { class: 'mk-icon', text: icon }), el('span', { class: 'mk-price', text: `${price}₺` })]));
    while (slots.length < SLOTS) slots.push(el('div', { class: 'mk-slot mk-none' }));
    this.grid.replaceChildren(...slots);
    const g = shop.goods[this.#pick];
    if (g) {
      const [kind, price, icon, what] = g, name = this.items.info(kind);
      this.info.replaceChildren(
        el('div', { class: 'mk-name' }, [`${icon} ${what}`, el('small', { class: 'en-t', text: ` · ${gloss(name.en)}` })]),
        el('div', { class: 'mk-cost', text: `${price} lira (${sayNumber(price)} lira)` }),
        el('button', { class: 'btn mk-buy', text: money < price ? 'Paran yetmiyor' : 'Satın al', attrs: { type: 'button', ...(money < price ? { disabled: '' } : {}) }, on: { click: () => { this.buy(kind, price); this.render(); } } }),
      );
    } else this.info.replaceChildren(el('div', { class: 'mk-hint' }, ['Bir ürüne dokun.', el('small', { class: 'en-t', text: ` · ${gloss('Tap something on the shelf.')}` })]));
    this.purse.replaceChildren(el('span', { text: '💰 Paran: ' }), el('b', { text: `${money} lira` }));
  }
}
