import { appendFileSync, existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { createHash } from 'node:crypto';

/**
 * How the game is played, anonymously: how many devices came, how far they got, what they did and
 * how often (talks, activities, places, chat lines, rides…). Counts only — never what anyone said.
 * A device is a random id made on the device (not an advertising id), kept here as a short hash.
 *
 *   POST /api/play-event  { pid, v, plat, lang, ch, chId, opens?, sec?, counts: { "talk:ali": 2, … } }   from the game (web/src/services/Stats.js)
 *   GET  /api/stats?key=…  the page (&format=json); the key is AD_STATS_KEY
 *   GET  /api/play-event     { today, now }: devices that played today / in the last few minutes (the game's menu shows them)
 *
 * Batches are appended to DIR/YYYY-MM-DD.jsonl (Turkish time) and the last DAYS days are kept in
 * memory; DIR/devices.json keeps every device's first day, last day, furthest chapter and totals.
 */
const DAYS = 30;
const NOW_MS = 150_000; // "playing now": a batch in the last 2.5 minutes (the game sends one a minute while it is played)
const PER_MINUTE = 20; // batches per IP and minute
const MAX_KEYS = 40; // counters in one batch
const MAX_NAMES = 400; // different counter names in a day (junk can't grow it)
const KEY = /^[a-z0-9:._-]{1,40}$/;
const day = (t = Date.now()) => new Date(t).toLocaleDateString('sv-SE', { timeZone: 'Europe/Istanbul' });

export class PlayStats {
  #days = new Map(); // day → { devices: Set, opens, sec, counts, names }
  #devices = new Map(); // hash → { first, last, ch, chId, plat, v, lang, sec, opens, counts }
  #hits = new Map();
  #seen = new Map(); // hash → when its last batch came (for "playing now")
  #dirty = false;
  #timer = null;

  constructor({ dir = null, key = '' } = {}) {
    this.dir = dir; this.key = key;
    if (dir) {
      mkdirSync(dir, { recursive: true });
      this.#load();
      this.#timer = setInterval(() => this.flush(), 60000); this.#timer.unref?.();
    }
  }

  #bucket(d) {
    if (!this.#days.has(d)) {
      this.#days.set(d, { devices: new Set(), opens: 0, sec: 0, counts: {}, names: 0 });
      for (const k of [...this.#days.keys()].sort().slice(0, -DAYS)) this.#days.delete(k);
    }
    return this.#days.get(d);
  }

  #load() {
    try { for (const [h, v] of Object.entries(JSON.parse(readFileSync(join(this.dir, 'devices.json'), 'utf8')))) this.#devices.set(h, v); } catch { /* none yet */ }
    for (let k = DAYS - 1; k >= 0; k--) {
      const d = day(Date.now() - k * 86400000), f = join(this.dir, `${d}.jsonl`);
      if (!existsSync(f)) continue;
      for (const line of readFileSync(f, 'utf8').split('\n')) { try { if (line) this.#tally(d, JSON.parse(line)); } catch { /* a broken line */ } }
    }
  }

  /** Adds one clean batch ({ h, opens, sec, counts }) to a day's numbers. */
  #tally(d, b) {
    const t = this.#bucket(d);
    t.devices.add(b.h); t.opens += b.opens ?? 0; t.sec += b.sec ?? 0;
    for (const [k, n] of Object.entries(b.counts ?? {})) {
      if (!(k in t.counts)) { if (t.names >= MAX_NAMES) continue; t.names++; }
      t.counts[k] = (t.counts[k] ?? 0) + n;
    }
  }

  /** One batch from the game; false when it is not one or comes too often. */
  record(msg, ip = '') {
    const now = Date.now(), hit = this.#hits.get(ip) ?? { n: 0, at: now };
    if (now - hit.at > 60000) { hit.n = 0; hit.at = now; }
    if (++hit.n > PER_MINUTE) return false;
    this.#hits.set(ip, hit);
    if (this.#hits.size > 5000) this.#hits.clear();
    if (!msg || !/^[a-z0-9]{8,24}$/.test(String(msg.pid ?? ''))) return false;
    const h = createHash('sha256').update(`play:${msg.pid}`).digest('hex').slice(0, 12);
    const counts = {};
    for (const [k, n] of Object.entries(msg.counts ?? {}).slice(0, MAX_KEYS)) {
      if (KEY.test(k) && Number.isInteger(n) && n > 0 && n < 10000) counts[k] = n;
    }
    const opens = msg.opens === 1 ? 1 : 0, sec = Number.isInteger(msg.sec) && msg.sec > 0 && msg.sec <= 3600 ? msg.sec : 0;
    const d = day(now), batch = { h, opens, sec, counts };
    this.#seen.set(h, now);
    this.#tally(d, batch);
    const dev = this.#devices.get(h) ?? { first: d, ch: -1, chId: '', plat: '', v: '', lang: '', sec: 0, opens: 0, counts: {} };
    dev.last = d; dev.sec += sec; dev.opens += opens;
    if (Number.isInteger(msg.ch) && msg.ch > dev.ch && msg.ch < 1000) { dev.ch = msg.ch; dev.chId = String(msg.chId ?? '').replace(/[^a-z0-9-]/g, '').slice(0, 30); }
    if (msg.plat === 'app' || msg.plat === 'web') dev.plat = msg.plat;
    if (typeof msg.v === 'string') dev.v = msg.v.slice(0, 16);
    if (/^[a-z]{2}$/.test(String(msg.lang ?? ''))) dev.lang = msg.lang;
    for (const [k, n] of Object.entries(counts)) if (k in dev.counts || Object.keys(dev.counts).length < 120) dev.counts[k] = (dev.counts[k] ?? 0) + n;
    this.#devices.set(h, dev); this.#dirty = true;
    if (this.dir) { try { appendFileSync(join(this.dir, `${d}.jsonl`), `${JSON.stringify(batch)}\n`); } catch { /* disk full: the memory still counts */ } }
    return true;
  }

  /** How many devices played today, and how many are playing now (a batch in the last few minutes). */
  online(t = Date.now()) {
    for (const [h, at] of this.#seen) if (t - at > NOW_MS) this.#seen.delete(h);
    return { today: this.#days.get(day(t))?.devices.size ?? 0, now: this.#seen.size };
  }

  /** The device table to disk (every minute when it changed). */
  flush() {
    if (!this.dir || !this.#dirty) return;
    this.#dirty = false;
    try { const f = join(this.dir, 'devices.json'); writeFileSync(`${f}.tmp`, JSON.stringify(Object.fromEntries(this.#devices))); renameSync(`${f}.tmp`, f); } catch { this.#dirty = true; }
  }

  /**
   * Downloads, as far as the server can tell: a device's first game opened is its download (the app's or the
   * web game's), counted from the day these numbers began. { since, total, app, web, days: [{ day, app, web }] }
   */
  installs(days = 14) {
    const devs = [...this.#devices.values()], plat = (v) => (v.plat === 'web' ? 'web' : 'app'); // (no platform yet: the app's)
    const list = Array.from({ length: days }, (_, k) => day(Date.now() - k * 86400000)).map((d) => {
      const fresh = devs.filter((v) => v.first === d);
      return { day: d, app: fresh.filter((v) => plat(v) === 'app').length, web: fresh.filter((v) => plat(v) === 'web').length };
    });
    const since = devs.reduce((m, v) => (!m || v.first < m ? v.first : m), '');
    return { since, total: devs.length, app: devs.filter((v) => plat(v) === 'app').length, web: devs.filter((v) => plat(v) === 'web').length, days: list };
  }

  summary() {
    const today = day();
    const devs = [...this.#devices.values()];
    const newByDay = {};
    for (const v of devs) newByDay[v.first] = (newByDay[v.first] ?? 0) + 1;
    const days = [...this.#days.keys()].sort().reverse().map((d) => {
      const t = this.#days.get(d);
      return { day: d, active: t.devices.size, new: newByDay[d] ?? 0, opens: t.opens, minutes: Math.round(t.sec / 60), counts: t.counts };
    });
    const top = {};
    for (const t of this.#days.values()) for (const [k, n] of Object.entries(t.counts)) top[k] = (top[k] ?? 0) + n;
    // furthest chapter: devices by the chapter they got to (all time)
    const names = {}; for (const v of devs) if (v.ch >= 0 && v.chId) names[v.ch] = v.chId; // (the game says each chapter's id)
    const last = Math.max(-1, ...devs.map((v) => v.ch));
    const reach = Array.from({ length: last + 1 }, (_, i) => ({ i, id: names[i] ?? '', devices: devs.filter((v) => v.ch >= i).length }));
    const returned = devs.filter((v) => v.last > v.first).length;
    const spoke = devs.filter((v) => Object.keys(v.counts).some((k) => k === 'chat' || k.startsWith('talk:'))).length;
    return {
      now: new Date().toISOString(), today,
      total: { devices: devs.length, returned, spoke, hours: Math.round(devs.reduce((s, v) => s + v.sec, 0) / 360) / 10, app: devs.filter((v) => v.plat === 'app').length, web: devs.filter((v) => v.plat === 'web').length },
      days, top, reach,
    };
  }

  /** The routes; true when it answered. */
  route(req, res, { clientIp = () => '' } = {}) {
    if (req.url === '/api/play-event' && req.method === 'GET') { // the counts only, for anyone (the app's pages come from another origin)
      res.writeHead(200, { 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=30', 'Access-Control-Allow-Origin': '*' });
      res.end(JSON.stringify(this.online()));
      return true;
    }
    if (req.url === '/api/play-event' && req.method === 'POST') {
      let body = '';
      req.on('data', (c) => { body += c; if (body.length > 4096) req.destroy(); });
      req.on('end', () => {
        let msg = null; try { msg = JSON.parse(body); } catch { /* not JSON */ }
        res.writeHead(this.record(msg, clientIp(req)) ? 204 : 400, { 'Cache-Control': 'no-store' }); res.end();
      });
      return true;
    }
    if (req.url.startsWith('/api/stats')) {
      const u = new URL(req.url, 'http://x');
      if (!this.key || u.searchParams.get('key') !== this.key) { res.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' }); res.end('yetkisiz\n'); return true; }
      const s = this.summary();
      if (u.searchParams.get('format') === 'json') { res.writeHead(200, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }); res.end(JSON.stringify(s)); return true; }
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex' });
      res.end(page(s, u.searchParams.get('key')));
      return true;
    }
    return false;
  }
}

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
/** Counter groups for the page: the prefix before ":" (none: the name itself). */
const GROUPS = [
  ['talk', 'Konuşulan karakterler'], ['act', 'Yapılan etkinlikler'], ['spot', 'Kullanılan yerler ve nesneler'], ['loc', 'Gidilen mekânlar'], ['cr', 'Kredi hareketleri'],
];
const SINGLES = [
  ['chat', 'Meydanda yazılan cümle'], ['voice', 'Sesli sohbet'], ['ride', 'Ata binme'], ['shop', 'Dükkân açma'], ['word', 'Öğrenilen kelime'], ['quest', 'Biten görev'],
];

function page(s, key) {
  const n = (v) => Number(v ?? 0).toLocaleString('tr-TR');
  const t = s.days.find((d) => d.day === s.today) ?? { active: 0, new: 0, opens: 0, minutes: 0, counts: {} };
  const maxReach = Math.max(1, s.reach[0]?.devices ?? 1);
  const group = (p, title) => {
    const rows = Object.entries(s.top).filter(([k]) => k.startsWith(`${p}:`)).map(([k, v]) => [k.slice(p.length + 1), v]).sort((a, b) => b[1] - a[1]).slice(0, 25);
    return rows.length ? `<h2>${title} <small>son ${s.days.length} gün</small></h2><table>${rows.map(([k, v]) => `<tr><td>${esc(k)}</td><td>${n(v)}</td></tr>`).join('')}</table>` : '';
  };
  const bar = (v) => `<span class="bar"><i style="width:${Math.round((100 * v) / maxReach)}%"></i></span>`;
  return `<!doctype html><html lang="tr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta http-equiv="refresh" content="60"><title>Oyun istatistikleri</title>
<style>body{font:15px system-ui,sans-serif;margin:16px;background:#14202e;color:#e8eef5}h1{font-size:22px;margin:0 0 4px}h2{font-size:17px;margin:22px 0 8px}small{color:#9fb0c2;font-weight:400}a{color:#ffd54a}
table{border-collapse:collapse;width:100%;max-width:900px;background:#1d2b3c;border-radius:10px;overflow:hidden}th,td{padding:7px 9px;border-bottom:1px solid #2b3c50;text-align:right}th:first-child,td:first-child{text-align:left}th{color:#9fb0c2;font-weight:600}
.big{display:flex;gap:12px;flex-wrap:wrap}.big div{background:#1d2b3c;border-radius:12px;padding:10px 14px}.big b{display:block;font-size:24px;color:#ffd54a}
.bar{display:inline-block;width:160px;height:10px;background:#2b3c50;border-radius:5px;vertical-align:middle;margin-left:8px;overflow:hidden}.bar i{display:block;height:100%;background:#45a852}</style></head><body>
<h1>Oyun istatistikleri</h1><small>Anonim sayılar: kimin ne yazdığı değil, kaç kere yapıldığı · her dakika yenilenir · <a href="/api/ad-stats?key=${encodeURIComponent(key)}">reklam sayıları</a></small>
<h2>Şimdiye kadar</h2>
<div class="big"><div><b>${n(s.total.devices)}</b>cihaz (oyuncu)</div><div><b>${n(s.total.returned)}</b>ertesi gün(ler) geri gelen</div><div><b>${n(s.total.spoke)}</b>biriyle konuşan</div><div><b>${n(s.total.hours)}</b>saat oynandı</div><div><b>${n(s.total.app)} / ${n(s.total.web)}</b>uygulama / web</div></div>
<h2>Bugün (${esc(s.today)})</h2>
<div class="big"><div><b>${n(t.active)}</b>aktif cihaz</div><div><b>${n(t.new)}</b>yeni cihaz</div><div><b>${n(t.opens)}</b>oyun açılışı</div><div><b>${n(t.minutes)}</b>dakika oynandı</div>
${SINGLES.map(([k, l]) => `<div><b>${n(t.counts[k])}</b>${l}</div>`).join('')}</div>
<h2>Son günler</h2><table><tr><th>Gün</th><th>aktif</th><th>yeni</th><th>açılış</th><th>dk</th>${SINGLES.map(([, l]) => `<th>${l}</th>`).join('')}</tr>
${s.days.map((d) => `<tr><td>${esc(d.day)}</td><td>${n(d.active)}</td><td>${n(d.new)}</td><td>${n(d.opens)}</td><td>${n(d.minutes)}</td>${SINGLES.map(([k]) => `<td>${n(d.counts[k]) === '0' ? '' : n(d.counts[k])}</td>`).join('')}</tr>`).join('')}</table>
<h2>Hangi bölüme kadar gidildi <small>o bölüme ulaşan cihaz sayısı</small></h2><table>${s.reach.map((r) => `<tr><td>${r.i + 1}. ${esc(r.id)}</td><td>${n(r.devices)} ${bar(r.devices)}</td></tr>`).join('')}</table>
${GROUPS.map(([p, title]) => group(p, title)).join('')}
</body></html>`;
}
