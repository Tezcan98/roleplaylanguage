import { el } from './dom.js';
import { gloss } from '../i18n/Gloss.js';

export class Toasts {
  constructor(host) { this.root = el('div', { attrs: { id: 'toasts', 'aria-live': 'polite' } }); host.append(this.root); }
  show(text, sub) {
    const t = el('div', { class: 'toast', text }, [sub && el('small', { class: 'en-t', text: gloss(sub) })]);
    this.root.append(t);
    setTimeout(() => t.remove(), 3600);
  }
}
