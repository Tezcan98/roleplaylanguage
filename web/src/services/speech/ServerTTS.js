/**
 * Turkish speech generated on the village server (Piper, server/src/Tts.js). Each line is a
 * cached WAV, so playback starts quickly and nothing big is downloaded on the phone.
 * Characters keep their own voice; `pitch` speeds the clip up / down a little.
 */
const SHORT = { 'tr-kadin': 'kadin', 'tr-kiz': 'kiz', 'tr-nine': 'nine', 'tr_TR-fahrettin-medium': 'fahrettin', 'tr_TR-fettah-medium': 'fettah' };

export class ServerTTS {
  #audio = null;
  #failures = 0;
  #badVoices = new Set(); // voices this server can't make (e.g. no women's voice set up)
  #voiceFails = new Map(); // voice → failures in a row
  #worked = new Set();

  constructor(url) { this.url = url; }

  /** Gives up after a few failures in a row (server unreachable), so the fallback takes over. */
  get supported() { return !!this.url && this.#failures < 3; }
  /** A voice that fails while the others work (no women's model on the server) is skipped: her lines go straight to the fallback. */
  has(voice) { return this.supported && !this.#badVoices.has(voice.id); }

  src(text, voiceId) { return `${this.url}?v=${SHORT[voiceId] ?? 'fahrettin'}&t=${encodeURIComponent(text.trim())}`; }

  /** Ask the server for a line ahead of time (the browser keeps it in its HTTP cache). */
  warm(text, voice) { if (this.has(voice) && text) fetch(this.src(text, voice.id)).catch(() => {}); }

  speak(text, { voice, rate = 1 }) {
    this.cancel();
    return new Promise((resolve, reject) => {
      const a = this.#audio = new Audio(this.src(text, voice.id));
      a.preservesPitch = false;
      a.playbackRate = (voice.pitch ?? 1) * rate;
      a.onended = () => resolve();
      let played = false;
      a.onerror = () => {
        // the server works but this voice keeps failing (3 in a row): skip it, her lines go to the fallback
        const n = (this.#voiceFails.get(voice.id) ?? 0) + 1;
        this.#voiceFails.set(voice.id, n);
        if (!this.#worked.size) this.#failures++; // nothing has worked yet: the server may be unreachable
        else if (n >= 3) this.#badVoices.add(voice.id);
        reject(new Error('server tts failed'));
      };
      a.onplaying = () => { if (!played) { played = true; this.#failures = 0; this.#voiceFails.delete(voice.id); this.#worked.add(voice.id); } };
      a.play().catch((e) => { if (e?.name !== 'AbortError') reject(e); });
    });
  }

  cancel() { if (this.#audio) { this.#audio.pause(); this.#audio.onerror = null; this.#audio = null; } }
}
