import { el } from './dom.js';
import { gloss } from '../i18n/Gloss.js';

/** A short, input-blocking night between story days; it finishes automatically. */
export class SleepScreen {
  #pending = null;
  constructor(host, modes, duration = 2400) {
    Object.assign(this, { modes, duration });
    this.root = el('div', { class: 'sleep-screen', attrs: { role: 'status', 'aria-live': 'polite', hidden: '' } }, [
      el('div', { class: 'sleep-moon', text: '☾', attrs: { 'aria-hidden': 'true' } }),
      el('p', { text: 'İyi geceler, herkese!' }),
      el('small', { class: 'en-t', text: gloss('Good night, everyone!') }),
      el('div', { class: 'sleep-stars', text: '✦   ·   ✧   ·   ✦', attrs: { 'aria-hidden': 'true' } }),
    ]);
    host.append(this.root);
  }
  show() {
    if (this.#pending) return this.#pending;
    const pop = this.modes.push('sleep');
    this.root.hidden = false;
    this.#pending = new Promise((resolve) => setTimeout(() => {
      this.root.hidden = true;
      pop(); this.#pending = null; resolve();
    }, this.duration));
    return this.#pending;
  }
}
