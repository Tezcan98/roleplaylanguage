import { el } from './dom.js';

export class ActionButton {
  constructor(host, onPress) {
    this.root = el('button', { attrs: { id: 'act', type: 'button' }, on: { click: onPress } });
    this.root.hidden = true;
    host.append(this.root);
  }
  show(action) {
    this.root.hidden = !action;
    if (action && this.root.textContent !== action.label) this.root.textContent = action.label;
  }
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
