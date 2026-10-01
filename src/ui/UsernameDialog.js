import { el } from './dom.js';

const VALID = /^[\p{L}\p{N}_ .-]{2,16}$/u;

/** Asks for a username (2–16 letters/digits). Resolves with the name, or null if skipped. */
export class UsernameDialog {
  constructor(host, modes) { this.host = host; this.modes = modes; }

  ask(current = '') {
    return new Promise((resolve) => {
      const pop = this.modes.push('overlay');
      const input = el('input', { attrs: { type: 'text', maxlength: '16', placeholder: 'ör. Ahmet_10', autocomplete: 'off', 'aria-label': 'Kullanıcı adı' } });
      input.value = current;
      const err = el('p', { class: 'fb bad' });
      const ok = el('button', { class: 'btn', text: 'Meydana gir', attrs: { type: 'submit' } });
      const skip = el('button', { class: 'btn alt', text: 'Tek başıma gez', attrs: { type: 'button' } });
      const form = el('form', { class: 'card' }, [
        el('p', { class: 'chap', text: 'Çok oyunculu köy meydanı' }),
        el('h2', { class: 'ctitle', text: 'Adın ne?' }),
        el('p', { class: 'cen en-t', text: 'Choose a username. Other players will see it.' }),
        el('div', { class: 'free' }, [input]), err, ok, skip,
      ]);
      const root = el('div', { class: 'overlay open dim' }, [form]);
      const done = (v) => { root.remove(); pop(); resolve(v); };
      form.addEventListener('submit', (e) => {
        e.preventDefault();
        const v = input.value.trim();
        if (!VALID.test(v)) { err.textContent = 'En az 2, en fazla 16 harf veya rakam yaz.'; return; }
        done(v);
      });
      input.addEventListener('keydown', (e) => e.stopPropagation());
      skip.onclick = () => done(null);
      this.host.append(root);
      setTimeout(() => input.focus(), 50);
    });
  }
}
