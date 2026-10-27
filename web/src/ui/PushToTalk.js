import { el } from './dom.js';
import { gloss } from '../i18n/Gloss.js';

const MIC = '<svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3"/></svg>';

/**
 * Talk button (also the T key, held): what you say appears as a text bubble (in a talking zone:
 * your voice). One tap starts, another tap stops — and while it is on, the button says so
 * ("Bitirmek için dokun"); holding it and letting go works too. Where the device can't
 * turn speech into text, the button opens a box to type the sentence instead. Plus the online counter.
 */
const LABEL = {
  idle: 'Dokun, konuş', // (shown the first few times only: then just the mic)
  rec: 'Bitirmek için dokun', // (short: a phone held sideways is only ~360 px high and the button sits by the corner)
  zoneRec: 'Bitirmek için dokun',
};
export class PushToTalk {
  #placed = '';
  #cap = 0;
  constructor(host, { onChange }) {
    this.onChange = onChange;
    this.on = false;
    this.btn = el('button', { class: 'ptt', html: `${MIC}<span>${LABEL.idle}</span>`, attrs: { type: 'button', 'aria-label': 'Konuşmak için dokun, bitirmek için tekrar dokun (T)' } });
    this.status = el('button', { class: 'pill online', attrs: { type: 'button' }, on: { click: () => (this.offline ? this.onRetry?.() : this.onRooms?.()) } }); // a tap: "Meydan seç" (another city's square) — offline: try again
    // "Şikayet et", next to who is online in the top bar (main.js puts both there)
    this.reportBtn = el('button', { class: 'pill report', text: '🚩 Şikayet et', attrs: { type: 'button', title: 'Bir oyuncuyu şikayet et', 'aria-label': 'Şikayet et' }, on: { click: () => this.onReport?.() } });
    this.reportBtn.hidden = true;
    this.zone = el('div', { class: 'pill zone-note' });
    this.zone.hidden = true;
    this.root = el('div', { class: 'ptt-wrap' }, [this.zone, this.status, this.btn]);
    this.root.hidden = true;
    host.append(this.root);
    // on the left, under the task: alone in the square (offline: a tap connects; online: a tap picks another city)
    this.alone = el('button', { class: 'alone-note', attrs: { type: 'button', hidden: '' }, on: { click: () => (this.offline ? this.onRetry?.() : this.onRooms?.()) } });
    host.append(this.alone);
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
    this.#label();
    this.onChange(on);
  }

  show(visible) {
    if (!visible) { this.set(false); this.typeBox.hidden = true; }
    const appearing = visible && this.root.hidden;
    this.root.hidden = !visible; this.status.hidden = !visible; this.reportBtn.hidden = !visible;
    if (!visible) this.#alone(null);
    // a small round mic button; its words ("Dokun, konuş") only the first few times, for a few seconds
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
    this.inZone = !!name;
    this.btn.classList.toggle('zone', !!name); // in a talking zone its words stay
    if (name) this.zone.replaceChildren(`🎙️ ${name}`); // short: the longer words were on the screen all the time and took too much room
    this.zone.title = name ? 'Toplu konuşma alanı: buradakiler seni duyar' : '';
    this.#label();
  }

  /** The button's words: how to start, or — while on — how to stop. */
  #label() { this.btn.querySelector('span').textContent = this.on ? (this.inZone ? LABEL.zoneRec : LABEL.rec) : LABEL.idle; }

  /** No speech-to-text here: type the sentence instead. */
  typeInstead() { this.typeBox.hidden = false; this.input.focus(); }
  /** Who is here, short (it sits in the top bar): "👥 3 · Ankara"; the details on a long press / hover. */
  setOnline(n, name, room = '') { this.offline = false; this.#here = n; this.#alone(n <= 1 && this.#elsewhere > 0 ? 'alone' : null); this.status.textContent = `👥 ${n}${room ? ` · ${room.split(' · ')[0]}` : ''}`; this.status.title = `${name} · ${room ? `${room} · ` : ''}köy meydanında ${n} kişi`; }
  /** Not in the square's crowd (the recording wasn't agreed to): the top bar says so, a tap asks again (`onRetry`). */
  setOffline() { this.offline = true; this.status.hidden = false; this.status.textContent = '📴 Çevrimdışı'; this.status.title = 'Köy meydanına bağlan · connect to the village square'; this.#alone('offline'); }

  #here = 0;
  #elsewhere = 0;
  /** How many are in the other cities' squares right now: alone here, the note says so only when someone is there (all empty: no note). */
  setElsewhere(n) { this.#elsewhere = n; if (!this.offline) this.#alone(this.#here <= 1 && n > 0 ? 'alone' : null); }

  /** The small note on the left: null | 'offline' | 'alone' (Turkish, its meaning in the player's language under it). */
  #alone(kind) {
    this.alone.hidden = !kind;
    if (!kind) return;
    const [tr, en] = kind === 'offline'
      ? ['📴 Çevrimdışı · bağlanmak için dokun', "You're offline: alone in the square. Tap to connect."]
      : [`👤 Yalnızsın · başka şehirde ${this.#elsewhere} kişi`, 'Alone here · others in another city'];
    const g = gloss(en);
    this.alone.replaceChildren(tr, ...(g ? [el('small', { class: 'en-t', text: g })] : []));
  }
}
