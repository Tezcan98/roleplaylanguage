/**
 * Turkish speech generated on the village server (Piper, server/src/Tts.js). Each line is a
 * cached WAV, so playback starts quickly and nothing big is downloaded on the phone.
 * Characters keep their own voice; `pitch` speeds the clip up / down a little.
 */
const SHORT = { 'tr_TR-dfki-medium': 'dfki', 'tr_TR-fahrettin-medium': 'fahrettin', 'tr_TR-fettah-medium': 'fettah' };

export class ServerTTS {
  #audio = null;
  #failures = 0;

  constructor(url) { this.url = url; }

  /** Gives up after a few failures in a row (server unreachable), so the fallback takes over. */
  get supported() { return !!this.url && this.#failures < 3; }

  src(text, voiceId) { return `${this.url}?v=${SHORT[voiceId] ?? 'fahrettin'}&t=${encodeURIComponent(text.trim())}`; }

  /** Ask the server for a line ahead of time (the browser keeps it in its HTTP cache). */
  warm(text, voice) { if (this.supported && text) fetch(this.src(text, voice.id)).catch(() => {}); }

  speak(text, { voice, rate = 1 }) {
    this.cancel();
    return new Promise((resolve, reject) => {
      const a = this.#audio = new Audio(this.src(text, voice.id));
      a.preservesPitch = false;
      a.playbackRate = (voice.pitch ?? 1) * rate;
      a.onended = () => resolve();
      a.onerror = () => { this.#failures++; reject(new Error('server tts failed')); };
      a.play().then(() => { this.#failures = 0; }, (e) => { if (e?.name !== 'AbortError') reject(e); });
    });
  }

  cancel() { if (this.#audio) { this.#audio.pause(); this.#audio.onerror = null; this.#audio = null; } }
}
