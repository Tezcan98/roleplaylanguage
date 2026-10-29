import { el } from './dom.js';
import { gloss, loadGlossLang, glossLanguages } from '../i18n/Gloss.js';
import { defaultGlossLang } from '../i18n/Region.js';

/** The four characters to pick from: [gender, look] — shown full length in HD (the shop's pictures of their 3D bodies), no names. */
export const CHARACTERS = [
  ['boy', 'modest'],
  ['boy', 'strong'],
  ['girl', 'covered'],
  ['girl', 'open'],
];
export const characterOf = (gender, look) => CHARACTERS.find(([g, l]) => g === gender && l === look) ?? CHARACTERS.find(([g]) => g === gender) ?? CHARACTERS[0];
const PICTURE = { 'boy-modest': 'boy', 'boy-strong': 'strong', 'girl-covered': 'covered', 'girl-open': 'girl' };
/** The HD picture of a character in everyday clothes (assets/shop, tools/models/render-previews.mjs). */
export const characterPicture = (gender, look) => `assets/shop/hd_casual_${PICTURE[characterOf(gender, look).join('-')]}.png`;

/**
 * First the language of the meanings, then which of the four characters you are (big full-length
 * pictures). Nothing to type: the username is asked when you go to the square from
 * the menu, the server is picked there too. Shown on the first launch and from the main menu.
 * `open()` resolves with the profile, or null when cancelled.
 */
export class CharacterSetup {
  constructor(host, { modes, settings }) {
    Object.assign(this, { host, modes, settings });
  }

  /** The saved profile (defaults for anything not chosen yet). */
  profile() {
    const s = this.settings;
    return { lang: s.get('glossLang', defaultGlossLang()), gender: s.get('gender', 'boy'), look: characterOf(s.get('gender', 'boy'), s.get('look', ''))[1] };
  }
  get done() { return !!this.settings.get('profileDone', false); }

  open({ cancellable = true } = {}) {
    const p = this.profile();
    const startLang = p.lang;
    return new Promise((resolve) => {
      const pop = this.modes.push('overlay');
      const texts = []; // [node, en] pairs re-glossed when the language changes
      const g = (en, cls = 'cen en-t') => { const n = el('p', { class: cls, text: gloss(en) }); texts.push([n, en]); return n; };

      const langs = el('div', { class: 'choice-row langs' }, glossLanguages().map(({ code, name }) => el('button', {
        class: 'chipbtn', text: name, attrs: { type: 'button', 'data-lang': code, 'aria-pressed': String(code === p.lang) },
        on: { click: async () => { p.lang = code; mark(langs, 'lang', code); await loadGlossLang(code); texts.forEach(([n, en]) => { n.textContent = gloss(en); }); } },
      })));
      const chars = el('div', { class: 'char-pick' }, CHARACTERS.map(([gender, look]) => el('button', {
        class: 'char-card', attrs: { type: 'button', 'data-char': `${gender}-${look}`, 'aria-pressed': String(gender === p.gender && look === p.look), 'aria-label': gender === 'girl' ? 'Kız' : 'Erkek' },
        on: { click: () => { p.gender = gender; p.look = look; mark(chars, 'char', `${gender}-${look}`); } },
      }, [el('img', { attrs: { src: characterPicture(gender, look), alt: '', draggable: 'false' } })])));

      const save = el('button', { class: 'btn', text: 'Başla', attrs: { type: 'button' } });
      const next = el('button', { class: 'btn', text: 'Devam ▶', attrs: { type: 'button' } });
      const back = el('button', { class: 'btn alt', text: '◀ Geri', attrs: { type: 'button' } });
      const cancel = cancellable && el('button', { class: 'btn alt', text: 'Vazgeç', attrs: { type: 'button' } });
      // two steps: first the language of the meanings, then the character
      const langStep = el('div', { class: 'setup-step' }, [
        el('h2', { class: 'ctitle', text: 'Açıklamalar hangi dilde olsun?' }), g('Which language should meanings be shown in?'), langs, next,
      ]);
      const charStep = el('div', { class: 'setup-step' }, [
        el('h2', { class: 'ctitle', text: 'Karakterini seç' }), g('Choose your character'), chars, save, back,
      ]);
      charStep.hidden = true;
      next.onclick = () => { langStep.hidden = true; charStep.hidden = false; };
      back.onclick = () => { charStep.hidden = true; langStep.hidden = false; };
      const root = el('div', { class: 'overlay open dim setup' }, [el('div', { class: 'card' }, [langStep, charStep, cancel])]);
      const done = (v) => { root.remove(); pop(); if (!v && p.lang !== startLang) loadGlossLang(startLang); resolve(v); };
      save.onclick = () => {
        const s = this.settings;
        s.set('glossLang', p.lang); s.set('gender', p.gender); s.set('look', p.look);
        s.set('profileDone', true);
        done({ ...p });
      };
      if (cancel) cancel.onclick = () => done(null);
      this.host.append(root);
    });
  }
}

function mark(row, key, id) {
  row.querySelectorAll('button').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset[key] === id)));
}
