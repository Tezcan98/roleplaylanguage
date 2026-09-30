/**
 * Listen → detect language → compare with the expected answers.
 * Activities depend on this abstraction only, so the recognizer (browser, Whisper server,
 * test double) and the detector can be swapped in main.js.
 */
export class SpeechEvaluator {
  constructor({ recognizer, detector, matcher, threshold = 0.72 }) {
    Object.assign(this, { recognizer, detector, matcher, threshold });
  }

  get supported() { return this.recognizer.supported; }
  cancel() { this.recognizer.cancel(); }

  /** @returns {Promise<{transcript, lang, score, match, pass, reason: 'ok'|'silent'|'not-turkish'|'mismatch'}>} */
  async evaluate(target) {
    const heard = await this.recognizer.listen({ expected: target.expect ?? [] });
    const transcript = heard.transcript?.trim() ?? '';
    if (!transcript) return { transcript, pass: false, score: 0, reason: 'silent' };
    const lang = this.detector.detect(heard);
    let best = { score: 0, match: null };
    for (const t of [transcript, ...(heard.alternatives ?? [])]) {
      const s = this.matcher.score(t, target);
      if (s.score > best.score) best = s;
    }
    const turkish = lang.lang === 'tr' || (lang.lang === 'unknown' && best.score >= this.threshold);
    if (!turkish) return { transcript, lang, ...best, pass: false, reason: 'not-turkish' };
    const pass = best.score >= this.threshold;
    return { transcript, lang, ...best, pass, reason: pass ? 'ok' : 'mismatch' };
  }
}
