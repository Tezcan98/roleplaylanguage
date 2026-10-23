import { el } from './dom.js';
import { gloss, withGloss } from '../i18n/Gloss.js';

const VALID = /^[\p{L}\p{N}_ .-]{2,16}$/u;

/**
 * Asks for a username (2–16 letters/digits), unique on the server: `check(name)` resolves true when it
 * is free (or this device's own). Resolves with the name, or null when cancelled (back to the menu).
 */
export class UsernameDialog {
  constructor(host, modes) { this.host = host; this.modes = modes; }

  /** `opts`: { title, ok } — another heading / button (changing the name from the menu). */
  ask(current = '', check = null, note = '', { title = 'Adın ne?', ok: okText = 'Meydana gir', chap = 'Çok oyunculu köy meydanı' } = {}) {
    return new Promise((resolve) => {
      const pop = this.modes.push('overlay');
      const input = el('input', { attrs: { type: 'text', maxlength: '16', placeholder: 'Kullanıcı adın', autocomplete: 'off', 'aria-label': 'Kullanıcı adı' } });
      input.value = current;
      const err = el('p', { class: 'fb bad', text: note });
      const ok = el('button', { class: 'btn', text: okText, attrs: { type: 'submit' } });
      const skip = el('button', { class: 'btn alt', text: 'Vazgeç', attrs: { type: 'button' } });
      const form = el('form', { class: 'card' }, [
        el('p', { class: 'chap', text: chap }),
        el('h2', { class: 'ctitle', text: title }),
        el('p', { class: 'cen en-t', text: gloss('Choose a username. Other players will see it.') }),
        el('div', { class: 'free' }, [input]), err, ok, skip,
      ]);
      const root = el('div', { class: 'overlay open dim' }, [form]);
      const done = (v) => { root.remove(); pop(); resolve(v); };
      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const v = input.value.trim();
        if (!VALID.test(v)) { err.textContent = 'En az 2, en fazla 16 harf veya rakam yaz.'; return; }
        ok.disabled = true;
        const free = check ? await check(v) : true;
        ok.disabled = false;
        if (!free) { err.textContent = withGloss(`“${v}” alınmış, başka bir ad dene.`, 'That name is taken, try another one.'); input.focus(); return; }
        done(v);
      });
      input.addEventListener('keydown', (e) => e.stopPropagation());
      skip.onclick = () => done(null);
      this.host.append(root);
      setTimeout(() => input.focus(), 50);
    });
  }
}
