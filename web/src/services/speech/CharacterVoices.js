/**
 * The TTS the game talks to: `speak(text, { speaker, rate })`.
 * Picks the speaker's voice, uses Piper once that voice is downloaded, and meanwhile
 * (or when Piper fails / is switched off) falls back to the browser voice with the
 * same pitch, so characters still sound different.
 */
export class CharacterVoices {
  constructor({ neural, fallback, voices, enabled = () => true }) {
    Object.assign(this, { neural, fallback, voices, enabled });
  }

  voiceOf(speaker) { return this.voices[speaker] ?? this.voices.default; }

  speak(text, { speaker, rate = 1 } = {}) {
    if (!text) return;
    const voice = this.voiceOf(speaker);
    const useNeural = this.enabled() && this.neural?.supported;
    if (useNeural && this.neural.isReady(voice.id)) {
      this.fallback.cancel();
      this.neural.speak(text, { voice, rate }).catch((e) => {
        console.warn('[tts] piper failed, using browser voice:', e.message);
        this.fallback.speak(text, { rate: 0.9 * rate, pitch: voice.pitch });
      });
      return;
    }
    this.fallback.speak(text, { rate: 0.9 * rate, pitch: voice.pitch });
    if (useNeural) this.neural.prepare(voice.id).catch((e) => console.warn('[tts] voice download failed:', e.message));
  }

  /** Pre-synthesise a line the player is likely to play, so the speaker button is instant. */
  warm(text, speaker) {
    if (text && this.enabled() && this.neural?.supported) this.neural.warm(text, this.voiceOf(speaker));
  }

  /** Start downloading every character voice (called when the game starts). */
  preload() {
    if (!this.enabled() || !this.neural?.supported) return;
    const ids = [...new Set(Object.values(this.voices).map((v) => v.id))];
    ids.reduce((p, id) => p.then(() => this.neural.prepare(id)), Promise.resolve())
      .catch((e) => console.warn('[tts] voice download failed:', e.message));
  }

  cancel() { this.neural?.cancel(); this.fallback.cancel(); }
}
