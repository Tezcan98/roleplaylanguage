import { appendFileSync, existsSync, mkdirSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
import { playBlock, moneyBlock, chartsCss } from './StatsCharts.js';

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
  constructor({ dir = null, key = '', installs = null, play = null, money = null } = {}) {
    this.dir = dir; this.key = key; this.installs = installs; this.play = play; this.money = money; // money: Money.js (typed revenue and spend)
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
    if (req.url.startsWith('/api/istatistik') && req.method === 'POST') { // the money form on the page: { day, revenue?, spend? }
      const u = new URL(req.url, 'http://x');
      if (!this.key || u.searchParams.get('key') !== this.key || !this.money) { res.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' }); res.end('yetkisiz\n'); return true; }
      let body = '';
      req.on('data', (c) => { body += c; if (body.length > 1024) req.destroy(); });
      req.on('end', () => {
        let msg = null; try { msg = JSON.parse(body); } catch { /* not JSON */ }
        const ok = !!msg && this.money.set(msg.day, { revenue: msg.revenue, spend: msg.spend });
        res.writeHead(ok ? 200 : 400, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }); res.end(JSON.stringify(ok ? this.money.summary() : { error: 'geçersiz' }));
      });
      return true;
    }
    if (req.url.startsWith('/api/istatistik') || req.url.startsWith('/api/ad-stats')) { // (one page for the ads and how the game is played; ad-stats is the old address)
      const u = new URL(req.url, 'http://x');
      if (!this.key || u.searchParams.get('key') !== this.key) { res.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' }); res.end('yetkisiz\n'); return true; }
      const s = { ...this.summary(), installs: this.installs?.() ?? null, play: this.play?.() ?? null, money: this.money?.summary() ?? null };
      if (u.searchParams.get('format') === 'json') { res.writeHead(200, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }); res.end(JSON.stringify(s)); return true; }
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex' });
      res.end(page(s));
      return true;
    }
    return false;
  }
}

const NAMES = { interstitial: 'Geçiş reklamı', rewarded: 'Ödüllü video', banner: 'Banner' };
/** AdMob's error codes (LoadAdError / AdError). */
const CODES = { 0: 'iç hata', 1: 'geçersiz istek', 2: 'ağ hatası', 3: 'reklam yok (no fill)', 8: 'uygulama kimliği', 9: 'aracılıkta reklam yok', 11: 'zaten gösteriliyor' };
const EV = { load: 'yüklendi', empty: 'boş döndü', show: 'gösterildi', impression: 'gösterim', paid: 'gelirli gösterim', reward: 'ödül verildi', click: 'tıklandı', dismiss: 'kapatıldı', fail: 'hata' };
/** Of the requests that came back, how many brought an ad (only once the app reports its loads too). */
const fill = (d, f) => { const ok = d?.counts[f]?.load ?? 0, empty = d?.counts[f]?.empty ?? 0; return ok + empty ? `%${Math.round((100 * ok) / (ok + empty))}` : '—'; };
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const REGIONS = new Intl.DisplayNames(['tr'], { type: 'region' });
/** "TR" → "Türkiye" (the name in Turkish; the code itself when it is not a country). */
const country = (c) => { if (!c) return ''; try { return REGIONS.of(c) ?? c; } catch { return c; } };
const money = (r) => Object.entries(r).map(([c, v]) => `${v.toFixed(4)} ${c}`).join(' + ') || '—';

/** The download counter: every device's first game opened (PlayStats.js), today and the last days. */
function installsBlock(i) {
  if (!i) return '';
  const today = i.days[0] ?? { app: 0, web: 0 };
  return `<h2>İndirmeler <small>bir cihazın oyunu ilk açışı · ${i.since ? `${esc(i.since)} tarihinden beri` : 'henüz kayıt yok'}</small></h2>
<div class="big"><div><b>${i.total}</b>toplam</div><div><b>${i.app}</b>uygulama (Android)</div><div><b>${i.web}</b>web</div><div><b>${today.app + today.web}</b>bugün</div></div>
<table><tr><th>Gün</th><th>uygulama</th><th>web</th><th>toplam</th></tr>${i.days.map((d) => `<tr><td>${esc(d.day)}</td><td>${d.app || ''}</td><td>${d.web || ''}</td><td>${d.app + d.web || ''}</td></tr>`).join('')}</table>`;
}

/** The page's tabs: the ads, the players, how far they got and the tasks, where they went and whom they talked to. */
const TABS = [['reklam', 'Reklamlar'], ['para', 'Para'], ['olaylar', 'Son olaylar'], ['oyuncular', 'Oyuncular'], ['bolumler', 'Bölümler ve görevler'], ['yerler', 'Yerler ve kişiler']];

/** The stats page: refreshes itself every 15 seconds. */
function page(s) {
  const today = s.days[0];
  const play = playBlock(s.play, s.countries.map(([c, v, bugun]) => [country(c) || c, v, `bugün ${bugun}`]));
  const cell = (d, f, e) => d?.counts[f]?.[e] ?? 0;
  const table = (d) => `<table><tr><th></th>${Object.values(EV).map((e) => `<th>${e}</th>`).join('')}<th>doluluk</th></tr>${[...FORMATS].map((f) => `<tr><td>${NAMES[f]}</td>${Object.keys(EV).map((e) => `<td>${cell(d, f, e) || ''}</td>`).join('')}<td>${fill(d, f)}</td></tr>`).join('')}</table>
<small>“Boş döndü”: AdMob o istekte reklam vermedi (no fill). Oyuncu bunu görmez — banner kısa süre sonra yeniden ister, arada bizim afişimiz durur; geçiş reklamında hikâye reklamsız devam eder. “Hata” yalnızca gerçek hatalar. Doluluk: gelen isteklerin yüzde kaçı reklamla döndü (uygulamanın yeni sürümüyle sayılır).</small>`;
  const time = (t) => new Date(t).toLocaleTimeString('tr-TR', { timeZone: 'Europe/Istanbul' });
  return `<!doctype html><html lang="tr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>İstatistik · canlı</title>
<style>body{font:15px system-ui,sans-serif;margin:16px;background:#14202e;color:#e8eef5}h1{font-size:22px;margin:0 0 4px}h2{font-size:17px;margin:22px 0 8px}small{color:#9fb0c2}
table{border-collapse:collapse;width:100%;max-width:900px;background:#1d2b3c;border-radius:10px;overflow:hidden}th,td{padding:7px 9px;border-bottom:1px solid #2b3c50;text-align:right}th:first-child,td:first-child{text-align:left}th{color:#9fb0c2;font-weight:600}
.big{display:flex;gap:12px;flex-wrap:wrap}.big div{background:#1d2b3c;border-radius:12px;padding:10px 14px}.big b{display:block;font-size:24px;color:#ffd54a}${chartsCss}</style></head><body>
<h1>İstatistik · canlı</h1><small>Uygulamadan anlık · AdMob'un kesin rakamları 1–2 gün sonra · her 15 sn yenilenir (seçili sekme kalır) · ${esc(time(s.now))}</small>
<nav class="tabs">${TABS.map(([id, label]) => `<a href="#${id}" data-tab="${id}">${label}</a>`).join('')}</nav>
<section class="tab" id="reklam">
<h2>Bugün (${esc(today?.day ?? '—')})</h2>
<div class="big"><div><b>${today?.events ?? 0}</b>olay</div><div><b>${today?.devices ?? 0}</b>cihaz</div><div><b>${esc(money(today?.revenue ?? {}))}</b>tahmini gelir</div>
<div><b>${[...FORMATS].reduce((n, f) => n + cell(today, f, 'click'), 0)}</b>tıklama (banner)</div></div>
${table(today)}
<h2>Son günler</h2><table><tr><th>Gün</th><th>olay</th><th>cihaz</th><th>gösterim</th><th>ödül</th><th>tıklama</th><th>tahmini gelir</th></tr>
${s.days.map((d) => `<tr><td>${esc(d.day)}</td><td>${d.events}</td><td>${d.devices}</td><td>${[...FORMATS].reduce((n, f) => n + cell(d, f, 'show') + cell(d, f, 'impression'), 0)}</td><td>${cell(d, 'rewarded', 'reward')}</td><td>${[...FORMATS].reduce((n, f) => n + cell(d, f, 'click'), 0)}</td><td>${esc(money(d.revenue))}</td></tr>`).join('')}</table>
</section>
<section class="tab" id="para">${moneyBlock(s.money, s.installs)}</section>
<section class="tab" id="olaylar">
<h2>Son olaylar <small>${s.emptyToday ? `boş dönen ${s.emptyToday} istek bugün listede gösterilmiyor` : ''}</small></h2><table><tr><th>Saat</th><th>Reklam</th><th>Olay</th><th>Gelir</th><th>Ülke</th><th>Sürüm</th><th>Cihaz</th></tr>
${s.latest.map((e) => `<tr><td>${esc(time(e.t))}</td><td>${NAMES[e.f]}</td><td>${EV[e.e]}${e.code != null ? ` · ${e.code} ${esc(CODES[e.code] ?? '')}` : ''}</td><td>${e.micros != null ? `${(e.micros / 1e6).toFixed(5)} ${esc(e.cur ?? '')}` : ''}</td><td>${esc(country(e.c))}</td><td>${esc(e.v ?? '')}</td><td>${esc(e.d ?? '')}</td></tr>`).join('')}</table>
</section>
<section class="tab" id="oyuncular">${installsBlock(s.installs)}
${play.players}</section>
<section class="tab" id="bolumler">${play.progress}</section>
<section class="tab" id="yerler">${play.places}</section>
<script>(function(){var ids=['reklam','para','olaylar','oyuncular','bolumler','yerler'],K='istatistik-sekme';function saved(){try{return localStorage.getItem(K)}catch(e){return null}}function show(){var h=(location.hash||'').slice(1);if(ids.indexOf(h)<0)h=saved();if(ids.indexOf(h)<0)h=ids[0];try{localStorage.setItem(K,h)}catch(e){}ids.forEach(function(i){document.getElementById(i).classList.toggle('on',i===h)});document.querySelectorAll('.tabs a').forEach(function(a){a.classList.toggle('on',a.dataset.tab===h)})}addEventListener('hashchange',show);show();setInterval(function(){var a=document.activeElement;if(a&&(a.tagName==='INPUT'||a.tagName==='TEXTAREA'))return;var typed=[].some.call(document.querySelectorAll('input[inputmode]'),function(i){return i.value!==''});if(!typed)location.reload()},15000)})()</script>
</body></html>`;
}
