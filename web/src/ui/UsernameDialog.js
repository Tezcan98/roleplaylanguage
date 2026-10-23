import { el } from './dom.js';
import { gloss, withGloss } from '../i18n/Gloss.js';

const VALID = /^[\p{L}\p{N}_ .-]{2,16}$/u;

/**
 * Asks for a username (2–16 letters/digits), unique on the server: `check(name)` resolves true when it
 * is free (or this device's own), 'bad' when it is not allowed, anything else when it is taken. Resolves with the name, or null when cancelled (back to the menu).
 */
/** A button's Turkish words, the meaning under them in the player's language (none in Turkish-only mode). */
const both = ([tr, en]) => { const g = gloss(en); return g ? [tr, el('small', { class: 'btn-gloss en-t', text: g })] : [tr]; };

export class UsernameDialog {
  constructor(host, modes) { this.host = host; this.modes = modes; }

  /**
   * `opts`: { title, ok, skip, chap } — [Turkish, English] pairs for another heading / buttons (changing the name in the
   * settings; keeping the made-up name). Every line is in Turkish with its meaning in the player's language under it.
   * `note`: why it is asked again ([Turkish, English] or plain Turkish).
   */
  ask(current = '', check = null, note = '', { title = ['Adın ne?', "What's your name?"], ok: okText = ['Meydana gir', 'Enter the square'], skip: skipText = ['Vazgeç', 'Cancel'], chap = ['Çok oyunculu köy meydanı', 'Multiplayer village square'] } = {}) {
    return new Promise((resolve) => {
      const pop = this.modes.push('overlay');
      const input = el('input', { attrs: { type: 'text', maxlength: '16', placeholder: withGloss('Kullanıcı adın', 'Username'), autocomplete: 'off', 'aria-label': 'Kullanıcı adı' } });
      input.value = current;
      const err = el('p', { class: 'fb bad', text: Array.isArray(note) ? withGloss(...note) : note });
      const ok = el('button', { class: 'btn', attrs: { type: 'submit' } }, both(okText));
      const skip = el('button', { class: 'btn alt', attrs: { type: 'button' } }, both(skipText));
      const form = el('form', { class: 'card username-card' }, [
        el('p', { class: 'chap', text: withGloss(...chap) }),
        el('h2', { class: 'ctitle', text: title[0] }),
        el('p', { class: 'cen en-t', text: gloss(title[1]) }),
        el('p', { class: 'ctext', text: 'Bir kullanıcı adı seç. Diğer oyuncular bunu görecek.' }),
        el('p', { class: 'cen en-t', text: gloss('Choose a username. Other players will see it.') }),
        el('div', { class: 'free' }, [input]), err, ok, skip,
      ].filter((n) => !(n.classList?.contains('en-t') && !n.textContent)));
      const root = el('div', { class: 'overlay open dim' }, [form]);
      const done = (v) => { root.remove(); pop(); resolve(v); };
      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const v = input.value.trim();
        if (!VALID.test(v)) { err.textContent = withGloss('En az 2, en fazla 16 harf veya rakam yaz.', 'Use 2 to 16 letters or digits.'); return; }
        ok.disabled = true;
        const free = check ? await check(v) : true;
        ok.disabled = false;
        if (free === 'bad') { err.textContent = withGloss(`“${v}” kullanılamaz, başka bir ad dene.`, 'That name is not allowed, try another one.'); input.focus(); return; }
        if (free !== true) { err.textContent = withGloss(`“${v}” alınmış, başka bir ad dene.`, 'That name is taken, try another one.'); input.focus(); return; }
        done(v);
      });
      input.addEventListener('keydown', (e) => e.stopPropagation());
      skip.onclick = () => done(null);
      this.host.append(root);
      setTimeout(() => input.focus(), 50);
    });
  }
}
