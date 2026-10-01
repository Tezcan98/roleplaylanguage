import { el, ICONS } from './dom.js';
import { gloss, glossLang, glossRole } from '../i18n/Gloss.js';

/** Dumb view for conversations: header, line, translation, words, activity slot. */
export class DialogueView {
  constructor(host, { onClose, onSpeak, onToggleEn }) {
    this.face = el('div', { class: 'face' });
    this.name = el('div', { class: 'n' });
    this.role = el('div', { class: 'r' });
    this.enBtn = el('button', { class: 'iconbtn', text: glossLang() === 'ar' ? 'ع' : 'EN', attrs: { type: 'button', 'aria-pressed': 'true', 'aria-label': 'Çeviri' }, on: { click: onToggleEn } });
    this.line = el('p', { class: 'line' });
    this.en = el('p', { class: 'en en-t' });
    this.hint = el('div', { class: 'hint', style: { display: 'none' } });
    this.words = el('div', { class: 'words' });
    this.slot = el('div', { class: 'activity' });
    this.root = el('div', { class: '', attrs: { id: 'dlg', role: 'dialog', 'aria-label': 'Konuşma' } }, [
      el('div', { class: 'head' }, [
        this.face,
        el('div', { class: 'who' }, [this.name, this.role]),
        el('button', { class: 'iconbtn', html: ICONS.speaker, attrs: { type: 'button', 'aria-label': 'Sesli dinle' }, on: { click: onSpeak } }),
        this.enBtn,
        el('button', { class: 'iconbtn', html: ICONS.close, attrs: { type: 'button', 'aria-label': 'Konuşmadan ayrıl' }, on: { click: onClose } }),
      ]),
      el('div', { class: 'sheet' }, [this.line, this.en, this.hint, this.words, this.slot]),
    ]);
    host.append(this.root);
  }

  open({ face, name, role }) {
    this.face.innerHTML = face;
    this.name.textContent = name;
    this.role.textContent = glossRole(role);
    this.root.classList.add('open');
  }
  close() { this.root.classList.remove('open'); this.slot.replaceChildren(); }
  get isOpen() { return this.root.classList.contains('open'); }

  setLine(tr, en, muted = false) {
    this.line.textContent = tr;
    this.line.classList.toggle('hiddenline', muted);
    this.en.textContent = gloss(en) || '';
    this.en.hidden = !en;
  }
  setHint(text) { this.hint.style.display = text ? 'block' : 'none'; this.hint.replaceChildren(el('b', { text: 'İpucu: ' }), text || ''); }
  setWords(list) {
    this.words.replaceChildren(...(list || []).map(([tr, en]) => el('span', { class: 'word' }, [`${tr} `, el('span', { class: 'en-t', text: `= ${gloss(en)}` })])));
  }
  setEnPressed(on) { this.enBtn.setAttribute('aria-pressed', String(on)); }
  clearActivity() { this.slot.replaceChildren(); }
}
