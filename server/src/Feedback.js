import { appendFileSync, existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { createHash } from 'node:crypto';

/**
 * What the players think of the game. Once a day the game asks them to write it down
 * (web/src/ui/FeedbackView.js); Gemini reads it and says whether it is a real opinion about the
 * game — something the player saw, liked, missed or found broken — or filler (random letters, the
 * same word again and again, text about something else, made-up praise with nothing in it). A real
 * one earns credits, more for a detailed, useful one. One a day per device (and per address).
 *
 *   POST /api/feedback        { text, pid, lang?, v?, place? } → { ok, credits, verdict, next }
 *   GET  /api/feedback-list?key=…   the latest ones, newest first (&format=json)
 *
 * One JSON line per message in DIR/YYYY-MM.jsonl; the device id is kept only as a short hash.
 */
const DAY = 86_400_000;
const MIN = 15, MAX = 1200; // characters
/** Credits by the model's grade: 0 filler · 1 short but real · 2 a clear opinion · 3 detailed and useful. */
export const CREDITS = [0, 5, 10, 20];

const SCHEMA = {
  type: 'OBJECT',
  properties: {
    grade: { type: 'INTEGER', description: '0-3' },
    reason: { type: 'STRING', description: 'kısa Türkçe gerekçe (en fazla 1 cümle)' },
  },
  required: ['grade', 'reason'],
};

const PROMPT = `Sen "Türk Ailem" adlı Türkçe öğreten 3D oyunun geri bildirim değerlendiricisisin. Oyunda oyuncu bir Türk köyünde aileyle yaşar: görevler, konuşmalar, okul, köy meydanı, park, çok oyunculu meydan, satranç, dama, mağaza, krediler, reklamlar var. Oyuncular çoğunlukla çocuk ve genç; Türkçe, Arapça, Urduca, İngilizce, İspanyolca ya da Fransızca yazabilirler.
Oyuncunun yazdığı geri bildirimi değerlendir ve 0-3 arası not ver:
0 = anlamsız ya da uydurma: rastgele harfler, aynı kelimenin tekrarı, kopyala-yapıştır, oyunla ilgisiz metin, sadece "güzel", "iyi", "kredi ver" gibi içi boş şeyler, hakaret.
1 = kısa ama gerçek bir görüş (ör. "oyun güzel ama yavaş açılıyor").
2 = açık bir görüş, beğendiği ya da sorun yaşadığı belirli bir şey anlatıyor.
3 = ayrıntılı ve faydalı: somut bir hata, öneri ya da deneyim anlatıyor.
Yazım hatalarına, dile ve çocuk diline göre not kırma. Sadece istenen JSON'u döndür.`;

export class Feedback {
  #last = new Map(); // device hash or ip → time of the last accepted message
  #items = [];       // the latest messages, newest last

  /**
   * @param {object} o
   * @param {string} [o.apiKey]  GEMINI_API_KEY; without one a simple check grades it (local play-tests)
   * @param {string} [o.model]   comma separated, the next one when one is busy
   * @param {string} [o.dir]     where the month files and the daily limits go
   * @param {string} [o.key]     for the list page
   * @param {boolean} [o.perIp]  one a day per address too (off on the local test server: every player is 127.0.0.1)
   */
  constructor({ apiKey = '', model = 'gemini-flash-lite-latest,gemini-flash-latest', dir = null, key = '', perIp = true, fetchImpl = fetch, log = console.log, now = () => Date.now() } = {}) {
    Object.assign(this, { apiKey, dir, key, perIp, fetchImpl, log, now });
    this.models = String(model).split(',').map((m) => m.trim()).filter(Boolean);
    if (dir) { mkdirSync(dir, { recursive: true }); this.#load(); }
  }

  #load() {
    try { for (const [k, t] of Object.entries(JSON.parse(readFileSync(join(this.dir, 'limits.json'), 'utf8')))) if (this.now() - t < DAY) this.#last.set(k, t); } catch { /* none yet */ }
    const months = readdirSync(this.dir).filter((f) => /^\d{4}-\d{2}\.jsonl$/.test(f)).sort().slice(-2);
    for (const f of months) for (const line of readFileSync(join(this.dir, f), 'utf8').split('\n')) { try { if (line) this.#items.push(JSON.parse(line)); } catch { /* a broken line */ } }
    this.#items = this.#items.slice(-500);
  }

  #save(item) {
    this.#items.push(item);
    if (this.#items.length > 500) this.#items.shift();
    if (!this.dir) return;
    try {
      appendFileSync(join(this.dir, `${new Date(item.t).toISOString().slice(0, 7)}.jsonl`), `${JSON.stringify(item)}\n`);
      writeFileSync(join(this.dir, 'limits.json'), JSON.stringify(Object.fromEntries([...this.#last].filter(([, t]) => this.now() - t < DAY))));
    } catch (e) { this.log(`[feedback] ${e.message}`); }
  }

  /** When this device (or address) may write again; 0 = now. */
  waitFor(device, ip) {
    const t = Math.max(this.#last.get(device) ?? 0, (this.perIp && this.#last.get(`ip:${ip}`)) || 0);
    return t ? Math.max(0, t + DAY - this.now()) : 0;
  }

  /** Grades a message; returns { status, body }. */
  async handle(body, ip) {
    const text = typeof body?.text === 'string' ? body.text.trim().slice(0, MAX) : '';
    const pid = typeof body?.pid === 'string' && /^[A-Za-z0-9_-]{6,64}$/.test(body.pid) ? body.pid : '';
    if (!pid || text.length < MIN) return { status: 400, body: { error: 'too short' } };
    const device = createHash('sha256').update(pid).digest('hex').slice(0, 12);
    const wait = this.waitFor(device, ip);
    if (wait > 0) return { status: 429, body: { error: 'once a day', next: this.now() + wait } };
    let grade, reason;
    try { ({ grade, reason } = this.apiKey ? await this.#ask(text) : simpleGrade(text)); } catch (e) {
      this.log(`[feedback] ${e.message}`);
      return { status: 502, body: { error: 'upstream' } }; // not counted: they can send it again
    }
    grade = Math.max(0, Math.min(3, Math.round(Number(grade) || 0)));
    const t = this.now();
    this.#last.set(device, t); this.#last.set(`ip:${ip}`, t);
    if (this.#last.size > 20000) this.#last.clear();
    const lang = /^[a-z]{2}$/.test(String(body.lang ?? '')) ? body.lang : '';
    const v = typeof body.v === 'string' ? body.v.slice(0, 16) : '';
    const place = typeof body.place === 'string' ? body.place.slice(0, 40) : '';
    this.#save({ t, d: device, lang, v, place, grade, reason: String(reason ?? '').slice(0, 200), text });
    return { status: 200, body: { ok: true, grade, credits: CREDITS[grade], next: t + DAY } };
  }

  async #ask(text) {
    const req = JSON.stringify({
      systemInstruction: { parts: [{ text: PROMPT }] },
      contents: [{ role: 'user', parts: [{ text: `Geri bildirim:\n"""${text}"""` }] }],
      generationConfig: { responseMimeType: 'application/json', responseSchema: SCHEMA, temperature: 0, maxOutputTokens: 256 },
    });
    let last;
    for (const model of this.models) {
      const res = await this.fetchImpl(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`, {
        method: 'POST', headers: { 'Content-Type': 'application/json', 'x-goog-api-key': this.apiKey }, body: req, signal: AbortSignal.timeout(15000),
      });
      if (res.status === 429 || res.status === 503) { last = new Error(`Gemini ${model} busy (${res.status})`); continue; }
      if (!res.ok) throw new Error(`Gemini ${res.status}`);
      const data = await res.json();
      return JSON.parse(data.candidates?.[0]?.content?.parts?.map((p) => p.text ?? '').join('') ?? '');
    }
    throw last ?? new Error('no model');
  }

  /** The two routes, with CORS for the game's origins; true when it answered. */
  route(req, res, { allowOrigin = () => true, clientIp = (r) => r.socket.remoteAddress } = {}) {
    if (req.url.startsWith('/api/feedback-list')) {
      const u = new URL(req.url, 'http://x');
      if (!this.key || u.searchParams.get('key') !== this.key) { res.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' }); res.end('yetkisiz\n'); return true; }
      const list = this.#items.slice().reverse();
      if (u.searchParams.get('format') === 'json') { res.writeHead(200, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }); res.end(JSON.stringify(list)); return true; }
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex' });
      res.end(page(list));
      return true;
    }
    if (!req.url.startsWith('/api/feedback')) return false;
    const origin = req.headers.origin;
    const cors = origin && allowOrigin(origin)
      ? { 'Access-Control-Allow-Origin': origin, 'Access-Control-Allow-Methods': 'POST, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type', 'Access-Control-Max-Age': '600', Vary: 'Origin' }
      : {};
    const reply = (status, body) => { res.writeHead(status, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', ...cors }); res.end(JSON.stringify(body)); };
    if (origin && !allowOrigin(origin)) { reply(403, { error: 'origin' }); return true; }
    if (req.method === 'OPTIONS') { res.writeHead(204, cors); res.end(); return true; }
    if (req.method !== 'POST') { reply(405, { error: 'method' }); return true; }
    let raw = '';
    req.setEncoding('utf8');
    req.on('data', (d) => { raw += d; if (raw.length > 8192) { reply(413, { error: 'too large' }); req.destroy(); } });
    req.on('end', async () => {
      if (res.headersSent) return;
      let body;
      try { body = JSON.parse(raw); } catch { reply(400, { error: 'json' }); return; }
      const out = await this.handle(body, clientIp(req));
      reply(out.status, out.body);
    });
    return true;
  }
}

/** Without Gemini (local play-tests): a few real words, not the same thing over and over. */
export function simpleGrade(text) {
  const words = text.toLocaleLowerCase('tr').match(/\p{L}{2,}/gu) ?? [];
  const distinct = new Set(words).size;
  if (words.length < 4 || distinct < words.length / 2 || !/[aeıioöuüâ]/i.test(text)) return { grade: 0, reason: 'anlamlı bir görüş değil' };
  return { grade: distinct >= 25 ? 3 : distinct >= 10 ? 2 : 1, reason: 'basit kontrol' };
}

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const STARS = ['✗', '★', '★★', '★★★'];

/** The list page: the latest messages, newest first. */
function page(list) {
  const time = (t) => new Date(t).toLocaleString('tr-TR', { timeZone: 'Europe/Istanbul' });
  return `<!doctype html><html lang="tr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Geri bildirimler</title>
<style>body{font:15px system-ui,sans-serif;margin:16px;background:#14202e;color:#e8eef5}h1{font-size:22px;margin:0 0 4px}small{color:#9fb0c2}
.it{background:#1d2b3c;border-radius:12px;padding:10px 14px;margin:10px 0;max-width:900px}.it p{margin:6px 0 0;white-space:pre-wrap}.g{color:#ffd54a;font-weight:700}.g0{color:#e57373}</style></head><body>
<h1>Geri bildirimler</h1><small>${list.length} mesaj · en yenisi üstte · not: ✗ anlamsız, ★ kısa, ★★ açık, ★★★ ayrıntılı</small>
${list.map((x) => `<div class="it"><small>${esc(time(x.t))} · ${esc(x.lang || '?')} · ${esc(x.v || '')} · ${esc(x.place || '')} · cihaz ${esc(x.d)}</small> <span class="g g${x.grade}">${STARS[x.grade] ?? ''} ${CREDITS[x.grade] ?? 0} kredi</span> <small>${esc(x.reason)}</small><p>${esc(x.text)}</p></div>`).join('')}
</body></html>`;
}
