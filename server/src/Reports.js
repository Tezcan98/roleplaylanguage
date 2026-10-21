import { appendFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { randomBytes, timingSafeEqual } from 'node:crypto';

/**
 * Player reports ("Şikayet et"). The server keeps what each player said in the last ten minutes —
 * their square bubbles and their voice (one-to-one calls and talking zones, in short segments the
 * game sends while the mic is open) — in memory only; the long-term copy is the encrypted safety
 * log (AuditLog.js), which the server can't read back. When someone is reported:
 *   1. the reported player's last ten minutes go to Gemini, which writes the speech down and says
 *      whether it is immoral (küfür, cinsellik, taciz, zorbalık…), commercial (reklam, satış, link,
 *      para / hesap isteme) or clean;
 *   2. the report and Gemini's answer are kept (DIR/reports.jsonl) and listed on GET /api/reports;
 *   3. immoral or commercial: the operator gets a mail with the transcript and three links —
 *      ban for 7 days, ban for good, dismiss. Nobody is banned before the operator decides;
 *   4. clean, but three different players reported the same one within a day: the operator gets
 *      a mail anyway, with the voice pieces attached (the AI may have missed something).
 * A ban holds the player's device id, Play Games id and username (DIR/bans.json). A banned player
 * is not told: the server just doesn't take them, and the game plays offline (VillageServer #hello).
 * A reporter whose reports came back clean five times can't report for three days
 * (DIR/reporters.json).
 *
 *   GET /api/reports?key=…                       the latest reports, newest first (&format=json)
 *   GET /api/report-action?id=…&key=…&do=ban7|ban|dismiss|unban
 */
const MINUTE = 60_000;
export const KEEP = 10 * MINUTE;              // what is kept of each player for a report
const PER_REPORTER = 3;                       // reports per reporter in ten minutes
const SAME_TARGET = 30 * MINUTE;              // the same reporter → the same player once per half hour
export const VERDICTS = ['ahlaksiz', 'ticari', 'temiz'];
export const FALSE_REPORTS = 5;               // clean reports in a row that stop a reporter…
export const REPORT_PAUSE = 3 * 1440 * MINUTE; // …for three days
export const CROWD = 3;                       // different reporters of the same player in a day: the operator hears it anyway
const DAY = 1440 * MINUTE;

const SCHEMA = {
  type: 'OBJECT',
  properties: {
    transcript: { type: 'STRING', description: 'ses kayıtlarında söylenenlerin Türkçe yazıya dökümü (başka dilse olduğu gibi)' },
    verdict: { type: 'STRING', enum: VERDICTS },
    reason: { type: 'STRING', description: 'kısa Türkçe gerekçe (en fazla 2 cümle)' },
  },
  required: ['transcript', 'verdict', 'reason'],
};

const PROMPT = `Sen "Türk Ailem" adlı Türkçe öğreten çok oyunculu oyunun güvenlik denetçisisin. Oyuncular çoğunlukla çocuk ve genç; meydanda yazıyla, birebir sesli sohbette ve kahvehane / cami avlusu gibi toplu konuşma alanlarında sesle konuşurlar.
Bir oyuncu başka bir oyuncuyu şikayet etti. Sana şikayet edilen oyuncunun son dakikalarda söyledikleri geliyor: yazılı mesajları ve ses kayıtları (yalnızca onun sesi).
1. Ses kayıtlarında söylenenleri yazıya dök (transcript). Ses yoksa ya da anlaşılmıyorsa boş bırak.
2. Karar ver (verdict):
   - "ahlaksiz": küfür, hakaret, cinsel içerik ya da ima, taciz, tehdit, zorbalık, nefret söylemi, kişisel bilgi (adres, telefon, okul) isteme, başka bir yerde buluşmaya ya da başka bir uygulamaya çağırma.
   - "ticari": reklam, bir şey satma ya da satın almaya çağırma, link / sosyal medya hesabı / kanal tanıtma, para, hediye kartı, hesap ya da şifre isteme.
   - "temiz": bunların hiçbiri yoksa. Şaka, oyun içi tartışma, Türkçe hatası, anlamsız sesler temizdir.
3. Gerekçeyi (reason) kısa yaz; hangi söz yüzünden olduğunu belirt.
Emin değilsen "temiz" de: karar bir insana gidecek ve yanlış suçlama bir çocuğu üzer. Sadece istenen JSON'u döndür.`;

/** What the operator can do from the mail. */
const ACTIONS = { ban7: 'ban', ban: 'ban', dismiss: 'dismiss', unban: 'unban' };

export class Reports {
  #recent = new Map(); // player key → { texts: [{ t, text }], voice: [{ t, mime, data, ctx }] }
  #sent = new Map();   // reporter key → [times]; `${reporter}>${target}` → time
  #items = [];         // the latest reports, newest last
  #bans = [];          // [{ pid, gid, name, until, reason, report, t }] (until 0: for good)
  #paused = {};        // reporter key → { until, since }: no reports until `until`; clean ones counted after `since`

  /**
   * @param {object} o
   * @param {string} [o.dir]       reports.jsonl and bans.json; null: in memory only (tests)
   * @param {string} [o.apiKey]    GEMINI_API_KEY; without one the report is kept with no verdict
   * @param {string} [o.model]     comma separated, the next one when one is busy (they must hear audio)
   * @param {string} [o.key]       for the list page and the links in the mail
   * @param {string} [o.publicUrl] where the links in the mail point (https://host)
   * @param {{ send: Function, to?: string }} [o.mailer]  Mailer.js
   * @param {(ban: object) => void} [o.onBan]  a ban was decided: send matching players away
   */
  constructor({ dir = null, apiKey = '', model = 'gemini-flash-latest,gemini-flash-lite-latest', key = '', publicUrl = '', mailer = null, onBan = () => {}, fetchImpl = fetch, log = console.log, now = () => Date.now() } = {}) {
    Object.assign(this, { dir, apiKey, key, publicUrl: publicUrl.replace(/\/$/, ''), mailer, onBan, fetchImpl, log, now });
    this.models = String(model).split(',').map((m) => m.trim()).filter(Boolean);
    if (dir) { mkdirSync(dir, { recursive: true, mode: 0o700 }); this.#load(); }
  }

  #load() {
    try { this.#bans = JSON.parse(readFileSync(join(this.dir, 'bans.json'), 'utf8')); } catch { /* none yet */ }
    try { this.#paused = JSON.parse(readFileSync(join(this.dir, 'reporters.json'), 'utf8')); } catch { /* none yet */ }
    const file = join(this.dir, 'reports.jsonl');
    if (!existsSync(file)) return;
    const byId = new Map();
    for (const line of readFileSync(file, 'utf8').split('\n')) { try { if (line) { const r = JSON.parse(line); byId.set(r.id, { ...byId.get(r.id), ...r }); } } catch { /* a broken line */ } }
    this.#items = [...byId.values()].slice(-500);
  }

  /** A record line (the whole report again after every change: the last line of an id wins). */
  #save(item) {
    if (!this.dir) return;
    try { appendFileSync(join(this.dir, 'reports.jsonl'), `${JSON.stringify(item)}\n`, { mode: 0o600 }); } catch (e) { this.log(`[reports] ${e.message}`); }
  }

  #savePaused() {
    if (!this.dir) return;
    try { writeFileSync(join(this.dir, 'reporters.json'), JSON.stringify(this.#paused), { mode: 0o600 }); } catch (e) { this.log(`[reports] ${e.message}`); }
  }

  #saveBans() {
    if (!this.dir) return;
    try { writeFileSync(join(this.dir, 'bans.json'), JSON.stringify(this.#bans, null, 1), { mode: 0o600 }); } catch (e) { this.log(`[reports] ${e.message}`); }
  }

  // --- what each player said lately -------------------------------------------------------

  /** The same player across reconnects: the device id, else the username. */
  static keyOf(p) { return p.pid ? `d:${p.pid}` : `n:${String(p.name ?? '').toLocaleLowerCase('tr')}`; }

  #of(p) {
    const k = Reports.keyOf(p);
    if (!this.#recent.has(k)) this.#recent.set(k, { texts: [], voice: [] });
    const r = this.#recent.get(k), since = this.now() - KEEP;
    r.texts = r.texts.filter((x) => x.t >= since);
    r.voice = r.voice.filter((x) => x.t >= since);
    return r;
  }

  /** A square bubble (shown or held back). */
  said(p, text) { this.#of(p).texts.push({ t: this.now(), text }); }

  /** A piece of voice (base64), `ctx`: 'call' | 'zone'. */
  spoke(p, { mime, data, ctx }) { this.#of(p).voice.push({ t: this.now(), mime, data, ctx }); }

  /** Forgets players who said nothing for ten minutes (called now and then). */
  prune() {
    const since = this.now() - KEEP;
    for (const [k, r] of this.#recent) if (![...r.texts, ...r.voice].some((x) => x.t >= since)) this.#recent.delete(k);
  }

  // --- reports ----------------------------------------------------------------------------

  /**
   * `reporter` / `target`: { name, pid?, gid?, ip?, room }. Returns { ok: true, id } or
   * { ok: false, reason: 'limit' | 'again' | 'self' | 'paused', until? }; the analysis goes on afterwards
   * (`done` resolves when it is finished — for tests).
   */
  report(reporter, target, reason = '') {
    const now = this.now(), rk = Reports.keyOf(reporter), tk = Reports.keyOf(target);
    if (rk === tk) return { ok: false, reason: 'self' };
    const paused = this.#paused[rk]?.until ?? 0;
    if (paused > now) return { ok: false, reason: 'paused', until: paused };
    const times = (this.#sent.get(rk) ?? []).filter((t) => now - t < 10 * MINUTE);
    if (times.length >= PER_REPORTER) return { ok: false, reason: 'limit' };
    const last = this.#sent.get(`${rk}>${tk}`);
    if (last !== undefined && now - last < SAME_TARGET) return { ok: false, reason: 'again' };
    this.#sent.set(rk, [...times, now]);
    this.#sent.set(`${rk}>${tk}`, now);
    if (this.#sent.size > 20000) this.#sent.clear();

    const said = this.#of(target);
    const who = ({ name, pid, gid, ip }) => ({ name, ...(pid ? { pid } : {}), ...(gid ? { gid } : {}), ...(ip ? { ip } : {}) });
    const item = {
      id: randomBytes(5).toString('hex'), t: now, room: target.room, status: 'analysing', rk, tk,
      reporter: who(reporter), target: who(target), reason: String(reason).slice(0, 40),
      texts: said.texts.map((x) => x.text), voiceSeconds: said.voice.length * 10,
    };
    this.#items.push(item);
    if (this.#items.length > 500) this.#items.shift();
    this.#save(item);
    this.log(`[reports] ${item.id}: ${reporter.name} → ${target.name} (${item.reason || '—'}, ${item.texts.length} mesaj, ${said.voice.length} ses parçası)`);
    const voice = said.voice.slice(); // the pieces as they were at the report
    this.done = this.#analyse(item, voice);
    return { ok: true, id: item.id };
  }

  async #analyse(item, voice) {
    if (!item.texts.length && !voice.length) Object.assign(item, { status: 'empty', verdict: 'temiz', analysis: 'Son 10 dakikada bu oyuncudan yazı ya da ses yok.' });
    else if (!this.apiKey) Object.assign(item, { status: 'unchecked', analysis: 'GEMINI_API_KEY yok: elle bakılmalı.' });
    else {
      try {
        const r = await this.#ask(item, voice);
        Object.assign(item, { status: 'analysed', verdict: VERDICTS.includes(r.verdict) ? r.verdict : 'temiz', transcript: String(r.transcript ?? '').slice(0, 4000), analysis: String(r.reason ?? '').slice(0, 400) });
      } catch (e) {
        this.log(`[reports] ${item.id}: Gemini ${e.message}`);
        Object.assign(item, { status: 'unchecked', analysis: `Gemini cevap vermedi (${e.message}): elle bakılmalı.` });
      }
    }
    this.#save(item);
    // the operator decides: a mail for anything Gemini flagged, and for what it could not check
    if (item.verdict === 'ahlaksiz' || item.verdict === 'ticari' || item.status === 'unchecked') return this.#mail(item);
    if (item.verdict !== 'temiz') return;
    // clean — but several players reported the same one today: the operator listens to it after all
    const day = this.#items.filter((r) => r.tk === item.tk && item.t - r.t < DAY);
    if (new Set(day.map((r) => r.rk)).size >= CROWD && !day.some((r) => r.crowd)) {
      day.forEach((r) => { r.crowd = item.id; this.#save(r); });
      return this.#mailCrowd(item, day, voice);
    }
    if (item.crowd) return;
    // a reporter whose reports keep coming back clean: no reports for a while
    const since = this.#paused[item.rk]?.since ?? 0;
    const clean = this.#items.filter((r) => r.rk === item.rk && r.t > since && r.verdict === 'temiz' && !r.crowd);
    if (clean.length >= FALSE_REPORTS) {
      this.#paused[item.rk] = { until: this.now() + REPORT_PAUSE, since: this.now() };
      this.#savePaused();
      this.log(`[reports] ${item.reporter.name}: ${clean.length} şikayeti asılsız çıktı, 3 gün şikayet edemez`);
    }
  }

  /** Three or more players reported the same one, Gemini found nothing: the voice goes to the operator. */
  async #mailCrowd(item, reports, voice) {
    if (!this.mailer) return;
    const ext = { 'audio/webm': 'webm', 'audio/ogg': 'ogg', 'audio/mp4': 'm4a', 'audio/aac': 'aac', 'audio/mpeg': 'mp3', 'audio/wav': 'wav' };
    const attachments = voice.map((v, i) => {
      const type = v.mime.split(';')[0];
      return { filename: `${String(i + 1).padStart(2, '0')}_${new Date(v.t).toISOString().slice(11, 19).replace(/:/g, '-')}.${ext[type] ?? 'bin'}`, contentType: type, content: v.data };
    });
    const text = [
      `${reports.length} şikayet, ${new Set(reports.map((r) => r.rk)).size} farklı oyuncudan, son 24 saatte: ${item.target.name} (${item.room}).`,
      'Gemini hepsine "temiz" dedi; sesleri ekte (son şikayetteki son 10 dakika, her parça ~10 sn). Kendin dinle.',
      '',
      ...reports.map((r) => `- ${time(r.t)} · ${r.reporter.name} (${r.reason || '—'}): ${r.verdict ?? r.status} — ${r.analysis ?? ''}`),
      '',
      `Son ses dökümü:\n${item.transcript || '(yok)'}`,
      '',
      `Yazılı mesajları:\n${item.texts.length ? item.texts.map((t) => `- ${t}`).join('\n') : '(yok)'}`,
      '',
      `Şikayet edilen: ${item.target.name} · cihaz ${item.target.pid ?? '-'} · Play Games ${item.target.gid ?? '-'} · IP ${item.target.ip ?? '-'}`,
      '',
      'Karar:',
      `  7 gün engelle:    ${this.#link(item, 'ban7')}`,
      `  Kalıcı engelle:   ${this.#link(item, 'ban')}`,
      `  Şikayeti kapat:   ${this.#link(item, 'dismiss')}`,
    ].join('\n');
    try {
      const ok = await this.mailer.send({ subject: `[Şikayet] ${reports.length} KİŞİ ŞİKAYET ETTİ: ${item.target.name} (${item.id})`, text, attachments });
      Object.assign(item, { mailed: !!ok });
      this.#save(item);
    } catch (e) { this.log(`[reports] ${item.id}: mail ${e.message}`); }
  }

  async #ask(item, voice) {
    const parts = [{ text: `Şikayet nedeni (şikayet edenin seçtiği): ${item.reason || 'belirtilmedi'}\nYazılı mesajları:\n${item.texts.length ? item.texts.map((t) => `- ${t}`).join('\n') : '(yok)'}\nSes kayıtları: ${voice.length ? `${voice.length} parça, sırayla` : '(yok)'}` }];
    for (const v of voice) parts.push({ inlineData: { mimeType: v.mime.split(';')[0], data: v.data } });
    const req = JSON.stringify({
      systemInstruction: { parts: [{ text: PROMPT }] },
      contents: [{ role: 'user', parts }],
      generationConfig: { responseMimeType: 'application/json', responseSchema: SCHEMA, temperature: 0, maxOutputTokens: 4096 },
    });
    let last;
    for (const model of this.models) {
      let res;
      try {
        res = await this.fetchImpl(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`, {
          method: 'POST', headers: { 'Content-Type': 'application/json', 'x-goog-api-key': this.apiKey }, body: req, signal: AbortSignal.timeout(60000),
        });
      } catch (e) { last = e; continue; }
      if (res.status === 429 || res.status === 503) { last = new Error(`${model} busy (${res.status})`); continue; }
      if (!res.ok) throw new Error(`${res.status}`);
      const data = await res.json();
      return JSON.parse(data.candidates?.[0]?.content?.parts?.map((p) => p.text ?? '').join('') ?? '');
    }
    throw last ?? new Error('no model');
  }

  #link(item, act) { return `${this.publicUrl}/api/report-action?id=${item.id}&key=${encodeURIComponent(this.key)}&do=${act}`; }

  async #mail(item) {
    if (!this.mailer) return;
    const label = { ahlaksiz: 'AHLAKSIZ İÇERİK', ticari: 'TİCARİ İÇERİK' }[item.verdict] ?? 'ELLE BAKILMALI';
    const text = [
      `${item.reporter.name}, ${item.target.name} adlı oyuncuyu şikayet etti (${item.room}, ${time(item.t)}).`,
      `Şikayet nedeni: ${item.reason || '—'}`,
      `Gemini kararı: ${label} — ${item.analysis ?? ''}`,
      '',
      `Ses dökümü:\n${item.transcript || '(yok)'}`,
      '',
      `Yazılı mesajları:\n${item.texts.length ? item.texts.map((t) => `- ${t}`).join('\n') : '(yok)'}`,
      '',
      `Şikayet edilen: ${item.target.name} · cihaz ${item.target.pid ?? '-'} · Play Games ${item.target.gid ?? '-'} · IP ${item.target.ip ?? '-'}`,
      `Şikayet eden: ${item.reporter.name} · cihaz ${item.reporter.pid ?? '-'} · IP ${item.reporter.ip ?? '-'}`,
      '',
      'Karar (oyuncu sen karar verene kadar engellenmez):',
      `  7 gün engelle:    ${this.#link(item, 'ban7')}`,
      `  Kalıcı engelle:   ${this.#link(item, 'ban')}`,
      `  Şikayeti kapat:   ${this.#link(item, 'dismiss')}`,
      '',
      `Tüm şikayetler: ${this.publicUrl}/api/reports?key=${encodeURIComponent(this.key)}`,
      'Kayıtların tamamı (ses dahil) şifreli güvenlik logunda: docs/guvenlik-logu.md',
    ].join('\n');
    try {
      const ok = await this.mailer.send({ subject: `[Şikayet] ${label}: ${item.target.name} (${item.id})`, text });
      Object.assign(item, { mailed: !!ok });
      this.#save(item);
    } catch (e) { this.log(`[reports] ${item.id}: mail ${e.message}`); }
  }

  // --- bans -------------------------------------------------------------------------------

  /** The ban that keeps this player out, or null. */
  banned({ pid, gid, name }) {
    const now = this.now(), n = String(name ?? '').toLocaleLowerCase('tr');
    return this.#bans.find((b) => (!b.until || b.until > now) && ((pid && b.pid === pid) || (gid && b.gid === gid) || (n && b.name === n))) ?? null;
  }

  /** The operator's decision on a report; returns a short Turkish sentence for the page. */
  decide(id, act) {
    const item = this.#items.find((r) => r.id === id);
    if (!item || !ACTIONS[act]) return null;
    const now = this.now(), { pid, gid, name } = item.target;
    this.#bans = this.#bans.filter((b) => b.report !== id);
    if (ACTIONS[act] === 'ban') {
      const ban = { pid: pid ?? null, gid: gid ?? null, name: String(name).toLocaleLowerCase('tr'), until: act === 'ban7' ? now + 7 * 1440 * MINUTE : 0, reason: item.verdict ?? item.reason, report: id, t: now };
      this.#bans.push(ban);
      this.onBan(ban);
    }
    this.#saveBans();
    Object.assign(item, { status: { ban7: 'banned-7d', ban: 'banned', dismiss: 'dismissed', unban: 'dismissed' }[act], decidedAt: now });
    this.#save(item);
    this.log(`[reports] ${id}: ${act} (${name})`);
    return { ban7: `${name} 7 gün engellendi.`, ban: `${name} kalıcı olarak engellendi.`, dismiss: 'Şikayet kapatıldı, kimse engellenmedi.', unban: `${name} engeli kaldırıldı.` }[act];
  }

  get items() { return this.#items.slice(); }

  /** The two pages, behind the key; true when it answered. */
  route(req, res) {
    if (!req.url.startsWith('/api/report')) return false;
    const u = new URL(req.url, 'http://x');
    const html = (status, body) => { res.writeHead(status, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex' }); res.end(body); };
    if (!this.key || !same(u.searchParams.get('key') ?? '', this.key)) { html(403, 'yetkisiz\n'); return true; }
    if (u.pathname === '/api/report-action') {
      const msg = this.decide(u.searchParams.get('id') ?? '', u.searchParams.get('do') ?? '');
      html(msg ? 200 : 404, shell('Şikayet', `<p>${esc(msg ?? 'Böyle bir şikayet yok.')}</p><p><a href="/api/reports?key=${encodeURIComponent(this.key)}">Tüm şikayetler</a></p>`));
      return true;
    }
    if (u.pathname === '/api/reports') {
      const list = this.#items.slice().reverse();
      if (u.searchParams.get('format') === 'json') { res.writeHead(200, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }); res.end(JSON.stringify(list)); return true; }
      html(200, page(list, (r, a) => this.#link(r, a)));
      return true;
    }
    return false;
  }
}

const same = (a, b) => { const x = Buffer.from(a), y = Buffer.from(b); return x.length === y.length && timingSafeEqual(x, y); };
const time = (t) => new Date(t).toLocaleString('tr-TR', { timeZone: 'Europe/Istanbul' });
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const shell = (title, body) => `<!doctype html><html lang="tr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title}</title>
<style>body{font:15px system-ui,sans-serif;margin:16px;background:#14202e;color:#e8eef5}a{color:#8fd0ff}h1{font-size:22px;margin:0 0 4px}small{color:#9fb0c2}
.it{background:#1d2b3c;border-radius:12px;padding:10px 14px;margin:10px 0;max-width:900px}.it p{margin:6px 0 0;white-space:pre-wrap}.v{font-weight:700}.ahlaksiz,.ticari{color:#e57373}.temiz{color:#81c784}</style></head><body>${body}</body></html>`;

/** The list page: the latest reports, newest first, with the decision links. */
function page(list, link) {
  return shell('Şikayetler', `<h1>Şikayetler</h1><small>${list.length} şikayet · en yenisi üstte</small>
${list.map((r) => `<div class="it"><small>${esc(time(r.t))} · ${esc(r.room)} · ${esc(r.id)} · ${esc(r.status)}</small>
<p><b>${esc(r.reporter?.name)}</b> → <b>${esc(r.target?.name)}</b> (${esc(r.reason || '—')}) · <span class="v ${esc(r.verdict)}">${esc(r.verdict ?? '?')}</span> ${esc(r.analysis ?? '')}</p>
${r.transcript ? `<p><small>Ses dökümü:</small> ${esc(r.transcript)}</p>` : ''}${r.texts?.length ? `<p><small>Yazılar:</small> ${r.texts.map(esc).join(' · ')}</p>` : ''}
<p><a href="${esc(link(r, 'ban7'))}">7 gün engelle</a> · <a href="${esc(link(r, 'ban'))}">Kalıcı engelle</a> · <a href="${esc(link(r, 'dismiss'))}">Kapat</a>${/banned/.test(r.status) ? ` · <a href="${esc(link(r, 'unban'))}">Engeli kaldır</a>` : ''}</p></div>`).join('')}`);
}
