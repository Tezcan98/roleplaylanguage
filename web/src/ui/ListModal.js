import { el, ICONS } from './dom.js';

/** Two-column list popup used for the word book and the bag. */
export class ListModal {
  constructor(host, modes) {
    this.modes = modes;
    this.title = el('span');
    this.list = el('div', { class: 'blist' });
    this.root = el('div', { class: 'overlay dim', on: { click: (e) => { if (e.target === this.root) this.close(); } } }, [
      el('div', { class: 'bookin' }, [
        el('h2', {}, [this.title, el('button', { class: 'iconbtn', html: ICONS.close, attrs: { type: 'button', 'aria-label': 'Kapat' }, on: { click: () => this.close() } })]),
        this.list,
      ]),
    ]);
    host.append(this.root);
  }

  open(title, rows, emptyText) {
    this.title.textContent = title;
    this.list.replaceChildren(...(rows.length
      ? rows.flatMap(([a, b]) => [el('div', { class: 'tr', text: a }), el('div', { class: 'en2', text: b })])
      : [el('div', { class: 'empty', text: emptyText })]));
    if (!this.pop) this.pop = this.modes.push('overlay');
    this.root.classList.add('open');
  }

  close() { this.root.classList.remove('open'); this.pop?.(); this.pop = null; }
}
