/**
 * Two players in the village square (two browser contexts, fake microphones):
 * unique usernames, no voice links in public, speech shown as a text bubble, voice-chat
 * request → accept → WebRTC connected with audio flowing, hang up, decline, walk-away drop.
 * Exit 1 on the first failed check.
 *
 *   npm run playtest:multiplayer                 village built into the dev server
 *   npm run playtest:multiplayer -- --standalone  production server (server/) on another port,
 *                                                  like GitHub Pages + your own server
 *   … -- --village=wss://meydan.ornek.com/ws/village   a deployed server
 */
import { args, log, sleep, waitFor, startServer, startVillageServer, openBrowser, watchErrors, screenshot } from './lib.mjs';

const opt = args();
const server = opt.server ? { url: opt.server, stop() {} } : await startServer();
const standalone = opt.standalone ? await startVillageServer() : null;
const villageUrl = opt.village ?? standalone?.url ?? null;
if (villageUrl) log(`village server: ${villageUrl}`);
const browser = await openBrowser(['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream']);
const errors = [];
const checks = [];
const check = (name, ok, detail = '') => { checks.push([name, ok]); log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ` — ${detail}` : ''}`); };

/** A joins from the main menu (username + "Meydana gir"), B walks there from the story. */
async function player(tag, name, { viaMenu = false } = {}) {
  const ctx = await browser.newContext({ viewport: { width: 1000, height: 620 }, permissions: ['microphone'] });
  const page = await ctx.newPage();
  errors.push(...watchErrors(page, `${tag} `));
  await page.goto(`${server.url}/?debug&fakemic&nointro&fresh&quality=low${villageUrl ? `&mp=${encodeURIComponent(villageUrl)}` : ''}`);
  await page.waitForFunction(() => window.__game, null, { timeout: 30000 });
  if (viaMenu) {
    await page.click('.main-menu.open button:has-text("Meydana gir")');
    await waitFor(() => page.$('.overlay.open input'), 15000);
    await page.fill('.overlay.open input', name); await page.click('.overlay.open button:has-text("Meydana gir")');
    await waitFor(() => page.evaluate(() => window.__game.village.net.connected), 15000, 400);
    await sleep(800);
    await page.evaluate(() => document.querySelector('.overlay.open .card .btn')?.click()); await sleep(300); // first-visit card
    return page;
  }
  await page.click('text=Hikayeye başla'); await sleep(1200);
  await page.evaluate(() => document.querySelector('.overlay.open .card .btn')?.click()); await sleep(300);
  await page.evaluate(() => window.__game.travel.go('village', 'yardRoad')); await sleep(1500);
  await page.fill('.overlay.open input', name); await page.click('.overlay.open button:has-text("Meydana gir")'); await sleep(1500);
  await page.evaluate(() => document.querySelector('.overlay.open .card .btn')?.click()); await sleep(300); // first-visit card
  return page;
}

let failed = false;
try {
  const A = await player('A', 'Ayşe', { viaMenu: true });
  check('main menu → village square', (await A.evaluate(() => window.__game.world.current.id)) === 'village' && (await A.evaluate(() => window.__game.village.net.connected)));
  const B = await player('B', 'Ayşe'); // same name on purpose
  const at = (p, x, z) => p.evaluate(([x, z]) => window.__game.player.position.set(x, 0, z), [x, z]);
  const label = (p) => p.evaluate(() => (document.getElementById('act').hidden ? null : document.getElementById('act').textContent));
  const peers = (p) => p.evaluate(() => window.__game.village.voice._debugPeers().length);
  const inCall = (p) => p.evaluate(() => window.__game.village.voice.inCall);

  const names = [await A.evaluate(() => window.__game.village.net.name), await B.evaluate(() => window.__game.village.net.name)];
  check('unique usernames', names[0] !== names[1], names.join(' / '));
  check('players see each other', (await A.evaluate(() => window.__game.village.remotes.count)) === 1 && (await B.evaluate(() => window.__game.village.remotes.count)) === 1);
  // the square's ball: run into it on A, it moves on B too
  const ballAt = (p) => p.evaluate(() => { const b = window.__game.toys.toys.find((t) => t.toy.location.id === 'village').toy.position; return [b.x, b.z]; });
  const ball0 = await ballAt(B);
  await A.evaluate(async () => {
    const g = window.__game, b = g.toys.toys.find((t) => t.toy.location.id === 'village').toy.position;
    const [bx, bz] = [b.x, b.z];
    for (let i = 0; i < 30; i++) { g.player.position.set(bx - 1.4 + i * 0.06, 0, bz); await new Promise((r) => requestAnimationFrame(r)); }
  });
  const moved = await waitFor(async () => { const [x, z] = await ballAt(B); const d = Math.hypot(x - ball0[0], z - ball0[1]); return d > 0.5 ? d : 0; }, 5000);
  check('kicking the ball by running into it, seen by the other player', !!moved, `${(moved || 0).toFixed(2)} m`);
  check('no voice links in public', (await peers(A)) === 0 && (await peers(B)) === 0);

  await A.dispatchEvent('.ptt', 'pointerdown'); await sleep(1200); await A.dispatchEvent('.ptt', 'pointerup'); await sleep(800);
  const bubbles = await B.evaluate(() => [...document.querySelectorAll('.bubble')].filter((b) => b.style.display !== 'none').map((b) => b.textContent));
  check('push-to-talk shows a text bubble to others', bubbles.length > 0, JSON.stringify(bubbles));
  check('…and sends no audio', (await peers(B)) === 0);

  {
    const C = await browser.newPage();
    await C.goto(`${server.url}/?nointro&fresh&quality=low${villageUrl ? `&mp=${encodeURIComponent(villageUrl)}` : ''}`);
    const opt = await waitFor(() => C.evaluate(() => [...document.querySelectorAll('.server-select option')].map((o) => o.textContent).find((t) => t.includes('2 kişi'))), 15000);
    check('menu shows live player counts per room', !!opt && opt.startsWith('Ankara'), opt);
    await C.close();
  }

  await at(A, 2, 4); await at(B, 3.5, 4);
  const l = await waitFor(async () => { const x = await label(A); return x?.includes('sesli sohbet') ? x : null; }) ?? await label(A);
  check('"voice chat" offered next to a player', !!l && l.includes('sesli sohbet'), l);
  await A.keyboard.press('e'); await sleep(800);
  check('the other player is asked first', !!(await waitFor(() => B.$('text=Kabul et'))));
  await B.click('text=Kabul et');
  const connected = () => Promise.all([A, B].map((p) => p.evaluate(() => Object.values(window.__game.village.voice.states())[0]))).then((s) => (s.every((x) => x === 'connected') ? s : null));
  const states = await waitFor(connected, 15000) ?? await Promise.all([A, B].map((p) => p.evaluate(() => window.__game.village.voice.states())));
  check('WebRTC connected after accepting', Array.isArray(states) && states.every((x) => x === 'connected'), JSON.stringify(states));
  const inbound = () => B.evaluate(async () => { let n = 0; for (const pc of window.__game.village.voice._debugPeers()) (await pc.getStats()).forEach((r) => { if (r.type === 'inbound-rtp' && r.kind === 'audio') n += r.bytesReceived; }); return n; });
  const bytes = await waitFor(async () => { const n = await inbound(); return n > 1000 ? n : 0; }, 8000) || await inbound();
  check('audio flows', bytes > 0, `${bytes} bytes`);
  await A.click('.callbar .danger');
  check('hang up ends the call on both sides', !!(await waitFor(async () => !(await inCall(A)) && !(await inCall(B)))));

  await A.keyboard.press('e'); await waitFor(() => B.$('text=Reddet')); await B.click('text=Reddet'); await sleep(800);
  check('declining is reported and no call starts', !(await inCall(A)) && !(await inCall(B)));

  await A.keyboard.press('e'); await waitFor(() => B.$('text=Kabul et')); await B.click('text=Kabul et');
  await waitFor(() => inCall(A));
  await at(A, -10, 10);
  check('walking away ends the call', !!(await waitFor(async () => !(await inCall(A)) && !(await inCall(B)))));

  await at(A, 2, 4); await at(B, 3.5, 4); await sleep(500);
  await A.keyboard.press('e'); await waitFor(() => B.$('text=Engelle')); await B.click('text=Engelle'); await sleep(800);
  await A.keyboard.press('e'); await sleep(1500);
  check('a blocked player cannot ask again', !(await B.$('text=Kabul et')) && !(await inCall(A)) && !(await inCall(B)));

  // online from the menu: the square's exit leads back to the main menu, not home
  const exitLabel = await A.evaluate(() => { const g = window.__game; g.player.position.set(-15.6, 0, 0); return new Promise((r) => setTimeout(() => r(document.getElementById('act').textContent), 400)); });
  check('online exit says "Ana menüye dön"', exitLabel.includes('Ana menüye dön'), exitLabel);
  await A.keyboard.press('e');
  check('…and returns to the main menu', !!(await waitFor(() => A.$('.main-menu.open'), 8000)) && (await A.evaluate(() => window.__game.world.current.id)) === 'yard');
  check('B sees A leave', !!(await waitFor(async () => (await B.evaluate(() => window.__game.village.remotes.count)) === 0)));
  await A.click('.main-menu.open button:has-text("Meydana gir")');
  check('A can go back in from the menu', !!(await waitFor(() => A.evaluate(() => window.__game.village.net.connected), 15000)));

  await B.evaluate(() => window.__game.travel.go('yard', 'squareRoad'));
  check('leaving the square removes the player', !!(await waitFor(async () => (await A.evaluate(() => window.__game.village.remotes.count)) === 0)));
  if (checks.some(([, ok]) => !ok)) await screenshot(A, 'multiplayer-A');
} catch (e) {
  failed = true;
  log('FAIL ', e.message);
}

await browser.close();
server.stop();
standalone?.stop();
if (errors.length) log('errors:\n  ' + errors.join('\n  '));
const ok = !failed && !errors.length && checks.every(([, x]) => x);
log(ok ? `PASS — ${checks.length} checks` : 'FAIL');
process.exit(ok ? 0 : 1);
