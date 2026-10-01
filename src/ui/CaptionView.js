import { el } from './dom.js';
import { gloss } from '../i18n/Gloss.js';

/** A large caption card at the bottom of the screen for short scripted scenes. */
export class CaptionView {
  constructor(host) {
    this.title = el('div', { class: 'cap-title' });
    this.text = el('div', { class: 'cap-text' });
    this.en = el('div', { class: 'cap-en en-t' });
    this.root = el('div', { class: 'caption' }, [this.title, this.text, this.en]);
    this.root.hidden = true;
    host.append(this.root);
  }
  show({ title, text, en }) { this.title.textContent = title; this.text.textContent = text; this.en.textContent = gloss(en) ?? ''; this.root.hidden = false; }
  hide() { this.root.hidden = true; }
}
