/**
 * Records the Play Store promo video from the game itself: every scene is played by script,
 * captions are drawn in the page (Turkish, with the meaning underneath, like in the game),
 * ffmpeg joins the scenes with short fades.
 *   node tools/promo/record.mjs [outDir] [--only=title,house] [--lang=en|ar --piper=<bin> --voice=<model.onnx>]
 * Frames are taken in virtual time: the page's clock (requestAnimationFrame, performance.now,
 * timers) stands still and moves 1/30 s per frame, so the video is smooth however slowly the
 * machine renders (the screencast used to drop two frames in three).
 * --lang: captions in English or Arabic (Turkish underneath), the meanings in the game in that
 * language, and a voice-over (Piper TTS, `--piper` the binary, `--voice` the voice model).
 */
import { chromium } from 'playwright';
import { mkdirSync, writeFileSync, rmSync, readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { join } from 'node:path';
import { startServer, startVillageServer, sleep } from '../playtest/lib.mjs';
import { SCENES as LONG_SCENES, CUT as LONG_CUT, SHORT_SCENES, SHORT_CUT } from './scenes.mjs'; // SCENES: recording order; CUT: the order in the video

const out = process.argv.slice(2).find((a) => !a.startsWith('--')) ?? 'promo-out';
const only = process.argv.find((a) => a.startsWith('--only='))?.slice(7).split(',');
const JOIN = process.argv.includes('--join'); // --join: only join the scene clips already recorded (after re-recording one with --only)
const CLEAN = process.argv.includes('--clean'); // --clean: no interface, no captions (a background loop for the website)
const opt = (k) => process.argv.find((a) => a.startsWith(`--${k}=`))?.slice(k.length + 3);
const LANG = opt('lang') ?? null; // en | ar: captions, meanings and voice-over in that language
const SHORT = process.argv.includes('--short'); // --short: the vertical YouTube Short (9:16, 1080×1920)
const FPS = 30, W = SHORT ? 540 : 1280, H = SHORT ? 960 : 720, SCALE = SHORT ? 2 : 1.5; // 1920×1080 frames (a Short: 1080×1920), UI the size of a tablet's / a phone's
const SCENES = SHORT ? SHORT_SCENES : LONG_SCENES, CUT = SHORT ? SHORT_CUT : LONG_CUT;
mkdirSync(out, { recursive: true });

const server = await startServer();
const village = await startVillageServer();
const browser = await chromium.launch({ args: ['--use-angle=gl', '--ignore-gpu-blocklist', '--enable-gpu', '--autoplay-policy=no-user-gesture-required'] });

/**
 * The page's clock, frozen and moved by hand while a scene is recorded (window.__vclock): every
 * frame is rendered at exactly 1/30 s after the one before. Off, everything runs in real time.
 */
const VCLOCK = `(() => {
  const real = { raf: requestAnimationFrame.bind(window), caf: cancelAnimationFrame.bind(window), now: performance.now.bind(performance), dnow: Date.now,
    st: setTimeout.bind(window), ct: clearTimeout.bind(window), si: setInterval.bind(window), ci: clearInterval.bind(window) };
  let on = false, vt = 0, base = 0, dbase = 0, id = 1e7;
  const rafs = new Map(), timers = new Map();
  window.requestAnimationFrame = (cb) => { if (!on) return real.raf(cb); rafs.set(++id, cb); return id; };
  window.cancelAnimationFrame = (i) => { rafs.delete(i); real.caf(i); };
  performance.now = () => (on ? vt : real.now());
  Date.now = () => (on ? dbase + (vt - base) : real.dnow());
  window.setTimeout = (cb, ms = 0, ...a) => { if (!on) return real.st(cb, ms, ...a); timers.set(++id, { at: vt + Math.max(0, +ms || 0), cb, a }); return id; };
  window.setInterval = (cb, ms = 0, ...a) => { if (!on) return real.si(cb, ms, ...a); timers.set(++id, { at: vt + Math.max(1, +ms || 1), every: Math.max(1, +ms || 1), cb, a }); return id; };
  window.clearTimeout = (i) => { timers.delete(i); real.ct(i); };
  window.clearInterval = (i) => { timers.delete(i); real.ci(i); };
  const call = (f, a) => { try { if (typeof f === 'function') f(...a); } catch (e) { console.error(e); } };
  window.__vclock = {
    start() { vt = base = real.now(); dbase = real.dnow(); on = true; },
    advance(ms) {
      const end = vt + ms;
      for (;;) { // the timers due by then, in order
        let next = null;
        for (const [i, t] of timers) if (t.at <= end && (!next || t.at < next[1].at)) next = [i, t];
        if (!next) break;
        const [i, t] = next; vt = Math.max(vt, t.at);
        if (t.every) t.at += t.every; else timers.delete(i);
        call(t.cb, t.a);
      }
      vt = end;
      const due = [...rafs.values()]; rafs.clear();
      due.forEach((cb) => call(cb, [vt]));
    },
    stop() { // back to real time: the waiting frame callbacks and timers go on from there
      on = false;
      const due = [...rafs.values()]; rafs.clear(); due.forEach((cb) => real.raf(cb));
      for (const [i, t] of timers) { timers.delete(i); if (t.every) real.si(t.cb, t.every, ...t.a); else real.st(t.cb, Math.max(0, t.at - vt), ...t.a); }
    },
  };
})();`;

/** A player in the game: its own browser context (own storage), already past the menu if `story`. */
async function open(params = '', { extra = false } = {}) { // extra: a player only there for the others to see (not filmed): small and cheap
  const ctx = await browser.newContext({ viewport: extra ? { width: 480, height: 270 } : { width: W, height: H }, deviceScaleFactor: extra ? 1 : SCALE, permissions: ['microphone'] });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => console.warn('[page]', e.message));
  await page.addInitScript(VCLOCK); // every page's clock is ours while recording (the others too: they move in step, no rushing or jumping)
  clocked.add(page); page.on('close', () => clocked.delete(page));
  await page.goto(`${server.url}/?debug&fakemic&nointro&fresh&quality=${extra ? 'low&norender' : 'high'}&mockads&gloss=${LANG ?? 'en'}&mp=${encodeURIComponent(village.url)}${params}`);
  await page.waitForFunction(() => window.__game, null, { timeout: 120000 }); // (a dozen pages open at once on the square: slow)
  await page.addStyleTag({ content: PROMO_CSS });
  if (SHORT) await page.evaluate(() => document.body.classList.add('short'));
  return page;
}

const PROMO_CSS = `
  .promo-cap{position:fixed;left:50%;top:5vh;transform:translateX(-50%);z-index:9999;text-align:center;pointer-events:none;
    background:rgba(27,36,64,.78);color:#fff;border-radius:18px;padding:14px 30px 12px;font-family:Fredoka,system-ui,sans-serif;
    box-shadow:0 8px 30px rgba(0,0,0,.25);animation:promoIn .45s ease-out both;max-width:80vw}
  .promo-cap.bottom{top:auto;bottom:4vh}
  body.short .promo-cap{top:8vh;left:5vw;right:5vw;transform:none;max-width:none;padding:16px 20px 14px;border-radius:22px;animation-name:promoCard}body.short .hud,body.short .net-status{visibility:hidden!important}body.short #toasts{top:26vh!important}body.short .promo-cap b{font-size:40px}body.short .promo-cap small{font-size:20px}
  body.short .promo-card h1{font-size:54px}body.short .promo-card p{font-size:30px;padding:0 20px}body.short .promo-card img{width:170px;height:170px}
  .promo-badges{display:flex;gap:12px;justify-content:center;margin-top:16px}.promo-badges span{background:#000;color:#fff;border:2px solid #fff6;border-radius:12px;padding:10px 16px;font:600 20px system-ui,sans-serif}
  .promo-cap.side{left:3vw;top:38vh;transform:none;max-width:21vw;text-align:left;animation-name:promoSide}.promo-cap.side b{font-size:32px}.promo-cap.side small{font-size:18px}
  @keyframes promoSide{from{opacity:0}to{opacity:1}}
  .promo-cap b{display:block;font-size:40px;font-weight:600;line-height:1.15}
  .promo-cap small{display:block;font-size:21px;opacity:.85;margin-top:4px}
  .promo-card{position:fixed;inset:0;z-index:9998;display:grid;place-items:center;align-content:center;gap:14px;text-align:center;
    background:radial-gradient(ellipse at center,rgba(27,36,64,.55),rgba(27,36,64,.88));color:#fff;font-family:Fredoka,system-ui,sans-serif;animation:promoIn .6s ease-out both}
  .promo-card img{width:150px;height:150px;border-radius:34px;box-shadow:0 10px 40px rgba(0,0,0,.4)}
  .promo-card h1{margin:0;font-size:72px;font-weight:700;letter-spacing:.5px}
  .promo-card p{margin:0;font-size:30px}.promo-card small{font-size:22px;opacity:.85}
  .promo-card .badge{margin-top:10px;background:#FFC845;color:#1B2440;border-radius:999px;padding:10px 26px;font-size:26px;font-weight:600}
  .promo-hide #joy,.promo-hide .help-btn,.promo-hide #quest,.promo-hide #toasts,.promo-hide .ptt-wrap,.promo-hide #shot,.promo-hide #act,.promo-hide #act-more{visibility:hidden!important}
  @keyframes promoIn{from{opacity:0;transform:translate(-50%,-12px)}to{opacity:1}}
  .promo-card{animation-name:promoCard}@keyframes promoCard{from{opacity:0}to{opacity:1}}`;

/** The open pages (all on the virtual clock while a scene is recorded). */
const clocked = new Set();
const allClocks = (fn, arg) => Promise.all([...clocked].map((p) => p.evaluate(fn, arg).catch(() => {})));

/** While a scene is recorded: its virtual time (ms) and who waits for it (kit.sleep in the scene). */
let rec = null;
const vsleep = (ms) => (rec ? new Promise((r) => rec.waiters.push({ at: rec.t + ms, r })) : sleep(ms));

/** Captions and cards in the video's language (Turkish underneath). */
const LOCAL = {
  'Dünyadan arkadaşlarla buluş': { en: 'Meet friends from all over the world', ar: 'التقِ بأصدقاء من كل أنحاء العالم' },
  'Birlikte Türkçe konuşun': { en: 'Speak Turkish together', ar: 'تحدّثوا التركية معًا' },
  'Köyü birlikte gez': { en: 'Explore the village together', ar: 'استكشفوا القرية معًا' },
  'Dev satranç, futbol, kütüphane': { en: 'Giant chess, football, a library', ar: 'شطرنج عملاق، كرة قدم، مكتبة' },
  'Bakkalda Türkçe alışveriş': { en: 'Shop at the grocer’s in Turkish', ar: 'تسوّق من البقالة بالتركية' },
  'Kocaman bir ev, bütün bir köy': { en: 'A family home, a whole village', ar: 'بيت عائلة، وقرية كاملة' },
  'Köyü keşfet': { en: 'Explore the village', ar: 'استكشف القرية' },
  'Konuş, seni anlasın': { en: 'Speak — the game listens', ar: 'تكلّم، واللعبة تفهمك' },
  'Okulda dersler': { en: 'Lessons at school, from A1', ar: 'دروس في المدرسة، من A1' },
  'Karakterini giydir': { en: 'Dress up your character', ar: 'ألبِس شخصيتك' },
};
const CARDS = {
  en: ['Learn Turkish by living it', 'in an Anatolian village', 'Learn Turkish'],
  ar: ['تعلّم التركية بالعيش فيها', 'في قرية أناضولية', 'تعلّم التركية'],
};
const localCard = (html) => {
  if (!LANG) return html;
  const [a, b, c] = CARDS[LANG];
  return html.replace(/<p>Türkçeyi köyde yaşayarak öğren<\/p><small>[^<]*<\/small>/, `<p dir="auto">${a}</p><small dir="auto">${b} · Türkçeyi köyde yaşayarak öğren</small>`)
    .replace(/<p>Türkçe Öğren<\/p><small>[^<]*<\/small>/, `<p dir="auto">${c}</p><small>Türkçe Öğren</small>`);
};

/** Helpers the scenes use. */
const kit = {
  open, sleep: vsleep,
  caption: (page, tr0, en0, { bottom = false, side = false } = {}) => CLEAN ? null : page.evaluate(([tr, en, bottom, side]) => {
    document.querySelector('.promo-cap')?.remove();
    if (!tr) return;
    const d = document.createElement('div'); d.className = `promo-cap${bottom ? ' bottom' : ''}${side ? ' side' : ''}`;
    d.innerHTML = `<b dir="auto"></b><small dir="auto"></small>`; d.querySelector('b').textContent = tr; d.querySelector('small').textContent = en;
    document.body.append(d);
  }, LANG && tr0 ? [LOCAL[tr0]?.[LANG] ?? en0, tr0, bottom, side] : [tr0, en0, bottom, side]),
  card: (page, html0) => CLEAN ? null : page.evaluate((html) => {
    document.querySelector('.promo-card')?.remove();
    if (!html) return;
    const d = document.createElement('div'); d.className = 'promo-card'; d.innerHTML = html; document.body.append(d);
  }, localCard(html0)),
  hideHud: async (page, on = true) => {
    await page.evaluate((on) => document.body.classList.toggle('promo-hide', on), on);
    if (CLEAN && on) await page.addStyleTag({ content: 'body > div > *:not(canvas){visibility:hidden!important}' }); // only the game world
  },
  /** Hold a movement key for `ms` (w a s d). */
  walk: async (page, key, ms) => { await page.keyboard.down(key); await vsleep(ms); await page.keyboard.up(key); },
  /** Camera closer (z < 1) or further, like the mouse wheel. */
  zoom: async (page, notches) => { await page.mouse.move(W / 2, H / 2); for (let i = 0; i < Math.abs(notches); i++) { await page.mouse.wheel(0, notches < 0 ? -100 : 100); await sleep(30); } },
  closeCards: (page) => page.evaluate(() => document.querySelectorAll('.overlay.open .card .btn').forEach((b) => b.click())),
};

/**
 * Record `seconds` of `page` while `act()` runs; returns the clip's path. `still`: also a store
 * screenshot that many seconds in. Frame by frame in the page's virtual time (VCLOCK): move the
 * clock 1/30 s, take the picture, let the scene's script (its kit.sleep is virtual too) go on.
 */
async function record(page, name, seconds, act, still = null, shotName = null) {
  const dir = join(out, `frames-${name}`); rmSync(dir, { recursive: true, force: true }); mkdirSync(dir);
  const frames = Math.round(seconds * FPS), step = 1000 / FPS, stillAt = still == null ? -1 : Math.round(still * FPS);
  await allClocks(() => window.__vclock.start());
  rec = { t: 0, waiters: [] };
  let acting = true;
  const acted = Promise.resolve().then(act).catch((e) => console.warn(`[${name}]`, e.message)).finally(() => { acting = false; });
  for (let f = 0; f < frames; f++) {
    await allClocks((ms) => window.__vclock.advance(ms), step);
    rec.t += step;
    rec.waiters = rec.waiters.filter((w) => (w.at <= rec.t ? (w.r(), false) : true));
    await page.screenshot({ path: join(dir, `${String(f).padStart(5, '0')}.jpg`), type: 'jpeg', quality: 92 });
    if (f === stillAt) await page.screenshot({ path: join(out, 'screens', `${shotName ?? `${String(++shots).padStart(2, '0')}-${name}`}.png`) });
    for (let k = 0; k < 4 && acting; k++) await new Promise((r) => setImmediate(r)); // the scene's script takes its turn
  }
  rec.waiters.forEach((w) => w.r()); rec = null; // a script still waiting goes on (and ends) in real time
  await Promise.race([acted, sleep(3000)]);
  await allClocks(() => window.__vclock.stop());
  const clip = join(out, `${name}.mp4`);
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-framerate', String(FPS), '-i', join(dir, '%05d.jpg'), '-t', String(seconds),
    '-vf', `scale=${SHORT ? '1080:1920' : '1920:1080'}:flags=lanczos,format=yuv420p`, '-c:v', 'libx264', '-preset', 'slow', '-crf', '17', clip]);
  console.log(`${name}: ${frames} frames → ${clip}`);
  return clip;
}

/** The 1024×500 feature graphic: the village screenshot behind the icon and the name (no prices, no "free"). */
async function featureGraphic() {
  // a clean picture of the square (no interface at all) for the background
  const bg = join(out, 'feature-bg.png');
  const game = await open();
  await game.evaluate(() => document.querySelector('.menu-main')?.click()); await sleep(2500); await kit.closeCards(game);
  await game.evaluate(() => { const g = window.__game, w = g.wallet, it = { id: 'hd', slot: 'hd' }; w.buy({ ...it, price: 0 }); w.equip(it); g.shop.onOutfit?.(); }); // HD player → HD villagers
  await game.evaluate(() => window.__game.travel.go('village', 'yardRoad')); await sleep(5000); await kit.closeCards(game);
  await game.evaluate(() => { const g = window.__game; g.player.position.set(-1, 0, 7); g.camera.snap(g.player.position, false); });
  await kit.zoom(game, -1); await sleep(2000);
  await game.addStyleTag({ content: 'body > div > *:not(canvas){visibility:hidden!important}' });
  await sleep(300); await game.screenshot({ path: bg }); await game.context().close();
  const page = await (await browser.newContext({ viewport: { width: 1024, height: 500 } })).newPage();
  const img = (f) => `data:image/png;base64,${readFileSync(f).toString('base64')}`;
  await page.setContent(`<body style="margin:0;width:1024px;height:500px;overflow:hidden;font-family:Fredoka,system-ui,sans-serif">
    <link href="https://fonts.googleapis.com/css2?family=Fredoka:wght@500;700&display=swap" rel="stylesheet">
    <div style="position:absolute;inset:0;background:url(${img(bg)}) center/cover"></div>
    <div style="position:absolute;inset:0;background:linear-gradient(90deg,rgba(27,36,64,.92) 0%,rgba(27,36,64,.75) 45%,rgba(27,36,64,.1) 75%)"></div>
    <div style="position:absolute;left:56px;top:50%;transform:translateY(-50%);display:flex;gap:28px;align-items:center;color:#fff">
      <img src="${img('assets/icons/icon-512.png')}" style="width:150px;height:150px;border-radius:34px;box-shadow:0 10px 40px rgba(0,0,0,.45)">
      <div><div style="font-size:60px;font-weight:700;line-height:1">Türk Ailem</div>
      <div style="font-size:30px;margin-top:10px;color:#FFC845;font-weight:500">Türkçe Öğren</div>
      <div style="font-size:20px;margin-top:6px;opacity:.9">Learn Turkish by living it</div></div></div></body>`, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.evaluate(() => document.fonts.ready);
  await sleep(1500);
  await page.screenshot({ path: join(out, 'screens', 'feature-graphic-1024x500.png') });
  await page.context().close();
}

/** What the voice says over each scene (it starts a moment after the scene does). */
const NARRATION = {
  en: {
    title: 'Learn Turkish by living it, with Türk Ailem.',
    mpFountain: 'Meet Turkish learners from all over the world in the village square, and talk to them in Turkish.',
    grocer: 'Go shopping at the grocer’s, with Turkish lira.',
    mpTea: 'Sit down for a glass of tea, and chat together.',
    speak: 'Speak out loud. The game listens to you.',
    mpWalk: 'Explore the village with your friends.',
    school: 'Learn step by step at school, from A1.',
    mpChess: 'Play giant chess, football, read in the library, and much more.',
    shop: 'Dress up your character.',
    end: 'Türk Ailem. Learn Turkish by living it.',
    sOpen: 'Coming soon…',
    sFamily: 'Live with a Turkish family.',
    sQuest: 'Learn Turkish by doing tasks with them.',
    sSpeak: 'Speak, and the game understands you.',
    sSquare: 'Meet learners from all over the world.',
    sVoice: 'Push to talk, or call them by voice.',
    sEnd: 'Türk Ailem. Coming soon to Google Play and the App Store.',
  },
  ar: {
    title: 'تعلّم التركية بالعيش فيها.',
    mpFountain: 'تعرّف على متعلمي التركية من كل أنحاء العالم في ساحة القرية، وتحدّث معهم بالتركية.',
    grocer: 'تسوّق من البقالة بالليرة التركية.',
    mpTea: 'اجلس لكوب من الشاي، وتحدّثوا معًا.',
    speak: 'تكلّم بصوت عالٍ، واللعبة تسمعك.',
    mpWalk: 'استكشف القرية مع أصدقائك.',
    school: 'تعلّم خطوة بخطوة في المدرسة، من المستوى الأول.',
    mpChess: 'العب الشطرنج العملاق وكرة القدم، واقرأ في المكتبة، وأكثر.',
    shop: 'ألبِس شخصيتك.',
    end: 'أناضولو آيلسي. تعلّم التركية بالعيش فيها.',
    sOpen: 'قريبًا جدًا…',
    sFamily: 'عِش مع عائلة تركية.',
    sQuest: 'وتعلّم التركية بإنجاز المهام معهم.',
    sSpeak: 'تكلّم، واللعبة تفهمك.',
    sSquare: 'التقِ بمتعلّمين من كل العالم.',
    sVoice: 'اضغط وتكلّم، أو اتصل بهم صوتيًا.',
    sEnd: 'أناضولو آيلسي. قريبًا على غوغل بلاي وآب ستور.',
  },
};

/** The voice-over (Piper TTS) laid over the joined video: each line at its scene, a little faster if it would run into the next. */
function voiceOver(video, clips, fade) {
  const piper = opt('piper'), voice = opt('voice');
  if (!piper || !voice) { console.warn('voice-over: --piper and --voice are needed'); return; }
  const lines = NARRATION[LANG] ?? {}, dir = join(out, `voice-${LANG}`); mkdirSync(dir, { recursive: true });
  let start = 0; const parts = [];
  clips.forEach((c, i) => {
    const name = CUT?.[i], text = name && lines[name];
    const room = c.seconds - (i < clips.length - 1 ? fade : 0) - 0.6; // until the next scene begins
    if (text) {
      const wav = join(dir, `${String(i).padStart(2, '0')}-${name}.wav`);
      execFileSync(piper, ['-m', voice, '-f', wav, '--length-scale', LANG === 'ar' ? '0.85' : '0.95', '--sentence-silence', '0.1'], { input: text, stdio: ['pipe', 'ignore', 'ignore'] });
      const len = Number(execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', wav]).toString());
      const tempo = Math.min(1.35, Math.max(1, len / room));
      parts.push({ wav, at: start + 0.4, tempo });
      if (len / tempo > room) console.warn(`voice-over: "${name}" is ${len.toFixed(1)} s for ${room.toFixed(1)} s`);
    }
    start += c.seconds - fade;
  });
  const inputs = parts.flatMap((p) => ['-i', p.wav]);
  const filters = parts.map((p, i) => `[${i + 1}:a]atempo=${p.tempo.toFixed(3)},adelay=${Math.round(p.at * 1000)}|${Math.round(p.at * 1000)},volume=1.6[a${i}]`);
  const mix = `${filters.join(';')};${parts.map((_, i) => `[a${i}]`).join('')}amix=inputs=${parts.length}:normalize=0,alimiter=limit=0.95,apad[a]`;
  const final = video.replace(/\.mp4$/, `-${LANG}.mp4`);
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', video, ...inputs, '-filter_complex', mix, '-map', '0:v', '-map', '[a]', '-c:v', 'copy', '-c:a', 'aac', '-b:a', '160k', '-shortest', '-movflags', '+faststart', final]);
  console.log(`→ ${final} (voice-over: ${LANG})`);
}

const clips = [];
let shots = 0;
mkdirSync(join(out, 'screens'), { recursive: true });
try {
  for (const s of SCENES) {
    if (only && !only.includes(s.name) && !JOIN) continue;
    if (JOIN) { if (!s.stillOnly) clips.push({ file: join(out, `${s.name}.mp4`), seconds: s.seconds }); continue; } // --join: the clips already there
    const page = await s.setup(kit);
    const file = await record(page, s.name, s.seconds, () => s.act(kit, page), s.still, s.shot);
    if (!s.stillOnly) clips.push({ file, seconds: s.seconds });
    if (s.cleanup) await s.cleanup(kit, page); else await page.context().close();
  }
  // the video: the scenes in CUT order (clips recorded in this run or an earlier one)
  if (CUT && !CLEAN) clips.splice(0, clips.length, ...CUT.map((n) => ({ file: join(out, `${n}.mp4`), seconds: SCENES.find((s) => s.name === n).seconds })));
  // join with 0.4 s cross-fades
  if (clips.length > 1) {
    const F = 0.4, inputs = clips.flatMap((c) => ['-i', c.file]);
    let chain = '', last = '[0:v]', offset = 0;
    clips.slice(1).forEach((c, i) => {
      offset += clips[i].seconds - F;
      const label = i === clips.length - 2 ? '[v]' : `[x${i}]`;
      chain += `${last}[${i + 1}:v]xfade=transition=fade:duration=${F}:offset=${offset.toFixed(2)}${label};`;
      last = label;
    });
    const final = join(out, SHORT ? 'anadolu-ailesi-short.mp4' : 'anadolu-ailesi-promo.mp4');
    execFileSync('ffmpeg', ['-y', '-loglevel', 'error', ...inputs, '-filter_complex', chain.replace(/;$/, ''), '-map', '[v]', '-c:v', 'libx264', '-preset', 'slow', '-crf', '18', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', final]);
    console.log(`→ ${final}`);
    if (LANG) voiceOver(final, clips, F);
  }
  if (!CLEAN && !JOIN && !SHORT) await featureGraphic();
} finally {
  await browser.close(); server.stop(); village.stop();
}
