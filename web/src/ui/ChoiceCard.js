import { el } from './dom.js';
import { gloss } from '../i18n/Gloss.js';

/** A small yes / no card. `ask()` resolves true for yes. */
export class ChoiceCard {
  constructor(host, modes) { Object.assign(this, { host, modes }); }

  ask({ title, text, en, yes, no }) {
    return new Promise((resolve) => {
      const pop = this.modes.push('overlay');
      const done = (v) => { root.remove(); pop(); resolve(v); };
      const root = el('div', { class: 'overlay open dim' }, [el('div', { class: 'card' }, [
        el('h2', { class: 'ctitle', text: title }),
        el('p', { class: 'ctext', text }),
        en && el('p', { class: 'cen en-t', text: gloss(en) }),
        el('button', { class: 'btn', text: yes, attrs: { type: 'button' }, on: { click: () => done(true) } }),
        el('button', { class: 'btn alt', text: no, attrs: { type: 'button' }, on: { click: () => done(false) } }),
      ])]);
      this.host.append(root);
    });
  }

  /**
   * Several choices: options [{ label, en?, disabled?, value }] + a cancel button.
   * @returns {Promise<any>} the chosen option's value, or null
   */
  pick({ title, en, options, cancel = 'Vazgeç' }) {
    return new Promise((resolve) => {
      const pop = this.modes.push('overlay');
      const done = (v) => { root.remove(); pop(); resolve(v); };
      const root = el('div', { class: 'overlay open dim' }, [el('div', { class: 'card pick-card' }, [
        el('h2', { class: 'ctitle', text: title }),
        en && el('p', { class: 'cen en-t', text: gloss(en) }),
        ...options.map((o) => el('button', {
          class: 'btn pick', attrs: { type: 'button', ...(o.disabled ? { disabled: '' } : {}) }, on: { click: () => done(o.value) },
        }, [el('span', { text: o.label }), o.en && el('small', { class: 'en-t', text: gloss(o.en) })])),
        el('button', { class: 'btn alt', text: cancel, attrs: { type: 'button' }, on: { click: () => done(null) } }),
      ])]);
      this.host.append(root);
    });
  }
}
