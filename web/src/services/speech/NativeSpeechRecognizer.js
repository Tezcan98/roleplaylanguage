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
        const transcript = matches[0] ?? this.#last ?? ''; // never fall back to the expected answer
        resolve({ transcript, alternatives: matches, confidence: transcript ? 1 : 0 });
      };
      // Android says "stopped" when the speech ends, a moment BEFORE the final text arrives (as one
      // more partialResults event): wait for it, so what was said is not thrown away
      let ended = false, heard = false, grace = null;
      const endSoon = (ms) => { clearTimeout(grace); grace = setTimeout(() => finish(), ms); };
      this.#listener = await SpeechRecognition.addListener('partialResults', ({ matches = [] }) => {
        if (matches[0]) this.#last = matches[0];
        this.#alternatives = matches.length ? matches : this.#alternatives;
        if (ended && matches[0]) finish({ matches }); // the final result
      });
      this.#stateListener = await SpeechRecognition.addListener('listeningState', ({ status }) => {
        if (status === 'started') heard = true;
        if (status === 'stopped') { ended = true; endSoon(1800); }
      });
      // no speech at all: Android only reports an error to itself (nothing reaches us) — end this round
      // after a few silent seconds (the caller listens again while the button is held), or a long one
      setTimeout(() => { if (!done && !heard) endSoon(0); }, 5000);
      setTimeout(() => { if (!done && !ended) endSoon(0); }, 20000);
      this.#active = { finish, reject, expected, endSoon };
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

  /** Released: Android finishes and sends the final text; if it doesn't, what we have after 1.8 s. */
  async stop() {
    const active = this.#active;
    if (!active) return;
    active.endSoon(1800);
    try { await SpeechRecognition.stop(); } catch { active.finish(); }
  }

  cancel() {
    const active = this.#active;
    if (!active) return;
    active.finish({ matches: [] });
    SpeechRecognition.stop().catch(() => {});
  }

  #cleanup() {
    this.#listener?.remove?.().catch?.(() => {});
    this.#stateListener?.remove?.().catch?.(() => {});
    this.#listener = null;
    this.#stateListener = null;
    this.#active = null;
  }
}
