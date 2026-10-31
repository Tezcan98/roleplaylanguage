import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { PlayStats } from '../src/PlayStats.js';

const batch = (o = {}) => ({ pid: 'abcdefgh1234', v: '1.0.36', plat: 'app', lang: 'ar', ch: 2, chId: 'd1-afternoon', opens: 1, sec: 60, counts: { chat: 3, 'talk:anne': 2 }, ...o });

test('counts devices, play time, furthest chapter and what was done', () => {
  const s = new PlayStats();
  assert.ok(s.record(batch()));
  assert.ok(s.record(batch({ opens: 0, ch: 5, chId: 'd2-x', counts: { chat: 1 } })));
  assert.ok(s.record(batch({ pid: 'zzzzzzzz9999', plat: 'web', ch: 0, chId: 'd1-morning', counts: { 'talk:anne': 1 } })));
  const r = s.summary();
  assert.equal(r.total.devices, 2);
  assert.equal(r.total.app, 1); assert.equal(r.total.web, 1);
  assert.equal(r.total.spoke, 2);
  assert.equal(r.days[0].active, 2);
  assert.equal(r.days[0].counts.chat, 4);
  assert.equal(r.top['talk:anne'], 3);
  assert.deepEqual(r.reach.map((x) => x.devices), [2, 1, 1, 1, 1, 1]); // everyone reached chapter 0; one got to 5
});

test('refuses junk: bad ids, odd counter names, too many batches', () => {
  const s = new PlayStats();
  assert.equal(s.record({ pid: 'x' }), false);
  assert.equal(s.record(null), false);
  assert.ok(s.record(batch({ counts: { 'Bad Key': 5, ok: 2, big: 99999, neg: -1, 'a/b': 1 } })));
  assert.deepEqual(Object.keys(s.summary().top), ['ok']);
  const t = new PlayStats();
  let ok = 0; for (let i = 0; i < 40; i++) ok += t.record(batch(), '1.2.3.4') ? 1 : 0;
  assert.equal(ok, 20);
});

test('keeps its numbers across a restart', () => {
  const dir = mkdtempSync(join(tmpdir(), 'play-'));
  try {
    const a = new PlayStats({ dir });
    a.record(batch());
    a.flush();
    const b = new PlayStats({ dir });
    const r = b.summary();
    assert.equal(r.total.devices, 1); assert.equal(r.top.chat, 3); assert.equal(r.reach.length, 3);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test('the page needs the key', async () => {
  const s = new PlayStats({ key: 'sirr' });
  s.record(batch());
  const run = (url) => new Promise((resolve) => { const out = { code: 0, body: '' }; s.route({ url, method: 'GET', headers: {} }, { writeHead: (c) => { out.code = c; }, end: (b) => resolve({ ...out, body: String(b ?? '') }) }); });
  assert.equal((await run('/api/stats')).code, 403);
  assert.equal((await run('/api/stats?key=yanlis')).code, 403);
  const page = await run('/api/stats?key=sirr');
  assert.equal(page.code, 200); assert.match(page.body, /Oyun istatistikleri/); assert.match(page.body, /d1-afternoon/);
  assert.equal(JSON.parse((await run('/api/stats?key=sirr&format=json')).body).total.devices, 1);
});

test('downloads: a device\'s first game opened, by app / web, today and the days before; the ad page shows them, countries by name', async () => {
  const s = new PlayStats();
  s.record(batch());
  s.record(batch({ opens: 0 })); // the same device again: no new download
  s.record(batch({ pid: 'zzzzzzzz9999', plat: 'web' }));
  const i = s.installs(3);
  assert.deepEqual([i.total, i.app, i.web, i.days.length], [2, 1, 1, 3]);
  assert.deepEqual(i.days[0], { day: i.since, app: 1, web: 1 });
  const { AdStats } = await import('../src/AdStats.js');
  const ads = new AdStats({ key: 'k', installs: () => s.installs(), play: () => s.summary() });
  ads.record({ e: 'show', f: 'banner', pid: 'aaaaaaaa1111' }, '1.2.3.4', 'TR');
  let html = '';
  ads.route({ url: '/api/ad-stats?key=k', method: 'GET' }, { writeHead() {}, end(b) { html = b; } });
  assert.match(html, /Türkiye/, 'the country by name, not "TR"');
});

test('ad page: an empty request (no fill) is counted apart, not listed as an error; loads give the fill rate', async () => {
  const { AdStats } = await import('../src/AdStats.js');
  const ads = new AdStats({ key: 'k' });
  ads.record({ e: 'load', f: 'banner' }, '1.1.1.1');
  ads.record({ e: 'fail', f: 'banner', code: 3 }, '1.1.1.1');
  ads.record({ e: 'fail', f: 'rewarded', code: 1 }, '1.1.1.1'); // a real error stays one
  const s = ads.summary();
  assert.deepEqual(s.days[0].counts.banner, { load: 1, empty: 1 });
  assert.equal(s.days[0].counts.rewarded.fail, 1);
  assert.deepEqual(s.latest.map((e) => e.e), ['fail', 'load']);
  assert.equal(s.emptyToday, 1);
});

test('today and now: devices that played today, and the ones with a batch in the last minutes', () => {
  const s = new PlayStats();
  assert.deepEqual(s.online(), { total: 0, today: 0, now: 0 });
  s.record(batch());
  s.record(batch({ pid: 'zzzzzzzz9999' }));
  s.record(batch({ opens: 0 })); // the same device again
  assert.deepEqual(s.online(), { total: 2, today: 2, now: 2 });
  assert.deepEqual(s.online(Date.now() + 10 * 60_000), { total: 2, today: 2, now: 0 }); // ten minutes later nobody sent one
});

test('total with the ad numbers: the app\'s players from those, the browser\'s from the play numbers, each once', async () => {
  const { AdStats } = await import('../src/AdStats.js');
  const s = new PlayStats(), ads = new AdStats({ key: 'k' });
  s.adDevices = () => ads.devices();
  ads.record({ e: 'load', f: 'banner', pid: 'aaaaaaaa1111' }, '1.1.1.1');
  ads.record({ e: 'impression', f: 'banner', pid: 'aaaaaaaa1111' }, '1.1.1.1'); // the same phone again
  ads.record({ e: 'load', f: 'banner', pid: 'bbbbbbbb2222' }, '1.1.1.2');
  s.record(batch({ pid: 'aaaaaaaa1111', plat: 'app' })); // a phone that is in the ad numbers too: not twice
  s.record(batch({ pid: 'cccccccc3333', plat: 'web' })); // a browser: no ads there
  assert.equal(s.online().total, 3);
});

test('tasks: how many devices did each, and how many times', () => {
  const s = new PlayStats();
  s.record(batch({ counts: { 'q:talk-mom': 1, 'q:bucket': 1 } }));
  s.record(batch({ pid: 'zzzzzzzz9999', counts: { 'q:talk-mom': 1 } }));
  s.record(batch({ counts: { 'q:bucket': 1 } })); // the first device again
  const q = Object.fromEntries(s.summary().quests.map((x) => [x.id, [x.devices, x.times]]));
  assert.deepEqual(q, { 'talk-mom': [2, 2], bucket: [1, 2] });
});

test('numbers page: tabs kept through the refresh (a script, not a meta refresh); countries are the devices of the kept days, with today beside', async () => {
  const { AdStats } = await import('../src/AdStats.js');
  const ads = new AdStats({ key: 'k' });
  ads.record({ e: 'load', f: 'banner', pid: 'aaaaaaaa1111' }, '1.1.1.1', 'PK');
  ads.record({ e: 'load', f: 'banner', pid: 'aaaaaaaa1111' }, '1.1.1.1', 'PK'); // the same device: once
  ads.record({ e: 'load', f: 'banner', pid: 'bbbbbbbb2222' }, '1.1.1.2', 'TR');
  const get = (url) => { let b = ''; ads.route({ url, method: 'GET' }, { writeHead() {}, end(x) { b = x; } }); return b; };
  const html = get('/api/istatistik?key=k'); // (the old /api/ad-stats address answers too)
  assert.doesNotMatch(html, /http-equiv="refresh"/);
  assert.match(html, /localStorage/);
  assert.match(html, /location\.reload\(\)/);
  assert.doesNotMatch(html, /tahmini gelir|Reklamlar/, 'no earnings on the page');
  assert.equal(get('/api/ad-stats?key=k').length > 1000, true);
  assert.deepEqual(JSON.parse(get('/api/istatistik?key=k&format=json')).countries, [['PK', 1, 1], ['TR', 1, 1]]);
});

test('numbers page: play time (total, today, per device) and Yusuf Hoca by name', async () => {
  const { AdStats } = await import('../src/AdStats.js');
  const s = new PlayStats(), ads = new AdStats({ key: 'k', play: () => s.summary() });
  s.record(batch({ sec: 3600, counts: { 'talk:imam': 2 } }));
  s.record(batch({ pid: 'zzzzzzzz9999', sec: 1800, counts: {} }));
  let html = '';
  ads.route({ url: '/api/istatistik?key=k', method: 'GET' }, { writeHead() {}, end(b) { html = b; } });
  assert.match(html, /data-p="today"><div class="big"><div><b>2<\/b>oyuncu<\/div><div><b>2<\/b>yeni oyuncu<\/div><div><b>1,5 saat<\/b>oynanan süre<\/div><div><b>45 dk<\/b>kişi başı ortalama/);
  assert.match(html, /Yusuf Hoca \(imam\)/);
});

test('play time chart: people per length of play, per period, per country', () => {
  const s = new PlayStats();
  s.record(batch({ sec: 30 }), '', 'TR'); // under a minute
  s.record(batch({ pid: 'zzzzzzzz9999', sec: 240 }), '', 'TR'); // 3–5
  s.record(batch({ pid: 'yyyyyyyy8888', sec: 3000 }), '', 'PK');
  s.record(batch({ pid: 'yyyyyyyy8888', sec: 600 }), '', 'PK'); // 3600 in all: over 30
  const t = s.summary().periods.today;
  assert.deepEqual(t.hist.all, [1, 0, 0, 1, 0, 0, 1]);
  assert.deepEqual(t.hist.TR, [1, 0, 0, 1, 0, 0, 0]);
  assert.deepEqual(t.hist.PK, [0, 0, 0, 0, 0, 0, 1]);
  assert.deepEqual([t.devices, t.new, t.minutes, t.played], [3, 3, 65, 3]);
  assert.equal(s.summary().periods.yesterday.devices, 0);
  assert.deepEqual(s.summary().periods.total.people, { all: 3, TR: 2, PK: 1 });
});

test('play time chart: a device without a known country is counted as "?"; junk country is ignored', () => {
  const s = new PlayStats();
  s.record(batch({ sec: 90 }), '', 'tr<'); // not two capital letters
  assert.deepEqual(s.summary().periods.week.hist['?'], [0, 1, 0, 0, 0, 0, 0]);
});

test('playing now: who is in the game right now, by country', () => {
  const s = new PlayStats();
  s.record(batch({ pid: 'aaaaaaaa1111' }), '', 'TR');
  s.record(batch({ pid: 'bbbbbbbb2222' }), '', 'TR');
  s.record(batch({ pid: 'cccccccc3333' }), '', 'PK');
  s.record(batch({ pid: 'dddddddd4444' })); // no country known
  assert.deepEqual(s.summary().playing, { n: 4, countries: [['TR', 2], ['PK', 1], ['?', 1]] });
});

test('retention by country: the next day and any later day, among devices that began before today', () => {
  const dir = mkdtempSync(join(tmpdir(), 'ps-'));
  try {
    const yday = (k) => new Date(Date.now() - k * 86400000).toLocaleDateString('sv-SE', { timeZone: 'Europe/Istanbul' });
    const dev = (first, last, cc) => ({ first, last, ch: 0, chId: '', plat: 'app', v: '', lang: '', cc, sec: 60, opens: 1, counts: {} });
    writeFileSync(join(dir, 'devices.json'), JSON.stringify({ a: dev(yday(2), yday(1), 'TR'), b: dev(yday(2), yday(2), 'TR'), c: dev(yday(2), yday(0), 'PK'), d: dev(yday(0), yday(0), 'TR') }));
    writeFileSync(join(dir, `${yday(1)}.jsonl`), `${JSON.stringify({ h: 'a', opens: 1, sec: 60, counts: {} })}\n`); // a played the day after it began
    writeFileSync(join(dir, `${yday(2)}.jsonl`), `${JSON.stringify({ h: 'b', opens: 1, sec: 60, counts: {} })}\n`);
    const r = Object.fromEntries(new PlayStats({ dir }).summary().retention.map(([c, ...v]) => [c, v]));
    assert.deepEqual(r.TR, [2, 1, 1, 2]); // d began today: not counted
    assert.deepEqual(r.PK, [1, 0, 1, 1]); // c came back later, not the next day
    assert.deepEqual(r.all, [3, 1, 2, 3]);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test('first minutes: the steps reached, seconds per screen, idle share and where devices were last seen', () => {
  const s = new PlayStats();
  s.record(batch({ pid: 'aaaaaaaa1111', sec: 30, counts: { 'fn:setup': 1, 'fn:play': 1, 'scr:setup': 20, 'scr:play': 30, idle: 15 }, at: { scr: 'play', q: 'talk-mom', loc: 'yard' } }));
  s.record(batch({ pid: 'bbbbbbbb2222', sec: 0, counts: { 'fn:setup': 1, 'scr:setup': 40 }, at: { scr: 'setup', q: '', loc: '' } }));
  s.record(batch({ pid: 'cccccccc3333', at: { scr: 'bad<script>' } })); // junk is dropped
  const f = s.summary().firstMinutes;
  assert.equal(f.devices, 2);
  assert.deepEqual([f.steps.setup, f.steps.play], [2, 1]);
  assert.equal(f.screens.setup, 30);
  assert.equal(f.idle, 50);
  assert.deepEqual(f.stops, [['play:talk-mom', 1], ['setup', 1]]);
});

test('first-minutes sub-page: a button on the numbers page leads to it; steps, drop, screens, countries', async () => {
  const { AdStats } = await import('../src/AdStats.js');
  const s = new PlayStats(), ads = new AdStats({ key: 'k', play: () => s.summary() });
  s.record(batch({ pid: 'aaaaaaaa1111', sec: 30, counts: { 'fn:setup': 1, 'fn:play': 1, 'fn:move': 1, 'scr:setup': 20, 'scr:play': 30 }, at: { scr: 'play', q: 'talk-mom', loc: 'yard' } }), '', 'TR');
  s.record(batch({ pid: 'bbbbbbbb2222', sec: 0, counts: { 'fn:setup': 1, 'scr:setup': 40 }, at: { scr: 'setup', q: '', loc: '' } }), '', 'IN');
  const get = (url) => { let b = ''; ads.route({ url, method: 'GET' }, { writeHead() {}, end(x) { b = x; } }); return b; };
  const main = get('/api/istatistik?key=k');
  assert.match(main, /href="\?key=k&amp;sayfa=ilk"/);
  const sub = get('/api/istatistik?key=k&sayfa=ilk');
  assert.match(sub, /İlk dakikalar/); assert.match(sub, /Oyuna girdi/); assert.match(sub, /Bu adıma ulaşmayan/); assert.match(sub, /1 \(%50\)/);
  assert.match(sub, /Türkiye/); assert.match(sub, /Hindistan/); assert.match(sub, /talk-mom/);
});
