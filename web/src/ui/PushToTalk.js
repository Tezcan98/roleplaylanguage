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
  #cap = 0;
  constructor(host, { onChange }) {
    this.onChange = onChange;
    this.on = false;
    this.btn = el('button', { class: 'ptt', html: `${MIC}<span>Bas, konuş (yazı)</span>`, attrs: { type: 'button', 'aria-label': 'Basılı tut ve konuş (T)' } });
    this.status = el('div', { class: 'pill online' });
    // "Şikayet et", next to who is online in the top bar (main.js puts both there)
    this.reportBtn = el('button', { class: 'pill report', text: '🚩 Şikayet et', attrs: { type: 'button', title: 'Bir oyuncuyu şikayet et', 'aria-label': 'Şikayet et' }, on: { click: () => this.onReport?.() } });
    this.reportBtn.hidden = true;
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
    this.btn.addEventListener('pointercancel', () => { if (performance.now() - downAt > 350 && !wasOn) { downAt = 0; return; } up(); }); // (a cancel while held isn't a let-go: it stays on until the next tap or release)
    this.btn.addEventListener('contextmenu', (e) => e.preventDefault());
    addEventListener('keydown', (e) => {
      if ((e.key === 't' || e.key === 'T') && !e.repeat && document.activeElement?.tagName !== 'INPUT') this.set(true);
    });
    addEventListener('keyup', (e) => { if (e.key === 't' || e.key === 'T') this.set(false); });
  }

  set(on) {
    if (this.on === on || (on && this.root.hidden)) return;
    this.on = on;
    clearTimeout(this.#cap);
    if (on) this.#cap = setTimeout(() => this.set(false), 60000); // left on by a cancelled press: off by itself after a minute
    this.btn.classList.toggle('rec', on);
    this.onChange(on);
  }

  show(visible) {
    if (!visible) { this.set(false); this.typeBox.hidden = true; }
    const appearing = visible && this.root.hidden;
    this.root.hidden = !visible; this.status.hidden = !visible; this.reportBtn.hidden = !visible;
    // a small round mic button; its words ("Bas, konuş") only the first few times, for a few seconds
    if (appearing) {
      let n = 0; try { n = Number(localStorage.getItem('pttHints') ?? 0); localStorage.setItem('pttHints', String(n + 1)); } catch { /* private mode */ }
      if (n < 3) { this.btn.classList.add('hint'); clearTimeout(this.hintTimer); this.hintTimer = setTimeout(() => this.btn.classList.remove('hint'), 5000); }
    }
  }
  /**
   * Above the action buttons: with two or three of them stacked (on a bike next to Cemal Abi:
   * "Bisikletten in" and "Cemal Abi ile konuş") the talk button went over them. Re-placed only
   * when they change.
   */
  keepAbove(...els) {
    // the buttons themselves (a container only through its children: the empty #act-more box pushed it up for nothing)
    const shown = els.flatMap((e) => (!e || e.hidden ? [] : e.children.length && e.tagName !== 'BUTTON' ? [...e.children] : [e])).filter((e) => e.offsetParent && e.getBoundingClientRect().height > 0 && e.getBoundingClientRect().left < this.root.getBoundingClientRect().right && e.getBoundingClientRect().right > this.root.getBoundingClientRect().left); // (only the ones in its column: the action button is on the left now)
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
    this.btn.classList.toggle('zone', !!name); // in a talking zone its words stay: hold it to speak
    if (name) this.zone.replaceChildren(`🎙️ ${name}`); // short: the longer words were on the screen all the time and took too much room
    this.zone.title = name ? 'Toplu konuşma alanı: buradakiler seni duyar' : '';
    this.btn.querySelector('span').textContent = name ? 'Basılı tut, konuş' : 'Bas, konuş (yazı)';
  }

  /** No speech-to-text here: type the sentence instead. */
  typeInstead() { this.typeBox.hidden = false; this.input.focus(); }
  /** Who is here, short (it sits in the top bar): "👥 3 · Ankara"; the details on a long press / hover. */
  setOnline(n, name, room = '') { this.status.textContent = `👥 ${n}${room ? ` · ${room.split(' · ')[0]}` : ''}`; this.status.title = `${name} · ${room ? `${room} · ` : ''}meydanda ${n} kişi`; }
}
