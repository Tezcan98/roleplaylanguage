import { el } from './dom.js';

const MIC = '<svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3"/></svg>';

/** Hold-to-talk button (also the T key): what you say appears as a text bubble. Plus the online counter. */
export class PushToTalk {
  constructor(host, { onChange }) {
    this.onChange = onChange;
    this.on = false;
    this.btn = el('button', { class: 'ptt', html: `${MIC}<span>Bas, konuş (yazı)</span>`, attrs: { type: 'button', 'aria-label': 'Basılı tut ve konuş (T)' } });
    this.status = el('div', { class: 'pill online' });
    this.root = el('div', { class: 'ptt-wrap' }, [this.status, this.btn]);
    this.root.hidden = true;
    host.append(this.root);
    const down = (e) => { e.preventDefault(); this.set(true); };
    const up = () => this.set(false);
    this.btn.addEventListener('pointerdown', down);
    this.btn.addEventListener('pointerup', up);
    this.btn.addEventListener('pointerleave', up);
    this.btn.addEventListener('pointercancel', up);
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

  show(visible) { if (!visible) this.set(false); this.root.hidden = !visible; }
  setOnline(n, name) { this.status.textContent = `🌐 ${name} · meydanda ${n} kişi`; }
}
