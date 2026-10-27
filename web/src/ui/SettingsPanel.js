import { el, ICONS } from './dom.js';
import { gloss } from '../i18n/Gloss.js';

/** Line icons (the same stroke as the close and speaker ones). */
const icon = (paths) => `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${paths}</svg>`;
const I = {
  sound: icon('<path d="M4 9h4l5-4v14l-5-4H4z"/><path d="M16.5 9a4 4 0 0 1 0 6"/>'),
  voices: icon('<path d="M20 11.5a7.5 7.5 0 0 1-11 6.6L4 19.5l1.4-4.6A7.5 7.5 0 1 1 20 11.5z"/>'),
  music: icon('<path d="M9 18V6l11-2v12"/><circle cx="6.5" cy="18" r="2.5"/><circle cx="17.5" cy="16" r="2.5"/>'),
  speed: icon('<path d="M12 21a9 9 0 1 1 9-9"/><path d="M12 12l4-4"/><circle cx="12" cy="12" r="1.2"/>'),
  picture: icon('<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 16l5-5 4 4 3-3 6 6"/>'),
  help: icon('<circle cx="12" cy="12" r="9"/><path d="M9.6 9.4a2.5 2.5 0 1 1 3.4 2.4c-.6.3-1 .9-1 1.6v.4"/><path d="M12 17.2h.01"/>'),
  user: icon('<circle cx="12" cy="8" r="4"/><path d="M4 20c1.5-4 4.5-6 8-6s6.5 2 8 6"/>'),
  square: icon('<path d="M12 21s-6.5-5.6-6.5-11a6.5 6.5 0 0 1 13 0c0 5.4-6.5 11-6.5 11z"/><circle cx="12" cy="10" r="2.3"/>'),
  feedback: icon('<path d="M4 5h16v11H9l-5 4z"/><path d="M8 9h8M8 12.5h5"/>'),
  home: icon('<path d="M4 11.5 12 4l8 7.5"/><path d="M6.5 10v10h11V10"/>'),
};
const QUALITY = [['low', 'Düşük'], ['medium', 'Orta'], ['high', 'Yüksek']];
/** Frames a second at most (settings 'fps'): fewer keep a phone cool and the battery longer. */
export const FPS = [['30', '30'], ['60', '60'], ['max', 'Sınırsız']];
/** Unlimited for everyone (30 on phones looked like the game was stuttering); 30 / 60 only by choice. */
export const defaultFps = () => 'max';

/**
 * In-game settings (⚙️ in the HUD), one compact card: the three sound levels, the picture quality,
 * and small tiles — how to play, write your opinion (credits), the username, the city square, back to the main menu (the game
 * is saved first; "Devam et" goes on from there). ✕ or a tap outside closes it.
 * Testers: five taps on the title show "Bölüm seç" (a new game from any chapter).
 */
export class SettingsPanel {
  #pop = null;
  #taps = [];

  constructor(host, { modes, settings, confirmQuality = async () => true, onHelp, onMenu, onSound, onFeedback = null, onRename = null, onRooms = null, room = () => '', onStartAt = null, chapters = [], onFps = null }) {
    Object.assign(this, { modes, settings, confirmQuality, onHelp, onMenu, onSound, onFeedback, onRename, onRooms, room, onStartAt, chapters, onFps });
    this.body = el('div', { class: 'settings-body' });
    const title = el('h2', { class: 'set-title', text: 'Ayarlar', on: { click: () => this.#tap() } });
    this.root = el('div', { class: 'overlay dim settings-panel' }, [el('div', { class: 'card' }, [
      el('div', { class: 'set-head' }, [
        el('div', {}, [title, el('small', { class: 'en-t', text: gloss('Settings') })]),
        el('button', { class: 'iconbtn light', html: ICONS.close, attrs: { type: 'button', 'aria-label': 'Kapat' }, on: { click: () => this.close() } }),
      ]),
      this.body,
    ])]);
    this.root.addEventListener('click', (e) => { if (e.target === this.root) this.close(); }); // a tap outside the card closes it
    host.append(this.root);
  }

  get isOpen() { return this.root.classList.contains('open'); }

  open() {
    if (!this.#pop) this.#pop = this.modes.push('overlay');
    this.root.classList.add('open');
    this.render();
  }

  close() { this.root.classList.remove('open'); this.#pop?.(); this.#pop = null; }

  /** Five quick taps on the title: the testers' chapter picker. */
  #tap() {
    const now = performance.now();
    this.#taps = [...this.#taps.filter((t) => now - t < 2500), now];
    if (this.#taps.length >= 5 && this.onStartAt) { this.#taps = []; this.settings.set('testerMode', !this.settings.get('testerMode', false)); this.render(); }
  }

  /** Test mode: the chapters (day · time · title) and "a new game from here". */
  #chapterPicker() {
    const pick = el('select', { attrs: { id: 'set-testChapter' } }, this.chapters.map((c) => el('option', { text: c.text, attrs: { value: String(c.i) } })));
    return el('div', { class: 'test-start' }, [
      el('b', { text: 'Test: bölümden başla' }),
      pick,
      el('button', { class: 'btn sm', text: 'Bu bölümden yeni oyun', attrs: { type: 'button' }, on: { click: () => { this.close(); this.onStartAt(Number(pick.value)); } } }),
    ]);
  }

  render() {
    const s = this.settings;
    // sound levels: sliders, 0–100 % (stored 0–1; older saves had on/off switches); the track fills up to the thumb
    const slider = (key, ico, text, en) => {
      const stored = s.get(`${key}Vol`), now = typeof stored === 'number' ? stored : s.get(`${key}On`, true) ? 1 : 0;
      const value = el('b', { class: 'vol-val' });
      const range = el('input', { attrs: { type: 'range', min: '0', max: '100', step: '5', value: String(Math.round(now * 100)), id: `set-${key}`, 'aria-label': text } });
      const paint = () => { value.textContent = `%${range.value}`; range.style.setProperty('--p', `${range.value}%`); range.closest?.('.vol')?.classList.toggle('off', range.value === '0'); };
      range.addEventListener('input', () => { const v = Number(range.value) / 100; s.set(`${key}Vol`, v); paint(); this.onSound?.(key, v); });
      const row = el('label', { class: 'vol' }, [el('span', { class: 'set-ico', html: ico }), el('span', { class: 'vol-name', text, attrs: { title: gloss(en) } }), range, value]); // (the icon says it: no meaning line under it, the card stays small)
      paint(); row.classList.toggle('off', range.value === '0');
      return row;
    };
    // frames a second: right away (no restart); 30 keeps a phone cool
    const fpsNow = s.get('fps', defaultFps());
    const fps = el('div', { class: 'seg', attrs: { role: 'radiogroup', 'aria-label': 'Kare hızı (saniyede)' } }, FPS.map(([id, name]) => el('button', {
      class: `seg-btn${id === fpsNow ? ' on' : ''}`, text: name, attrs: { type: 'button', role: 'radio', 'aria-checked': String(id === fpsNow), 'data-fps': id, title: id === '30' ? 'Telefon daha az ısınır, pil daha uzun gider' : '' },
      on: { click: () => { s.set('fps', id); this.onFps?.(id); [...fps.children].forEach((b) => { const on = b.dataset.fps === id; b.classList.toggle('on', on); b.setAttribute('aria-checked', String(on)); }); } },
    })));
    // picture quality: three choices side by side (takes effect on a fresh start: saved, reloaded, and on where you were)
    const q = s.get('quality', 'medium');
    const quality = el('div', { class: 'seg', attrs: { role: 'radiogroup', 'aria-label': 'Görüntü kalitesi' } }, QUALITY.map(([id, name]) => el('button', {
      class: `seg-btn${id === q ? ' on' : ''}`, text: name, attrs: { type: 'button', role: 'radio', 'aria-checked': String(id === q), 'data-quality': id },
      on: { click: async () => { if (id === q) return; if (id !== 'low' && !(await this.confirmQuality())) return; s.set('quality', id); this.onMenu({ resume: true }); } }, // medium / high: "Emin misin?" first
    })));
    const tile = (ico, text, sub, fn) => el('button', { class: 'set-tile', attrs: { type: 'button' }, on: { click: () => { this.close(); fn(); } } }, [
      el('span', { class: 'set-ico', html: ico }), el('b', { text }), sub ? el('small', { text: sub }) : null,
    ].filter(Boolean));
    this.body.replaceChildren(...[
      s.get('testerMode', false) && this.onStartAt ? this.#chapterPicker() : null,
      el('div', { class: 'set-group' }, [
        slider('sound', I.sound, 'Ses', 'Sound (all of it)'),
        slider('voices', I.voices, 'Karakterler', 'Characters speak out loud'),
        slider('music', I.music, 'Müzik', 'Music'),
      ]),
      el('div', { class: 'set-group set-row' }, [el('span', { class: 'set-ico', html: I.picture }), el('span', { class: 'vol-name', text: 'Görüntü' }), quality]),
      el('div', { class: 'set-group set-row' }, [el('span', { class: 'set-ico', html: I.speed }), el('span', { class: 'vol-name', text: 'Kare hızı' }), fps]),
      el('div', { class: 'set-tiles' }, [
        tile(I.help, 'Nasıl oynanır', '', () => this.onHelp?.()),
        this.onFeedback && tile(I.feedback, 'Yorum yaz', '+20 kredi', () => this.onFeedback()),
        this.onRename && tile(I.user, 'Kullanıcı adı', `@${s.get('username') || '—'}`, () => this.onRename()),
        this.onRooms && tile(I.square, 'Köy meydanı', this.room(), () => this.onRooms()), // another city's square
        tile(I.home, 'Ana menü', '', () => this.onMenu()),
      ].filter(Boolean)),
    ].filter(Boolean));
  }
}
