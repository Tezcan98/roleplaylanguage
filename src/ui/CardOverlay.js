import { el } from './dom.js';

/** Chapter / story cards. Blocks input while open. */
export class CardOverlay {
  constructor(host, modes) {
    this.modes = modes;
    this.num = el('p', { class: 'chap' });
    this.title = el('h2', { class: 'ctitle' });
    this.text = el('p', { class: 'ctext' });
    this.en = el('p', { class: 'cen en-t' });
    this.btn = el('button', { class: 'btn', attrs: { type: 'button' } });
    this.root = el('div', { class: 'overlay' }, [el('div', { class: 'card' }, [this.num, this.title, this.text, this.en, this.btn])]);
    host.append(this.root);
  }

  /** @param {{num, title, text, en, button?}} card */
  show(card, onDone) {
    if (!card) { onDone?.(); return; }
    this.num.textContent = card.num ?? '';
    this.title.textContent = card.title;
    this.text.textContent = typeof card.text === 'function' ? card.text() : card.text;
    this.en.textContent = card.en ?? '';
    this.btn.textContent = card.button ?? 'Başla';
    const pop = this.modes.push('card');
    this.root.classList.add('open');
    this.btn.onclick = () => { this.root.classList.remove('open'); pop(); onDone?.(); };
    this.btn.focus();
  }
}
