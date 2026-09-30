import { el } from './dom.js';

export class Toasts {
  constructor(host) { this.root = el('div', { attrs: { id: 'toasts', 'aria-live': 'polite' } }); host.append(this.root); }
  show(text, sub) {
    const t = el('div', { class: 'toast', text }, [sub && el('small', { text: sub })]);
    this.root.append(t);
    setTimeout(() => t.remove(), 3600);
  }
}
