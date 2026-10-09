import { playVoice, stopVoice } from './voiceAudio.js';

/**
 * Turkish speech generated on the village server (Gemini voices, Piper, server/src/Tts.js). Each line is a
 * cached WAV, so playback starts quickly and nothing big is downloaded on the phone.
 * Characters keep their own voice; `pitch` speeds the clip up / down a little.
 */
import { SHORT } from './SpeechRepo.js';

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

  /**
   * A man's voice is one of Gemini's (`g-<Name>`) with Piper as the server's stand-in (`f`);
   * `fresh`: a sentence made up on the spot goes straight to Piper (Gemini's quota is for fixed lines).
   */
  src(text, voice, fresh = false) {
    const t = encodeURIComponent(text.trim());
    if (voice.id?.startsWith('g-')) return fresh ? `${this.url}?v=${SHORT[voice.piper] ?? 'fahrettin'}&t=${t}` : `${this.url}?v=${voice.id}&f=${SHORT[voice.piper] ?? 'fahrettin'}&t=${t}`;
    return `${this.url}?v=${SHORT[voice.id] ?? 'fahrettin'}&t=${t}`;
  }

  /** Ask the server for a line ahead of time (the browser keeps it in its HTTP cache). */
  warm(text, voice) { if (this.has(voice) && text) fetch(this.src(text, voice)).catch(() => {}); }

  speak(text, { voice, rate = 1, fresh = false }) {
    this.cancel();
    this.#audio = true;
    let played = false;
    return playVoice(this.src(text, voice, fresh), (voice.pitch ?? 1) * rate, { // the shared element (voiceAudio.js: phones)
      onError: () => {
        // the server works but this voice keeps failing (3 in a row): skip it, her lines go to the fallback
        const n = (this.#voiceFails.get(voice.id) ?? 0) + 1;
        this.#voiceFails.set(voice.id, n);
        if (!this.#worked.size) this.#failures++; // nothing has worked yet: the server may be unreachable
        else if (n >= 3) this.#badVoices.add(voice.id);
      },
      onPlaying: () => { if (!played) { played = true; this.#failures = 0; this.#voiceFails.delete(voice.id); this.#worked.add(voice.id); } },
    });
  }

  cancel() { if (this.#audio) { stopVoice(); this.#audio = null; } }
}
