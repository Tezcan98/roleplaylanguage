/**
 * The square's talk button in the player's own language (Arabic, Urdu, Hindi, English…): what was said
 * is turned into simple Turkish here (Gemini) before the moderator sees it, so the square stays a
 * Turkish place and the usual checks still decide what is shown. The speaker sees their sentence in
 * Turkish too ('said'). No key, a failure or a refusal: null (the bubble is held back as "not Turkish").
 *
 *   new Translator({ apiKey }).toTurkish(text, 'ar') → 'Merhaba, nasılsın?' | null
 */
export const LANGS = { ar: 'Arabic', en: 'English', ur: 'Urdu', hi: 'Hindi', es: 'Spanish', fr: 'French', id: 'Indonesian' };

const PROMPT = `You translate one short chat message, spoken by a child in a Turkish-learning game, into simple, natural Turkish.
Reply with the Turkish sentence only: no quotes, no notes, no other language. Keep names as they are.
If the message is insulting, sexual, asks for personal details (phone, address, social media) or is not a real sentence, reply with exactly: -`;

export class Translator {
  /** `perDay`: translations a day in all (a cap on the cost). */
  constructor({ apiKey = '', model = 'gemini-flash-lite-latest', timeoutMs = 4000, perDay = 3000, fetchImpl = fetch, log = console.log } = {}) {
    Object.assign(this, { apiKey, model, timeoutMs, perDay, fetchImpl, log });
    this.day = ''; this.used = 0;
  }

  get enabled() { return !!this.apiKey; }

  async toTurkish(text, from) {
    if (!this.enabled || !LANGS[from] || !text) return null;
    const today = new Date().toISOString().slice(0, 10);
    if (today !== this.day) { this.day = today; this.used = 0; }
    if (++this.used > this.perDay) return null;
    try {
      const res = await this.fetchImpl(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(this.model)}:generateContent`, {
        method: 'POST', signal: AbortSignal.timeout(this.timeoutMs),
        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': this.apiKey },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: PROMPT }] },
          contents: [{ role: 'user', parts: [{ text: `(${LANGS[from]}) ${text}` }] }],
          generationConfig: { temperature: 0, maxOutputTokens: 80 },
        }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if (data.promptFeedback?.blockReason) return null;
      const out = (data.candidates?.[0]?.content?.parts ?? []).map((p) => p.text ?? '').join('').trim().replace(/^["“']|["”']$/g, '');
      return out && out !== '-' ? out.slice(0, 140) : null;
    } catch (e) {
      this.log(`[translate] ${from}: ${e.message}`);
      return null;
    }
  }
}
