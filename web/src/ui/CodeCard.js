import { el } from './dom.js';

/** The hidden "Kod" card (testers, the developer): a box for a code; what it did, or "Geçersiz kod". */
export class CodeCard {
  constructor(host, modes, codes) { Object.assign(this, { host, modes, codes }); }

  open() {
    const pop = this.modes.push('overlay');
    const close = () => { root.remove(); pop(); };
    const input = el('input', { class: 'code-input', attrs: { type: 'text', autocomplete: 'off', autocapitalize: 'characters', spellcheck: 'false', 'aria-label': 'Kod' } });
    const said = el('p', { class: 'ctext code-said' });
    const go = async () => {
      if (!input.value.trim()) return;
      const r = await this.codes.redeem(input.value).catch(() => null); // a line, or { said, close } (a jump to a chapter: the card goes)
      const done = typeof r === 'string' ? r : r?.said ?? null;
      if (r?.close) { close(); return; }
      said.textContent = done ?? 'Geçersiz kod';
      said.classList.toggle('bad', !done);
      if (done) input.value = '';
      input.focus();
    };
    input.addEventListener('keydown', (e) => { e.stopPropagation(); if (e.key === 'Enter') go(); }); // (the game's keys stay out of it)
    const root = el('div', { class: 'overlay open dim' }, [el('div', { class: 'card code-card' }, [
      el('h2', { class: 'ctitle', text: '🔑 Kod' }),
      input, said,
      el('button', { class: 'btn', text: 'Tamam', attrs: { type: 'button' }, on: { click: go } }),
      el('button', { class: 'btn alt', text: 'Kapat', attrs: { type: 'button' }, on: { click: close } }),
    ])]);
    root.addEventListener('click', (e) => { if (e.target === root) close(); });
    this.host.append(root);
    input.focus();
  }
}

/** Hold `node` down for `ms`: `fn()` (the hidden way to the code card; a quick tap still does what it did). */
export function onHold(node, fn, ms = 1500) {
  let timer = null;
  const stop = () => { clearTimeout(timer); timer = null; };
  node.addEventListener('pointerdown', () => { stop(); timer = setTimeout(() => { timer = null; fn(); }, ms); });
  for (const e of ['pointerup', 'pointerleave', 'pointercancel']) node.addEventListener(e, stop);
  node.addEventListener('contextmenu', (e) => e.preventDefault()); // (a long press on a phone)
  return node;
}
