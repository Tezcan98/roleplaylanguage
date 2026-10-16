import { el } from './dom.js';
import { gloss } from '../i18n/Gloss.js';

/**
 * The current task, top left. It folds down to its title line (the – button, or a tap on it to open
 * it again), remembered in the settings; folded, a new task makes it blink for a moment.
 */
export class QuestPanel {
  constructor(host, { settings = null } = {}) {
    this.settings = settings;
    this.t = el('div', { class: 'qt' });
    this.o = el('div', { class: 'qo' });
    this.e = el('div', { class: 'qe en-t' });
    this.toggle = el('button', { class: 'q-toggle', attrs: { type: 'button' }, on: { click: (e) => { e.stopPropagation(); this.setCollapsed(!this.collapsed); } } });
    this.root = el('div', { attrs: { id: 'quest' } }, [this.toggle, this.t, this.o, this.e]);
    this.root.addEventListener('click', () => { if (this.collapsed) this.setCollapsed(false); });
    host.append(this.root);
    this.setCollapsed(!!settings?.get('questCollapsed', false));
  }

  setCollapsed(on) {
    this.collapsed = on;
    this.root.classList.toggle('collapsed', on);
    this.toggle.textContent = on ? '+' : '–';
    this.toggle.setAttribute('aria-label', on ? 'Görevi göster' : 'Görevi küçült');
    this.settings?.set('questCollapsed', on);
  }

  show(obj) {
    this.root.hidden = !obj;
    if (!obj) return;
    const title = `Görev: ${obj.title}`;
    if (this.collapsed && this.t.textContent && this.t.textContent !== title) { // a new task while folded: a blink
      this.root.classList.remove('news'); void this.root.offsetWidth; this.root.classList.add('news');
    }
    this.t.textContent = title;
    this.o.textContent = obj.text;
    this.e.textContent = gloss(obj.en);
  }
}
