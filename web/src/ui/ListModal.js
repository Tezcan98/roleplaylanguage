import { el, ICONS } from './dom.js';

/** Two-column list popup used for the word book and the bag. */
export class ListModal {
  constructor(host, modes) {
    this.modes = modes;
    this.title = el('span');
    this.list = el('div', { class: 'blist' });
    this.action = el('button', { class: 'btn sm list-action', attrs: { type: 'button' } });
    this.root = el('div', { class: 'overlay dim', on: { click: (e) => { if (e.target === this.root) this.close(); } } }, [
      el('div', { class: 'bookin' }, [
        el('h2', {}, [this.title, el('button', { class: 'iconbtn', html: ICONS.close, attrs: { type: 'button', 'aria-label': 'Kapat' }, on: { click: () => this.close() } })]),
        this.action,
        this.list,
      ]),
    ]);
    host.append(this.root);
  }

  /**
   * `action`: optional { label, run } button above the list (e.g. word practice).
   * A row with a third element (a function) can be tapped (the table, the rubbish bin).
   */
  open(title, rows, emptyText, action = null) {
    this.title.textContent = title;
    this.action.hidden = !action;
    if (action) { this.action.textContent = action.label; this.action.onclick = () => { this.close(); action.run(); }; }
    this.list.replaceChildren(...(rows.length
      ? rows.flatMap(([a, b, pick]) => (pick
        ? [el('button', { class: 'pick', attrs: { type: 'button' }, on: { click: pick } }, [el('span', { class: 'tr', text: a }), el('span', { class: 'en2 en-t', text: b })])]
        : [el('div', { class: 'tr', text: a }), el('div', { class: 'en2', text: b })]))
      : [el('div', { class: 'empty', text: emptyText })]));
    if (!this.pop) this.pop = this.modes.push('overlay');
    this.root.classList.add('open');
  }

  close() { this.root.classList.remove('open'); this.pop?.(); this.pop = null; }
}
