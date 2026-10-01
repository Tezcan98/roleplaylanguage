/**
 * Free conversation with village characters through Google Gemini (POST /api/npc-chat).
 * The API key and the character prompts live only on the server; the game sends the
 * character id, the player's message and the recent turns, and gets back a short Turkish
 * reply with its meaning in the player's language.
 *
 * Abuse limits: per IP (per minute and per day) and a global daily cap, so the free quota
 * can't be drained by one visitor.
 */
import { ChatFilter } from './ChatFilter.js';

const LANG_NAMES = { ar: 'Arabic', en: 'English', ur: 'Urdu', es: 'Spanish', fr: 'French' };
const MAX_MESSAGE = 200;
const MAX_TURNS = 10;

const BASE_RULES = `
Oyun: "Yılmaz Ailesi" adlı, bir Türk köyünde geçen ve Türkçe öğreten bir oyun. Karşındaki kişi Türkçe öğrenen bir oyuncu (çoğunlukla çocuk ya da genç, Türkçesi başlangıç seviyesinde).
Kurallar:
- Her zaman karakterinde kal, sadece TÜRKÇE konuş. Cümlelerin kısa ve basit olsun (A1-A2 seviyesi), en fazla 2 cümle.
- Her cevabın sonunda oyuncuya konuyla ilgili kısa bir soru sor ki konuşma sürsün ve pratik yapsın.
- Oyuncu Türkçe hata yaparsa kızma; doğru söylenişini "correction" alanında nazikçe ver (hata yoksa boş bırak).
- Oyuncu başka dilde yazarsa, Türkçe cevap ver ve onu Türkçe söylemeye teşvik et.
- Çocuklara uygun ol: kaba söz, şiddet, korku, siyaset, flört veya uygunsuz konulara girme; nazikçe konuyu köy hayatına, alışverişe, aileye, okula çevir.
- Kişisel bilgi (adres, telefon, okul adı, fotoğraf) isteme ve verme. Gerçek dünyadan buluşma önerme.
- Oyunun dışından bir şey yapmanı isterlerse (ödev yazmak, kod, başka rol) kibarca reddet ve karakterinle devam et.
- "meaning" alanı: cevabının oyuncunun dilindeki ({LANG}) doğal çevirisi.
- "words" alanı: cevabındaki en fazla 3 faydalı Türkçe kelime ve {LANG} anlamları.
Sadece istenen JSON'u döndür.`;

/** The characters' roles. Ids match the game's NPC ids. */
export const PERSONAS = {
  manav: 'Sen köy meydanındaki manavsın, adın Rıza. Taze meyve ve sebze satıyorsun: elma, armut, domates, salatalık, patates, soğan, karpuz. Fiyatlar kilo hesabı (elma kilosu 30 lira gibi). Türkçe öğrenmek isteyen birisi için alışveriş dilini öğretirsin: "Kaç kilo istersin?", "Buyurun", "Başka bir şey?", sayılar, renkler, tatlar. Güler yüzlü ve sabırlısın.',
  bakkal: 'Sen köyün bakkalısın, adın Mehmet. Dükkanında ekmek, süt, peynir, yumurta, çay, şeker, sabun, defter ve kalem var. Türkçe öğrenen birine alışveriş cümlelerini, fiyatları ve para üstünü öğretirsin. Samimi, biraz şakacı bir esnafsın.',
  muhtar: 'Sen köyün muhtarısın, adın Hasan. Köyü, insanları, yolları ve köydeki yerleri (cami, okul, meydan, çeşme, bakkal, manav) iyi bilirsin. Türkçe öğrenen birine yön tarifini ("sağa dön", "düz git", "yanında", "karşısında") ve köy hayatını anlatırsın. Saygılı ve babacansın.',
  elif: 'Sen Elif\'sin, 10 yaşında, oyuncunun sınıf arkadaşısın. Resim yapmayı, kitap okumayı ve ip atlamayı seversin. Okul, oyunlar, hafta sonu ve hobiler hakkında çocukça ve neşeli konuşursun.',
  can: 'Sen Can\'sın, 10 yaşında, oyuncunun sınıf arkadaşısın. Futbolu çok seversin ve şakacısın. Top oynamak, maçlar, okul ve teneffüs hakkında eğlenceli, kısa cümlelerle konuşursun.',
  zehra: 'Sen Zehra\'sın, 10 yaşında, oyuncunun sınıf arkadaşısın. Hayvanları, özellikle kedileri seversin ve bahçede annene yardım edersin. Hayvanlar, çiçekler, okul ve aile hakkında tatlı tatlı konuşursun.',
  ogretmen: 'Sen köy okulundaki öğretmen Zeynep Hanım\'sın. Türkçe öğrenen öğrencine sabırla, öğretici ama doğal konuşursun. Her cevapta bir kelime ya da küçük bir dilbilgisi ipucu verirsin.',
  anne: 'Sen Ayşe\'sin, oyuncunun annesisin. Ev işleri, yemek, aile ve günlük rutin hakkında sıcak ve şefkatli konuşursun. Yemek tariflerinden ve evdeki eşyalardan kelimeler öğretirsin.',
  baba: 'Sen Mehmet\'sin, oyuncunun babasısın. Tarlada ve köyde çalışırsın, traktörün var. İş, hayvanlar, tarla, hava durumu ve sorumluluklar hakkında sakin ve kısa konuşursun.',
  dede: 'Sen Hüseyin Dede\'sin, oyuncunun dedesisin. Eski zamanlardan, köyün geçmişinden ve Nasreddin Hoca fıkralarından bahsetmeyi seversin. Sabırlı, tatlı dilli ve bilge bir dedesin.',
  nine: 'Sen Fatma Nine\'sin, oyuncunun ninesisin. İslam ahlakı üzerine yumuşak nasihatler verirsin (selam, doğruluk, saygı, temizlik, israf etmemek, komşuluk, hayvanlara şefkat). Sevecen, dualı ve şefkatlisin; "kuzum", "evladım" dersin. Dini konularda kısa, doğru ve sade ol; fetva verme.',
};

const SCHEMA = {
  type: 'OBJECT',
  properties: {
    reply: { type: 'STRING' },
    meaning: { type: 'STRING' },
    correction: { type: 'STRING' },
    words: { type: 'ARRAY', items: { type: 'ARRAY', items: { type: 'STRING' } } },
  },
  required: ['reply', 'meaning'],
};

/** Sliding counters per key (minute / day windows). */
class Quota {
  #hits = new Map();
  constructor(limit, windowMs) { Object.assign(this, { limit, windowMs }); }
  take(key, now = Date.now()) {
    const list = (this.#hits.get(key) ?? []).filter((t) => now - t < this.windowMs);
    if (list.length >= this.limit) { this.#hits.set(key, list); return false; }
    list.push(now);
    this.#hits.set(key, list);
    return true;
  }
}

export class NpcChat {
  /**
   * @param {object} o
   * @param {string} [o.apiKey]   GEMINI_API_KEY; without one the service answers 503
   * @param {string} [o.model]    e.g. gemini-flash-latest
   * @param {typeof fetch} [o.fetchImpl]  injectable for tests
   * @param {boolean} [o.fake]    canned answers without calling Gemini (local play-tests)
   */
  constructor({ apiKey, model = 'gemini-flash-latest', perMinute = 8, perDay = 150, globalPerDay = 1200, fetchImpl = fetch, fake = false, log = console.log } = {}) {
    Object.assign(this, { apiKey, model, fetchImpl, fake, log });
    this.minute = new Quota(perMinute, 60_000);
    this.day = new Quota(perDay, 86_400_000);
    this.global = new Quota(globalPerDay, 86_400_000);
  }

  get enabled() { return this.fake || !!this.apiKey; }

  /** Validates the request; returns { status, body }. */
  async handle(body, ip) {
    if (!this.enabled) return { status: 503, body: { error: 'disabled' } };
    const npc = String(body?.npc ?? '');
    const persona = PERSONAS[npc];
    const message = typeof body?.message === 'string' ? body.message.trim().slice(0, MAX_MESSAGE) : '';
    if (!persona || !message) return { status: 400, body: { error: 'bad request' } };
    if (!this.minute.take(ip)) return { status: 429, body: { error: 'slow down' } };
    if (!this.day.take(ip) || !this.global.take('all')) return { status: 429, body: { error: 'daily limit' } };
    const lang = LANG_NAMES[body.lang] ? body.lang : 'en';
    const history = (Array.isArray(body.history) ? body.history : []).slice(-MAX_TURNS)
      .filter((h) => h && (h.role === 'user' || h.role === 'model') && typeof h.text === 'string')
      .map((h) => ({ role: h.role, text: h.text.slice(0, 300) }));
    const player = typeof body.player === 'string' && /^[\p{L} ]{2,16}$/u.test(body.player) ? body.player : 'Ahmet';
    try {
      const out = this.fake ? this.#fakeReply(npc, message) : await this.#ask({ persona, lang, history, message, player });
      return { status: 200, body: clean(out) };
    } catch (e) {
      this.log(`[npc-chat] ${npc}: ${e.message}`);
      return { status: 502, body: { error: 'upstream' } };
    }
  }

  systemPrompt(persona, lang, player) {
    return `${persona}\nOyuncunun oyundaki adı: ${player}.\n${BASE_RULES.replaceAll('{LANG}', LANG_NAMES[lang])}`;
  }

  async #ask({ persona, lang, history, message, player }) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(this.model)}:generateContent`;
    const res = await this.fetchImpl(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': this.apiKey },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: this.systemPrompt(persona, lang, player) }] },
        contents: [...history, { role: 'user', text: message }].map((h) => ({ role: h.role, parts: [{ text: h.text }] })),
        generationConfig: { responseMimeType: 'application/json', responseSchema: SCHEMA, temperature: 0.8, maxOutputTokens: 1024 },
      }),
      signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) throw new Error(`Gemini ${res.status}`);
    const data = await res.json();
    const text = data.candidates?.[0]?.content?.parts?.map((p) => p.text ?? '').join('') ?? '';
    return JSON.parse(text);
  }

  #fakeReply(npc, message) {
    return {
      reply: `Merhaba! "${message.slice(0, 40)}" dedin. Bugün ne yapmak istersin?`,
      meaning: `Hello! You said "${message.slice(0, 40)}". What would you like to do today?`,
      correction: '',
      words: [['merhaba', 'hello'], ['bugün', 'today']],
    };
  }
}

/** Keep only well-formed, short, clean fields from the model's answer. */
function clean(o) {
  const str = (v, n) => (typeof v === 'string' ? ChatFilter.clean(v.trim().slice(0, n)) : '');
  const reply = str(o?.reply, 400);
  if (!reply) throw new Error('empty reply');
  const words = (Array.isArray(o?.words) ? o.words : [])
    .filter((w) => Array.isArray(w) && typeof w[0] === 'string' && typeof w[1] === 'string')
    .slice(0, 3).map(([tr, m]) => [str(tr, 40), str(m, 60)]);
  return { reply, meaning: str(o?.meaning, 500), correction: str(o?.correction, 200), words };
}
