import { el } from './dom.js';
import { gloss } from '../i18n/Gloss.js';

/**
 * In-game settings (⚙️ in the HUD): voices and music on / off, picture quality, how to play,
 * and back to the main menu (the game is saved first; "Devam et" goes on from there).
 * "🧪 Bölüm seç": a new game from any chapter (testing; as in the main menu's settings).
 */
export class SettingsPanel {
  #pop = null;

  constructor(host, { modes, settings, onHelp, onMenu, onSound, onStartAt = null, chapters = [] }) {
    Object.assign(this, { modes, settings, onHelp, onMenu, onSound, onStartAt, chapters });
    this.body = el('div', { class: 'settings-body' });
    this.root = el('div', { class: 'overlay dim settings-panel' }, [el('div', { class: 'card' }, [
      el('h2', { class: 'ctitle', text: '⚙️ Ayarlar' }),
      el('p', { class: 'cen en-t', text: gloss('Settings') }),
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

  /** Test mode: the chapters (day · time · title) and "a new game from here". */
  #chapterPicker() {
    const pick = el('select', { attrs: { id: 'set-testChapter' } }, this.chapters.map((c) => el('option', { text: c.text, attrs: { value: String(c.i) } })));
    return el('div', { class: 'test-start' }, [
      el('b', { text: '🧪 Test: bölümden başla' }),
      pick,
      el('button', { class: 'btn sm', text: 'Bu bölümden yeni oyun', attrs: { type: 'button' }, on: { click: () => { this.close(); this.onStartAt(Number(pick.value)); } } }),
    ]);
  }

  render() {
    const s = this.settings;
    // sound levels: sliders, 0–100 % (stored 0–1); older saves had on/off switches
    const slider = (key, text, en) => {
      const stored = s.get(`${key}Vol`), now = typeof stored === 'number' ? stored : s.get(`${key}On`, true) ? 1 : 0;
      const value = el('b', { class: 'vol-val', text: `%${Math.round(now * 100)}` });
      const range = el('input', { attrs: { type: 'range', min: '0', max: '100', step: '5', value: String(Math.round(now * 100)), id: `set-${key}`, 'aria-label': text } });
      range.addEventListener('input', () => { const v = Number(range.value) / 100; s.set(`${key}Vol`, v); value.textContent = `%${range.value}`; this.onSound?.(key, v); });
      return el('label', { class: 'vol' }, [el('span', {}, [text, el('small', { class: 'en-t', text: ` · ${gloss(en)}` })]), range, value]);
    };
    const quality = el('select', { attrs: { id: 'set-quality' } }, [
      el('option', { text: 'Yüksek', attrs: { value: 'high' } }),
      el('option', { text: 'Orta', attrs: { value: 'medium' } }),
      el('option', { text: 'Düşük (telefon)', attrs: { value: 'low' } }),
    ]);
    quality.value = s.get('quality', 'medium');
    quality.addEventListener('change', () => { s.set('quality', quality.value); this.onMenu({ resume: true }); }); // takes effect on a fresh start: saved, reloaded, and on where you were
    const btn = (text, cls, fn) => el('button', { class: cls, text, attrs: { type: 'button' }, on: { click: fn } });
    this.body.replaceChildren(
      // start the story from any day (testing): a button, the list opens in its place
      this.onStartAt && (s.get('testerMode', false) ? this.#chapterPicker() : btn('🧪 Bölüm seç (gün seç)', 'btn alt', () => { s.set('testerMode', true); this.render(); })),
      slider('sound', '🔊 Ses', 'Sound (all of it)'),
      slider('voices', 'Karakter sesleri', 'Characters speak out loud'),
      slider('music', 'Müzik', 'Music'),
      el('label', { class: 'toggle' }, [el('span', { text: 'Görüntü kalitesi:' }), quality]),
      btn('Nasıl oynanır?', 'btn alt', () => { this.close(); this.onHelp?.(); }),
      btn('Ana menüye dön', 'btn alt', () => { this.close(); this.onMenu(); }),
      btn('Oyuna dön', 'btn', () => this.close()),
    );
  }
}
