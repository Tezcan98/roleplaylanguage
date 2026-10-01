import { el } from './dom.js';
import { gloss, glossInfo } from '../i18n/Gloss.js';
import { ServerPicker, SERVERS } from './ServerPicker.js';
import { PLAYER_NAMES, characterOf } from './CharacterSetup.js';

/**
 * Title screen: the character (with "change"), the story (continue / new game), the online
 * village square (server with live player counts) and display settings.
 * It is shown again when the player leaves the online square.
 */
export class MainMenu {
  constructor(host, { settings, villageServer, hasSave, onStart, onContinue, onSquare, onHelp, onProfile }) {
    Object.assign(this, { host, settings, hasSave, onStart, onContinue, onSquare, onHelp, onProfile });
    this.servers = new ServerPicker({ villageServer, value: settings.get('serverRegion', 'ankara'), onChange: (id) => settings.set('serverRegion', id) });
    this.root = el('div', { class: 'overlay main-menu' });
    document.addEventListener('fullscreenchange', () => { if (this.root.classList.contains('open')) this.show(); });
    host.append(this.root);
    this.show();
  }

  show() {
    const s = this.settings;
    const save = this.hasSave();
    const gender = s.get('gender', 'boy');
    const lang = glossInfo().name;
    this.servers.value = s.get('serverRegion', 'ankara');

    const help = el('ul', { class: 'help', style: { display: 'none' } }, [
      'Joystick veya WASD ile yürü.', 'Parlayan oku takip et: görevin orada.', 'Konuş, görev al, eşya topla, teslim et.',
      'Doğru cevabı seç (1-4 tuşları da çalışır).', 'Mikrofon görünce bas ve Türkçe söyle.', 'Hoparlöre basınca karakter konuşur.',
    ].map((t) => el('li', { text: t })));
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
    const btn = (text, cls, fn) => el('button', { class: cls, text, attrs: { type: 'button' }, on: { click: fn } });
    const go = (fn) => () => { this.hide(); fn(); };

    // full screen: Android / desktop browsers can do it; on iPhone the game must be added to the home screen
    const canFull = !!document.documentElement.requestFullscreen && !document.fullscreenElement;
    const ios = /iPhone|iPad|iPod/.test(navigator.userAgent) && !matchMedia('(display-mode: fullscreen), (display-mode: standalone)').matches;
    this.root.replaceChildren(el('div', { class: 'card' }, [
      canFull && btn('⛶ Tam ekran', 'chipbtn fs-btn', () => document.documentElement.requestFullscreen({ navigationUI: 'hide' }).then(() => screen.orientation?.lock?.('landscape')).catch(() => {}).finally(() => this.show())),
      el('h1', { class: 'big', text: 'Yılmaz Ailesi' }),
      ios && el('p', { class: 'fs-tip', text: `Tam ekran için: Paylaş ⬆️ → Ana Ekrana Ekle · ${gloss('For full screen: Share → Add to Home Screen')}` }),
      el('p', { class: 'sub', text: 'Köyde yaşa, Türkçe öğren.' }),
      el('div', { class: 'profile-line' }, [
        el('span', { text: `${characterOf(gender, s.get('look', ''))[2]} ${characterOf(gender, s.get('look', ''))[3]} · ${lang}${s.get('username') ? ` · @${s.get('username')}` : ''}` }),
        btn('Değiştir', 'chipbtn', () => this.onProfile()),
      ]),
      el('div', { class: 'menu-cols' }, [
        el('div', { class: 'menu-col' }, [
          save && btn('Devam et', 'btn', go(this.onContinue)),
          btn(save ? 'Yeni oyun' : 'Hikayeye başla', save ? 'btn alt' : 'btn', go(this.onStart)),
          btn('Nasıl oynanır?', 'btn alt', () => { if (this.onHelp) this.onHelp(); else help.style.display = help.style.display === 'block' ? 'none' : 'block'; }),
          help,
          el('label', { class: 'toggle' }, [voice, el('span', { text: 'Doğal Türkçe sesler (Piper)' })]),
          el('label', { class: 'toggle' }, [el('span', { text: 'Görüntü kalitesi:' }), quality]),
        ]),
        el('div', { class: 'menu-square' }, [
          el('p', { class: 'chap', text: 'Köy meydanı · çok oyunculu' }),
          el('p', { class: 'cen en-t', text: gloss('Village square · play online with others') }),
          btn('Meydana gir', 'btn', go(() => this.onSquare(this.servers.value))),
          this.servers.root,
        ]),
      ]),
    ]));
    this.root.classList.add('open');
    this.servers.start();
  }

  hide() { this.root.classList.remove('open'); this.servers.stop(); }
}

export { SERVERS };
