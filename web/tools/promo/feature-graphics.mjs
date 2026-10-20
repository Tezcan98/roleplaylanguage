/**
 * The Play Store feature graphic (1024×500) in every store language, each with the game's name
 * in that language (Türk Ailem, My Turkish Family, عائلتي التركية…): one clean picture of the
 * village square behind the icon, the name and "learn Turkish".
 *   node tools/promo/feature-graphics.mjs [outDir]   (default ~/Desktop/AnadoluAilesi-release/store)
 */
import { readFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { homedir } from 'node:os';
import { startServer, openBrowser, sleep } from '../playtest/lib.mjs';

const out = process.argv[2] ?? join(homedir(), 'Desktop/AnadoluAilesi-release/store');
const LANGS = {
  tr: ['Türk Ailem', 'Türkçe Öğren', 'Bir Türk ailesiyle köyde yaşayarak'],
  en: ['My Turkish Family', 'Learn Turkish', 'by living it with a family in an Anatolian village'],
  ar: ['عائلتي التركية', 'تعلّم التركية', 'بالعيش مع عائلة في قرية أناضولية'],
  ur: ['میرا ترک خاندان', 'ترکی سیکھیں', 'اناطولیہ کے گاؤں میں ایک خاندان کے ساتھ رہ کر'],
  es: ['Mi familia turca', 'Aprende turco', 'viviendo con una familia en un pueblo de Anatolia'],
  fr: ['Ma famille turque', 'Apprends le turc', 'en vivant avec une famille dans un village d’Anatolie'],
  ru: ['Моя турецкая семья', 'Учи турецкий', 'живя с семьёй в анатолийской деревне'],
};
mkdirSync(out, { recursive: true });
const server = await startServer(); const browser = await openBrowser();
const img = (f) => `data:image/png;base64,${readFileSync(f).toString('base64')}`;
try {
  // a clean picture of the square (no interface) for the background
  const game = await (await browser.newContext({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1.5 })).newPage();
  await game.goto(`${server.url}/?debug&nointro&fresh&quality=high`); await game.waitForFunction(() => window.__game, null, { timeout: 90000 });
  await game.evaluate(() => document.querySelector('.menu-main')?.click()); await sleep(2500);
  await game.evaluate(() => document.querySelectorAll('.overlay.open .card .btn').forEach((b) => b.click()));
  await game.evaluate(() => { const g = window.__game, w = g.wallet, it = { id: 'hd', slot: 'hd' }; w.buy({ ...it, price: 0 }); w.equip(it); g.shop.onOutfit?.(); });
  await game.evaluate(() => window.__game.travel.go('village', 'yardRoad')); await sleep(5000);
  await game.evaluate(() => document.querySelectorAll('.overlay.open .card .btn').forEach((b) => b.click()));
  await game.evaluate(() => { const g = window.__game; g.player.position.set(-1, 0, 7); g.camera.snap?.(g.player.position, false); });
  await game.mouse.move(640, 360); for (let i = 0; i < 1; i++) await game.mouse.wheel(0, -100);
  await sleep(2500);
  await game.addStyleTag({ content: 'body > div > *:not(canvas){visibility:hidden!important}' });
  await sleep(300);
  const bg = join(out, 'feature-bg.png');
  await game.screenshot({ path: bg }); await game.context().close();
  for (const [lang, [name, learn, sub]] of Object.entries(LANGS)) {
    const rtl = lang === 'ar' || lang === 'ur';
    const page = await (await browser.newContext({ viewport: { width: 1024, height: 500 } })).newPage();
    await page.setContent(`<body style="margin:0;width:1024px;height:500px;overflow:hidden;font-family:Fredoka,'Noto Sans','Noto Naskh Arabic','Noto Nastaliq Urdu',system-ui,sans-serif">
      <link href="https://fonts.googleapis.com/css2?family=Fredoka:wght@500;700&family=Noto+Naskh+Arabic:wght@600;700&family=Noto+Sans:wght@500;700&display=swap" rel="stylesheet">
      <div style="position:absolute;inset:0;background:url(${img(bg)}) center/cover${rtl ? ';transform:scaleX(-1)' : ''}"></div>
      <div style="position:absolute;inset:0;background:linear-gradient(${rtl ? 270 : 90}deg,rgba(27,36,64,.94) 0%,rgba(27,36,64,.78) 48%,rgba(27,36,64,.1) 78%)"></div>
      <div dir="${rtl ? 'rtl' : 'ltr'}" style="position:absolute;${rtl ? 'right' : 'left'}:56px;top:50%;transform:translateY(-50%);display:flex;gap:28px;align-items:center;color:#fff;max-width:900px">
        <img src="${img('assets/icons/icon-512.png')}" style="width:150px;height:150px;border-radius:34px;box-shadow:0 10px 40px rgba(0,0,0,.45)">
        <div><div style="font-size:${name.length > 16 ? 52 : 60}px;font-weight:700;line-height:1.1">${name}</div>
        <div style="font-size:32px;margin-top:10px;color:#FFC845;font-weight:600">${learn}</div>
        <div style="font-size:21px;margin-top:6px;opacity:.92;max-width:560px">${sub}</div></div></div></body>`, { waitUntil: 'networkidle', timeout: 60000 }).catch(() => {});
    await page.evaluate(() => document.fonts.ready); await sleep(800);
    await page.screenshot({ path: join(out, `feature-graphic-${lang}-1024x500.png`) });
    await page.context().close();
    console.log('✓', lang, name);
  }
} finally { await browser.close(); server.stop(); }
