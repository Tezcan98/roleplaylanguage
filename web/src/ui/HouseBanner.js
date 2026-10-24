import { el } from './dom.js';
import { gloss } from '../i18n/Gloss.js';

/**
 * Our own little banner in the ad's place at the bottom, while AdMob has none to give (no fill:
 * ads fit for children are few in some countries): the game's own offers, one after another.
 * Gone as soon as an AdMob banner comes, or the banner isn't wanted any more.
 */
export class HouseBanner {
  #i = 0;
  #timer = null;

  /** `items`: [{ icon, tr, en, run }] — what a tap does (the shop, sharing…). */
  constructor(host, items) {
    this.items = items;
    this.root = el('button', { class: 'house-banner', attrs: { type: 'button', hidden: '' }, on: { click: () => this.items[this.#i]?.run() } });
    host.append(this.root);
  }

  set(on) {
    if (on === !this.root.hidden) return;
    this.root.hidden = !on;
    clearInterval(this.#timer);
    if (!on) return;
    this.#draw();
    this.#timer = setInterval(() => { this.#i = (this.#i + 1) % this.items.length; this.#draw(); }, 8000);
  }

  #draw() {
    const { icon, tr, en } = this.items[this.#i];
    this.root.replaceChildren(el('span', { class: 'hb-icon', text: icon }), el('span', {}, [tr, el('small', { class: 'en-t', text: gloss(en) })]), el('span', { class: 'hb-go', text: '›' }));
  }
}
