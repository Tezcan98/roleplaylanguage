import { el } from './dom.js';
import { gloss } from '../i18n/Gloss.js';

/**
 * Chapter / story cards. Blocks input while open. A card asked for while another is open waits
 * for it (the square's first-visit card used to replace the welcome card when the connection came);
 * the open card's own follow-up comes after the waiting ones.
 */
export class CardOverlay {
  #queue = [];

  constructor(host, modes) {
    this.modes = modes;
    this.num = el('p', { class: 'chap' });
    this.title = el('h2', { class: 'ctitle' });
    this.text = el('p', { class: 'ctext' });
    this.en = el('p', { class: 'cen en-t' });
    this.btn = el('button', { class: 'btn', attrs: { type: 'button' } });
    this.root = el('div', { class: 'overlay story-card' }, [el('div', { class: 'card' }, [this.num, this.title, this.text, this.en, this.btn])]);
    host.append(this.root);
  }

  /** @param {{num, title, text, en, button?}} card */
  show(card, onDone) {
    if (!card) { onDone?.(); return; }
    if (this.root.classList.contains('open')) { this.#queue.push([card, onDone]); return; }
    this.num.textContent = card.num ?? '';
    this.title.textContent = card.title;
    this.text.textContent = typeof card.text === 'function' ? card.text() : card.text;
    this.en.textContent = gloss(card.en) ?? '';
    this.btn.textContent = card.button ?? 'Başla';
    const pop = this.modes.push('card');
    this.root.classList.add('open');
    this.btn.onclick = () => {
      this.root.classList.remove('open'); pop();
      const next = this.#queue.shift();
      if (next) this.show(next[0], () => { next[1]?.(); onDone?.(); }); else onDone?.();
    };
    this.btn.focus();
  }
}
