import { el } from './dom.js';
import { gloss, glossInfo } from '../i18n/Gloss.js';
import { ServerPicker, SERVERS } from './ServerPicker.js';
import { characterOf } from './CharacterSetup.js';
import { fullscreenPossible, goFullscreen, fullscreenIcon, canInstall, installApp } from './Landscape.js';


/**
 * Title screen, kept simple: play the story, or go to the online village square — that's
 * all on the first screen. The city for the square (with live player counts) and the
 * settings (new game, how to play, voices, picture quality) open only when asked for.
 * It is shown again when the player leaves the online square.
 */
export class MainMenu {
  #view = 'home'; // home | city | settings

  constructor(host, { settings, villageServer, hasSave, onStart, onContinue, onSquare, onHelp, onProfile, onShop, onStartAt, chapters = [] }) {
    Object.assign(this, { host, settings, hasSave, onStart, onContinue, onSquare, onHelp, onProfile, onShop, onStartAt, chapters });
    this.servers = new ServerPicker({ villageServer, value: settings.get('serverRegion', 'ankara'), onChange: (id) => settings.set('serverRegion', id) });
    this.servers.onUpdate = () => this.#where && (this.#where.textContent = this.#whereText());
    this.root = el('div', { class: 'overlay main-menu' });
    document.addEventListener('fullscreenchange', () => { if (this.root.classList.contains('open')) this.show(this.#view); });
    host.append(this.root);
    addEventListener('game-installable', () => { if (this.root.classList.contains('open') && this.#view === 'home') this.show(); });
    this.show();
  }

  #where = null;
  #whereText() {
    const n = this.servers.count();
    return `${this.servers.label} meydanı · ${n ? `${n} kişi var` : 'şimdilik boş'}`;
  }

  #taps = 0;
  #tapAt = 0;

  /** Five quick taps on the settings title (on / off) or the game's name on the home screen (on): test mode; the title counts them down. */
  #tap(title, label = '⚙️ Ayarlar') {
    const now = Date.now();
    this.#taps = now - this.#tapAt < 1500 ? this.#taps + 1 : 1; this.#tapAt = now;
    const s = this.settings;
    if (this.#taps < 5) { if (this.#taps >= 2) title.textContent = `${label} · ${5 - this.#taps}`; return; }
    this.#taps = 0;
    s.set('testerMode', label === '⚙️ Ayarlar' ? !s.get('testerMode', false) : true); // (from the home screen: always on)
    this.show('settings');
  }

  /** Test mode: a new game from the chosen chapter (day, time and title of each). */
  #chapterPicker(go) {
    const pick = el('select', { attrs: { id: 'testChapter' } }, this.chapters.map((c) => el('option', { text: c.text, attrs: { value: String(c.i) } })));
    return el('div', { class: 'test-start' }, [
      el('b', { text: '🧪 Test: bölümden başla' }),
      pick,
      el('button', { class: 'btn sm', text: 'Bu bölümden yeni oyun', attrs: { type: 'button' }, on: { click: go(() => this.onStartAt(Number(pick.value))) } }),
    ]);
  }

  show(view = 'home') {
    this.#view = view;
    const s = this.settings;
    const save = this.hasSave();
    this.servers.value = s.get('serverRegion', 'ankara');
    const btn = (text, cls, fn, attrs = {}) => el('button', { class: cls, text, attrs: { type: 'button', ...attrs }, on: { click: fn } });
    const go = (fn) => () => { this.hide(); fn(); };
    const back = btn('← Geri', 'chipbtn menu-back', () => this.show('home'));
    let body;

    if (view === 'city') {
      body = [
        back,
        el('h2', { class: 'ctitle', text: 'Hangi şehrin meydanı?' }),
        el('p', { class: 'cen en-t', text: gloss('Village square · play online with others') }),
        this.servers.root,
        btn('Meydana gir', 'btn', go(() => this.onSquare(this.servers.value))),
      ];
    } else if (view === 'settings') {
      const voice = el('input', { attrs: { type: 'checkbox', id: 'neuralVoices' } });
      voice.checked = s.get('neuralVoices', true);
      voice.addEventListener('change', () => s.set('neuralVoices', voice.checked));
      const quality = el('select', { attrs: { id: 'quality' } }, [
        el('option', { text: 'Yüksek (güçlü ekran kartı)', attrs: { value: 'high' } }),
        el('option', { text: 'Orta (bilgisayar)', attrs: { value: 'medium' } }),
        el('option', { text: 'Düşük (telefon)', attrs: { value: 'low' } }),
      ]);
      quality.value = s.get('quality', 'medium');
      quality.addEventListener('change', () => { s.set('quality', quality.value); location.reload(); });
      body = [
        back,
        // five taps on the title: test mode (start the story from any chapter) — for the people testing the game
        el('h2', { class: 'ctitle', text: s.get('testerMode', false) ? '⚙️ Ayarlar · 🧪' : '⚙️ Ayarlar', on: { click: (e) => this.#tap(e.currentTarget) } }),
        s.get('testerMode', false) && this.onStartAt && this.#chapterPicker(go), // right under the title: seen without scrolling
        btn('Nasıl oynanır?', 'btn alt', () => this.onHelp?.()),
        save && btn('Yeni oyun (baştan başla)', 'btn alt', go(this.onStart)),
        el('label', { class: 'toggle' }, [voice, el('span', { text: 'Doğal Türkçe sesler' })]),
        el('label', { class: 'toggle' }, [el('span', { text: 'Görüntü kalitesi:' }), quality]),
      ];
    } else {
      const gender = s.get('gender', 'boy'), [, , icon, name] = characterOf(gender, s.get('look', ''));
      this.#where = el('span', { text: this.#whereText() });
      body = [
        el('div', { class: 'menu-top' }, [
          fullscreenPossible() && el('button', { class: 'iconbtn light', html: fullscreenIcon(), attrs: { type: 'button', 'aria-label': 'Tam ekran', title: 'Tam ekran' }, on: { click: () => goFullscreen().finally(() => this.show()) } }), // iPhone: the home-screen guide
          btn('🪙', 'iconbtn light', () => this.onShop?.(), { 'aria-label': 'Dükkan', title: 'Dükkan · krediler' }),
          btn('⚙️', 'iconbtn light', () => this.show('settings'), { 'aria-label': 'Ayarlar', title: 'Ayarlar' }),
        ]),
        el('h1', { class: 'big ctitle-tap', text: 'Anadolu Ailesi', on: { click: (e) => this.#tap(e.currentTarget, 'Anadolu Ailesi') } }), // five quick taps: test mode, straight to its chapter picker
        el('p', { class: 'sub', text: 'Köyde yaşa, Türkçe öğren.' }),
        btn(save ? '▶ Devam et' : '▶ Hikayeye başla', 'btn menu-main', go(save ? this.onContinue : this.onStart)),
        btn('🏘️ Meydana gir', 'btn alt menu-main', go(() => this.onSquare(this.servers.value))),
        el('p', { class: 'menu-where' }, [this.#where, ' · ', btn('Şehir değiştir', 'linkbtn', () => this.show('city'))]),
        canInstall() && el('button', { class: 'btn alt menu-install', text: '📲 Uygulama olarak yükle (hep tam ekran)', attrs: { type: 'button' }, on: { click: () => installApp().finally(() => this.show()) } }),
        el('div', { class: 'profile-line' }, [
          el('span', { text: `${icon} ${name} · ${glossInfo().name}${s.get('username') ? ` · @${s.get('username')}` : ''}` }),
          btn('Değiştir', 'chipbtn', () => this.onProfile()),
        ]),
      ];
    }
    this.root.replaceChildren(el('div', { class: `card menu-${view}` }, body.filter(Boolean)));
    this.root.classList.add('open');
    this.servers.start();
  }

  hide() { this.root.classList.remove('open'); this.servers.stop(); }
}

export { SERVERS };
