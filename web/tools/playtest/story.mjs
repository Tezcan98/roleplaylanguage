/**
 * Plays the whole story automatically and fails (exit 1) when it gets stuck, throws or
 * never reaches the end card. For each quest it moves Ahmet next to the quest arrow's
 * target, presses the action key and answers everything that opens.
 *
 *   npm run playtest                       whole week
 *   npm run playtest:smoke                 first chapters only (CI smoke)
 *   node tools/playtest/story.mjs --from=8 --to=d3-school --server=http://localhost:8080
 *
 * Options: --from=<chapter index> --to=<chapter id> --server=<url> --max-steps=<n> --stall=<n>
 * Env: PLAYTEST_CHANNEL=chrome (local Chrome + GPU), PLAYTEST_HEADED=1
 */
import { args, log, sleep, startServer, openBrowser, watchErrors, screenshot, snapshot, drainUi } from './lib.mjs';

const opt = args();
const FROM = Number(opt.from ?? 0);
const TO = opt.to ?? null;
const MAX_STEPS = Number(opt['max-steps'] ?? 900);
const STALL = Number(opt.stall ?? 25); // steps on the same quest before it counts as stuck

const server = opt.server ? { url: opt.server, stop() {} } : await startServer();
const browser = await openBrowser();
const page = await browser.newPage({ viewport: { width: 1100, height: 680 } });
const errors = watchErrors(page);
let result = 'FAIL', reason = '';
const t0 = Date.now();

try {
  // test mode: debug handle, scripted microphone, fast classmates, no intro, empty save, light graphics
  await page.goto(`${server.url}/?debug&fakemic&fastclass&nointro&fresh&quality=low`);
  await page.waitForFunction(() => window.__game, null, { timeout: 30000 });
  await page.click('text=Hikayeye başla');
  await sleep(1200);
  if (FROM) {
    await page.evaluate(() => document.querySelector('.overlay.open .card .btn')?.click());
    await page.evaluate((i) => window.__game.story.startChapter(i), FROM);
    await sleep(800);
  }

  let last = null, same = 0;
  for (let step = 0; step < MAX_STEPS; step++) {
    if ((await drainUi(page)) === 'outro') { result = 'PASS'; reason = 'reached the end card'; break; }
    if (errors.length) throw new Error(errors[0]);
    const s = await snapshot(page);
    if (TO && s.chapter === TO) { result = 'PASS'; reason = `reached ${TO}`; break; }
    if (!s.quest) { await sleep(800); continue; }
    if (s.quest === last) same++; else { same = 0; last = s.quest; log(`${s.day} ${s.time}  ${s.chapter} › ${s.quest}  (${s.location})`); }
    if (same > STALL) {
      const shot = await screenshot(page, `stuck-${s.chapter}-${s.quest}`);
      throw new Error(`stuck on quest "${s.quest}" in ${s.chapter}: ${JSON.stringify(s)} — screenshot ${shot}`);
    }
    // stand next to whatever the quest arrow points at (a closer spot when it keeps failing)
    const target = await page.evaluate((near) => {
      const g = window.__game, p = g.marker.resolve();
      if (!p) return null;
      g.player.sit(false);
      g.player.position.set(p.x + 0.3 * near, 0, p.z + 0.5 * near);
      return { x: p.x, z: p.z };
    }, same > 3 ? 0.5 : 1);
    if (!target) { await sleep(800); continue; }
    await sleep(150);
    await page.keyboard.press('e');
    await sleep(1000);
  }
  if (result !== 'PASS') reason = reason || `step limit (${MAX_STEPS}) reached`;
} catch (e) {
  reason = e.message;
  await screenshot(page, 'failure');
}

const end = await snapshot(page).catch(() => ({}));
await browser.close();
server.stop();
log(`${result} — ${reason}`);
log(`end: ${end.day ?? '?'} ${end.time ?? ''} ${end.chapter ?? ''} · words ${end.words ?? '?'} · ${Math.round((Date.now() - t0) / 1000)} s`);
if (errors.length) log('errors:\n  ' + errors.join('\n  '));
process.exit(result === 'PASS' && !errors.length ? 0 : 1);
