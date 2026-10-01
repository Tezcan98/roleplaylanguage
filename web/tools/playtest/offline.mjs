/**
 * The packaged build (dist/) must work without internet, as in the mobile app: every
 * request to another host is blocked, then the game is started and a dialogue opened.
 * Usage: npm run playtest:offline   (builds first)
 */
import { log, sleep, startServer, openBrowser, watchErrors, screenshot } from './lib.mjs';

const server = await startServer('dist');
const browser = await openBrowser();
const page = await browser.newPage({ viewport: { width: 1000, height: 640 } });
const errors = watchErrors(page);
const blocked = new Set();
await page.route('**/*', (route) => {
  const u = new URL(route.request().url());
  if (u.hostname !== 'localhost') { blocked.add(u.hostname + u.pathname); return route.abort(); }
  return route.continue();
});

const checks = [];
const check = (name, ok, detail = '') => { checks.push(ok); log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ` — ${detail}` : ''}`); };
try {
  await page.goto(`${server.url}/?debug&nointro&fakemic&fresh&quality=low`);
  await page.waitForFunction(() => window.__game, null, { timeout: 30000 });
  check('game loads without internet', true);
  await page.click('text=Hikayeye başla'); await sleep(1500);
  await page.evaluate(() => document.querySelector('.overlay.open .card .btn')?.click()); await sleep(800);
  await page.evaluate(() => window.__game.player.position.set(3.6, 0, -2.7)); await sleep(300);
  await page.keyboard.press('e'); await sleep(800);
  check('dialogue opens', (await page.evaluate(() => window.__game.dialogue.talking)) === 'anne');
  check('fonts are bundled', await page.evaluate(() => document.fonts.check('700 20px Fredoka') && document.fonts.check("700 16px 'Noto Naskh Arabic'")));
  check('textures are bundled', (await page.evaluate(() => performance.getEntriesByType('resource').filter((r) => r.name.endsWith('.webp')).length)) > 0);
  const essential = [...blocked].filter((u) => !/onnxruntime|vits-web|piper|huggingface/.test(u)); // optional neural voices may try the network
  check('nothing essential comes from the internet', essential.length === 0, essential.join(', '));
  if (checks.some((x) => !x)) await screenshot(page, 'offline');
} catch (e) {
  checks.push(false);
  log('FAIL ', e.message);
}
await browser.close();
server.stop();
if (errors.length) log('errors:\n  ' + errors.join('\n  '));
const ok = checks.every(Boolean) && !errors.length;
log(ok ? `PASS — ${checks.length} checks` : 'FAIL');
process.exit(ok ? 0 : 1);
