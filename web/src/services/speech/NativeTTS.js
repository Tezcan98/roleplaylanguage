import { TextToSpeech } from '@capacitor-community/text-to-speech';

/** Native device TTS adapter with the same public methods as WebSpeechTTS. */
export class NativeTTS {
  constructor(lang = 'tr-TR') { this.lang = lang; }

  speak(text, { rate = 0.9, pitch = 1, volume = 1 } = {}) {
    if (!text) return;
    TextToSpeech.stop().catch(() => {});
    return TextToSpeech.speak({
      text,
      lang: this.lang,
      rate,
      pitch: Math.max(0, Math.min(2, pitch)),
      volume: Math.max(0, Math.min(1, volume)),
      queueStrategy: 0,
    }).catch(() => {});
  }

  cancel() { return TextToSpeech.stop().catch(() => {}); }
}
