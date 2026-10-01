import { TextToSpeech } from '@capacitor-community/text-to-speech';

export class NativeTTS {
  constructor(lang = 'tr-TR') { this.lang = lang; }

  get supported() {
    return !!globalThis.Capacitor?.isNativePlatform?.() && !!TextToSpeech;
  }

  async speak(text, { rate = 0.9, pitch = 1 } = {}) {
    if (!text || !this.supported) return;
    try {
      await TextToSpeech.speak({
        text,
        lang: this.lang,
        rate,
        pitch: Math.max(0, Math.min(2, pitch)),
        volume: 1,
        queueStrategy: 0,
      });
    } catch (e) {
      console.warn('[tts] native speech failed:', e.message);
    }
  }

  cancel() {
    return TextToSpeech.stop().catch(() => {});
  }
}
