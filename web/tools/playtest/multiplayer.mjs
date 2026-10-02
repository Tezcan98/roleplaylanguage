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
 *   … -- --relayonly   voice may only go through the TURN relay (proves the relay works)
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
async function player(tag, name, { viaMenu = false, room = null } = {}) {
  const ctx = await browser.newContext({ viewport: { width: 1000, height: 620 }, permissions: ['microphone'] });
  const page = await ctx.newPage();
  errors.push(...watchErrors(page, `${tag} `));
  await page.goto(`${server.url}/?debug&fakemic&nointro&fresh&quality=low${opt.relayonly ? '&relayonly' : ''}${villageUrl ? `&mp=${encodeURIComponent(villageUrl)}` : ''}`);
  await page.waitForFunction(() => window.__game, null, { timeout: 30000 });
  if (room) await page.evaluate((r) => window.__game.settings.set('serverRegion', r), room);
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
  // the square's pitch has a second ball, synced on its own
  const ballsAt = (p) => p.evaluate(() => window.__game.toys.toys.filter((t) => t.toy.location.id === 'village' && t.action === 'ball').map((t) => [t.toy.position.x, t.toy.position.z]));
  await waitFor(() => A.evaluate(() => window.__game.squareFootball.balls.every((b) => !b.moving)), 8000); await sleep(500); // let the first one stop
  const [, second0] = await ballsAt(A);
  await B.evaluate(async () => {
    const g = window.__game, b = g.toys.toys.filter((t) => t.toy.location.id === 'village' && t.action === 'ball')[1].toy.position;
    const [bx, bz] = [b.x, b.z];
    for (let i = 0; i < 30; i++) { g.player.position.set(bx, 0, bz - 1.4 + i * 0.06); await new Promise((r) => requestAnimationFrame(r)); }
  });
  // both screens agree on both balls (each synced on its own) and the second one really moved
  const moved2 = await waitFor(async () => {
    const [a, b] = [await ballsAt(A), await ballsAt(B)];
    const same = a.every((p, i) => Math.hypot(p[0] - b[i][0], p[1] - b[i][1]) < 0.5);
    return same && Math.hypot(a[1][0] - second0[0], a[1][1] - second0[1]) > 0.5;
  }, 12000, 400);
  check('square pitch: the second ball is shared on its own', !!moved2, JSON.stringify(await ballsAt(A)));
  // sitting at a tea table shows as sitting on the other screen
  await A.evaluate(() => { const g = window.__game; g.player.place(g.world.current.anchors.get('cay3')); g.player.sit(true); });
  const seenSitting = await waitFor(() => B.evaluate(() => window.__game.village.remotes.list().some((c) => c.seated)), 4000);
  check('a player sitting at the tea garden is seen sitting', !!seenSitting);
  await A.evaluate(() => window.__game.player.sit(false));

  await A.dispatchEvent('.ptt', 'pointerdown'); await sleep(1200); await A.dispatchEvent('.ptt', 'pointerup'); await sleep(800);
  const bubbles = await B.evaluate(() => [...document.querySelectorAll('.bubble')].filter((b) => b.style.display !== 'none').map((b) => b.textContent));
  check('push-to-talk shows a text bubble to others', bubbles.length > 0, JSON.stringify(bubbles));
  check('…and sends no audio', (await peers(B)) === 0);

  {
    const C = await browser.newPage();
    await C.goto(`${server.url}/?nointro&fresh&quality=low${villageUrl ? `&mp=${encodeURIComponent(villageUrl)}` : ''}`);
    const home = await waitFor(() => C.evaluate(() => document.querySelector('.menu-where')?.textContent.includes('2 kişi') && document.querySelector('.menu-where').textContent), 45000);
    check('menu: the square button says how many people are there', !!home, home);
    await C.click('text=Şehir değiştir');
    const opt = await waitFor(() => C.evaluate(() => document.querySelector('.server-card[data-server="ankara"]')?.textContent.includes('👥 2') && document.querySelector('.server-card[data-server="ankara"]').textContent), 45000); // a third page next to two running games loads slowly on CI
    check('menu shows live player counts per room', !!opt, opt);
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
  await at(A, -10, 20); await sleep(2500);
  check('walking across the square keeps the call', (await inCall(A)) && (await inCall(B)));
  await A.click('.callbar .danger');
  await waitFor(async () => !(await inCall(A)) && !(await inCall(B)), 6000);

  await at(A, 2, 4); await at(B, 3.5, 4); await sleep(500);
  await A.keyboard.press('e'); await waitFor(() => B.$('text=Engelle')); await B.click('text=Engelle'); await sleep(800);
  await A.keyboard.press('e'); await sleep(1500);
  check('a blocked player cannot ask again', !(await B.$('text=Kabul et')) && !(await inCall(A)) && !(await inCall(B)));

  // giant chess: A takes white, B black, A moves; B (and the board on the square) follow
  // (through İsmail Dede: “Beyaz olmak istiyorum” / “Siyah …”)
  await A.evaluate(() => window.__game.village.chess.ask('w')); await sleep(300);
  await B.evaluate(() => window.__game.village.chess.ask('b'));
  await waitFor(() => A.evaluate(() => window.__game.village.chess.myColor === 'w' && window.__game.village.chess.state?.phase === 'playing'));
  await A.evaluate(() => window.__game.village.net.send({ type: 'chess-move', from: 'e2', to: 'e4', promotion: 'q' }));
  const seen = await waitFor(() => B.evaluate(() => window.__game.village.chess.state?.last?.to === 'e4' && window.__game.village.chess.game.get('e4')?.type === 'p'), 6000);
  check('chess: a move on one screen shows on the other player’s board', !!seen);
  await B.evaluate(() => window.__game.village.chess.resign());
  const scored = await waitFor(() => A.evaluate(() => { const s = window.__game.village.chess.state; return s.phase === 'over' && s.scores.some((r) => r.games === 1) ? s.scores.map((r) => r.name).join(', ') : null; }), 6000);
  check('chess: resigning ends the game, Dede keeps the score board', !!scored, scored);

  // the schoolyard is a public place too: both go there, A scores, both scoreboards say 1-0
  await A.evaluate(() => window.__game.travel.go('schoolyard', 'squareRoad')); await B.evaluate(() => window.__game.travel.go('schoolyard', 'squareRoad'));
  const meet = await waitFor(async () => (await A.evaluate(() => window.__game.village.joinedAt === 'schoolyard' && window.__game.village.remotes.count)) === 1 && (await B.evaluate(() => window.__game.village.remotes.count)) === 1, 15000);
  check('schoolyard: a public place with its own room', !!meet);
  await A.evaluate(async () => {
    const g = window.__game, b = g.toys.toys.find((t) => t.toy.location.id === 'schoolyard').toy;
    b.setState({ x: 8.8, z: -2, vx: 0, vz: 0 });
    for (let i = 0; i < 25; i++) { g.player.position.set(7.4 + i * 0.07, 0, -2); await new Promise((r) => requestAnimationFrame(r)); }
  });
  const goal = await waitFor(() => B.evaluate(() => window.__game.football?.score.a === 1), 8000);
  check('football: a goal counts on both screens', !!goal && (await A.evaluate(() => window.__game.football.score.a)) === 1);
  await A.evaluate(() => window.__game.travel.go('village', 'schoolRoad')); await B.evaluate(() => window.__game.travel.go('village', 'schoolRoad'));
  await waitFor(async () => (await A.evaluate(() => window.__game.village.joinedAt === 'village' && window.__game.village.remotes.count)) === 1, 15000);

  // a phone locking its screen drops the socket: the game reconnects by itself
  await B.evaluate(() => window.__game.village.net.dropForTest());
  check('after a dropped connection the player comes back by itself', !!(await waitFor(async () => (await B.evaluate(() => window.__game.village.net.connected)) && (await A.evaluate(() => window.__game.village.remotes.count)) === 1, 15000)));

  // walking in from the story: the room where the others are, whatever city was picked before
  {
    const C = await player('C', 'Gezgin', { room: 'izmir' });
    check('from the story: joins the square where the others are', !!(await waitFor(async () => (await C.evaluate(() => window.__game.village.net.room)) === 'ankara' && (await A.evaluate(() => window.__game.village.remotes.count)) === 2, 10000)));
    await C.close();
    await waitFor(async () => (await A.evaluate(() => window.__game.village.remotes.count)) === 1, 8000);
  }
  // someone who picked an empty room on the menu is offered the room where the others are
  {
    const ctx = await browser.newContext({ viewport: { width: 1000, height: 620 } });
    const C = await ctx.newPage();
    errors.push(...watchErrors(C, 'C '));
    await C.goto(`${server.url}/?debug&fakemic&nointro&fresh&quality=low${villageUrl ? `&mp=${encodeURIComponent(villageUrl)}` : ''}`);
    await C.waitForFunction(() => window.__game, null, { timeout: 30000 });
    await C.evaluate(() => { window.__game.settings.set('username', 'Yalnız'); window.__game.settings.set('villageIntroSeen', true); });
    await C.click('text=Şehir değiştir');
    await C.click('.server-card[data-server="izmir"]');
    await C.click('.main-menu.open button:has-text("Meydana gir")');
    await waitFor(() => C.evaluate(() => window.__game.village.net.connected), 15000, 400);
    const offer = await waitFor(() => C.$('.overlay.open button:has-text("Ankara meydanına geç")'), 8000);
    check('alone in a square picked on the menu: offered the busier one', !!offer);
    if (offer) await offer.click();
    check('…and switching joins the others', !!(await waitFor(async () => (await A.evaluate(() => window.__game.village.remotes.count)) === 2, 10000)));
    await C.close();
  }

  // online from the menu: the square's exit leads back to the main menu, not home
  const exitLabel = await A.evaluate(() => { const g = window.__game; g.player.position.set(-32.6, 0, 0); return new Promise((r) => setTimeout(() => r(document.getElementById('act').textContent), 400)); });
  check('online exit says "Ana menüye dön"', exitLabel.includes('Ana menüye dön'), exitLabel);
  await A.keyboard.press('e');
  check('…and returns to the main menu', !!(await waitFor(() => A.$('.main-menu.open'), 8000)) && (await A.evaluate(() => window.__game.world.current.id)) === 'yard');
  check('B sees A leave', !!(await waitFor(async () => (await B.evaluate(() => window.__game.village.remotes.count)) === 0)));
  await A.click('.main-menu.open button:has-text("Meydana gir")');
  check('A can go back in from the menu', !!(await waitFor(() => A.evaluate(() => window.__game.village.net.connected), 15000)));

  await B.evaluate(() => window.__game.travel.go('yard', 'gate'));
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
