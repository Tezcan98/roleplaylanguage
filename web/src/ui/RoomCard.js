import { el, ICONS } from './dom.js';
import { gloss } from '../i18n/Gloss.js';
import { ServerPicker } from './ServerPicker.js';

/**
 * "Meydan seç": the city squares with how many are in each right now (ServerPicker, polled while open).
 * A tap on a city picks it; `open(current)` resolves with its id, or null when closed.
 */
export class RoomCard {
  constructor(host, modes, { villageServer }) { Object.assign(this, { host, modes, villageServer }); }

  open(current) {
    return new Promise((resolve) => {
      const pop = this.modes.push('overlay');
      const done = (id) => { picker.stop(); root.remove(); pop(); resolve(id); };
      const picker = new ServerPicker({ villageServer: this.villageServer, value: current, follow: false, onChange: (id) => done(id) }); // (only the player's tap picks here)
      const root = el('div', { class: 'overlay open dim' }, [el('div', { class: 'card room-card' }, [
        el('div', { class: 'set-head' }, [
          el('div', {}, [el('h2', { class: 'ctitle', text: 'Köy meydanı seç' }), el('small', { class: 'en-t', text: gloss('Choose a square') })]),
          el('button', { class: 'iconbtn light', html: ICONS.close, attrs: { type: 'button', 'aria-label': 'Kapat' }, on: { click: () => done(null) } }),
        ]),
        el('p', { class: 'ctext', text: 'Her şehirde ayrı bir köy meydanı var. Arkadaşınla aynı şehri seç.' }),
        el('p', { class: 'en-t', text: gloss('Each city is its own square. Pick the same city as your friend.') }),
        picker.root,
      ].filter((n) => !(n.classList?.contains('en-t') && !n.textContent)))]);
      root.addEventListener('click', (e) => { if (e.target === root) done(null); });
      this.host.append(root);
      picker.start();
    });
  }
}
