import { el } from './dom.js';

/**
 * The action button (the most important thing you can do here) and, above it, smaller buttons
 * for the other things within reach — e.g. talking to Hasan Amca while another player comes up.
 */
export class ActionButton {
  #key = '';

  constructor(host, onPress) {
    this.root = el('button', { attrs: { id: 'act', type: 'button' }, on: { click: onPress } });
    this.root.hidden = true;
    this.more = el('div', { attrs: { id: 'act-more' } });
    host.append(this.more, this.root);
  }

  /** @param action the main one  @param others [{ label, run }] */
  show(action, others = []) {
    this.root.hidden = !action;
    if (action && this.root.textContent !== action.label) this.root.textContent = action.label;
    const list = action ? others : [], key = list.map((a) => a.label).join('|');
    if (key === this.#key) { this.#runs = list.map((a) => a.run); return; }
    this.#key = key; this.#runs = list.map((a) => a.run);
    this.more.replaceChildren(...list.map((a, i) => el('button', { class: 'act-alt', text: a.label, attrs: { type: 'button' }, on: { click: () => this.#runs[i]?.() } })));
  }

  #runs = [];
}

/** ⚡ Hard shot: next to the action button (left of it) while a ball is at your feet. */
export class ShotButton {
  #key = '';

  constructor(host, onPress, act) {
    this.act = act;
    this.root = el('button', { attrs: { id: 'shot', type: 'button', 'aria-label': 'Sert vur' }, text: '⚡ Sert vur', on: { click: onPress } });
    this.root.hidden = true;
    host.append(this.root);
  }

  show(on) {
    if (this.root.hidden === !!on) this.root.hidden = !on;
    if (!on) return;
    const key = `${this.act.hidden}|${this.act.textContent}|${innerWidth}x${innerHeight}`;
    if (key === this.#key) return; // re-place only when the action button changes
    this.#key = key;
    const a = this.act.getBoundingClientRect();
    this.root.style.right = a.width ? `${innerWidth - a.left + 10}px` : '';
    this.root.style.bottom = a.width ? `${innerHeight - a.bottom}px` : '';
  }
}
