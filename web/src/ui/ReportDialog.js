import { el } from './dom.js';
import { gloss, withGloss } from '../i18n/Gloss.js';

/** Why a player is reported (sent to the server as `id`). */
export const REPORT_REASONS = [
  { id: 'ahlaksiz', tr: 'Küfür, kötü ya da ayıp söz', en: 'Swearing, rude or indecent words' },
  { id: 'ticari', tr: 'Reklam, satış, link, para isteme', en: 'Ads, selling, links, asking for money' },
  { id: 'rahatsiz', tr: 'Rahatsız ediyor, zorbalık', en: 'Harassment, bullying' },
  { id: 'diger', tr: 'Başka bir şey', en: 'Something else' },
];

/**
 * "Şikayet et": pick the player (nearest first), then why. What they said in the last ten
 * minutes — text and voice — is checked on the server; the player is not told who reported them.
 */
export class ReportDialog {
  constructor(host, modes) { this.host = host; this.modes = modes; }

  /**
   * @param {{ id: string, name: string, note?: string }[]} players  nearest first
   * @returns {Promise<{ id: string, name: string, reason: string } | null>}
   */
  ask(players) {
    return new Promise((resolve) => {
      const pop = this.modes.push('overlay');
      const body = el('div', { class: 'report-list' });
      const title = el('h2', { class: 'ctitle', text: withGloss('Kimi şikayet ediyorsun?', 'Who are you reporting?') });
      const en = el('p', { class: 'cen en-t', text: gloss('Who are you reporting?') });
      const cancel = el('button', { class: 'linkbtn', text: withGloss('Vazgeç', 'Cancel'), attrs: { type: 'button' } });
      const root = el('div', { class: 'overlay open dim' }, [el('div', { class: 'card report' }, [
        el('p', { class: 'chap', text: withGloss('🚩 Şikayet et', '🚩 Report') }), title, en, body,
        el('p', { class: 'note', text: 'Son 10 dakikada yazdıkları ve sesli söyledikleri incelenir. Kimin şikayet ettiği söylenmez.' }),
        cancel,
      ])]);
      const done = (v) => { root.remove(); pop(); resolve(v); };
      cancel.onclick = () => done(null);
      const reasons = (p) => {
        title.textContent = `${p.name} neden?`;
        en.textContent = gloss('Why?');
        body.replaceChildren(...REPORT_REASONS.map((r) => el('button', { class: 'btn alt sm', attrs: { type: 'button' }, on: { click: () => done({ id: p.id, name: p.name, reason: r.id }) } }, [
          el('span', { text: r.tr }), el('small', { class: 'en-t', text: ` · ${gloss(r.en)}` }),
        ])));
      };
      body.replaceChildren(...players.map((p) => el('button', { class: 'btn alt sm', attrs: { type: 'button' }, on: { click: () => reasons(p) } }, [
        el('span', { text: p.name }), ...(p.note ? [el('small', { text: ` · ${p.note}` })] : []),
      ])));
      if (players.length === 1) reasons(players[0]);
      this.host.append(root);
    });
  }
}
