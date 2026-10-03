import { el } from './dom.js';

const MIC = '<svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3"/></svg>';

/**
 * Talk button (also the T key, held): what you say appears as a text bubble. Hold it while you
 * speak and let go, or tap once to start and once more to stop. Where the device can't turn speech into text, the button opens a box to type the
 * sentence instead. Plus the online counter.
 */
export class PushToTalk {
  constructor(host, { onChange }) {
    this.onChange = onChange;
    this.on = false;
    this.btn = el('button', { class: 'ptt', html: `${MIC}<span>Bas, konuş (yazı)</span>`, attrs: { type: 'button', 'aria-label': 'Basılı tut ve konuş (T)' } });
    this.status = el('div', { class: 'pill online' });
    this.root = el('div', { class: 'ptt-wrap' }, [this.status, this.btn]);
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

  show(visible) { if (!visible) { this.set(false); this.typeBox.hidden = true; } this.root.hidden = !visible; }
  /** No speech-to-text here: type the sentence instead. */
  typeInstead() { this.typeBox.hidden = false; this.input.focus(); }
  setOnline(n, name, room = '') { this.status.textContent = `🌐 ${name} · ${room ? `${room} · ` : ''}meydanda ${n} kişi`; }
}
