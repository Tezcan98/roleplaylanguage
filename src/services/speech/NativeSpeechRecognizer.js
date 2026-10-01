import { SpeechRecognition } from '@capacitor-community/speech-recognition';
import { SpeechRecognizer } from './SpeechRecognizer.js';

const WAIT_AFTER_STOP_MS = 450;

/**
 * Native Android speech-recognition adapter.
 * Keeps the SpeechRecognizer port intact while using partial results so stop()
 * can return the last words heard. Permission is requested lazily on first listen.
 */
export class NativeSpeechRecognizer extends SpeechRecognizer {
  #listening = false;
  #partial = '';
  #alternatives = [];
  #confidence = 0;
  #pending = null;
  #listener = null;
  #stopTimer = null;

  constructor(lang = 'tr-TR') {
    super();
    this.lang = lang;
  }

  get supported() {
    return !!globalThis.Capacitor?.isNativePlatform?.() && !!SpeechRecognition;
  }

  async #ensurePermission() {
    const status = await SpeechRecognition.checkPermissions();
    if (status.speechRecognition !== 'granted') {
      const next = await SpeechRecognition.requestPermissions();
      if (next.speechRecognition !== 'granted') throw new Error('not-allowed');
    }
  }

  async listen({ expected = [] } = {}) {
    await this.cancel();
    await this.#ensurePermission();

    this.#partial = '';
    this.#alternatives = [];
    this.#confidence = 0;

    this.#pending = new Promise((resolve, reject) => {
      this.#resolve = resolve;
      this.#reject = reject;
    });

    this.#listener = await SpeechRecognition.addListener('partialResults', ({ matches = [] } = {}) => {
      if (!matches.length) return;
      this.#alternatives = matches.filter(Boolean);
      this.#partial = this.#alternatives[0] ?? '';
      this.#confidence = 0.9;
    });

    const stateListener = await SpeechRecognition.addListener('listeningState', ({ status }) => {
      if (status === 'stopped') this.#finish();
    });
    this.#stateListener = stateListener;

    try {
      await SpeechRecognition.start({
        language: this.lang,
        maxResults: Math.max(1, Math.min(5, expected.length || 3)),
        prompt: 'Türkçe söyle',
        partialResults: true,
        popup: false,
      });
      this.#listening = true;
    } catch (e) {
      this.#reject?.(e);
      await this.#cleanup();
    }

    return this.#pending;
  }

  async stop() {
    if (!this.#listening && !this.#pending) return this.#result();
    try { await SpeechRecognition.stop(); } catch { /* native plugin may already have stopped */ }
    clearTimeout(this.#stopTimer);
    this.#stopTimer = setTimeout(() => this.#finish(), WAIT_AFTER_STOP_MS);
    return this.#pending ?? this.#result();
  }

  async cancel() {
    clearTimeout(this.#stopTimer);
    if (this.#listening) {
      try { await SpeechRecognition.stop(); } catch { /* already stopped */ }
    }
    this.#reject?.(new Error('cancelled'));
    this.#resolve = null;
    this.#reject = null;
    await this.#cleanup();
  }

  #result() {
    return {
      transcript: this.#partial.trim(),
      alternatives: [...new Set(this.#alternatives.map((x) => x.trim()).filter(Boolean))],
      confidence: this.#confidence,
    };
  }

  async #finish() {
    if (!this.#pending) return;
    const resolve = this.#resolve;
    const result = this.#result();
    this.#resolve = null;
    this.#reject = null;
    this.#listening = false;
    await this.#cleanup();
    resolve?.(result);
  }

  async #cleanup() {
    this.#listener?.remove?.();
    this.#stateListener?.remove?.();
    this.#listener = null;
    this.#stateListener = null;
    this.#pending = null;
  }
}
