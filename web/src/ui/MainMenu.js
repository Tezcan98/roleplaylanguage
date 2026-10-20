import { CONFIG } from '../config/remote.js';
import { el } from './dom.js';
import { gloss, glossInfo } from '../i18n/Gloss.js';
import { ServerPicker, SERVERS } from './ServerPicker.js';
import { characterPicture } from './CharacterSetup.js';
import { fullscreenPossible, goFullscreen, fullscreenIcon, canInstall, installApp } from './Landscape.js';
import { COIN_HTML } from './coin.js';


/**
 * Title screen, kept simple: one "▶ Hikayeye başla" (no separate way into the square). The game is one world — a new game starts in the park
 * in the village square, among the other players, and the story goes on from there (a saved game
 * goes on where it was). How many are in the squares right now is shown underneath; the settings
 * (new game, how to play, voices, picture quality) open only when asked for.
 */
/** How often the main menu shows a banner ad (when it opens). */
const HOME_BANNER = CONFIG.ads.menuBannerChance; // (set on the server: config/remote.js)

export class MainMenu {
  #view = 'home'; // home | settings
  #homeAd = false; // this time the main menu carries a banner (HOME_BANNER of the times it opens)

  constructor(host, { settings, villageServer, hasSave, onStart, onContinue, onHelp, onProfile, onShop, onStartAt, onBanner, chapters = [] }) {
    Object.assign(this, { host, settings, hasSave, onStart, onContinue, onHelp, onProfile, onShop, onStartAt, onBanner, chapters });
    this.servers = new ServerPicker({ villageServer, value: settings.get('serverRegion', 'ankara'), onChange: (id) => { settings.set('serverRegion', id); settings.set('serverPicked', true); } }); // (picked by hand: kept even when busy)
    this.servers.onUpdate = () => this.#where && (this.#where.textContent = this.#whereText());
    this.root = el('div', { class: 'overlay main-menu' });
    document.addEventListener('fullscreenchange', () => { if (this.root.classList.contains('open')) this.show(this.#view); });
    host.append(this.root);
    addEventListener('game-installable', () => { if (this.root.classList.contains('open') && this.#view === 'home') this.show(); });
    this.show();
  }

  #where = null;
  #whereText() {
    const n = SERVERS.reduce((sum, [id]) => sum + this.servers.count(id), 0);
    return n ? `🏘️ Meydanlarda şu an ${n} kişi var` : '🏘️ Meydanda başka oyuncularla buluşursun';
  }

  #taps = [];
  /** Five quick taps on the settings title: the testers' chapter picker on / off. */
  #testerTap() {
    const now = performance.now();
    this.#taps = [...this.#taps.filter((t) => now - t < 2500), now];
    if (this.#taps.length >= 5 && this.onStartAt) { this.#taps = []; this.settings.set('testerMode', !this.settings.get('testerMode', false)); this.show('settings'); }
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
    if (!this.isOpen) { // decided as the menu opens: always the very first time (a new player shows up in AdMob), then now and then
      const first = view === 'home' && !this.settings.get('firstBannerSeen', false);
      this.#homeAd = first || Math.random() < HOME_BANNER;
      if (first && this.settings.get('profileDone', false)) this.settings.set('firstBannerSeen', true); // (after the character setup: the menu is really seen)
    }
    this.onBanner?.(view === 'home' && this.#homeAd); // the main menu carries a banner ad now and then
    const s = this.settings;
    const save = this.hasSave();
    this.servers.value = s.get('serverRegion', 'ankara');
    const btn = (text, cls, fn, attrs = {}) => el('button', { class: cls, text, attrs: { type: 'button', ...attrs }, on: { click: fn } });
    const go = (fn) => () => { this.hide(); fn(); };
    const back = btn('← Geri', 'chipbtn menu-back', () => this.show('home'));
    let body;

    if (view === 'settings') {
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
        el('h2', { class: 'ctitle', text: '⚙️ Ayarlar', on: { click: () => this.#testerTap() } }),
        // start the story from any day (testers only: five taps on the title, as in the game's ⚙️)
        this.onStartAt && s.get('testerMode', false) && this.#chapterPicker(go),
        btn('Nasıl oynanır?', 'btn alt', () => this.onHelp?.()),
        save && btn('Yeni oyun (baştan başla)', 'btn alt', go(this.onStart)),
        el('label', { class: 'toggle' }, [voice, el('span', { text: 'Doğal Türkçe sesler' })]),
        el('label', { class: 'toggle' }, [el('span', { text: 'Görüntü kalitesi:' }), quality]),
      ];
    } else {
      const pic = characterPicture(s.get('gender', 'boy'), s.get('look', ''));
      this.#where = el('span', { text: this.#whereText() });
      body = [
        el('div', { class: 'menu-top' }, [
          fullscreenPossible() && el('button', { class: 'iconbtn light', html: fullscreenIcon(), attrs: { type: 'button', 'aria-label': 'Tam ekran', title: 'Tam ekran' }, on: { click: () => goFullscreen().finally(() => this.show()) } }), // iPhone: the home-screen guide
          el('button', { class: 'iconbtn light', html: COIN_HTML, attrs: { type: 'button', 'aria-label': 'Dükkan', title: 'Dükkan · krediler' }, on: { click: () => this.onShop?.() } }),
          btn('⚙️', 'iconbtn light', () => this.show('settings'), { 'aria-label': 'Ayarlar', title: 'Ayarlar' }),
        ]),
        el('h1', { class: 'big', text: 'Türk Ailem' }),
        el('p', { class: 'brand-meaning en-t', text: gloss('My Turkish Family') }), // the name in the player's own language (Türk + aile + -m)
        el('p', { class: 'sub', text: 'Köyde yaşa, Türkçe öğren.' }),
        btn(save ? '▶ Devam et' : '▶ Hikayeye başla', 'btn menu-main', go(save ? this.onContinue : this.onStart)),
        el('p', { class: 'menu-where' }, [this.#where]),
        canInstall() && el('button', { class: 'btn alt menu-install', text: '📲 Uygulama olarak yükle (hep tam ekran)', attrs: { type: 'button' }, on: { click: () => installApp().finally(() => this.show()) } }),
        el('div', { class: 'profile-line' }, [
          el('span', { class: 'profile-who' }, [el('img', { class: 'profile-pic', attrs: { src: pic, alt: '' } }), `${glossInfo().name}${s.get('username') ? ` · @${s.get('username')}` : ''}`]),
          btn('Değiştir', 'chipbtn', () => this.onProfile()),
        ]),
      ];
    }
    this.root.replaceChildren(el('div', { class: `card menu-${view}` }, body.filter(Boolean)));
    this.root.classList.add('open');
    this.servers.start();
  }

  get isOpen() { return this.root.classList.contains('open'); }

  hide() { this.root.classList.remove('open'); this.servers.stop(); this.onBanner?.(false); }
}

export { SERVERS };
