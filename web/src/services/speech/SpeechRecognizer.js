/**
 * Speech-to-text port. `listen()` resolves with
 * `{ transcript, alternatives: string[], confidence, language?, languageConfidence? }`.
 * `language` is only filled by recognizers that detect it (e.g. a Whisper server).
 */
export class SpeechRecognizer {
  get supported() { return false; }
  async listen() { throw new Error('Speech recognition not supported'); }
  cancel() {}
}

/** Longest time one listen may take (ms). */
const LISTEN_MAX = 9000;

/** Browser Web Speech API (Chrome, Edge, Safari). Transcribes as Turkish. */
export class WebSpeechRecognizer extends SpeechRecognizer {
  #active = null;

  constructor(lang = 'tr-TR') {
    super();
    this.lang = lang;
    this.Impl = window.SpeechRecognition || window.webkitSpeechRecognition;
  }

  get supported() { return !!this.Impl; }

  listen() {
    return new Promise((resolve, reject) => {
      const r = new this.Impl();
      r.lang = this.lang;
      r.interimResults = false;
      r.maxAlternatives = 3;
      let done = false;
      r.onresult = (e) => {
        done = true;
        const alts = [...e.results[0]];
        resolve({ transcript: alts[0].transcript, alternatives: alts.map((a) => a.transcript), confidence: alts[0].confidence });
      };
      r.onerror = (e) => { done = true; clearTimeout(limit); reject(new Error(e.error)); };
      r.onend = () => { clearTimeout(limit); if (!done) resolve({ transcript: '', alternatives: [], confidence: 0 }); this.#active = null; };
      // some phones never end the session (the mic stayed on "Dinliyorum…" for good): give up after a while
      const limit = setTimeout(() => {
        try { r.stop(); } catch { /* already over */ }
        setTimeout(() => { if (!done) { done = true; try { r.abort(); } catch { /* */ } this.#active = null; resolve({ transcript: '', alternatives: [], confidence: 0 }); } }, 1500);
      }, LISTEN_MAX);
      this.#active = r;
      r.start();
    });
  }

  /** Stop listening but still deliver what was heard (push-to-talk release). */
  stop() { this.#active?.stop(); }

  cancel() { this.#active?.abort(); }
}

/**
 * Records a short clip and posts it to a speech server (e.g. faster-whisper behind
 * a small HTTP endpoint). Expected response: `{ text, language, language_probability }`.
 * Whisper's language ID is what tells us the player really spoke Turkish.
 */
export class RemoteSpeechRecognizer extends SpeechRecognizer {
  #rec = null;

  constructor(endpoint, seconds = 4) { super(); this.endpoint = endpoint; this.seconds = seconds; }

  get supported() { return !!(navigator.mediaDevices?.getUserMedia && window.MediaRecorder); }

  async listen() {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const chunks = [];
    const rec = this.#rec = new MediaRecorder(stream);
    rec.ondataavailable = (e) => chunks.push(e.data);
    const stopped = new Promise((r) => { rec.onstop = r; });
    rec.start();
    setTimeout(() => rec.state !== 'inactive' && rec.stop(), this.seconds * 1000);
    await stopped;
    stream.getTracks().forEach((t) => t.stop());
    const body = new FormData();
    body.append('audio', new Blob(chunks, { type: rec.mimeType }), 'speech.webm');
    const res = await fetch(this.endpoint, { method: 'POST', body });
    if (!res.ok) throw new Error(`STT ${res.status}`);
    const j = await res.json();
    return { transcript: j.text ?? '', alternatives: [], confidence: 1, language: j.language, languageConfidence: j.language_probability };
  }

  cancel() { if (this.#rec?.state === 'recording') this.#rec.stop(); }
}

/** Test double: "hears" whatever the activity expects. Enabled with ?fakemic. */
export class ScriptedRecognizer extends SpeechRecognizer {
  get supported() { return true; }
  async listen({ expected = [] } = {}) {
    await new Promise((r) => setTimeout(r, 300));
    const t = expected[0] ?? 'merhaba';
    return { transcript: t, alternatives: [t], confidence: 0.9 };
  }
}
