import { el } from './dom.js';
import { canRate, openStore } from '../platform/rate.js';
import { fromIndia } from '../i18n/Region.js';

/**
 * A card once, for a player from India who already had the game: Hindi is in the game now — switch to it, and a rating on
 * Google Play helps us go on (no reward for it, and no number asked for: Google Play forbids both). Hindi and English
 * together, whatever language is chosen. Not for new players (they pick their language first, Hindi in front for them).
 */
export class HindiNews {
  constructor(host, { settings, modes, currentLang }) { Object.assign(this, { host, settings, modes, currentLang }); }

  /** Shows it when it is due; `onDone` after it closes (or at once when it is not due). */
  maybe() {
    if (this.settings.get('hindiNews', false) || !fromIndia()) return;
    this.settings.set('hindiNews', true);
    const pop = this.modes.push('overlay');
    const close = () => { root.remove(); pop(); };
    const hindi = this.currentLang() === 'hi';
    const text = (s, dir = 'ltr') => el('p', { class: 'ctext', text: s, attrs: { lang: dir === 'ltr' ? 'en' : 'hi' } });
    const root = el('div', { class: 'overlay open dim' }, [el('div', { class: 'card' }, [
      el('h2', { class: 'ctitle', text: 'हिन्दी आ गई! 🇮🇳' }),
      text(hindi ? 'अब खेल पूरा हिन्दी में है। अगर खेल पसंद आए, तो Google Play पर रेटिंग देकर हमारा साथ दीजिए। ⭐' : 'अब खेल हिन्दी में भी खेला जा सकता है। अगर खेल पसंद आए, तो Google Play पर रेटिंग देकर हमारा साथ दीजिए। ⭐', 'hi'),
      el('p', { class: 'cen en-t', text: 'Hindi is now in the game. If you like it, support us with a rating on Google Play.' }),
      ...(hindi ? [] : [el('button', { class: 'btn', text: 'हिन्दी में खेलें · Play in Hindi', attrs: { type: 'button' }, on: { click: () => { this.settings.set('glossLang', 'hi'); location.reload(); } } })]),
      ...(canRate() ? [el('button', { class: `btn${hindi ? '' : ' alt'}`, text: '⭐ रेटिंग दें · Rate us', attrs: { type: 'button' }, on: { click: () => { openStore(this.settings); close(); } } })] : []),
      el('button', { class: 'btn alt', text: 'बाद में · Later', attrs: { type: 'button' }, on: { click: close } }),
    ])]);
    this.host.append(root);
  }
}
