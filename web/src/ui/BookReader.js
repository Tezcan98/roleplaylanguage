import { el, ICONS } from './dom.js';
import { gloss } from '../i18n/Gloss.js';

/** A book open in your hands: one page at a time, Turkish with its meaning and the book's words. */
export class BookReader {
  #pop = null;

  constructor(host, { modes, onSpeak, onClose, onFinish }) {
    Object.assign(this, { modes, onSpeak, onClose, onFinish });
    this.title = el('h2', { class: 'ctitle' });
    this.author = el('p', { class: 'book-author' });
    this.text = el('p', { class: 'book-text' });
    this.en = el('p', { class: 'book-en en-t' });
    this.words = el('div', { class: 'words' });
    this.pageNo = el('span', { class: 'book-page' });
    this.prev = el('button', { class: 'btn alt sm', text: '◀', attrs: { type: 'button', 'aria-label': 'Önceki sayfa' }, on: { click: () => this.#go(-1) } });
    this.next = el('button', { class: 'btn sm', text: 'Sonraki ▶', attrs: { type: 'button' }, on: { click: () => this.#go(1) } });
    this.root = el('div', { class: 'overlay dim book' }, [el('div', { class: 'card' }, [
      el('div', { class: 'book-head' }, [
        el('div', {}, [this.title, this.author]),
        el('button', { class: 'iconbtn light', html: ICONS.speaker, attrs: { type: 'button', 'aria-label': 'Sesli oku' }, on: { click: () => this.onSpeak?.(this.book.pages[this.page].tr) } }),
        el('button', { class: 'iconbtn light', html: ICONS.close, attrs: { type: 'button', 'aria-label': 'Kitabı kapat' }, on: { click: () => this.close() } }),
      ]),
      this.text, this.en, this.words,
      el('div', { class: 'row book-nav' }, [this.prev, this.pageNo, this.next]),
    ])]);
    host.append(this.root);
  }

  get isOpen() { return this.root.classList.contains('open'); }

  open(book, page = 0) {
    this.book = book;
    this.page = Math.min(page, book.pages.length - 1);
    if (!this.#pop) this.#pop = this.modes.push('overlay');
    this.root.classList.add('open');
    this.#render();
  }

  close() {
    this.root.classList.remove('open');
    this.#pop?.(); this.#pop = null;
    this.onClose?.(this.book, this.page);
  }

  #go(d) {
    const last = this.book.pages.length - 1;
    if (d > 0 && this.page === last) { this.onFinish?.(this.book); this.close(); return; }
    this.page = Math.max(0, Math.min(last, this.page + d));
    this.#render();
  }

  #render() {
    const b = this.book, p = b.pages[this.page], last = b.pages.length - 1;
    this.title.textContent = `📖 ${b.title}`;
    this.author.replaceChildren(b.author, el('small', { class: 'en-t', text: ` · ${gloss(b.en)}` }));
    this.text.textContent = p.tr;
    this.en.textContent = gloss(p.en);
    this.words.replaceChildren(...(this.page === last ? b.words : []).map(([tr, en]) => el('span', { class: 'word' }, [`${tr} `, el('span', { text: `= ${gloss(en)}` })])));
    this.pageNo.textContent = `${this.page + 1} / ${b.pages.length}`;
    this.prev.disabled = this.page === 0;
    this.next.textContent = this.page === last ? 'Bitir ✓' : 'Sonraki ▶';
    this.onSpeak?.(p.tr);
  }
}
