import { appendFileSync, existsSync, mkdirSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
import { numbersBody, firstMinutesBody, chartsCss } from './StatsCharts.js';

/**
 * Live ad numbers from the Android app (AdMob shows them a day or two late): every ad shown,
 * every reward, a banner opened (its click), and the estimated revenue AdMob's SDK reports for an
 * impression (needs "impression-level ad revenue" on in the AdMob account). Nothing about the ad
 * is changed — this only counts. A request that came back empty ("no fill": the banner asks again
 * every minute or so) is not an error the player sees: the page counts it apart, next to the loads
 * that brought an ad (how often there is one), and keeps it out of the latest events.
 *
 *   POST /api/ad-event  { e, f, micros?, cur?, v?, pid?, code? }  (code: AdMob's error code of a 'fail')   from the app (web/src/services/monetization/AdMobAdProvider.js)
 *   GET  /api/istatistik?key=…  a page with the ads (today, the last days, the latest events) and how the game is played, with charts (&format=json); /api/ad-stats the same, the old address
 *
 * One JSON line per event in DIR/YYYY-MM-DD.jsonl (Turkish time), the last DAYS days kept in memory.
 * The page needs AD_STATS_KEY; the device id is stored only as a short hash.
 */
const EVENTS = new Set(['load', 'show', 'impression', 'click', 'reward', 'paid', 'fail', 'dismiss']);
/** AdMob's "no ad for this request" (no fill, none through mediation): normal, not an error. */
const EMPTY = new Set([3, 9]);
export const isEmpty = (ev) => ev.e === 'fail' && EMPTY.has(ev.code);
const FORMATS = new Set(['interstitial', 'rewarded', 'banner']);
const DAYS = 14;
const PER_MINUTE = 60; // events per IP and minute
const day = (t = Date.now()) => new Date(t).toLocaleDateString('sv-SE', { timeZone: 'Europe/Istanbul' }); // YYYY-MM-DD

export class AdStats {
  #days = new Map(); // day → events
  #hits = new Map(); // ip → { n, at }

  /** `installs()`: the download counter shown on the page (PlayStats.js `installs()`), or null. `play()`: how the game is played (PlayStats.js `summary()`), shown below the ads. */
  constructor({ dir = null, key = '', installs = null, play = null } = {}) {
    this.dir = dir; this.key = key; this.installs = installs; this.play = play;
    if (dir) { mkdirSync(dir, { recursive: true }); this.#load(); }
  }

  #everyone = new Set(); // every device that ever sent an event (its short hash), from all the day files

  /** How many devices (app players) ever sent an ad event. */
  devices() { return this.#everyone.size; }

  #load() {
    for (const f of readdirSync(this.dir).filter((n) => /^\d{4}-\d{2}-\d{2}\.jsonl$/.test(n))) {
      for (const line of readFileSync(join(this.dir, f), 'utf8').split('\n')) { const m = /"d":"([0-9a-f]{10})"/.exec(line); if (m) this.#everyone.add(m[1]); }
    }
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
    if (msg.e === 'fail' && Number.isInteger(msg.code) && msg.code >= -1 && msg.code < 100) ev.code = msg.code;
    if (msg.pid) { ev.d = createHash('sha256').update(String(msg.pid)).digest('hex').slice(0, 10); this.#everyone.add(ev.d); }
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
        const e = isEmpty(ev) ? 'empty' : ev.e; // (an empty request apart from real errors)
        (counts[ev.f] ??= {})[e] = (counts[ev.f][e] ?? 0) + 1;
        if (ev.e === 'paid' && ev.micros != null) revenue[ev.cur ?? '?'] = (revenue[ev.cur ?? '?'] ?? 0) + ev.micros / 1e6;
        if (ev.d) devices.add(ev.d);
      }
      return { day: d, events: list.length, devices: devices.size, counts, revenue };
    });
    const today = this.#days.get(day()) ?? [];
    const latest = today.filter((ev) => !isEmpty(ev)).slice(-60).reverse(); // (the empty requests only as a count)
    // the devices by country (the ad events carry it): each device once, in the country it was last seen in
    const seen = new Map(), todayDevs = new Map();
    for (const [d, list] of this.#days) for (const ev of list) if (ev.d && ev.c) { seen.set(ev.d, ev.c); if (d === day()) todayDevs.set(ev.d, ev.c); }
    const count = (m) => { const o = {}; for (const c of m.values()) o[c] = (o[c] ?? 0) + 1; return o; };
    const all = count(seen), now = count(todayDevs);
    const countries = Object.entries(all).sort((a, b) => b[1] - a[1]).map(([c, v]) => [c, v, now[c] ?? 0]); // [country, devices in the kept days, devices today]
    return { now: new Date().toISOString(), days, latest, emptyToday: today.filter(isEmpty).length, countries };
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
    if (req.url.startsWith('/api/istatistik') || req.url.startsWith('/api/ad-stats')) { // (one page for the ads and how the game is played; ad-stats is the old address)
      const u = new URL(req.url, 'http://x'), key = u.searchParams.get('key');
      if (!this.key || u.searchParams.get('key') !== this.key) { res.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' }); res.end('yetkisiz\n'); return true; }
      const s = { ...this.summary(), installs: this.installs?.() ?? null, play: this.play?.() ?? null };
      if (u.searchParams.get('format') === 'json') { res.writeHead(200, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }); res.end(JSON.stringify(s)); return true; }
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex' });
      res.end(u.searchParams.get('sayfa') === 'ilk' ? firstPage(s, key) : page(s, key));
      return true;
    }
    return false;
  }
}

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const NUMBERS_JS = `(function(){var P='istatistik-donem',C='istatistik-ulke';function get(k){try{return localStorage.getItem(k)}catch(e){return null}}function put(k,v){try{localStorage.setItem(k,v)}catch(e){}}
function show(){var p=get(P),c=get(C);var pers=document.querySelectorAll('.per');if(!document.querySelector('.per[data-p="'+p+'"]'))p='today';
document.querySelectorAll('.periods button').forEach(function(b){b.classList.toggle('on',b.dataset.p===p)});
pers.forEach(function(e){e.classList.toggle('on',e.dataset.p===p);var has=e.querySelector('.hist[data-c="'+c+'"]');e.querySelectorAll('.hist').forEach(function(h){h.classList.toggle('on',h.dataset.c===(has?c:'all'))})});
document.querySelectorAll('.ulke').forEach(function(s){s.value=has0(c)?c:'all'})}
function has0(c){return !!document.querySelector('.hist[data-c="'+c+'"]')}
document.querySelectorAll('.periods button').forEach(function(b){b.onclick=function(){put(P,b.dataset.p);show()}});
document.querySelectorAll('.ulke').forEach(function(s){s.onchange=function(){put(C,s.value);show()}});show();setTimeout(function(){location.reload()},30000)})()`;

/** The numbers page (one calm page, StatsCharts.js `numbersBody`); it reloads itself, keeping the chosen period and country. */
function page(s, key = '') {
  s.keyQuery = `key=${encodeURIComponent(key)}`;
  const time = new Date(s.now).toLocaleTimeString('tr-TR', { timeZone: 'Europe/Istanbul', hour: '2-digit', minute: '2-digit' });
  return `<!doctype html><html lang="tr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>İstatistik</title>
<style>body{font:15px/1.5 system-ui,sans-serif;margin:16px auto;padding:0 16px;max-width:1000px;background:#14202e;color:#e8eef5}h1{font-size:22px;margin:0 0 2px;font-weight:600}small{color:#9fb0c2;font-weight:400}
.big{display:flex;gap:12px;flex-wrap:wrap}.big div{background:#1d2b3c;border-radius:12px;padding:12px 18px;min-width:120px}.big b{display:block;font-size:26px;color:#ffd54a;font-weight:600}${chartsCss}</style></head><body>
<h1>Türk Ailem · İstatistik</h1><small>Anonim sayılar · her 30 saniyede yenilenir · ${esc(time)}</small>
${numbersBody(s)}
<script>${NUMBERS_JS}</script>
</body></html>`;
}

/** The first-minutes sub-page (StatsCharts.js `firstMinutesBody`): a button on the numbers page leads here. */
function firstPage(s, key) {
  return `<!doctype html><html lang="tr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>İlk dakikalar</title>
<style>body{font:15px/1.5 system-ui,sans-serif;margin:16px auto;padding:0 16px;max-width:1000px;background:#14202e;color:#e8eef5}h1{font-size:22px;margin:0 0 2px;font-weight:600}small{color:#9fb0c2;font-weight:400}${chartsCss}</style></head><body>
<p class="subnav"><a href="?key=${encodeURIComponent(key)}">← İstatistik</a></p><h1>İlk dakikalar</h1>
${firstMinutesBody(s)}
</body></html>`;
}
