import { el } from './dom.js';

export class QuestPanel {
  constructor(host) {
    this.t = el('div', { class: 'qt' });
    this.o = el('div', { class: 'qo' });
    this.e = el('div', { class: 'qe en-t' });
    this.root = el('div', { attrs: { id: 'quest' } }, [this.t, this.o, this.e]);
    host.append(this.root);
  }
  show(obj) {
    this.root.hidden = !obj;
    if (!obj) return;
    this.t.textContent = `Görev: ${obj.title}`;
    this.o.textContent = obj.text;
    this.e.textContent = obj.en;
  }
}
