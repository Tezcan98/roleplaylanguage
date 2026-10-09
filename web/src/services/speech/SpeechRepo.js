import { playVoice, stopVoice } from './voiceAudio.js';
/**
 * The game's own voice library: every fixed line, made once (Gemini / Piper on the village
 * server) by tools/build-voices.mjs and kept in the repository as assets/speech/<key>.mp3.
 * A line found here plays straight from the website — no server, no Gemini call, ever again;
 * lines that are not in the library (new ones, names typed by the player) still go to the server.
 */
/** Server voice names (server/src/Tts.js): women kadin / kiz / nine, men g-<Gemini voice> or a Piper voice. */
export const SHORT = { 'tr-kadin': 'kadin', 'tr-kiz': 'kiz', 'tr-nine': 'nine', 'tr_TR-fahrettin-medium': 'fahrettin', 'tr_TR-fettah-medium': 'fettah' };
export const serverVoice = (voice) => (voice.id?.startsWith('g-') ? voice.id : SHORT[voice.id] ?? 'fahrettin');
/** The text exactly as the server reads it. */
export const speechText = (text) => String(text).normalize('NFC').trim().replace(/\s+/g, ' ');

/** File name of a line in a voice: sha1 of "voice|text", hex. */
export async function speechKey(voice, text) {
  const data = new TextEncoder().encode(`${serverVoice(voice)}|${speechText(text)}`);
  const hash = await globalThis.crypto.subtle.digest('SHA-1', data);
  return [...new Uint8Array(hash)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

export class SpeechRepo {
  #keys = null;
  #loading = null;
  #audio = null;

  constructor(base = 'assets/speech/') { this.base = base; }

  /** The library's index (one fetch; an empty library when there is none). */
  load() {
    this.#loading ??= fetch(`${this.base}index.json`, { cache: 'no-cache' })
      .then((r) => (r.ok ? r.json() : []), () => [])
      .then((list) => { this.#keys = new Set(Array.isArray(list) ? list : []); });
    return this.#loading;
  }

  /** URL of the recorded line, or null when the library doesn't have it. */
  async url(voice, text) {
    if (!this.#keys) await this.load();
    if (!this.#keys.size) return null;
    const key = await speechKey(voice, text);
    return this.#keys.has(key) ? `${this.base}${key}.mp3` : null;
  }

  play(url, rate = 1) {
    this.cancel();
    this.#audio = true;
    return playVoice(url, rate); // the shared element (voiceAudio.js: phones)
  }

  cancel() { if (this.#audio) { stopVoice(); this.#audio = null; } }
}
