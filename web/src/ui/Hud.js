import { withGloss, gloss, glossDir, turkishOnly } from '../i18n/Gloss.js';
import { el } from './dom.js';
import { coin } from './coin.js';
import { GARDEN_TEXT } from './gardenText.js';

/** Top bar: clock, word book and bag counters (and `extra` buttons on the right, e.g. full screen). */
export class Hud {
  constructor(host, { onBook, onBag, onBookOpen, onShop, extra = [] }) {
    this.clock = el('div', { class: 'pill clock', attrs: { 'aria-live': 'off' } });
    this.words = el('b', { text: '0' });
    this.bag = el('b', { text: '0' });
    this.money = el('b', { text: '0' });
    this.credits = el('b', { text: '0' });
    this.textbook = el('button', { class: 'pill', text: withGloss('📘 Kitap', '📘 Book'), attrs: { type: 'button' }, on: { click: onBookOpen } });
    this.textbook.hidden = true;
    const hud = el('div', { class: 'hud' }, [
      el('div', { class: 'grp' }, [
        el('button', { class: 'pill', attrs: { type: 'button' }, on: { click: onBook } }, ['Defter ', this.words]),
        this.textbook,
        el('button', { class: 'pill credits-btn', attrs: { type: 'button', title: withGloss('Dükkan · krediler', 'Shop · credits') }, on: { click: () => onShop?.() } }, [coin(), ' ', this.credits]), // the shop
        el('button', { class: 'pill money', attrs: { type: 'button', title: 'Paran · game money' }, on: { click: onBag } }, ['💰 ', this.money, ' ₺']), // game money: lira in the bag
      ]),
      el('div', { class: 'grp' }, [
        el('button', { class: 'pill', attrs: { type: 'button' }, on: { click: onBag } }, ['Çanta ', this.bag]),
        ...extra,
      ]),
    ]);
    this.bagArrow = el('div', { class: 'bag-guide', attrs: { hidden: '', 'aria-hidden': 'true' } }, [
      el('div', { class: 'bag-guide-arrow', html: '<svg viewBox="0 0 90 110" aria-hidden="true"><path d="M45 5L8 45h22v57h30V45h22z" fill="#ffe07b" stroke="#50361c" stroke-width="5" stroke-linejoin="round"/><path d="M45 17L23 41h16v50" fill="none" stroke="#fff3c0" stroke-width="5" stroke-linecap="round"/></svg>' }),
      el('div', { class: 'bag-guide-label' }, [el('strong', { text: turkishOnly() ? GARDEN_TEXT.bag.tr : gloss(GARDEN_TEXT.bag.en), attrs: { dir: glossDir() } }), !turkishOnly() && el('small', { text: GARDEN_TEXT.bag.tr })]),
    ]);
    host.append(hud, this.bagArrow);
    this.right = hud.lastElementChild;
    // the quest panel and toasts sit right under the HUD, however many rows it wraps into (phones)
    new ResizeObserver(() => document.documentElement.style.setProperty('--hud-h', `${hud.offsetHeight}px`)).observe(hud);
  }
  /** Something more on the right-hand side of the bar, before the clock (the help button, who is online). */
  addRight(node) { this.right.prepend(node); }

  hintBag(on) {
    const button = this.bag.closest('button');
    button.classList.toggle('garden-bag-hint', on);
    const visible = on && !document.querySelector('.overlay.open') && !document.body.classList.contains('menu');
    this.bagArrow.hidden = !visible;
    if (!visible) return;
    const r = button.getBoundingClientRect(), width = Math.min(220, window.innerWidth - 16);
    const left = Math.max(8, Math.min(window.innerWidth - width - 8, r.left + r.width / 2 - width / 2));
    this.bagArrow.style.width = `${width}px`;
    this.bagArrow.style.left = `${left}px`;
    this.bagArrow.style.top = `${r.bottom + 5}px`;
    this.bagArrow.firstChild.style.marginLeft = `${r.left + r.width / 2 - left - 38}px`;
  }
  setTime(dayName, label, night) { this.clock.textContent = `${night ? '☾' : '☀'} ${dayName} ${label}`; }
  setWords(n) { this.words.textContent = n; }
  setBag(n) { this.bag.textContent = n; }
  setMoney(n) { this.money.textContent = n; }
  setCredits(n) { this.credits.textContent = n; }
  setTextbook(on) { this.textbook.hidden = !on; }
}
