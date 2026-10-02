/**
 * Four players in the village square on the production server (server/): does everyone see
 * the same square? Positions, speech, the shared balls, the chess board and who is sitting —
 * and what happens when a phone puts the game in the background (page hidden and frozen past
 * the server's heartbeat; or the connection killed while hidden) and brings it back.
 * Exit 1 on a failed check.
 *
 *   npm run playtest:square
 *   … -- --village=wss://…/ws/village   against a deployed server
 */
import { args, log, sleep, waitFor, startServer, startVillageServer, openBrowser, watchErrors, screenshot } from './lib.mjs';

const opt = args();
const server = await startServer();
const standalone = opt.village ? null : await startVillageServer();
const villageUrl = opt.village ?? standalone.url;
const browser = await openBrowser();
const errors = [];
const checks = [];
const check = (name, ok, detail = '') => { checks.push(ok); log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ` — ${detail}` : ''}`); };
const room = `test-${Date.now().toString(36).slice(-5)}`; // our own room, also on a live server

async function player(tag, name, { viaMenu = true } = {}) {
  const ctx = await browser.newContext({ viewport: { width: 900, height: 560 } });
  const page = await ctx.newPage();
  page.tag = tag;
  errors.push(...watchErrors(page, `${tag} `));
  await page.goto(`${server.url}/?debug&nointro&fresh&quality=low&mp=${encodeURIComponent(villageUrl)}`);
  await page.waitForFunction(() => window.__game, null, { timeout: 30000 });
  await page.evaluate((r) => window.__game.settings.set('serverRegion', r), room);
  if (viaMenu) {
    await page.click('.main-menu.open button:has-text("Meydana gir")');
  } else {
    await page.click('text=Hikayeye başla'); await sleep(1200);
    await page.evaluate(() => document.querySelector('.overlay.open .card .btn')?.click()); await sleep(300);
    await page.evaluate(() => window.__game.travel.go('village', 'yardRoad'));
  }
  await waitFor(() => page.$('.overlay.open input'), 15000);
  await page.fill('.overlay.open input', name); await page.click('.overlay.open button:has-text("Meydana gir")');
  await waitFor(() => page.evaluate(() => window.__game.village.net.connected), 15000, 300);
  await sleep(600);
  await page.evaluate(() => document.querySelector('.overlay.open .card .btn')?.click()); await sleep(300);
  return page;
}

const ev = (p, fn, a) => p.evaluate(fn, a);
const me = (p) => ev(p, () => { const g = window.__game; return { id: g.village.net.id, name: g.village.net.name, x: g.player.position.x, z: g.player.position.z }; });
const remotes = (p) => ev(p, () => window.__game.village.remotes.list().map((c) => ({ name: c.name, x: c.position.x, z: c.position.z, seated: !!c.seated })));
const moveTo = (p, x, z) => ev(p, ([x, z]) => window.__game.player.position.set(x, 0, z), [x, z]);
/** Page lifecycle as on a phone: hidden (app in the background), frozen, back. */
const setHidden = (p, hidden) => ev(p, (h) => {
  Object.defineProperty(document, 'hidden', { configurable: true, get: () => h });
  Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => (h ? 'hidden' : 'visible') });
  document.dispatchEvent(new Event('visibilitychange'));
}, hidden);
async function freeze(p, ms) {
  const cdp = await p.context().newCDPSession(p);
  await cdp.send('Page.setWebLifecycleState', { state: 'frozen' });
  await sleep(ms);
  await cdp.send('Page.setWebLifecycleState', { state: 'active' });
}

/** Does `viewer` see every other player exactly once, close to where they really are? */
async function sees(viewer, others, tol = 0.6) {
  const list = await remotes(viewer);
  const problems = [];
  for (const o of others) {
    const m = await me(o);
    const hits = list.filter((r) => r.name === m.name);
    if (hits.length !== 1) problems.push(`${viewer.tag} sees ${m.name} ${hits.length}×`);
    else if (Math.hypot(hits[0].x - m.x, hits[0].z - m.z) > tol) problems.push(`${viewer.tag}: ${m.name} off by ${Math.hypot(hits[0].x - m.x, hits[0].z - m.z).toFixed(1)} m`);
  }
  if (list.length !== others.length) problems.push(`${viewer.tag} sees ${list.length} players, expected ${others.length}`);
  return problems;
}
async function allSeeAll(players, tol, wait = 12000) { // test pages share one CPU: a few frames per second
  let problems = [];
  await waitFor(async () => {
    problems = [];
    for (const p of players) problems.push(...await sees(p, players.filter((q) => q !== p), tol));
    return problems.length === 0;
  }, wait, 300);
  return problems;
}

let failed = false;
try {
  log(`village server: ${villageUrl}, room ${room}`);
  const A = await player('A', 'Ayla');
  const B = await player('B', 'Berk', { viaMenu: false }); // walks in from the story
  const C = await player('C', 'Cem');
  const D = await player('D', 'Defne');
  const all = [A, B, C, D];
  const fps = await Promise.all(all.map((p) => ev(p, () => new Promise((r) => { let n = 0; const t0 = performance.now(); const f = () => { n++; if (performance.now() - t0 < 2000) requestAnimationFrame(f); else r(Math.round(n / 2)); }; requestAnimationFrame(f); }))));
  log(`  frames per second on the four test pages: ${fps.join(', ')}`);
  check('four players in one room (menu and story)', (await Promise.all(all.map((p) => ev(p, () => window.__game.settings.get('serverRegion'))))).every((r, _, a) => r === a[0]),
    (await Promise.all(all.map((p) => ev(p, () => window.__game.settings.get('serverRegion'))))).join(', '));

  // positions
  const spots = [[-4, 6], [2, 8], [6, 4], [-2, 12]];
  await Promise.all(all.map((p, i) => moveTo(p, ...spots[i])));
  let prob = await allSeeAll(all, 0.5);
  check('everyone sees everyone once, in the right place', !prob.length, prob.join('; '));
  // keep moving for a while (like walking), then check again
  for (let s = 0; s < 12; s++) { await Promise.all(all.map((p, i) => moveTo(p, spots[i][0] + Math.sin(s / 2) * 3, spots[i][1] + Math.cos(s / 2) * 2))); await sleep(120); }
  prob = await allSeeAll(all, 0.5);
  check('…still in sync after walking around', !prob.length, prob.join('; '));

  // speech
  await ev(C, () => window.__game.village.net.send({ type: 'say', text: 'Merhaba arkadaşlar!' }));
  const heard = await waitFor(async () => (await Promise.all([A, B, D].map((p) => ev(p, () => [...document.querySelectorAll('.bubble')].some((b) => b.textContent.includes('Merhaba arkadaşlar')))))).every(Boolean), 4000);
  check('speech reaches all three others', !!heard);

  // the shared balls
  await moveTo(D, 12, 21); await sleep(300);
  await ev(D, async () => {
    const g = window.__game, b = g.squareFootball.balls[0];
    b.setState({ x: 14, z: 21, vx: 0, vz: 0 }); g.village.ballKicked(b);
    for (let i = 0; i < 30; i++) { g.player.position.set(12.6 + i * 0.06, 0, 21); await new Promise((r) => requestAnimationFrame(r)); }
  });
  await waitFor(() => ev(D, () => !window.__game.squareFootball.balls[0].moving), 8000); await sleep(1200);
  const ballOf = (p) => ev(p, () => { const b = window.__game.squareFootball.balls[0].position; return [b.x, b.z]; });
  const balls = await Promise.all(all.map(ballOf));
  const spread = Math.max(...balls.map((b) => Math.hypot(b[0] - balls[3][0], b[1] - balls[3][1])));
  check('ball: kicked by one, it stops in the same place on every screen', spread < 0.5 && Math.hypot(balls[3][0] - 14, balls[3][1] - 21) > 1, `spread ${spread.toFixed(2)} m`);

  // chess: A white, C black, A moves
  await ev(A, () => window.__game.chess.ask('w')); await sleep(400);
  await ev(C, () => window.__game.chess.ask('b'));
  await waitFor(() => ev(A, () => window.__game.chess.state.phase === 'playing'), 5000);
  await ev(A, () => window.__game.chess.view.close?.());
  await ev(A, () => window.__game.village.net.send({ type: 'chess-move', from: 'e2', to: 'e4', promotion: 'q' }));
  const fenSame = await waitFor(async () => { const f = await Promise.all(all.map((p) => ev(p, () => window.__game.chess.state.fen))); return f.every((x) => x === f[0] && x.includes('4P3')) ? f[0] : null; }, 5000);
  check('chess: a game between two players, the same board on all four screens', !!fenSame, fenSame || '');

  // sitting
  await ev(D, () => { const g = window.__game; g.player.place(g.world.current.anchors.get('cay2')); g.player.sit(true); });
  const seatedSeen = await waitFor(async () => (await Promise.all([A, B, C].map(async (p) => (await remotes(p)).find((r) => r.name === 'Defne')?.seated))).every(Boolean), 4000);
  check('sitting at the tea garden: everyone sees it', !!seatedSeen);

  // B: game in the background, page frozen for longer than the server's heartbeat (phone screen off)
  await setHidden(B, true);
  let goneFromOthers = false;
  const frozen = freeze(B, 85000); // the socket still answers pings, but the game sends nothing: the server drops it after 45–75 s
  goneFromOthers = !!(await waitFor(async () => (await Promise.all([A, C, D].map(async (p) => !(await remotes(p)).some((r) => r.name === 'Berk')))).every(Boolean), 84000, 1000));
  await frozen;
  check('B frozen in the background (phone locked): the others no longer see a statue', goneFromOthers);
  // the others go on with their lives meanwhile
  await moveTo(A, -8, 2); await moveTo(C, 9, 9);
  await setHidden(B, false);
  const back = await waitFor(() => ev(B, () => window.__game.village.net.connected && window.__game.village.remotes.count === 3), 20000, 300);
  check('B back from the background: reconnected and sees the others', !!back);
  prob = await allSeeAll(all, 0.6, 8000);
  check('…no ghost or double of B, everyone where they are now', !prob.length, prob.join('; '));
  const bFen = await ev(B, () => window.__game.chess.state.fen), aFen = await ev(A, () => window.__game.chess.state.fen);
  check('…B has the current chess board', bFen === aFen, bFen);
  const bBall = await ballOf(B), aBall = await ballOf(A);
  check('…and the ball where it is', Math.hypot(bBall[0] - aBall[0], bBall[1] - aBall[1]) < 0.5, `${bBall.map((v) => v.toFixed(1))} vs ${aBall.map((v) => v.toFixed(1))}`);
  const dSeated = await waitFor(async () => (await remotes(B)).find((r) => r.name === 'Defne')?.seated, 3000);
  check('…and sees Defne still sitting', !!dSeated, JSON.stringify((await remotes(B)).find((r) => r.name === 'Defne')) + ' D: ' + JSON.stringify(await ev(D, () => ({ seated: window.__game.player.seated, connected: window.__game.village.net.connected }))));

  // C: the phone kills the connection while the game is in the background (no freeze)
  await setHidden(C, true);
  await ev(C, () => window.__game.village.net.dropForTest());
  await sleep(4000);
  const stayedDown = !(await ev(C, () => window.__game.village.net.connected));
  check('C hidden with a dropped connection: does not reconnect in the background', stayedDown);
  await moveTo(D, 3, -2); await ev(D, () => window.__game.player.sit(false));
  await setHidden(C, false);
  const cBack = await waitFor(() => ev(C, () => window.__game.village.net.connected), 10000, 300);
  check('C back to the foreground: reconnects by itself', !!cBack);
  prob = await allSeeAll(all, 0.6, 8000);
  check('…all four in sync again (Defne stood up and moved meanwhile)', !prob.length && !(await remotes(C)).find((r) => r.name === 'Defne')?.seated, prob.join('; '));

  // A (playing chess) switches to another app for half a minute: leaves the square, keeps the seat
  await setHidden(A, true);
  const aGone = await waitFor(async () => (await Promise.all([B, C, D].map(async (p) => !(await remotes(p)).some((r) => r.name === 'Ayla')))).every(Boolean), 30000, 1000);
  check('A in the background for 20 s: leaves the square by itself', !!aGone);
  await setHidden(A, false);
  const aBack = await waitFor(() => ev(A, () => window.__game.village.net.connected && window.__game.chess.myColor === 'w'), 10000, 300);
  check('…back within 45 s: still in the square and still white in the chess game', !!aBack, await ev(A, () => `${window.__game.chess.state?.phase} ${window.__game.chess.myColor}`));
  prob = await allSeeAll(all, 0.6, 8000);
  check('…and all four see each other again', !prob.length, prob.join('; '));

  // A leaves to the main menu: the others see three players
  await ev(A, () => document.querySelector('#act')?.hidden);
  await ev(A, () => window.__game.village.leave?.() ?? window.__game.village.net.close());
  const left = await waitFor(async () => (await Promise.all([B, C, D].map((p) => ev(p, () => window.__game.village.remotes.count)))).every((n) => n === 2), 6000);
  check('a player who leaves disappears for everyone', !!left);
  for (const p of all) await screenshot(p, `square-${p.tag}`);
} catch (e) {
  failed = true;
  log('FAIL ', e.stack ?? e.message);
}

await browser.close();
server.stop(); standalone?.stop();
const relevant = errors.filter((e) => !/WebSocket|ERR_CONNECTION|net::|closed before/i.test(e));
if (relevant.length) log('errors:\n  ' + relevant.join('\n  '));
const ok = !failed && !relevant.length && checks.every(Boolean);
log(ok ? `PASS — ${checks.length} checks` : 'FAIL');
process.exit(ok ? 0 : 1);
