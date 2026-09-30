import { el } from './dom.js';

/** Black fade used to hide scene changes. */
export class Fader {
  constructor(host, ms = 550) { this.ms = ms; this.root = el('div', { attrs: { id: 'fade' } }); host.append(this.root); }
  run(midpoint) {
    this.root.style.opacity = '1';
    setTimeout(() => { midpoint(); this.root.style.opacity = '0'; }, this.ms);
  }
}
