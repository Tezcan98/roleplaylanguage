import { el } from './dom.js';
import { gloss } from '../i18n/Gloss.js';

const MIC = '<svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3"/></svg>';

/**
 * Talk button (also the T key, held): what you say appears as a text bubble. Hold it while you
 * speak and let go, or tap once to start and once more to stop. Where the device can't turn speech into text, the button opens a box to type the
 * sentence instead. Plus the online counter.
 */
export class PushToTalk {
  #placed = '';
  constructor(host, { onChange }) {
    this.onChange = onChange;
    this.on = false;
    this.btn = el('button', { class: 'ptt', html: `${MIC}<span>Bas, konuş (yazı)</span>`, attrs: { type: 'button', 'aria-label': 'Basılı tut ve konuş (T)' } });
    this.status = el('div', { class: 'pill online' });
    this.zone = el('div', { class: 'pill zone-note' });
    this.zone.hidden = true;
    this.root = el('div', { class: 'ptt-wrap' }, [this.zone, this.status, this.btn]);
    this.root.hidden = true;
    host.append(this.root);
    this.input = el('input', { class: 'ptt-input', attrs: { type: 'text', maxlength: '140', placeholder: 'Türkçe yaz…', enterkeyhint: 'send', 'aria-label': 'Mesaj' } });
    this.typeBox = el('form', { class: 'ptt-type' }, [this.input, el('button', { class: 'chipbtn primary', text: 'Gönder', attrs: { type: 'submit' } })]);
    this.typeBox.hidden = true;
    this.root.append(this.typeBox);
    this.typeBox.addEventListener('submit', (e) => { e.preventDefault(); const t = this.input.value.trim(); this.input.value = ''; this.typeBox.hidden = true; if (t) this.onType?.(t); });
    this.input.addEventListener('blur', () => setTimeout(() => { if (!this.input.value.trim()) this.typeBox.hidden = true; }, 200));
    // hold to talk (let go = send), or a quick tap to start and another tap to stop
    let downAt = 0, wasOn = false;
    this.btn.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      try { this.btn.setPointerCapture(e.pointerId); } catch { /* not a real pointer */ } // the finger may slide a little while holding
      downAt = performance.now();
      wasOn = this.on;
      if (!this.on) this.set(true);
    });
    const up = () => {
      if (!downAt) return;
      const held = performance.now() - downAt > 350;
      downAt = 0;
      if (held || wasOn) this.set(false); // held: let go = stop · tapped while on: stop
    };
    this.btn.addEventListener('pointerup', up);
    this.btn.addEventListener('pointercancel', up);
    this.btn.addEventListener('contextmenu', (e) => e.preventDefault());
    addEventListener('keydown', (e) => {
      if ((e.key === 't' || e.key === 'T') && !e.repeat && document.activeElement?.tagName !== 'INPUT') this.set(true);
    });
    addEventListener('keyup', (e) => { if (e.key === 't' || e.key === 'T') this.set(false); });
  }

  set(on) {
    if (this.on === on || (on && this.root.hidden)) return;
    this.on = on;
    this.btn.classList.toggle('rec', on);
    this.onChange(on);
  }

  show(visible) { if (!visible) { this.set(false); this.typeBox.hidden = true; } this.root.hidden = !visible; this.status.hidden = !visible; }
  /**
   * Above the action buttons: with two or three of them stacked (on a bike next to Cemal Abi:
   * "Bisikletten in" and "Cemal Abi ile konuş") the talk button went over them. Re-placed only
   * when they change.
   */
  keepAbove(...els) {
    const shown = els.flatMap((e) => (e && !e.hidden ? [e, ...e.children] : [])).filter((e) => e.offsetParent);
    const key = `${shown.map((e) => e.textContent).join('|')}|${innerWidth}x${innerHeight}|${this.root.hidden}`;
    if (key === this.#placed) return;
    this.#placed = key;
    this.root.style.bottom = '';
    if (this.root.hidden || !shown.length) return;
    const top = Math.min(...shown.map((e) => e.getBoundingClientRect().top)), mine = this.root.getBoundingClientRect();
    if (mine.bottom > top - 8) this.root.style.bottom = `${innerHeight - top + 10}px`;
  }

  /** In a talking zone (its name) the button sends the voice; out of it (null), text again. */
  setZone(name) {
    this.zone.hidden = !name;
    if (name) this.zone.replaceChildren(`🎙️ ${name} · toplu konuşma alanı`, el('small', { text: 'Buradakiler seni duyar' }), el('small', { class: 'en-t', text: gloss('Everyone in here hears you') }));
    this.btn.querySelector('span').textContent = name ? 'Bas, konuş (ses)' : 'Bas, konuş (yazı)';
  }

  /** No speech-to-text here: type the sentence instead. */
  typeInstead() { this.typeBox.hidden = false; this.input.focus(); }
  /** Who is here, short (it sits in the top bar): "👥 3 · Ankara"; the details on a long press / hover. */
  setOnline(n, name, room = '') { this.status.textContent = `👥 ${n}${room ? ` · ${room.split(' · ')[0]}` : ''}`; this.status.title = `${name} · ${room ? `${room} · ` : ''}meydanda ${n} kişi`; }
}
