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
