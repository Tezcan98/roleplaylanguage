import { el } from './dom.js';
import { gloss } from '../i18n/Gloss.js';

/** Incoming voice-chat request (accept / decline) and the in-call bar. */
export class CallUI {
  constructor(host, modes) {
    this.host = host;
    this.modes = modes;
    this.name = el('span');
    this.muteBtn = el('button', { class: 'chipbtn', text: '🔇 Sessize al', attrs: { type: 'button' } });
    this.endBtn = el('button', { class: 'chipbtn danger', text: 'Bitir', attrs: { type: 'button' } });
    // the browser blocked the other side's audio until a tap
    this.unmuteBtn = el('button', { class: 'chipbtn primary', text: '🔊 Sesi aç', attrs: { type: 'button' } });
    this.unmuteBtn.hidden = true;
    this.bar = el('div', { class: 'callbar' }, [el('span', { class: 'live', text: '● SESLİ' }), this.name, this.unmuteBtn, this.muteBtn, this.endBtn]);
    this.bar.hidden = true;
    host.append(this.bar);
  }

  /** @returns {Promise<boolean|'block'>} accepted, declined, or 'block' (auto-declines after `seconds`). */
  ask(fromName, seconds = 15) {
    return new Promise((resolve) => {
      const pop = this.modes.push('overlay');
      const count = el('p', { class: 'note' });
      const yes = el('button', { class: 'btn', text: 'Kabul et', attrs: { type: 'button' } });
      const no = el('button', { class: 'btn alt', text: 'Reddet', attrs: { type: 'button' } });
      const block = el('button', { class: 'linkbtn', text: '🚫 Engelle', attrs: { type: 'button' } });
      const root = el('div', { class: 'overlay open dim' }, [el('div', { class: 'card' }, [
        el('p', { class: 'chap', text: 'Sesli sohbet isteği' }),
        el('h2', { class: 'ctitle', text: `${fromName} seninle konuşmak istiyor` }),
        el('p', { class: 'cen en-t', text: gloss('{name} wants to voice chat with you', { name: fromName }) }),
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

  showCall(name, { onMute, onEnd }) {
    this.name.textContent = `${name} ile konuşuyorsun`;
    let muted = false;
    this.muteBtn.textContent = '🔇 Sessize al';
    this.muteBtn.onclick = () => { muted = !muted; this.muteBtn.textContent = muted ? '🎙️ Sesi aç' : '🔇 Sessize al'; onMute(muted); };
    this.endBtn.onclick = onEnd;
    this.bar.hidden = false;
  }

  showUnmute(play) {
    this.unmuteBtn.hidden = false;
    this.unmuteBtn.onclick = async () => { if (await play()) this.unmuteBtn.hidden = true; };
  }

  hideCall() { this.bar.hidden = true; this.unmuteBtn.hidden = true; }
}
