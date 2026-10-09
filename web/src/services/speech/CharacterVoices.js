/**
 * The TTS the game talks to: `speak(text, { speaker, rate })`.
 * Picks the speaker's voice and plays it from the first source that works:
 *   0. the game's own voice library (assets/speech: every fixed line, recorded once — no server call),
 *   1. the village server (each character's own Gemini voice, Piper as its stand-in; cached lines),
 *   2. Piper in the browser once its voice is downloaded (when switched on; men only — Piper
 *      has no Turkish woman's voice),
 *   3. the browser's own voice — only if it really is a Turkish one.
 */
export class CharacterVoices {
  #turn = 0;

  constructor({ repo = null, server = null, neural, fallback, voices, enabled = () => true, muted = () => false }) {
    Object.assign(this, { repo, server, neural, fallback, voices, enabled, muted });
  }

  voiceOf(speaker) { return this.voices[speaker] ?? this.voices.default; }

  /** The browser's voice: a woman's one for the women and girls, and their pitch. */
  #say(text, voice, rate) { this.fallback.speak(text, { rate: 0.9 * rate, pitch: voice.pitch, female: !!voice.female }); }

  /**
   * `fresh`: a sentence made up on the spot (free chat with a character). Women's voices come from
   * Gemini, made once per sentence and kept — a new sentence every time would use the daily quota
   * up, so hers is spoken by the device; a man's goes to Piper on our own server (costs nothing).
   */
  speak(text, { speaker, rate = 1, fresh = false } = {}) {
    if (!text || this.muted()) return; // voices off in the settings
    const voice = this.voiceOf(speaker), turn = ++this.#turn;
    if (fresh || !this.repo) { this.#speak(text, voice, rate, fresh); return; }
    this.repo.url(voice, text).then((url) => {
      if (turn !== this.#turn) return; // something else was said meanwhile
      if (!url) { this.#speak(text, voice, rate, fresh); return; }
      this.server?.cancel(); this.neural?.cancel(); this.fallback.cancel();
      this.repo.play(url, (voice.pitch ?? 1) * rate).catch(() => { if (turn === this.#turn) this.#speak(text, voice, rate, fresh); });
    }, () => this.#speak(text, voice, rate, fresh));
  }

  #speak(text, voice, rate, fresh) {
    this.repo?.cancel();
    if (!(fresh && voice.female) && (this.server?.has?.(voice) ?? this.server?.supported)) {
      this.neural?.cancel(); this.fallback.cancel();
      this.server.speak(text, { voice, rate, fresh }).catch(() => this.#local(text, voice, rate));
      return;
    }
    this.#local(text, voice, rate);
  }

  #local(text, voice, rate) {
    if (voice.piper) voice = { ...voice, id: voice.piper }; // a man's Gemini voice: Piper in the browser stands in
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
    if (this.repo) { this.repo.url(voice, text).then((url) => { if (!url) this.#warm(text, voice); }, () => this.#warm(text, voice)); return; }
    this.#warm(text, voice);
  }

  #warm(text, voice) {
    if (this.server?.has?.(voice) ?? this.server?.supported) { this.server.warm(text, voice); return; }
    if (this.enabled() && this.neural?.supported && !voice.female) this.neural.warm(text, voice.piper ? { ...voice, id: voice.piper } : voice);
  }

  /** Start downloading every character voice (called when the game starts). */
  preload() {
    if (this.server?.supported || !this.enabled() || !this.neural?.supported) return; // the server speaks: nothing to download
    const ids = [...new Set(Object.values(this.voices).filter((v) => !v.female).map((v) => v.piper ?? v.id))];
    ids.reduce((p, id) => p.then(() => this.neural.prepare(id)), Promise.resolve())
      .catch((e) => console.warn('[tts] voice download failed:', e.message));
  }

  cancel() { this.#turn++; this.repo?.cancel(); this.server?.cancel(); this.neural?.cancel(); this.fallback.cancel(); }
}
