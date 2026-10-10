import { playVoice, stopVoice } from './voiceAudio.js';
/**
 * Open-source neural Turkish TTS (Piper voices, ONNX in a Web Worker).
 * Each voice model is ~60 MB, downloaded once and kept in the browser cache.
 * Pitch per character is done by resampling (playbackRate without pitch preservation).
 */
/** Lines one worker makes before it is replaced (its memory is freed only that way). */
const RECYCLE = 60;

export class PiperTTS {
  #worker = null;
  #seq = 0;
  #pending = new Map();
  #ready = new Set();
  #preparing = new Map();
  #clips = new Map();
  #audio = null;
  #spoken = 0; // lines made by this worker (it is replaced now and then: its WebAssembly memory only grows)

  constructor({ onProgress = () => {} } = {}) { this.onProgress = onProgress; }

  get supported() { return typeof Worker === 'function' && typeof WebAssembly === 'object' && 'caches' in self; }
  isReady(voiceId) { return this.#ready.has(voiceId); }

  /**
   * A fresh worker: after RECYCLE lines (memory), or when it crashed ("Aborted()": out of memory) —
   * the voices load again on the next line, the game goes on (the error doesn't reach the page).
   */
  #reset(reason) {
    this.#worker?.terminate();
    this.#worker = null;
    this.#spoken = 0;
    this.#ready.clear();
    for (const p of this.#pending.values()) p.reject(new Error(reason));
    this.#pending.clear();
  }

  #call(msg, transfer) {
    if (msg.type === 'speak' && this.#spoken >= RECYCLE && !this.#pending.size) this.#reset('recycled');
    if (!this.#worker) {
      this.#worker = new Worker(new URL('./piper.worker.js', import.meta.url), { type: 'module' });
      this.#worker.onerror = (e) => { e.preventDefault(); this.#reset(e.message || 'piper worker crashed'); };
      this.#worker.onmessage = ({ data }) => {
        if (data.type === 'progress') { this.onProgress(data.voice, data.total ? data.loaded / data.total : 0); return; }
        const p = this.#pending.get(data.id);
        this.#pending.delete(data.id);
        if (data.type === 'error') p?.reject(new Error(data.message)); else p?.resolve(data);
      };
    }
    if (msg.type === 'speak') this.#spoken++;
    const id = ++this.#seq;
    return new Promise((resolve, reject) => {
      this.#pending.set(id, { resolve, reject });
      this.#worker.postMessage({ ...msg, id }, transfer ?? []);
    });
  }

  /** Download (first time) and load a voice. Safe to call repeatedly. */
  prepare(voiceId) {
    if (this.#ready.has(voiceId)) return Promise.resolve();
    if (!this.#preparing.has(voiceId)) {
      this.#preparing.set(voiceId, this.#call({ type: 'prepare', voice: voiceId })
        .then(() => { this.#ready.add(voiceId); })
        .finally(() => this.#preparing.delete(voiceId)));
    }
    return this.#preparing.get(voiceId);
  }

  async #clip(text, voiceId) {
    const key = `${voiceId}|${text}`;
    if (!this.#clips.has(key)) {
      await this.prepare(voiceId); // (again after a fresh worker)
      const { wav } = await this.#call({ type: 'speak', voice: voiceId, text });
      this.#clips.set(key, URL.createObjectURL(new Blob([wav], { type: 'audio/wav' })));
      if (this.#clips.size > 80) { const [k, url] = this.#clips.entries().next().value; URL.revokeObjectURL(url); this.#clips.delete(k); }
    }
    return this.#clips.get(key);
  }

  /** Synthesise ahead of time (e.g. the next line) so playback starts instantly. */
  warm(text, voice) { if (this.isReady(voice.id)) this.#clip(text, voice.id).catch(() => {}); }

  async speak(text, { voice, rate = 1 }) {
    const token = this.#audio = {};
    const url = await this.#clip(text, voice.id);
    if (this.#audio !== token) return; // cancelled or superseded meanwhile
    this.#audio = 'playing';
    await playVoice(url, (voice.pitch ?? 1) * rate); // the shared element (voiceAudio.js: phones)
  }

  cancel() { if (this.#audio === 'playing') stopVoice(); this.#audio = null; }
}
