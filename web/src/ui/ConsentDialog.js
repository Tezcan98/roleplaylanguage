import { el } from './dom.js';
import { gloss } from '../i18n/Gloss.js';

/** Raised when what is kept or how it is used changes: everyone is asked again. */
export const CONSENT_VERSION = 2; // 2: push-to-talk voice is kept too
export const PRIVACY_URL = 'https://github.com/Tezcan98/roleplaylanguage/blob/main/docs/store/privacy-policy.md';

/**
 * Before the first time in the multiplayer square: what is recorded and how it may be used, and
 * the player agrees (a tick, then "Kabul et") or not. `ask()` resolves true / false.
 */
export class ConsentDialog {
  constructor(host, modes) { Object.assign(this, { host, modes }); }

  ask() {
    return new Promise((resolve) => {
      const pop = this.modes.push('overlay');
      const tick = el('input', { attrs: { type: 'checkbox' } });
      const yes = el('button', { class: 'btn', text: 'Kabul et ve gir', attrs: { type: 'button', disabled: '' } });
      const no = el('button', { class: 'btn alt', text: 'Kabul etmiyorum', attrs: { type: 'button' } });
      tick.addEventListener('change', () => { yes.disabled = !tick.checked; });
      const item = (tr, en) => el('li', {}, [el('span', { text: tr }), el('small', { class: 'en-t', text: en })]);
      const root = el('div', { class: 'overlay open dim' }, [el('div', { class: 'card consent' }, [
        el('p', { class: 'chap', text: 'Köy meydanı · gerçek oyuncular' }),
        el('h2', { class: 'ctitle', text: 'Girmeden önce' }),
        el('p', { class: 'cen en-t', text: gloss('Before you go in') }),
        el('ul', {}, [
          item('Meydanda yazdıkların şifreli olarak 90 gün saklanır.', gloss('What you write in the square is kept encrypted for 90 days.')),
          item('Sesli sohbette ve bas-konuş ile konuşurken sesin şifreli olarak 48 saat saklanır.', gloss('Your voice in voice chats and push-to-talk is kept encrypted for 48 hours.')),
          item('Biri seni şikayet ederse son 10 dakikada söylediklerin yapay zekâyla (Google Gemini) yazıya dökülüp incelenir; bir yetkili bakar ve gerekirse seni meydandan engeller.', gloss('If someone reports you, what you said in the last 10 minutes is transcribed and checked by AI (Google Gemini); a moderator looks at it and may ban you from the square.')),
          item('Bu kayıtlar yalnızca oyuncuları korumak için ve yasal bir talep olursa yetkililere verilmek için kullanılır.', gloss('These records are used only to keep players safe, and given to the authorities if the law asks for them.')),
        ]),
        el('p', { class: 'note' }, [
          '18 yaşından küçüksen bunu anne-babanla birlikte oku. Ayrıntılar: ',
          el('a', { text: 'Gizlilik politikası', attrs: { href: PRIVACY_URL, target: '_blank', rel: 'noopener' } }),
        ]),
        el('label', { class: 'consent-tick' }, [tick, el('span', { text: 'Okudum, kayıt tutulmasını ve bu şekilde işlenmesini kabul ediyorum.' })]),
        yes, no,
      ])]);
      const done = (v) => { root.remove(); pop(); resolve(v); };
      yes.onclick = () => done(true);
      no.onclick = () => done(false);
      this.host.append(root);
    });
  }
}
