import { el } from './dom.js';
import { gloss } from '../i18n/Gloss.js';

/** A line of Turkish at the bottom of the screen with its meaning in the player's language under it (a book read aloud). */
export class Subtitles {
  constructor(host) {
    this.head = el('small', { class: 'sub-head' });
    this.tr = el('b', { class: 'sub-tr' });
    this.en = el('span', { class: 'sub-en en-t' });
    this.root = el('div', { class: 'subtitles', attrs: { 'aria-live': 'polite' } }, [this.head, this.tr, this.en]);
    this.root.hidden = true;
    host.append(this.root);
  }

  show(tr, en, head = '') {
    this.head.textContent = head; this.tr.textContent = tr; this.en.textContent = en ? gloss(en) : '';
    this.root.hidden = false;
  }

  hide() { this.root.hidden = true; }
}
