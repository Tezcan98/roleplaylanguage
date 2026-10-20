import { el } from './dom.js';
import { gloss } from '../i18n/Gloss.js';

const DAY = 86_400_000;
const MIN = 15, MAX = 1200;

/**
 * "Oyunu nasıl buldun?": the player writes what they think of the game, once a day. Our server
 * (server/src/Feedback.js) has Gemini read it: a real opinion earns credits (more for a detailed,
 * useful one), filler earns none. Opened by itself after a while of playing (main.js, at most
 * once a day) and from ⚙️ Ayarlar.
 *
 * `post(body)` → { status, data } sends it; `onCredits(n)` adds what it earned.
 */
export class FeedbackView {
  #pop = null;

  constructor(host, { modes, settings, post, onCredits = () => {}, info = () => ({}) }) {
    Object.assign(this, { modes, settings, post, onCredits, info });
    this.body = el('div', { class: 'feedback-body' });
    this.root = el('div', { class: 'overlay dim feedback' }, [el('div', { class: 'card' }, [
      el('h2', { class: 'ctitle', text: '💬 Oyunu nasıl buldun?' }),
      el('p', { class: 'cen en-t', text: gloss('How do you like the game?') }),
      this.body,
    ])]);
    host.append(this.root);
  }

  get isOpen() { return this.root.classList.contains('open'); }
  /** May the player write today (a day since the last one they sent)? */
  get due() { return Date.now() - Number(this.settings.get('feedbackAt', 0)) >= DAY; }

  open() {
    if (!this.#pop) this.#pop = this.modes.push('overlay');
    this.root.classList.add('open');
    if (this.due) this.#form(); else this.#done('Bugün zaten yazdın, teşekkürler! Yeni bir görüşünü yarın yazabilirsin.', gloss('You already wrote today, thank you! You can write again tomorrow.'));
  }

  close() { this.root.classList.remove('open'); this.#pop?.(); this.#pop = null; }

  #form() {
    const text = el('textarea', { attrs: { maxlength: String(MAX), rows: '5', placeholder: 'Görüşünü buraya yaz…', 'aria-label': 'Görüşün' } });
    const count = el('small', { class: 'fb-count', text: `0/${MAX}` });
    const send = el('button', { class: 'btn', text: 'Gönder', attrs: { type: 'button', disabled: '' } });
    const status = el('p', { class: 'fb-status' });
    text.addEventListener('input', () => { const n = text.value.trim().length; count.textContent = `${n}/${MAX}`; send.disabled = n < MIN; });
    send.onclick = () => this.#send(text.value.trim(), send, status);
    this.body.replaceChildren(
      el('p', { class: 'ctext', text: 'Neyi sevdin, neyi değiştirelim, nerede hata gördün? Bize yaz! Gerçek ve anlamlı görüşlere kredi hediye ediyoruz (günde bir kez).' }),
      el('p', { class: 'cen en-t', text: gloss('What did you like, what should we change, where did you see a bug? Write to us! Real, thoughtful feedback earns credits (once a day).') }),
      text, count, status,
      el('div', { class: 'row' }, [el('button', { class: 'btn alt', text: 'Sonra', attrs: { type: 'button' }, on: { click: () => this.close() } }), send]),
    );
    setTimeout(() => text.focus(), 50);
  }

  async #send(text, btn, status) {
    if (text.length < MIN) return;
    btn.disabled = true; status.textContent = 'Gönderiliyor…';
    let r;
    try { r = await this.post({ text, pid: this.#deviceId(), ...this.info() }); } catch { r = null; }
    if (r?.status === 200 && r.data?.ok) {
      this.settings.set('feedbackAt', Date.now());
      const n = Number(r.data.credits) || 0;
      if (n > 0) { this.onCredits(n); this.#done(`Teşekkürler! 🎉 +${n} kredi kazandın.`, gloss('Thank you! You earned {n} credits.', { n })); }
      else this.#done('Teşekkürler! Bu sefer kredi yok: yazdıkların oyunla ilgili bir görüşe benzemiyor. Yarın yine yazabilirsin.', gloss('Thank you! No credits this time: what you wrote doesn’t look like an opinion about the game. You can write again tomorrow.'));
      return;
    }
    if (r?.status === 429) { this.settings.set('feedbackAt', Date.now()); this.#done('Bugün zaten yazdın, teşekkürler! Yeni bir görüşünü yarın yazabilirsin.', gloss('You already wrote today, thank you! You can write again tomorrow.')); return; }
    btn.disabled = false;
    status.replaceChildren('Gönderilemedi. İnternetini kontrol edip tekrar dene.', el('small', { class: 'en-t', text: ` · ${gloss('Could not send it. Check your internet and try again.')}` }));
  }

  /** The answer: Turkish, and its meaning (already glossed). */
  #done(tr, meaning) {
    this.body.replaceChildren(
      el('p', { class: 'ctext', text: tr }),
      el('p', { class: 'cen en-t', text: meaning }),
      el('button', { class: 'btn', text: 'Tamam', attrs: { type: 'button' }, on: { click: () => this.close() } }),
    );
  }

  /** One id per device (as the square makes it). */
  #deviceId() {
    if (!this.settings.get('deviceId')) this.settings.set('deviceId', Array.from(crypto.getRandomValues(new Uint8Array(12)), (b) => (b % 36).toString(36)).join(''));
    return this.settings.get('deviceId');
  }
}
