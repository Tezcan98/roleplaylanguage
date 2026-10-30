/**
 * The giant chess board on its own, quickly: İsmail Dede plays you (with a clock or without), you take a pawn on foot
 * and play it, he answers; as black the joystick goes away from the camera. Run: node tools/playtest/chess.mjs [--server=URL]
 */
import { args, log, sleep, waitFor, startServer, openBrowser, watchErrors, drainUi } from './lib.mjs';

const opt = args();
const server = opt.server ? { url: opt.server, stop() {} } : await startServer();
const browser = await openBrowser();
const checks = [];
const check = (name, ok, detail = '') => { checks.push(ok); log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ` — ${detail}` : ''}`); };
try {
  const page = await (await browser.newContext({ viewport: { width: 1100, height: 700 } })).newPage();
  const errors = watchErrors(page);
  const ev = (fn, a) => page.evaluate(fn, a);
  await page.goto(`${server.url}/?debug&consented&fakemic&nointro&fresh&quality=low&lang=tr`);
  await page.waitForFunction(() => window.__game, null, { timeout: 90000 });
  await page.click('.main-menu.open .menu-main'); await sleep(1200);
  await drainUi(page);
  await ev(() => window.__game.travel.place('village', 'yardRoad', { force: true })); await sleep(2500);
  await drainUi(page);
  log(`online: ${await ev(() => window.__game.chess.online)}`);
  const stand = (sq) => ev((sq) => { const g = window.__game, f = sq.charCodeAt(0) - 97, r = Number(sq[1]) - 1; g.player.position.set(-15 + (f - 3.5) * 1.1, 0, 15 - (r - 3.5) * 1.1); }, sq);
  const act = () => ev(() => (document.getElementById('act').hidden ? '(hidden)' : document.getElementById('act').textContent));
  const choose = (t) => ev((t) => [...document.querySelectorAll('#dlg .choice')].find((c) => c.textContent.includes(t))?.click(), t);
  const playDede = async (clock) => {
    await ev(() => window.__game.player.position.set(-15, 0, 21)); await sleep(300); // by the board, near Dede (far away a game is given up)
    await ev(() => window.__game.dialogue.open('ismail')); await sleep(500);
    await choose('Seninle oynamak'); await sleep(400);
    await choose(clock); await sleep(400);
    await ev(() => window.__game.dialogue.close?.()); await sleep(600);
    await drainUi(page);
  };
  await playDede('Süreli');
  check('Dede plays you, with a clock', !!(await waitFor(() => ev(() => window.__game.chess.state.phase === 'playing' && window.__game.chess.myColor === 'w'), 6000)), JSON.stringify(await ev(() => ({ p: window.__game.chess.state.phase, c: window.__game.chess.myColor, t: window.__game.chess.state.timed }))));
  check('…modes: play (nothing in the way)', await ev(() => window.__game.modes.is('play')), await ev(() => window.__game.modes.current ?? ''));
  check('a game of mine: no notes, no task panel on the screen', await ev(() => document.body.classList.contains('chess-focus') && getComputedStyle(document.getElementById('toasts')).display === 'none' && getComputedStyle(document.getElementById('quest')).display === 'none'));
  await stand('e2'); await sleep(500);
  check('standing on the e2 pawn offers to take it', (await act()).includes('taşını al'), await act());
  await page.keyboard.press('e'); await sleep(400);
  await stand('e4'); await sleep(500);
  check('…carried to e4: offers to play it', (await act()).includes('e4 karesine oyna'), await act());
  await page.keyboard.press('e');
  const fen = await waitFor(() => ev(() => { const f = window.__game.chess.state.fen; return f.includes('4P3') && f.split(' ')[1] === 'w' ? f : null; }), 8000);
  check('…played, Dede answers', !!fen, fen || await ev(() => window.__game.chess.state.fen));
  await stand('d2'); await sleep(500);
  check('…and the next move can be taken too', (await act()).includes('taşını al'), await act());
  await ev(() => window.__game.chess.resign()); await sleep(800);
  check('resigning: the result card', (await ev(() => document.querySelector('.story-card.open .ctitle')?.textContent)) === 'Kaybettin');
  await drainUi(page);
  await waitFor(() => ev(() => window.__game.chess.state.phase === 'idle'), 12000);
  await playDede('Süresiz');
  check('without a clock', !!(await waitFor(() => ev(() => window.__game.chess.state.phase === 'playing' && window.__game.chess.state.timed === false), 6000)), JSON.stringify(await ev(() => ({ p: window.__game.chess.state.phase, t: window.__game.chess.state.timed }))));
  await stand('e2'); await sleep(500);
  check('…and its pawn can be taken', (await act()).includes('taşını al'), await act());
  await ev(() => window.__game.chess.resign()); await sleep(800); await drainUi(page);
  await waitFor(() => ev(() => window.__game.chess.state.phase === 'idle'), 12000);
  // black, against Dede: he moves first; then my pawn; the joystick ("up") goes away from the camera
  await ev(() => window.__game.player.position.set(-15, 0, 9)); await sleep(300);
  await ev(() => window.__game.chess.playDede('b', true));
  const myTurn = await waitFor(() => ev(() => window.__game.chess.state.phase === 'playing' && window.__game.chess.myColor === 'b' && window.__game.chess.game.turn() === 'b'), 10000);
  check('as black: Dede (white) moves first, then it is my turn', !!myTurn, JSON.stringify(await ev(() => ({ p: window.__game.chess.state.phase, c: window.__game.chess.myColor }))));
  await stand('e7'); await sleep(500);
  check('…standing on my e7 pawn offers to take it', (await act()).includes('taşını al'), await act());
  await ev(() => window.__game.player.position.set(-15, 0, 8)); await sleep(3000); // (the camera settles on black's side)
  const camZ = await ev(() => window.__game.camera.fixed?.pos.z ?? window.__game.camera.camera.position.z), z0 = await ev(() => window.__game.player.position.z);
  await page.keyboard.down('ArrowUp'); await sleep(1500); await page.keyboard.up('ArrowUp');
  const z1 = await ev(() => window.__game.player.position.z);
  check('…as black, "up" walks away from the camera', Math.abs(z1 - camZ) > Math.abs(z0 - camZ) + 0.5, `z ${z0.toFixed(2)} → ${z1.toFixed(2)}, camera z ${camZ.toFixed(2)}, yaw ${(await ev(() => window.__game.camera.yaw)).toFixed(2)}`);
  check('no errors on the page', errors.length === 0, errors.slice(0, 3).join(' | '));
} catch (e) { check(String(e.message ?? e).slice(0, 200), false); } finally { await browser.close(); server.stop(); }
log(checks.every(Boolean) ? 'ALL PASS' : `${checks.filter((c) => !c).length} FAILED`);
process.exit(checks.every(Boolean) ? 0 : 1);
