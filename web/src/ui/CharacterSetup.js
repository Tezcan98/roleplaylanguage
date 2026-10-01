import { el } from './dom.js';
import { gloss, loadGlossLang, glossLanguages } from '../i18n/Gloss.js';
import { ServerPicker } from './ServerPicker.js';

export const PLAYER_NAMES = { boy: 'Ahmet', girl: 'Meryem' };
const NAME = /^[\p{L}\p{N}_ .-]{2,16}$/u;

/**
 * "Create your character": meaning language, boy/girl, username and village server.
 * Shown on the first launch and from the main menu ("Değiştir"); everything can be changed later.
 * `open()` resolves with the profile, or null when cancelled.
 */
export class CharacterSetup {
  constructor(host, { modes, settings, villageServer }) {
    Object.assign(this, { host, modes, settings, villageServer });
  }

  /** The saved profile (defaults for anything not chosen yet). */
  profile() {
    const s = this.settings;
    return {
      lang: s.get('glossLang', 'ar'),
      gender: s.get('gender', 'boy'),
      username: s.get('username', '') ?? '',
      server: s.get('serverRegion', 'ankara'),
    };
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
      const genders = el('div', { class: 'choice-row' }, [['boy', '👦 Erkek'], ['girl', '👧 Kız']].map(([id, label]) => el('button', {
        class: 'chipbtn big-chip', text: `${label} · ${PLAYER_NAMES[id]}`, attrs: { type: 'button', 'data-gender': id, 'aria-pressed': String(id === p.gender) },
        on: { click: () => { p.gender = id; mark(genders, 'gender', id); } },
      })));
      const name = el('input', { class: 'name-in', attrs: { type: 'text', maxlength: '16', placeholder: 'Kullanıcı adın', autocomplete: 'nickname' } });
      name.value = p.username;
      const err = el('p', { class: 'note' });
      const servers = new ServerPicker({ villageServer: this.villageServer, value: p.server });
      servers.start();

      const save = el('button', { class: 'btn', text: 'Kaydet ve devam et', attrs: { type: 'button' } });
      const cancel = cancellable && el('button', { class: 'btn alt', text: 'Vazgeç', attrs: { type: 'button' } });
      const root = el('div', { class: 'overlay open dim setup' }, [el('div', { class: 'card' }, [
        el('h2', { class: 'ctitle', text: 'Karakterini oluştur' }), g('Create your character'),
        el('div', { class: 'setup-grid' }, [
          el('section', {}, [el('p', { class: 'chap', text: 'Açıklamalar hangi dilde olsun?' }), g('Which language should meanings be shown in?'), langs]),
          el('section', {}, [el('p', { class: 'chap', text: 'Cinsiyet' }), g('Boy or girl?'), genders]),
          el('section', {}, [el('p', { class: 'chap', text: 'Kullanıcı adı (köy meydanında görünür)' }), g('Username (shown in the village square)'), name]),
          el('section', {}, [el('p', { class: 'chap', text: 'Köy meydanı sunucusu' }), g('Village square server — you can change it later.'), servers.root]),
        ]),
        err, save, cancel,
      ])]);
      const done = (v) => { servers.stop(); root.remove(); pop(); if (!v && p.lang !== startLang) loadGlossLang(startLang); resolve(v); };
      save.onclick = () => {
        const username = name.value.trim();
        if (username && !NAME.test(username)) { err.textContent = `Kullanıcı adı 2-16 harf/rakam olmalı · ${gloss('2-16 letters or digits')}`; name.focus(); return; }
        const out = { ...p, username, server: servers.value };
        const s = this.settings;
        s.set('glossLang', out.lang); s.set('gender', out.gender); s.set('serverRegion', out.server);
        if (username) s.set('username', username);
        s.set('profileDone', true);
        done(out);
      };
      if (cancel) cancel.onclick = () => done(null);
      this.host.append(root);
    });
  }
}

function mark(row, key, id) {
  row.querySelectorAll('button').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset[key] === id)));
}
