import { el } from './dom.js';

/** Top bar: clock, word book and bag counters. */
export class Hud {
  constructor(host, { onBook, onBag, onBookOpen }) {
    this.clock = el('div', { class: 'pill clock', attrs: { 'aria-live': 'off' } });
    this.words = el('b', { text: '0' });
    this.bag = el('b', { text: '0' });
    this.credits = el('b', { text: '0' });
    this.textbook = el('button', { class: 'pill', text: '📘 Kitap', attrs: { type: 'button' }, on: { click: onBookOpen } });
    this.textbook.hidden = true;
    host.append(el('div', { class: 'hud' }, [
      el('div', { class: 'grp' }, [
        el('button', { class: 'pill', attrs: { type: 'button' }, on: { click: onBook } }, ['Defter ', this.words]),
        this.textbook,
        el('div', { class: 'pill clock', attrs: { title: 'Ders kredisi' } }, ['🪙 ', this.credits]),
      ]),
      el('div', { class: 'grp' }, [
        this.clock,
        el('button', { class: 'pill', attrs: { type: 'button' }, on: { click: onBag } }, ['Çanta ', this.bag]),
      ]),
    ]));
  }
  setTime(dayName, label, night) { this.clock.textContent = `${night ? '☾' : '☀'} ${dayName} ${label}`; }
  setWords(n) { this.words.textContent = n; }
  setBag(n) { this.bag.textContent = n; }
  setCredits(n) { this.credits.textContent = n; }
  setTextbook(on) { this.textbook.hidden = !on; }
}
