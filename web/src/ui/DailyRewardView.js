import { el } from './dom.js';
import { gloss } from '../i18n/Gloss.js';
import { DAILY } from '../services/monetization/CreditWallet.js';

/** "Günlük ödül": the 7-day strip (today lit), and a button to take today's credits — or, with a rewarded video, twice as many. */
export class DailyRewardView {
  constructor(host, modes) { Object.assign(this, { host, modes }); }

  /**
   * @param {{ day: number, amount: number }} d  @param {{ double?: () => Promise<boolean> }} o — `double`: a rewarded video; true when watched
   * @returns {Promise<boolean>} when taken: true for twice as many (the video was watched)
   */
  show(d, { double = null } = {}) {
    return new Promise((resolve) => {
      const pop = this.modes.push('overlay');
      const today = Math.min(d.day, DAILY.length);
      const strip = el('div', { class: 'daily-strip' }, DAILY.map((n, i) => el('div', { class: `daily-day${i + 1 < today ? ' done' : ''}${i + 1 === today ? ' today' : ''}` }, [
        el('small', { text: `${i + 1}. gün` }), el('b', { text: `+${n}` }),
      ])));
      const root = el('div', { class: 'overlay open dim daily' }, [el('div', { class: 'card' }, [
        el('h2', { class: 'ctitle', text: '🎁 Günlük ödül' }),
        el('p', { class: 'ctext', text: d.day > 1 ? `${d.day} gündür her gün geliyorsun. Aferin!` : 'Hoş geldin! Her gün gelirsen ödül büyür.' }),
        el('p', { class: 'cen en-t', text: gloss('Come every day: the reward grows.') }),
        strip,
        double && el('button', { class: 'btn', text: `📺 Video izle, +${d.amount * 2} kredi al`, attrs: { type: 'button' }, on: { click: async (e) => {
          e.currentTarget.disabled = true;
          const ok = await double();
          root.remove(); pop(); resolve(ok);
        } } }),
        double && el('p', { class: 'cen en-t', text: gloss('Watch a video: twice as many.') }),
        el('button', { class: double ? 'btn alt' : 'btn', text: `+${d.amount} kredi al`, attrs: { type: 'button' }, on: { click: () => { root.remove(); pop(); resolve(false); } } }),
      ].filter(Boolean))]);
      this.host.append(root);
    });
  }
}
