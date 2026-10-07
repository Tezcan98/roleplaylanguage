/**
 * Decides whether a public speech bubble in the village square may be shown. The square is
 * for children learning Turkish, so a bubble is held back (and written to the moderation
 * log) when it is
 *   - not Turkish (the square is a Turkish-only place), or
 *   - harmful: sexual content, drugs / alcohol / cigarettes, swearing, bad habits (gambling,
 *     smoking…), violence or threats, bullying, hate, self-harm, or personal details
 *     (phone, address, meeting in real life).
 *
 * Three layers, cheapest first:
 *   1. the word list (ChatFilter) — instant, always on;
 *   2. a script / stop-word check for the language — instant, always on;
 *   3. a decision model, when one is configured:
 *        systemone  a "System 1" decision model over the POST /v1/systemone protocol:
 *                   TypeSafe's hosted Jev (https://api.typesafe.ai, TYPESAFE_API_KEY) or a
 *                   self-hosted open-weights Laya (`pip install "laya[serve]"; laya-serve`,
 *                   multilingual, ~30 ms a decision, no data leaves your machine)
 *        gemini     Google Gemini with a short classification prompt (GEMINI_API_KEY)
 * Verdicts are cached; when the model is down or slow the first two layers still apply
 * (`failClosed: true` holds every bubble back instead).
 */
import { appendFile } from 'node:fs/promises';
import { ChatFilter } from './ChatFilter.js';

export const CATEGORIES = {
  sexual: 'sexual content, flirting, body talk',
  drugs: 'drugs, alcohol, cigarettes, vaping',
  profanity: 'swearing, insults, rude words',
  bad_habit: 'gambling, betting, smoking, boasting about bad habits',
  violence: 'threats, weapons, fighting, hurting someone',
  bullying: 'mocking or humiliating another player',
  hate: 'hatred of a people, religion or group',
  self_harm: 'self-harm or suicide',
  personal_info: 'phone numbers, addresses, social media, meeting in real life',
};
/** Question set for a System 1 model (Jev / Laya). */
const QUESTIONS = {
  turkish: { type: 'noul', instructions: 'Is this chat message written in Turkish?' },
  harm: {
    type: 'choice',
    instructions: 'A child wrote this in the public chat of a language-learning game for children. What is wrong with it, if anything?',
    criteria: { none: 'nothing: everyday talk, greetings, the game, school, family', ...CATEGORIES },
  },
};
const HARM_MIN = 0.6;      // a category must be at least this likely to hold a bubble back
const NOT_TURKISH = 0.2;   // …and "Turkish" at most this likely for the language

const PROMPT = `You moderate one chat message written by a player in a Turkish-learning game for children (8-14).
Players must speak Turkish in this public square. Decide:
- "turkish": true if the message is Turkish (a few names or loanwords are fine); false if it is mainly another language.
- "category": "none" if it is fine for children, otherwise the main problem: ${Object.entries(CATEGORIES).map(([k, v]) => `${k} (${v})`).join(', ')}, other.
Ordinary everyday talk, game talk and polite greetings are "none". Answer only JSON.`;
const SCHEMA = { type: 'OBJECT', properties: { turkish: { type: 'BOOLEAN' }, category: { type: 'STRING', enum: ['none', ...Object.keys(CATEGORIES), 'other'] } }, required: ['turkish', 'category'] };

// --- language without a model --------------------------------------------------------
const TR_WORDS = new Set(('ve bir bu şu o ne evet hayır merhaba selam teşekkür teşekkürler sağ ol ben sen biz siz çok var yok mı mi mu mü '
  + 'için ile gibi ama değil tamam anne baba dede nine günaydın iyi geceler lütfen afiyet olsun adım benim nasılsın naber '
  + 'gel git hadi oyna oynayalım top gol satranç kim nerede nereye burada orada şimdi sonra da de ki').split(' '));
const FOREIGN_WORDS = new Set(('the a an is are am you he she it we they what yes no hello hi thanks my your to and of in on this that please '
  + 'el la los las es y que por para con una hola gracias el le les et est je tu il nous vous bonjour merci oui non '
  + 'der die das und ist ich du nicht ja nein hallo danke').split(' '));
const TR_CHARS = /[çğıöşü]/;
const TR_SUFFIX = /(yor|yorum|dım|dim|dum|düm|lar|ler|ım|im|um|üm|sın|sin|mış|miş|acak|ecek|alım|elim|dır|dir|da|de|ta|te)$/;
// letters of other scripts: Arabic, Cyrillic, Greek, Hebrew, Indic, CJK, Hangul, Thai…
const OTHER_SCRIPT = /[Ͱ-ϿЀ-ӿ֐-ۿݐ-ࣿऀ-෿฀-๿぀-ヿ㐀-鿿가-힯]/u;

/** 'tr' | 'other' | 'unknown' (too short or mixed to tell). */
export function guessLanguage(text) {
  const letters = String(text).match(/\p{L}/gu) ?? [];
  if (!letters.length) return 'unknown';
  const other = letters.filter((ch) => OTHER_SCRIPT.test(ch)).length;
  if (other / letters.length > 0.5) return 'other';
  const words = String(text).toLowerCase().match(/[a-zçğıöşüâîû]+/g) ?? [];
  let tr = 0, foreign = 0;
  for (const w of words) {
    if (TR_WORDS.has(w) || TR_CHARS.test(w)) tr++;
    else if (w.length > 3 && TR_SUFFIX.test(w)) tr += 0.6;
    if (FOREIGN_WORDS.has(w)) foreign++;
  }
  if (tr > 0 && tr >= foreign) return 'tr';
  return foreign >= 2 && foreign > tr ? 'other' : 'unknown';
}

export class Moderator {
  #cache = new Map();

  /**
   * @param {object} o
   * @param {'off'|'systemone'|'gemini'} [o.provider]
   * @param {string} [o.url]     System 1 server: https://api.typesafe.ai (Jev) or http://127.0.0.1:8000 (laya-serve)
   * @param {string} [o.apiKey]  TYPESAFE_API_KEY for Jev (laya-serve needs none) / GEMINI_API_KEY
   * @param {string} [o.model]   e.g. "multilingual" for Laya; empty → the server picks
   * @param {boolean} [o.turkishOnly]  hold back bubbles that are not Turkish (default true)
   * @param {string} [o.logFile]  moderation log (JSON lines); empty → console only
   */
  constructor({ provider = 'off', url = '', apiKey = '', model = '', turkishOnly = true, failClosed = false, timeoutMs = 2500, logFile = '', log = console.log, fetchImpl = fetch } = {}) {
    Object.assign(this, { provider, apiKey, model, url: url.replace(/\/+$/, ''), turkishOnly, failClosed, timeoutMs, logFile, log, fetchImpl });
    if (provider === 'gemini' && !apiKey) this.provider = 'off';
    if (provider === 'systemone' && !this.url) this.provider = 'off';
    if (provider === 'gemini' && !model) this.model = 'gemini-flash-lite-latest';
  }

  get usesModel() { return this.provider !== 'off'; }

  /** @returns {Promise<{ ok: boolean, reason?: string, by?: 'words' | 'script' | 'model' | 'error' }>} */
  async check(text) {
    const t = String(text).trim();
    if (ChatFilter.blocks(t)) return { ok: false, reason: 'profanity', by: 'words' };
    const lang = guessLanguage(t);
    if (this.turkishOnly && lang === 'other') return { ok: false, reason: 'language', by: 'script' };
    if (!this.usesModel) return { ok: true };
    const key = t.toLocaleLowerCase('tr');
    if (this.#cache.has(key)) return this.#cache.get(key);
    let verdict;
    try {
      const v = await (this.provider === 'gemini' ? this.#gemini(t) : this.#systemOne(t));
      verdict = v.category !== 'none' ? { ok: false, reason: v.category, by: 'model' }
        : this.turkishOnly && v.turkish === false && lang !== 'tr' ? { ok: false, reason: 'language', by: 'model' }
          : { ok: true };
    } catch (e) {
      this.log(`[moderation] ${this.provider} failed: ${e.message}`);
      return this.failClosed ? { ok: false, reason: 'unchecked', by: 'error' } : { ok: true };
    }
    this.#cache.set(key, verdict);
    if (this.#cache.size > 1000) this.#cache.delete(this.#cache.keys().next().value);
    return verdict;
  }

  /** One held-back message, for whoever looks after the square. */
  async record(entry) {
    const line = JSON.stringify({ at: new Date().toISOString(), ...entry });
    this.log(`[moderation] held back ${line}`);
    if (this.logFile) await appendFile(this.logFile, `${line}\n`).catch((e) => this.log(`[moderation] log file: ${e.message}`));
  }

  /** Jev / Laya: one forward pass answers both questions → { turkish, category }. */
  async #systemOne(text) {
    const res = await this.fetchImpl(`${this.url}/v1/systemone`, {
      method: 'POST', signal: AbortSignal.timeout(this.timeoutMs),
      headers: { 'Content-Type': 'application/json', ...(this.apiKey ? { Authorization: `Bearer ${this.apiKey}` } : {}) },
      body: JSON.stringify({ ...(this.model ? { model: this.model } : {}), state: { message: text }, questions: QUESTIONS }),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const { answers = {} } = await res.json();
    const harm = answers.harm ?? {}, yes = Number(answers.turkish?.noul);
    const p = harm.probabilities?.[harm.choice] ?? 1;
    const category = harm.choice && harm.choice !== 'none' && CATEGORIES[harm.choice] && p >= HARM_MIN ? harm.choice : 'none';
    return { turkish: Number.isFinite(yes) ? yes > NOT_TURKISH : null, category };
  }

  async #gemini(text) {
    const res = await this.fetchImpl(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(this.model)}:generateContent`, {
      method: 'POST', signal: AbortSignal.timeout(this.timeoutMs),
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': this.apiKey },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: PROMPT }] },
        contents: [{ role: 'user', parts: [{ text }] }],
        generationConfig: { responseMimeType: 'application/json', responseSchema: SCHEMA, temperature: 0, maxOutputTokens: 60 },
      }),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    if (data.promptFeedback?.blockReason) return { turkish: true, category: 'other' }; // Gemini's own filter refused it
    return JSON.parse(data.candidates?.[0]?.content?.parts?.map((p) => p.text ?? '').join('') || '{}');
  }
}
