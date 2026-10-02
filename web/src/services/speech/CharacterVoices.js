/**
 * The TTS the game talks to: `speak(text, { speaker, rate })`.
 * Picks the speaker's voice and plays it from the first source that works:
 *   1. the village server (Piper on the server, cached lines — natural Turkish everywhere),
 *   2. Piper in the browser once its voice is downloaded (when switched on; men only — Piper
 *      has no Turkish woman's voice),
 *   3. the browser's own voice — only if it really is a Turkish one.
 */
export class CharacterVoices {
  constructor({ server = null, neural, fallback, voices, enabled = () => true }) {
    Object.assign(this, { server, neural, fallback, voices, enabled });
  }

  voiceOf(speaker) { return this.voices[speaker] ?? this.voices.default; }

  /** The browser's voice: a woman's one for the women and girls, and their pitch. */
  #say(text, voice, rate) { this.fallback.speak(text, { rate: 0.9 * rate, pitch: voice.pitch, female: !!voice.female }); }

  speak(text, { speaker, rate = 1 } = {}) {
    if (!text) return;
    const voice = this.voiceOf(speaker);
    if (this.server?.has?.(voice) ?? this.server?.supported) {
      this.neural?.cancel(); this.fallback.cancel();
      this.server.speak(text, { voice, rate }).catch(() => this.#local(text, voice, rate));
      return;
    }
    this.#local(text, voice, rate);
  }

  #local(text, voice, rate) {
    const useNeural = this.enabled() && this.neural?.supported && !voice.female;
    if (useNeural && this.neural.isReady(voice.id)) {
      this.fallback.cancel();
      this.neural.speak(text, { voice, rate }).catch((e) => {
        console.warn('[tts] piper failed, using browser voice:', e.message);
        this.#say(text, voice, rate);
      });
      return;
    }
    this.#say(text, voice, rate);
    if (useNeural) this.neural.prepare(voice.id).catch((e) => console.warn('[tts] voice download failed:', e.message));
  }

  /** Pre-synthesise a line the player is likely to play, so the speaker button is instant. */
  warm(text, speaker) {
    if (!text) return;
    const voice = this.voiceOf(speaker);
    if (this.server?.has?.(voice) ?? this.server?.supported) { this.server.warm(text, voice); return; }
    if (this.enabled() && this.neural?.supported && !voice.female) this.neural.warm(text, voice);
  }

  /** Start downloading every character voice (called when the game starts). */
  preload() {
    if (this.server?.supported || !this.enabled() || !this.neural?.supported) return; // the server speaks: nothing to download
    const ids = [...new Set(Object.values(this.voices).filter((v) => !v.female).map((v) => v.id))];
    ids.reduce((p, id) => p.then(() => this.neural.prepare(id)), Promise.resolve())
      .catch((e) => console.warn('[tts] voice download failed:', e.message));
  }

  cancel() { this.server?.cancel(); this.neural?.cancel(); this.fallback.cancel(); }
}
