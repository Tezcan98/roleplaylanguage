/** Speech output port. WebSpeechTTS uses the browser voice; a cloud TTS can replace it. */
export class WebSpeechTTS {
  constructor(lang = 'tr-TR', rate = 0.9) { this.lang = lang; this.rate = rate; }

  speak(text) {
    if (!window.speechSynthesis || !text) return;
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = this.lang;
    u.rate = this.rate;
    const voice = speechSynthesis.getVoices().find((v) => v.lang?.toLowerCase().startsWith(this.lang.slice(0, 2)));
    if (voice) u.voice = voice;
    speechSynthesis.speak(u);
  }

  cancel() { window.speechSynthesis?.cancel(); }
}
