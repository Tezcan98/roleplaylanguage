import { el } from './dom.js';

/** Top bar: clock, word book and bag counters. */
export class Hud {
  constructor(host, { onBook, onBag }) {
    this.clock = el('div', { class: 'pill clock', attrs: { 'aria-live': 'off' } });
    this.words = el('b', { text: '0' });
    this.bag = el('b', { text: '0' });
    host.append(el('div', { class: 'hud' }, [
      el('div', { class: 'grp' }, [el('button', { class: 'pill', attrs: { type: 'button' }, on: { click: onBook } }, ['Defter ', this.words])]),
      el('div', { class: 'grp' }, [
        this.clock,
        el('button', { class: 'pill', attrs: { type: 'button' }, on: { click: onBag } }, ['Çanta ', this.bag]),
      ]),
    ]));
  }
  setTime(dayName, label, night) { this.clock.textContent = `${night ? '☾' : '☀'} ${dayName} ${label}`; }
  setWords(n) { this.words.textContent = n; }
  setBag(n) { this.bag.textContent = n; }
}
