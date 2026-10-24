import { el } from './dom.js';
import { gloss } from '../i18n/Gloss.js';

const svg = (body) => `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">${body}</svg>`;
const SLASH = '<path d="M3 3l18 18"/>';
const MIC = '<rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3"/>';
const SPEAKER = '<path d="M4 9v6h4l5 4V5L8 9z"/>';
const WAVES = '<path d="M16 9a4 4 0 0 1 0 6M19 6a8 8 0 0 1 0 12"/>';
const ICON = {
  mic: svg(MIC), micOff: svg(MIC + SLASH),
  speaker: svg(SPEAKER + WAVES), speakerOff: svg(`${SPEAKER}<path d="M16 9l5 6M21 9l-5 6"/>`),
};

/** Incoming voice-chat request (accept / decline) and the in-call bar: who, 🎙️ mic and 🔊 speaker (a tap turns each off and on), 🚩, end. */
export class CallUI {
  constructor(host, modes) {
    this.host = host;
    this.modes = modes;
    this.name = el('span');
    this.micBtn = el('button', { class: 'chipbtn icon', attrs: { type: 'button' } });
    this.speakerBtn = el('button', { class: 'chipbtn icon', attrs: { type: 'button' } });
    this.endBtn = el('button', { class: 'chipbtn danger', text: 'Bitir', attrs: { type: 'button' } });
    this.reportBtn = el('button', { class: 'chipbtn', text: '🚩', attrs: { type: 'button', title: 'Şikayet et', 'aria-label': 'Şikayet et' } });
    this.bar = el('div', { class: 'callbar' }, [el('span', { class: 'live', text: '● SESLİ' }), this.name, this.micBtn, this.speakerBtn, this.reportBtn, this.endBtn]);
    this.bar.hidden = true;
    host.append(this.bar);
  }

  /** The mic / speaker button drawn for its state (on: the plain icon; off: crossed out, red). */
  #toggle(btn, on, [onIcon, offIcon], [onLabel, offLabel]) {
    btn.innerHTML = on ? onIcon : offIcon;
    btn.classList.toggle('off', !on);
    btn.setAttribute('aria-pressed', String(!on));
    btn.title = on ? onLabel : offLabel;
    btn.setAttribute('aria-label', btn.title);
  }

  /** @returns {Promise<boolean|'block'>} accepted, declined, or 'block' (auto-declines after `seconds`). */
  ask(fromName, { join = false, others = [] } = {}, seconds = 15) {
    return new Promise((resolve) => {
      const pop = this.modes.push('overlay');
      const count = el('p', { class: 'note' });
      const yes = el('button', { class: 'btn', text: 'Kabul et', attrs: { type: 'button' } });
      const no = el('button', { class: 'btn alt', text: 'Reddet', attrs: { type: 'button' } });
      const block = el('button', { class: 'linkbtn', text: '🚫 Engelle', attrs: { type: 'button' } });
      const root = el('div', { class: 'overlay open dim' }, [el('div', { class: 'card' }, [
        el('p', { class: 'chap', text: 'Sesli sohbet isteği' }),
        el('h2', { class: 'ctitle', text: join ? `${fromName} sohbetinize katılmak istiyor` : others.length ? `${fromName} seni sohbete çağırıyor` : `${fromName} seninle konuşmak istiyor` }),
        ...(others.length ? [el('p', { class: 'note', text: `Sohbette: ${others.join(', ')}` })] : []),
        el('p', { class: 'cen en-t', text: join ? gloss('{name} wants to join your voice chat', { name: fromName }) : others.length ? gloss('{name} invites you to a voice chat', { name: fromName }) : gloss('{name} wants to voice chat with you', { name: fromName }) }),
        count, yes, no, block,
      ])]);
      let left = seconds;
      const tick = () => { count.textContent = `${left} sn içinde cevap vermezsen istek reddedilir.`; if (left-- <= 0) done(false); };
      const timer = setInterval(tick, 1000);
      const done = (v) => { clearInterval(timer); root.remove(); pop(); resolve(v); };
      yes.onclick = () => done(true);
      no.onclick = () => done(false);
      block.onclick = () => done('block');
      tick();
      this.host.append(root);
    });
  }

  showCall({ onMute, onSpeaker, onEnd, onReport }) {
    this.reportBtn.onclick = onReport;
    let mic = true, speaker = true;
    const drawMic = () => this.#toggle(this.micBtn, mic, [ICON.mic, ICON.micOff], ['Mikrofonu kapat', 'Mikrofonu aç']);
    const drawSpeaker = () => this.#toggle(this.speakerBtn, speaker, [ICON.speaker, ICON.speakerOff], ['Hoparlörü kapat', 'Hoparlörü aç']);
    this.micBtn.onclick = () => { mic = !mic; drawMic(); onMute(!mic); };
    this.speakerBtn.onclick = async () => {
      const ask = this.speakerBtn.classList.contains('ask'); // (blinking: the browser held the voices back — this tap only plays them)
      speaker = ask || !speaker; drawSpeaker();
      this.speakerBtn.classList.remove('ask');
      if (!(await onSpeaker(speaker)) && speaker) this.speakerBtn.classList.add('ask'); // still held back: one more tap
    };
    this.#setSpeaker = (on) => { speaker = on; drawSpeaker(); };
    drawMic(); drawSpeaker();
    this.speakerBtn.classList.remove('ask');
    this.endBtn.onclick = onEnd;
    this.bar.hidden = false;
  }

  #setSpeaker = () => {};

  /** Who I am talking with (one name, or "Ali +2"). */
  setNames(names) {
    this.name.textContent = names.length > 1 ? `${names[0]} +${names.length - 1}` : names[0] ?? ''; // (short: the bar sits over the game)
    this.name.title = names.join(', ');
  }

  /** The browser held the others' voices back until a tap: the 🔊 button asks for one (blinks), and its tap plays them. */
  showUnmute() {
    this.#setSpeaker(true);
    this.speakerBtn.classList.add('ask');
  }

  hideCall() { this.bar.hidden = true; this.speakerBtn.classList.remove('ask'); }
}
