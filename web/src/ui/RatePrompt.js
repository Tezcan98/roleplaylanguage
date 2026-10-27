import { el, ICONS } from './dom.js';
import { ui, turkishOnly, glossDir } from '../i18n/Gloss.js';
import { canRate, openStore } from '../platform/rate.js';

const AFTER = 90; // seconds of play on your own before it shows
const SHOWN = 15; // seconds on screen
const AFTER_TAP = 2; // times it still shows (on later days) to someone who already went to the store

/**
 * Playing on your own (home, the garden, school — not the square): once a day, after a while, a slim line at the top in the
 * player's own language — "Enjoying the game? Support us with a rating on Google Play" — a tap opens the
 * store (platform/rate.js; no reward). Once tapped (here or the menu's button) it shows twice more on later
 * days, then never again; ✕ puts it away for the day.
 * Ambient system (update every frame).
 */
export class RatePrompt {
  #t = 0;
  #left = 0;

  constructor(host, { settings, modes, alone }) {
    Object.assign(this, { settings, modes, alone });
    this.text = el('bdi', {});
    this.root = el('div', { class: 'rate-prompt', attrs: { hidden: '' } }, [
      el('button', { class: 'rate-go', attrs: { type: 'button' }, on: { click: () => { openStore(this.settings); this.#hide(); } } }, ['⭐ ', this.text]),
      el('button', { class: 'rate-x', html: ICONS.close, attrs: { type: 'button', 'aria-label': 'Kapat' }, on: { click: () => this.#hide() } }),
    ]);
    host.append(this.root);
  }

  #today() { return new Date().toISOString().slice(0, 10); }

  #hide() { this.root.hidden = true; this.#left = 0; }

  update(dt) {
    if (this.#left > 0) { if ((this.#left -= dt) <= 0 || !this.modes.is('play')) this.#hide(); return; }
    const tapped = this.settings.get('rateTapped', false), again = this.settings.get('rateAfterTap', 0);
    if (!canRate() || (tapped && again >= AFTER_TAP) || this.settings.get('rateAsked') === this.#today()) return;
    if (!this.alone() || !this.modes.is('play')) return;
    if ((this.#t += dt) < AFTER) return;
    this.#t = 0;
    this.settings.set('rateAsked', this.#today());
    if (tapped) this.settings.set('rateAfterTap', again + 1);
    this.text.textContent = ui('Oyunu sevdiysen Play Store’da puan vererek bize destek ol', 'Enjoying the game? Support us with a rating on Google Play');
    this.text.dir = turkishOnly() ? 'ltr' : glossDir(); // (Arabic, Urdu: right to left, "Google Play" in its place)
    this.root.hidden = false;
    this.#left = SHOWN;
  }
}
