import { el } from './dom.js';
import { gloss } from '../i18n/Gloss.js';

/** Free conversation box inside the dialogue sheet: type or say a line, send. */
export class NpcChatBox {
  constructor(slot, { onSend, onMic, canListen }) {
    this.input = el('input', { class: 'chat-in', attrs: { type: 'text', maxlength: '200', placeholder: 'Türkçe yaz…', 'aria-label': 'Mesaj' } });
    this.send = el('button', { class: 'chipbtn primary', text: 'Gönder', attrs: { type: 'button' } });
    this.mic = canListen && el('button', { class: 'chipbtn', text: '🎙️ Söyle', attrs: { type: 'button' } });
    this.note = el('p', { class: 'note en-t', text: gloss('Talk freely in Turkish. The answer is read aloud; tap the speaker to hear it again. Chats are kept encrypted for 90 days for safety.') });
    const go = () => { const t = this.input.value.trim(); if (t && !this.waiting) onSend(t); };
    this.send.onclick = go;
    this.input.addEventListener('keydown', (e) => { e.stopPropagation(); if (e.key === 'Enter') go(); });
    if (this.mic) this.mic.onclick = () => onMic();
    slot.replaceChildren(el('div', { class: 'chatbox' }, [el('div', { class: 'chat-row' }, [this.input, this.mic, this.send]), this.note]));
    setTimeout(() => this.input.focus(), 50);
  }

  /** Waiting for the answer: the next line can already be typed, only sending waits. */
  busy(on) {
    this.waiting = on;
    [this.send, this.mic].forEach((b) => { if (b) b.disabled = on; });
    this.send.textContent = on ? '…' : 'Gönder';
    if (!on) this.input.focus();
  }
  clear() { this.input.value = ''; }
  setText(t) { this.input.value = t; }
}
