/**
 * Play Store phone screenshots (1920×1080, 16:9) from the game itself, with a caption in the
 * store listing's language: Turkish, English, Russian or Arabic (the meanings in the game are in
 * English, in Arabic for the Arabic set — the game has no Russian meanings).
 *   node tools/promo/shots.mjs <outDir> --lang=tr|en|ru|ar [--only=ride,simit]
 */
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { startServer, startVillageServer, sleep } from '../playtest/lib.mjs';

const out = process.argv.slice(2).find((a) => !a.startsWith('--')) ?? 'store-shots';
const lang = process.argv.find((a) => a.startsWith('--lang='))?.slice(7) ?? 'tr';
const only = process.argv.find((a) => a.startsWith('--only='))?.slice(7).split(',');
const W = 1280, H = 720, SCALE = 1.5;
mkdirSync(out, { recursive: true });

/** [title, subtitle] per scene and language. */
const CAPTIONS = {
  family: {
    tr: ['Bir aileyle yaşa, Türkçe öğren', 'Live with a Turkish family, learn Turkish'],
    en: ['Live with a Turkish family', 'Learn Turkish the way children do: at home, every day'],
    ru: ['Живи в турецкой семье', 'Учи турецкий, как дети: дома, каждый день'],
    ar: ['عِش مع عائلة تركية', 'تعلّم التركية كما يتعلّمها الأطفال: في البيت، كل يوم'],
  },
  ride: {
    tr: ['Köyde ata bin', 'Ride horses around the village square'],
    en: ['Ride horses in the village', 'A whole town around you to explore'],
    ru: ['Катайся на лошади', 'Целый городок вокруг — исследуй его'],
    ar: ['اركب الخيل في القرية', 'بلدة كاملة حولك لتستكشفها'],
  },
  simit: {
    tr: ['Deyimleri gülerek öğren', 'The simit seller’s jokes teach Turkish idioms'],
    en: ['Learn idioms with a laugh', 'The simit seller’s lame jokes explain Turkish idioms'],
    ru: ['Учи идиомы со смехом', 'Шутки продавца симитов объясняют турецкие идиомы'],
    ar: ['تعلّم التعابير وأنت تضحك', 'نكات بائع السميت تشرح التعابير التركية'],
  },
  school: {
    tr: ['Okulda adım adım dersler', 'Lessons step by step, from A1'],
    en: ['Lessons step by step', 'A real classroom, from A1'],
    ru: ['Уроки шаг за шагом', 'Настоящий класс, с уровня A1'],
    ar: ['دروس خطوة بخطوة', 'فصل دراسي حقيقي، من مستوى A1'],
  },
  canteen: {
    tr: ['Kantinde tost al', 'Greet Hasan Amca and order at the school canteen'],
    en: ['Order at the school canteen', 'Greet, ask, pay — in Turkish'],
    ru: ['Закажи в школьном буфете', 'Поздоровайся, спроси, заплати — по-турецки'],
    ar: ['اطلب من مقصف المدرسة', 'سلّم، اسأل، ادفع — بالتركية'],
  },
  bike: {
    tr: ['Bisiklet sürmeyi öğren', 'Ride around the yard'],
    en: ['Learn to ride a bike', 'Play, help the family, explore the yard'],
    ru: ['Научись кататься на велосипеде', 'Играй, помогай семье, гуляй по двору'],
    ar: ['تعلّم ركوب الدراجة', 'العب، ساعد العائلة، واستكشف الفناء'],
  },
  speak: {
    tr: ['Konuş, oyun seni dinlesin', 'Speak Turkish out loud, the game listens'],
    en: ['Speak Turkish out loud', 'The game listens and answers'],
    ru: ['Говори по-турецки вслух', 'Игра слушает и отвечает'],
    ar: ['تكلّم التركية بصوت عالٍ', 'اللعبة تستمع وتجيب'],
  },
  words: {
    tr: ['Her karakterden yeni kelimeler', 'Every word goes into your notebook'],
    en: ['New words from everyone', 'Every word goes into your notebook'],
    ru: ['Новые слова от каждого', 'Каждое слово — в твою тетрадь'],
    ar: ['كلمات جديدة من الجميع', 'كل كلمة تُحفظ في دفترك'],
  },
};
const GLOSS = { tr: 'en', en: 'en', ru: 'en', ar: 'ar' }[lang];

const server = await startServer();
const village = await startVillageServer();
const browser = await chromium.launch({ args: ['--use-angle=gl', '--ignore-gpu-blocklist', '--enable-gpu'] });

const CSS = `
  .promo-cap{position:fixed;left:50%;top:5vh;transform:translateX(-50%);z-index:9999;text-align:center;pointer-events:none;
    background:rgba(27,36,64,.8);color:#fff;border-radius:18px;padding:14px 30px 12px;font-family:Fredoka,system-ui,sans-serif;
    box-shadow:0 8px 30px rgba(0,0,0,.25);max-width:80vw}
  .promo-cap.side{left:3vw;top:30vh;transform:none;max-width:22vw;text-align:start}.promo-cap.side b{font-size:32px}.promo-cap.side small{font-size:18px}
  .promo-cap b{display:block;font-size:40px;font-weight:600;line-height:1.15}
  .promo-cap small{display:block;font-size:21px;opacity:.88;margin-top:4px}
  .promo-hide #joy,.promo-hide .help-btn,.promo-hide #quest,.promo-hide #toasts,.promo-hide .ptt-wrap,.promo-hide #shot,.promo-hide #act,.promo-hide .net-status{visibility:hidden!important}`;

async function open(params = '') {
  const ctx = await browser.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: SCALE, permissions: ['microphone'] });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => console.warn('[page]', e.message));
  await page.goto(`${server.url}/?debug&fakemic&nointro&fresh&quality=high&mockads&gloss=${GLOSS}&mp=${encodeURIComponent(village.url)}${params}`);
  await page.waitForFunction(() => window.__game, null, { timeout: 30000 });
  await page.addStyleTag({ content: CSS });
  await page.evaluate(() => document.querySelector('.menu-main')?.click());
  await sleep(2500); await closeCards(page);
  await page.evaluate(() => { const g = window.__game, w = g.wallet; w.add(500, 'promo'); for (const it of [{ id: 'hd', slot: 'hd' }]) { w.buy({ ...it, price: 0 }); w.equip(it); } g.shop.onOutfit?.(); });
  await sleep(800);
  await page.evaluate(() => document.body.classList.add('promo-hide'));
  return page;
}
const closeCards = (page) => page.evaluate(() => document.querySelectorAll('.overlay.open .card .btn').forEach((b) => b.click()));
const go = async (page, loc, anchor) => { await page.evaluate(([l, a]) => window.__game.travel.go(l, a), [loc, anchor]); await sleep(4500); await closeCards(page); await sleep(300); };
const stand = (page, x, z, rot = null) => page.evaluate(([x, z, rot]) => { const g = window.__game; g.player.position.set(x, 0, z); if (rot != null) g.player.group.rotation.y = rot; g.camera.snap(g.player.position, false); }, [x, z, rot]);
const zoom = async (page, notches) => { await page.mouse.move(W / 2, H / 2); for (let i = 0; i < Math.abs(notches); i++) { await page.mouse.wheel(0, notches < 0 ? -100 : 100); await sleep(30); } };
const walk = async (page, key, ms) => { await page.keyboard.down(key); await sleep(ms); await page.keyboard.up(key); };

const SCENES = {
  family: async (page) => { await stand(page, -3, 1); await zoom(page, 4); await sleep(1500); },
  ride: async (page) => {
    await go(page, 'village', 'yardRoad');
    await stand(page, 2.2, -23.6); await sleep(600);
    await page.evaluate(() => window.__game.interactions.trigger()); await sleep(800);
    await walk(page, 's', 1500); await walk(page, 'd', 500); await zoom(page, -3); await sleep(600);
  },
  simit: async (page) => {
    await go(page, 'village', 'yardRoad');
    await stand(page, -8.6, 3.4); await sleep(1200);
    await page.evaluate(() => { window.__game.story.state.flags['met-simitci'] = true; window.__game.dialogue.open('simitci', 'j1'); });
    await sleep(2500);
  },
  school: async (page) => {
    page.evaluate(() => window.__game.lessons.enter('l1'));
    await sleep(800);
    await page.click('.overlay.open button:has-text("Krediyle gir")').catch(() => {});
    await sleep(4000); await closeCards(page);
  },
  canteen: async (page) => {
    await go(page, 'schoolyard', 'gate');
    await stand(page, -13.2, -5.5); await sleep(1200);
    await page.evaluate(() => window.__game.market.open('kantin')); await sleep(600);
    await page.click('.market.open .mk-slot[aria-label="tost"]').catch(() => {}); await sleep(800);
  },
  bike: async (page) => {
    await go(page, 'yard', 'houseDoor');
    await page.evaluate(() => { const g = window.__game; g.wallet.buy({ id: 'skill.bike', price: 0 }); const b = g.bicycle.bike.group.position; g.player.position.set(b.x, 0, b.z + 1); });
    await sleep(500);
    await page.evaluate(() => window.__game.bicycle.getOn()); await sleep(600);
    await stand(page, 2, -1, Math.PI / 2); // out on the path in front of the house
    await walk(page, 'd', 700); await zoom(page, -2); await sleep(500);
  },
  speak: async (page) => {
    await go(page, 'village', 'yardRoad');
    await page.evaluate(() => { const g = window.__game, n = g.cast.get('cayci'); g.player.position.set(n.position.x - 1.5, 0, n.position.z + 1.2); g.camera.snap(g.player.position, false); });
    await sleep(1500);
    await page.evaluate(() => window.__game.dialogue.open('cayci', 'c3')); await sleep(2800);
  },
  words: async (page) => {
    await go(page, 'village', 'yardRoad');
    await stand(page, -4.6, -21.2); await sleep(1200);
    await page.evaluate(() => window.__game.dialogue.open('seyis', 'sWords')); await sleep(2500);
  },
};
const ORDER = ['family', 'ride', 'simit', 'school', 'canteen', 'bike', 'speak', 'words'];
const SIDE = new Set(['school']); // the lesson panel fills the right: caption on the left

let n = 0;
for (const name of ORDER) {
  n++;
  if (only && !only.includes(name)) continue;
  const page = await open(name === 'school' ? '&fastclass' : '');
  try {
    await SCENES[name](page);
    const [tr, sub] = CAPTIONS[name][lang];
    await page.evaluate(([t, s, side, rtl]) => {
      document.querySelector('.promo-cap')?.remove();
      const d = document.createElement('div'); d.className = `promo-cap${side ? ' side' : ''}`; if (rtl) d.dir = 'rtl';
      d.innerHTML = '<b></b><small></small>'; d.querySelector('b').textContent = t; d.querySelector('small').textContent = s;
      document.body.append(d);
    }, [tr, sub, SIDE.has(name), lang === 'ar']);
    await sleep(700);
    const file = join(out, `${String(n).padStart(2, '0')}-${name}.png`);
    await page.screenshot({ path: file });
    console.log(file);
  } catch (e) { console.warn(`${name}: ${e.message}`); }
  await page.context().close();
}
await browser.close();
village.stop?.(); server.stop();
