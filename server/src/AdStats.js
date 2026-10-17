import { appendFileSync, existsSync, mkdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { createHash } from 'node:crypto';

/**
 * Live ad numbers from the Android app (AdMob shows them a day or two late): every ad shown,
 * every reward, a banner opened (its click), and the estimated revenue AdMob's SDK reports for an
 * impression (needs "impression-level ad revenue" on in the AdMob account). Nothing about the ad
 * is changed — this only counts.
 *
 *   POST /api/ad-event  { e, f, micros?, cur?, v?, pid? }   from the app (web/src/services/monetization/AdMobAdProvider.js)
 *   GET  /api/ad-stats?key=…  a page with today, the last days and the latest events (&format=json)
 *
 * One JSON line per event in DIR/YYYY-MM-DD.jsonl (Turkish time), the last DAYS days kept in memory.
 * The page needs AD_STATS_KEY; the device id is stored only as a short hash.
 */
const EVENTS = new Set(['show', 'impression', 'click', 'reward', 'paid', 'fail', 'dismiss']);
const FORMATS = new Set(['interstitial', 'rewarded', 'banner']);
const DAYS = 14;
const PER_MINUTE = 60; // events per IP and minute
const day = (t = Date.now()) => new Date(t).toLocaleDateString('sv-SE', { timeZone: 'Europe/Istanbul' }); // YYYY-MM-DD

export class AdStats {
  #days = new Map(); // day → events
  #hits = new Map(); // ip → { n, at }

  constructor({ dir = null, key = '' } = {}) {
    this.dir = dir; this.key = key;
    if (dir) { mkdirSync(dir, { recursive: true }); this.#load(); }
  }

  #load() {
    for (let k = 0; k < DAYS; k++) {
      const d = day(Date.now() - k * 86400000), f = join(this.dir, `${d}.jsonl`);
      if (!existsSync(f)) continue;
      const list = [];
      for (const line of readFileSync(f, 'utf8').split('\n')) { try { if (line) list.push(JSON.parse(line)); } catch { /* a broken line */ } }
      this.#days.set(d, list);
    }
  }

  /** One event from the app; false when it is not one or comes too often. */
  record(msg, ip = '', country = '') {
    const now = Date.now(), h = this.#hits.get(ip) ?? { n: 0, at: now };
    if (now - h.at > 60000) { h.n = 0; h.at = now; }
    if (++h.n > PER_MINUTE) return false;
    this.#hits.set(ip, h);
    if (this.#hits.size > 5000) this.#hits.clear();
    if (!msg || !EVENTS.has(msg.e) || !FORMATS.has(msg.f)) return false;
    const ev = { t: now, e: msg.e, f: msg.f };
    const micros = Number(msg.micros);
    if (Number.isFinite(micros) && micros >= 0 && micros < 1e9) ev.micros = Math.round(micros);
    if (/^[A-Z]{3}$/.test(String(msg.cur ?? ''))) ev.cur = msg.cur;
    if (typeof msg.v === 'string') ev.v = msg.v.slice(0, 16);
    if (msg.pid) ev.d = createHash('sha256').update(String(msg.pid)).digest('hex').slice(0, 10);
    if (/^[A-Z]{2}$/.test(country)) ev.c = country;
    const d = day(now);
    if (!this.#days.has(d)) {
      this.#days.set(d, []);
      for (const k of [...this.#days.keys()].sort().slice(0, -DAYS)) this.#days.delete(k);
    }
    this.#days.get(d).push(ev);
    if (this.dir) { try { appendFileSync(join(this.dir, `${d}.jsonl`), `${JSON.stringify(ev)}\n`); } catch { /* disk full: the memory still counts */ } }
    return true;
  }

  /** Per day: counts by format and event, revenue by currency, devices; and the latest events. */
  summary() {
    const days = [...this.#days.keys()].sort().reverse().map((d) => {
      const list = this.#days.get(d), counts = {}, revenue = {}, devices = new Set();
      for (const ev of list) {
        (counts[ev.f] ??= {})[ev.e] = (counts[ev.f][ev.e] ?? 0) + 1;
        if (ev.e === 'paid' && ev.micros != null) revenue[ev.cur ?? '?'] = (revenue[ev.cur ?? '?'] ?? 0) + ev.micros / 1e6;
        if (ev.d) devices.add(ev.d);
      }
      return { day: d, events: list.length, devices: devices.size, counts, revenue };
    });
    const latest = (this.#days.get(day()) ?? []).slice(-60).reverse();
    return { now: new Date().toISOString(), days, latest };
  }

  /** The two routes; true when it answered. */
  route(req, res, { clientIp = () => '' } = {}) {
    if (req.url === '/api/ad-event' && req.method === 'POST') {
      let body = '';
      req.on('data', (c) => { body += c; if (body.length > 2048) req.destroy(); });
      req.on('end', () => {
        let msg = null; try { msg = JSON.parse(body); } catch { /* not JSON */ }
        const ok = this.record(msg, clientIp(req), String(req.headers['x-country'] ?? '').toUpperCase());
        res.writeHead(ok ? 204 : 400, { 'Cache-Control': 'no-store' }); res.end();
      });
      return true;
    }
    if (req.url.startsWith('/api/ad-stats')) {
      const u = new URL(req.url, 'http://x');
      if (!this.key || u.searchParams.get('key') !== this.key) { res.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' }); res.end('yetkisiz\n'); return true; }
      const s = this.summary();
      if (u.searchParams.get('format') === 'json') { res.writeHead(200, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }); res.end(JSON.stringify(s)); return true; }
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex' });
      res.end(page(s));
      return true;
    }
    return false;
  }
}

const NAMES = { interstitial: 'Geçiş reklamı', rewarded: 'Ödüllü video', banner: 'Banner' };
const EV = { show: 'gösterildi', impression: 'gösterim', paid: 'gelirli gösterim', reward: 'ödül verildi', click: 'tıklandı', dismiss: 'kapatıldı', fail: 'hata' };
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const money = (r) => Object.entries(r).map(([c, v]) => `${v.toFixed(4)} ${c}`).join(' + ') || '—';

/** The stats page: refreshes itself every 15 seconds. */
function page(s) {
  const today = s.days[0];
  const cell = (d, f, e) => d?.counts[f]?.[e] ?? 0;
  const table = (d) => `<table><tr><th></th>${Object.values(EV).map((e) => `<th>${e}</th>`).join('')}</tr>${[...FORMATS].map((f) => `<tr><td>${NAMES[f]}</td>${Object.keys(EV).map((e) => `<td>${cell(d, f, e) || ''}</td>`).join('')}</tr>`).join('')}</table>`;
  const time = (t) => new Date(t).toLocaleTimeString('tr-TR', { timeZone: 'Europe/Istanbul' });
  return `<!doctype html><html lang="tr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta http-equiv="refresh" content="15"><title>Reklamlar · canlı</title>
<style>body{font:15px system-ui,sans-serif;margin:16px;background:#14202e;color:#e8eef5}h1{font-size:22px;margin:0 0 4px}h2{font-size:17px;margin:22px 0 8px}small{color:#9fb0c2}
table{border-collapse:collapse;width:100%;max-width:900px;background:#1d2b3c;border-radius:10px;overflow:hidden}th,td{padding:7px 9px;border-bottom:1px solid #2b3c50;text-align:right}th:first-child,td:first-child{text-align:left}th{color:#9fb0c2;font-weight:600}
.big{display:flex;gap:12px;flex-wrap:wrap}.big div{background:#1d2b3c;border-radius:12px;padding:10px 14px}.big b{display:block;font-size:24px;color:#ffd54a}</style></head><body>
<h1>Reklamlar · canlı</h1><small>Uygulamadan anlık · AdMob'un kesin rakamları 1–2 gün sonra · her 15 sn yenilenir · ${esc(time(s.now))}</small>
<h2>Bugün (${esc(today?.day ?? '—')})</h2>
<div class="big"><div><b>${today?.events ?? 0}</b>olay</div><div><b>${today?.devices ?? 0}</b>cihaz</div><div><b>${esc(money(today?.revenue ?? {}))}</b>tahmini gelir</div>
<div><b>${[...FORMATS].reduce((n, f) => n + cell(today, f, 'click'), 0)}</b>tıklama (banner)</div></div>
${table(today)}
<h2>Son günler</h2><table><tr><th>Gün</th><th>olay</th><th>cihaz</th><th>gösterim</th><th>ödül</th><th>tıklama</th><th>tahmini gelir</th></tr>
${s.days.map((d) => `<tr><td>${esc(d.day)}</td><td>${d.events}</td><td>${d.devices}</td><td>${[...FORMATS].reduce((n, f) => n + cell(d, f, 'show') + cell(d, f, 'impression'), 0)}</td><td>${cell(d, 'rewarded', 'reward')}</td><td>${[...FORMATS].reduce((n, f) => n + cell(d, f, 'click'), 0)}</td><td>${esc(money(d.revenue))}</td></tr>`).join('')}</table>
<h2>Son olaylar</h2><table><tr><th>Saat</th><th>Reklam</th><th>Olay</th><th>Gelir</th><th>Ülke</th><th>Sürüm</th><th>Cihaz</th></tr>
${s.latest.map((e) => `<tr><td>${esc(time(e.t))}</td><td>${NAMES[e.f]}</td><td>${EV[e.e]}</td><td>${e.micros != null ? `${(e.micros / 1e6).toFixed(5)} ${esc(e.cur ?? '')}` : ''}</td><td>${esc(e.c ?? '')}</td><td>${esc(e.v ?? '')}</td><td>${esc(e.d ?? '')}</td></tr>`).join('')}</table>
</body></html>`;
}
