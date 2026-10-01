import { el, ICONS } from './dom.js';

/** Book-shaped overlay; the controller fills the page body and wires navigation. */
export class TextbookView {
  constructor(host, { onClose, onPrev, onNext }) {
    this.title = el('h2');
    this.body = el('div', { class: 'tb-body' });
    this.page = el('span', { class: 'pg' });
    this.prev = el('button', { class: 'chipbtn', text: '‹ Geri', attrs: { type: 'button' }, on: { click: onPrev } });
    this.next = el('button', { class: 'chipbtn primary', text: 'İleri ›', attrs: { type: 'button' }, on: { click: onNext } });
    this.root = el('div', { class: 'overlay dim' }, [el('div', { class: 'textbook' }, [
      el('div', { class: 'tb-head' }, [this.title, el('button', { class: 'iconbtn', html: ICONS.close, attrs: { type: 'button', 'aria-label': 'Kitabı kapat' }, on: { click: onClose } })]),
      this.body,
      el('div', { class: 'tb-nav' }, [this.prev, this.page, this.next]),
    ])]);
    host.append(this.root);
  }

  open() { this.root.classList.add('open'); }
  close() { this.root.classList.remove('open'); this.body.replaceChildren(); }
  get isOpen() { return this.root.classList.contains('open'); }

  frame(title, pageText, { prev, next, nextLabel }) {
    this.title.textContent = title;
    this.page.textContent = pageText;
    this.prev.hidden = !prev;
    this.next.hidden = !next;
    this.next.disabled = next === 'locked';
    this.next.textContent = nextLabel ?? 'İleri ›';
    this.body.replaceChildren();
  }

  units(units, status, onPick) {
    this.body.append(el('h3', { text: 'İçindekiler' }), el('div', { class: 'tb-units' }, units.map((u) => el('button', {
      class: 'unit', attrs: { type: 'button', ...(u.locked ? { disabled: '' } : {}) }, on: { click: () => onPick(u) },
    }, [el('span', {}, [u.title, el('br'), el('small', { class: 'en-t', text: u.titleEn })]), el('span', { class: `st ${status(u) === 'done' ? 'done' : ''}`, text: u.locked ? 'Yakında' : status(u) === 'done' ? '✓ Bitti' : 'Ödev' })]))));
  }

  read(page, onSpeak) {
    this.body.append(el('h3', { text: page.title }));
    page.lines.forEach(([tr, en]) => this.body.append(
      el('p', {}, [tr, ' ', el('button', { class: 'chipbtn', html: ICONS.speaker, attrs: { type: 'button', 'aria-label': 'Dinle' }, style: { minHeight: '30px', padding: '0 6px' }, on: { click: () => onSpeak(tr) } })]),
      el('p', { class: 'en en-t', text: en, style: { lineHeight: '20px', marginTop: '-6px' } }),
    ));
    if (page.words) this.body.append(el('div', { class: 'words' }, page.words.map(([tr, en]) => el('span', { class: 'word' }, [`${tr} `, el('span', { text: `= ${en}` })]))));
  }

  memory(page, onSpeak) {
    this.body.append(el('h3', { text: page.title }), el('p', { class: 'en', text: 'Kelimeyi, sesi benzeyen İngilizce bir kelimeyle ve komik bir resimle hatırla.', style: { lineHeight: '22px' } }));
    page.cards.forEach((c) => this.body.append(el('div', { class: 'mncard' }, [
      el('span', { class: 'w' }, [`${c.tr} `, el('button', { class: 'chipbtn', html: ICONS.speaker, attrs: { type: 'button', 'aria-label': 'Dinle' }, style: { minHeight: '30px', padding: '0 6px' }, on: { click: () => onSpeak(c.tr) } })]),
      el('span', { class: 's', text: `= ${c.en} · kulağa ${c.sounds} gibi gelir` }),
      el('span', { class: 'p', text: `🎨 ${c.picture}` }),
    ])));
  }

  exercise(page) {
    this.body.append(el('h3', { text: page.title }), el('p', { text: page.activity === 'listen' ? '🔊 Dinle ve seç.' : page.say }), el('p', { class: 'en en-t', text: page.activity === 'listen' ? '' : page.en, style: { lineHeight: '20px' } }));
    this.hint = el('div', { class: 'hint', style: { display: 'none' } });
    this.slot = el('div', { class: 'activity' });
    this.body.append(this.hint, this.slot);
    return this.slot;
  }

  enableNext() { this.next.disabled = false; }

  showHint(text) { if (!text) return; this.hint.style.display = 'block'; this.hint.textContent = `İpucu: ${text}`; }
  done(text) { this.slot.append(el('p', { class: 'fb ok', text })); }
}
