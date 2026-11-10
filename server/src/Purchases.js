import { appendFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { createHash } from 'node:crypto';

/**
 * Gold-pack purchases, as the app reports them: after Google Play charged a pack the app posts it
 * here, the server keeps one JSON line per purchase and mails the operator ("somebody bought").
 * The report comes from the phone, so it is a notice, not proof — Play Console has the real orders.
 *
 *   POST /api/purchase  { id, tx?, v?, pid? }   id: the Play product (credits_50 …)
 *
 * Limits: unknown products are refused, one transaction id mails once, and at most MAIL_PER_HOUR
 * mails an hour in all (a flood becomes a single "many reports" line in the log, not a mail storm).
 */
const PRODUCTS = { credits_50: 50, credits_100: 100, credits_200: 200 };
const MAIL_PER_HOUR = 30;
const PER_MINUTE = 10; // reports per IP and minute

export class Purchases {
  #seen = new Set(); // transaction ids already mailed
  #hits = new Map(); // ip → { n, at }
  #mails = [];       // times of the mails sent in the last hour

  constructor({ dir = null, mailer = null, now = Date.now, log = console.log } = {}) {
    Object.assign(this, { dir, mailer, now, log });
    if (dir) mkdirSync(dir, { recursive: true });
  }

  /** True when the report was taken (mailed or logged). */
  async record(msg, ip = '', country = '') {
    const t = this.now(), h = this.#hits.get(ip) ?? { n: 0, at: t };
    if (t - h.at > 60000) { h.n = 0; h.at = t; }
    if (++h.n > PER_MINUTE) return false;
    this.#hits.set(ip, h);
    if (this.#hits.size > 5000) this.#hits.clear();
    const credits = PRODUCTS[msg?.id];
    if (!credits) return false;
    const tx = typeof msg.tx === 'string' ? msg.tx.slice(0, 80) : '';
    if (tx) { if (this.#seen.has(tx)) return true; this.#seen.add(tx); }
    const ev = { t, id: msg.id, credits, ...(tx ? { tx } : {}), ...(typeof msg.v === 'string' ? { v: msg.v.slice(0, 16) } : {}), ...(/^[A-Z]{2}$/.test(country) ? { c: country } : {}) };
    if (msg.pid) ev.d = createHash('sha256').update(String(msg.pid)).digest('hex').slice(0, 10);
    if (this.dir) { try { appendFileSync(join(this.dir, 'purchases.jsonl'), `${JSON.stringify(ev)}\n`); } catch { /* disk full: the mail still goes */ } }
    this.log(`[purchase] ${ev.id} ${ev.c ?? '?'} ${ev.d ?? ''}`);
    this.#mails = this.#mails.filter((m) => t - m < 3600000);
    if (this.#mails.length >= MAIL_PER_HOUR || !this.mailer?.enabled) return true;
    this.#mails.push(t);
    const when = new Date(t).toLocaleString('tr-TR', { timeZone: 'Europe/Istanbul' });
    this.mailer.send({
      subject: `Türk Ailem: bir kişi ${credits} altın aldı`,
      text: `Bir oyuncu ${credits} altınlık paket aldı (${ev.id}).\nÜlke: ${ev.c ?? 'bilinmiyor'}\nSürüm: ${ev.v ?? '?'}\nCihaz: ${ev.d ?? '?'}\nZaman: ${when}\n\nBu bildirimi telefon gönderir; gerçek siparişler Play Console > Siparişleri yönet bölümünde.\n`,
    }).catch((e) => this.log(`[purchase] mail failed: ${e.message}`));
    return true;
  }

  route(req, res, { clientIp = () => '' } = {}) {
    if (req.url !== '/api/purchase' || req.method !== 'POST') return false;
    let body = '';
    req.on('data', (c) => { body += c; if (body.length > 2048) req.destroy(); });
    req.on('end', async () => {
      let msg = null; try { msg = JSON.parse(body); } catch { /* not JSON */ }
      const ok = await this.record(msg, clientIp(req), String(req.headers['x-country'] ?? '').toUpperCase());
      res.writeHead(ok ? 204 : 400, { 'Cache-Control': 'no-store' }); res.end();
    });
    return true;
  }
}
