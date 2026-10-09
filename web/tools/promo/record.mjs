/**
 * Records the Play Store promo video from the game itself: every scene is played by script,
 * captions are drawn in the page (Turkish, with the meaning underneath, like in the game),
 * frames come from the browser's screencast, ffmpeg joins the scenes with short fades.
 *   node tools/promo/record.mjs [outDir] [--only=title,house]
 * Needs a GPU for smooth 1080p (headless Chromium with ANGLE on OpenGL).
 */
import { chromium } from 'playwright';
import { mkdirSync, writeFileSync, rmSync, readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { join } from 'node:path';
import { startServer, startVillageServer, sleep } from '../playtest/lib.mjs';
import { SCENES, CUT } from './scenes.mjs'; // SCENES: recording order; CUT: the order in the video

const out = process.argv.slice(2).find((a) => !a.startsWith('--')) ?? 'promo-out';
const only = process.argv.find((a) => a.startsWith('--only='))?.slice(7).split(',');
const JOIN = process.argv.includes('--join'); // --join: only join the scene clips already recorded (after re-recording one with --only)
const CLEAN = process.argv.includes('--clean'); // --clean: no interface, no captions (a background loop for the website)
const FPS = 30, W = 1280, H = 720, SCALE = 1.5; // 1920×1080 frames, UI the size of a tablet's
mkdirSync(out, { recursive: true });

const server = await startServer();
const village = await startVillageServer();
const browser = await chromium.launch({ args: ['--use-angle=gl', '--ignore-gpu-blocklist', '--enable-gpu', '--autoplay-policy=no-user-gesture-required'] });

/** A player in the game: its own browser context (own storage), already past the menu if `story`. */
async function open(params = '', { extra = false } = {}) { // extra: a player only there for the others to see (not filmed): small and cheap
  const ctx = await browser.newContext({ viewport: extra ? { width: 480, height: 270 } : { width: W, height: H }, deviceScaleFactor: extra ? 1 : SCALE, permissions: ['microphone'] });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => console.warn('[page]', e.message));
  await page.goto(`${server.url}/?debug&fakemic&nointro&fresh&quality=${extra ? 'low&norender' : 'high'}&mockads&gloss=en&mp=${encodeURIComponent(village.url)}${params}`);
  await page.waitForFunction(() => window.__game, null, { timeout: 30000 });
  await page.addStyleTag({ content: PROMO_CSS });
  return page;
}

const PROMO_CSS = `
  .promo-cap{position:fixed;left:50%;top:5vh;transform:translateX(-50%);z-index:9999;text-align:center;pointer-events:none;
    background:rgba(27,36,64,.78);color:#fff;border-radius:18px;padding:14px 30px 12px;font-family:Fredoka,system-ui,sans-serif;
    box-shadow:0 8px 30px rgba(0,0,0,.25);animation:promoIn .45s ease-out both;max-width:80vw}
  .promo-cap.bottom{top:auto;bottom:4vh}
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
  .promo-hide #joy,.promo-hide .help-btn,.promo-hide #quest,.promo-hide #toasts,.promo-hide .ptt-wrap,.promo-hide #shot,.promo-hide #act{visibility:hidden!important}
  @keyframes promoIn{from{opacity:0;transform:translate(-50%,-12px)}to{opacity:1}}
  .promo-card{animation-name:promoCard}@keyframes promoCard{from{opacity:0}to{opacity:1}}`;

/** Helpers the scenes use. */
const kit = {
  open, sleep,
  caption: (page, tr, en, { bottom = false, side = false } = {}) => CLEAN ? null : page.evaluate(([tr, en, bottom, side]) => {
    document.querySelector('.promo-cap')?.remove();
    if (!tr) return;
    const d = document.createElement('div'); d.className = `promo-cap${bottom ? ' bottom' : ''}${side ? ' side' : ''}`;
    d.innerHTML = `<b></b><small></small>`; d.querySelector('b').textContent = tr; d.querySelector('small').textContent = en;
    document.body.append(d);
  }, [tr, en, bottom, side]),
  card: (page, html) => CLEAN ? null : page.evaluate((html) => {
    document.querySelector('.promo-card')?.remove();
    if (!html) return;
    const d = document.createElement('div'); d.className = 'promo-card'; d.innerHTML = html; document.body.append(d);
  }, html),
  hideHud: async (page, on = true) => {
    await page.evaluate((on) => document.body.classList.toggle('promo-hide', on), on);
    if (CLEAN && on) await page.addStyleTag({ content: 'body > div > *:not(canvas){visibility:hidden!important}' }); // only the game world
  },
  /** Hold a movement key for `ms` (w a s d). */
  walk: async (page, key, ms) => { await page.keyboard.down(key); await sleep(ms); await page.keyboard.up(key); },
  /** Camera closer (z < 1) or further, like the mouse wheel. */
  zoom: async (page, notches) => { await page.mouse.move(W / 2, H / 2); for (let i = 0; i < Math.abs(notches); i++) { await page.mouse.wheel(0, notches < 0 ? -100 : 100); await sleep(30); } },
  closeCards: (page) => page.evaluate(() => document.querySelectorAll('.overlay.open .card .btn').forEach((b) => b.click())),
};

/** Record `seconds` of `page` while `act()` runs; returns the clip's path. `still`: also a store screenshot that many seconds in. */
async function record(page, name, seconds, act, still = null, shotName = null) {
  const dir = join(out, `frames-${name}`); rmSync(dir, { recursive: true, force: true }); mkdirSync(dir);
  const cdp = await page.context().newCDPSession(page);
  const frames = [];
  cdp.on('Page.screencastFrame', async ({ data, metadata, sessionId }) => {
    frames.push({ t: metadata.timestamp, file: join(dir, `${String(frames.length).padStart(5, '0')}.jpg`) });
    writeFileSync(frames.at(-1).file, Buffer.from(data, 'base64'));
    cdp.send('Page.screencastFrameAck', { sessionId }).catch(() => {});
  });
  await cdp.send('Page.startScreencast', { format: 'jpeg', quality: 92, maxWidth: W * SCALE, maxHeight: H * SCALE, everyNthFrame: 1 });
  const t0 = Date.now();
  let quiet = null; // while the screenshot is taken the screencast sends shrunken frames: those are left out
  const shot = still == null ? null : sleep(still * 1000).then(() => { quiet = [Date.now() / 1000 - 0.05, Infinity]; }).then(() => page.screenshot({ path: join(out, 'screens', `${shotName ?? `${String(++shots).padStart(2, '0')}-${name}`}.png`) }));
  await Promise.all([act(), sleep(seconds * 1000), shot?.then(() => { quiet[1] = Date.now() / 1000 + 0.15; })]);
  while (Date.now() - t0 < seconds * 1000) await sleep(50);
  await cdp.send('Page.stopScreencast'); await sleep(200);
  if (quiet) frames.splice(0, frames.length, ...frames.filter((f) => f.t < quiet[0] || f.t > quiet[1]));
  // each frame lasts until the next one (the screencast only sends changed frames)
  const list = frames.map((f, i) => `file '${f.file.split('/').pop()}'\nduration ${Math.max(0.001, ((frames[i + 1]?.t ?? frames[0].t + seconds) - f.t)).toFixed(4)}`).join('\n');
  writeFileSync(join(dir, 'list.txt'), `${list}\nfile '${frames.at(-1).file.split('/').pop()}'\n`);
  const clip = join(out, `${name}.mp4`);
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'concat', '-safe', '0', '-i', join(dir, 'list.txt'), '-t', String(seconds),
    '-vf', `fps=${FPS},scale=1920:1080:flags=lanczos,format=yuv420p`, '-c:v', 'libx264', '-preset', 'slow', '-crf', '17', clip]);
  console.log(`${name}: ${frames.length} frames in ${seconds}s → ${clip}`);
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
      <div><div style="font-size:60px;font-weight:700;line-height:1">Anadolu Ailesi</div>
      <div style="font-size:30px;margin-top:10px;color:#FFC845;font-weight:500">Türkçe Öğren</div>
      <div style="font-size:20px;margin-top:6px;opacity:.9">Learn Turkish by living it</div></div></div></body>`, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.evaluate(() => document.fonts.ready);
  await sleep(1500);
  await page.screenshot({ path: join(out, 'screens', 'feature-graphic-1024x500.png') });
  await page.context().close();
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
    const final = join(out, 'anadolu-ailesi-promo.mp4');
    execFileSync('ffmpeg', ['-y', '-loglevel', 'error', ...inputs, '-filter_complex', chain.replace(/;$/, ''), '-map', '[v]', '-c:v', 'libx264', '-preset', 'slow', '-crf', '18', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', final]);
    console.log(`→ ${final}`);
  }
  if (!CLEAN && !JOIN) await featureGraphic();
} finally {
  await browser.close(); server.stop(); village.stop();
}
