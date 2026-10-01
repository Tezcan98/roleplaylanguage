import { SpeechRecognition } from '@capacitor-community/speech-recognition';
import { SpeechRecognizer } from './SpeechRecognizer.js';

/** Native Android speech recognizer adapter. It keeps the browser port unchanged. */
export class NativeSpeechRecognizer extends SpeechRecognizer {
  #active = null;
  #last = '';
  #alternatives = [];
  #listener = null;
  #stateListener = null;

  get supported() { return !!window.Capacitor?.isNativePlatform?.(); }

  async listen({ expected = [] } = {}) {
    if (!this.supported) throw new Error('Native speech recognition is only available on Android/iOS');
    const permission = await SpeechRecognition.requestPermissions();
    if (permission?.speechRecognition !== 'granted') throw new Error('Microphone permission denied');
    const available = await SpeechRecognition.available();
    if (!available.available) throw new Error('Native speech recognition unavailable');

    this.cancel();
    this.#last = '';
    this.#alternatives = [];

    return new Promise(async (resolve, reject) => {
      let done = false;
      const finish = (result = {}) => {
        if (done) return;
        done = true;
        this.#cleanup();
        const matches = result.matches?.length ? result.matches : this.#alternatives;
        const transcript = matches[0] ?? this.#last ?? expected[0] ?? '';
        resolve({ transcript, alternatives: matches, confidence: transcript ? 1 : 0 });
      };
      this.#listener = await SpeechRecognition.addListener('partialResults', ({ matches = [] }) => {
        if (matches[0]) this.#last = matches[0];
        this.#alternatives = matches.length ? matches : this.#alternatives;
      });
      this.#stateListener = await SpeechRecognition.addListener('listeningState', ({ status }) => {
        if (status === 'stopped') finish();
      });
      this.#active = { finish, reject, expected };
      try {
        const result = await SpeechRecognition.start({
          language: 'tr-TR', maxResults: 3, partialResults: true, popup: false,
        });
        if (result?.matches?.length) {
          this.#last = result.matches[0];
          this.#alternatives = result.matches;
        }
      } catch (e) {
        this.#cleanup();
        reject(e);
      }
    });
  }

  async stop() {
    if (!this.#active) return;
    try { await SpeechRecognition.stop(); } catch { this.#active?.finish(); }
  }

  cancel() {
    const active = this.#active;
    this.#cleanup();
    if (active) SpeechRecognition.stop().catch(() => {});
  }

  #cleanup() {
    this.#listener?.remove?.().catch?.(() => {});
    this.#stateListener?.remove?.().catch?.(() => {});
    this.#listener = null;
    this.#stateListener = null;
    this.#active = null;
  }
}
