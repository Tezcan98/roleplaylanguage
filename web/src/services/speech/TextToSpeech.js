// names of the Turkish system voices, to tell a woman's voice from a man's
const WOMEN = /yelda|filiz|seda|emel|aylin|zeynep|female|kadın|woman|google/i;
const MEN = /tolga|cem|ahmet|male|erkek|\bman\b/i;

/** Browser voice (Web Speech API). Always available as the fallback. */
export class WebSpeechTTS {
  constructor(lang = 'tr-TR') { this.lang = lang; }

  /** `female`: the speaker is a woman or a girl — her voice if the device has one, else a higher pitch. */
  speak(text, { rate = 0.9, pitch = 1, female = false } = {}) {
    if (!window.speechSynthesis || !text) return;
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = this.lang;
    u.rate = rate;
    const turkish = speechSynthesis.getVoices().filter((v) => v.lang?.toLowerCase().startsWith(this.lang.slice(0, 2)));
    // no Turkish voice on this device: stay silent rather than read Turkish with an English voice
    if (!turkish.length) return;
    const isMan = (v) => MEN.test(v.name) && !/female/i.test(v.name);
    const isWoman = (v) => WOMEN.test(v.name) && !isMan(v);
    const voice = (female ? turkish.find(isWoman) : turkish.find(isMan)) ?? turkish[0];
    // only one kind of voice here: shift the pitch so women and men still sound different
    const shift = female && isMan(voice) ? 1.35 : !female && isWoman(voice) ? 0.75 : 1;
    u.pitch = Math.max(0, Math.min(2, pitch * shift));
    u.voice = voice;
    speechSynthesis.speak(u);
  }

  cancel() { window.speechSynthesis?.cancel(); }
}
