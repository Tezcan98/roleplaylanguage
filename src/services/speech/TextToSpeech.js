/** Browser voice (Web Speech API). Always available as the fallback. */
export class WebSpeechTTS {
  constructor(lang = 'tr-TR') { this.lang = lang; }

  speak(text, { rate = 0.9, pitch = 1 } = {}) {
    if (!window.speechSynthesis || !text) return;
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = this.lang;
    u.rate = rate;
    u.pitch = Math.max(0, Math.min(2, pitch));
    const voice = speechSynthesis.getVoices().find((v) => v.lang?.toLowerCase().startsWith(this.lang.slice(0, 2)));
    if (voice) u.voice = voice;
    speechSynthesis.speak(u);
  }

  cancel() { window.speechSynthesis?.cancel(); }
}
