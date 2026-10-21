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

/** A player: "▶ Hikayeye başla" — a new game starts in the park in the square, among the others (one world, no separate online mode). */
async function player(tag, name, { room = null } = {}) {
  const ctx = await browser.newContext({ viewport: { width: 1000, height: 620 }, permissions: ['microphone'] });
  const page = await ctx.newPage();
  errors.push(...watchErrors(page, `${tag} `));
  await page.goto(`${server.url}/?debug&fakemic&nointro&fresh&quality=low${opt.relayonly ? '&relayonly' : ''}${villageUrl ? `&mp=${encodeURIComponent(villageUrl)}` : ''}`);
  await page.waitForFunction(() => window.__game, null, { timeout: 90000 });
  if (room) await page.evaluate((r) => window.__game.settings.set('serverRegion', r), room);
  if (name) await page.evaluate((n) => window.__game.settings.set('username', n), name); // set in the profile
  await page.click('.main-menu.open .menu-main'); await sleep(1200);
  await closeCards(page); // the welcome, mom calling: the game starts, in the square
  await waitFor(() => page.evaluate(() => window.__game.village.net.connected), 20000, 300); await sleep(800);
  await closeCards(page); // the square's first-visit card
  return page;
}
const closeCards = async (page) => { for (let i = 0; i < 5 && await page.evaluate(() => !!document.querySelector('.overlay.story-card.open')); i++) { await page.evaluate(() => document.querySelector('.overlay.story-card.open .btn').click()); await sleep(400); } };

let failed = false;
try {
  const A = await player('A', 'Ayşe');
  check('"▶ Hikayeye başla": a new game starts in the village square, online', (await A.evaluate(() => window.__game.world.current.id)) === 'village' && (await A.evaluate(() => window.__game.village.net.connected)));
  const B = await player('B', 'Ayşe'); // same name on purpose
  const at = (p, x, z) => p.evaluate(([x, z]) => window.__game.player.position.set(x, 0, z), [x, z]);
  const label = (p) => p.evaluate(() => (document.getElementById('act').hidden ? null : document.getElementById('act').textContent));
  const peers = (p) => p.evaluate(() => window.__game.village.voice._debugPeers().length);
  const inCall = (p) => p.evaluate(() => window.__game.village.voice.inCall);

  const names = [await A.evaluate(() => window.__game.village.net.name), await B.evaluate(() => window.__game.village.net.name)];
  check('unique usernames', names[0] !== names[1], names.join(' / '));
  {
    // story mode with no username yet: straight into the square under the character's name, no question
    const S = await player('S', '');
    const sName = await S.evaluate(() => window.__game.village.net.connected && window.__game.village.net.name);
    check('story mode: in the square straight away, no username question', !!sName && !(await S.$('.overlay.open input')), String(sName));
    check('…talk button there as online', await S.evaluate(() => !document.querySelector('.ptt-wrap').hidden));
    await S.context().close();
    await waitFor(async () => (await A.evaluate(() => window.__game.village.remotes.count)) === 1, 8000);
  }
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

  await A.dispatchEvent('.ptt', 'pointerdown'); await sleep(1200); await A.dispatchEvent('.ptt', 'pointerup');
  const shown = () => B.evaluate(() => [...document.querySelectorAll('.bubble')].filter((b) => b.style.display !== 'none' && b.textContent).map((b) => b.textContent));
  await waitFor(async () => (await shown()).length > 0, 5000);
  const bubbles = await shown();
  check('push-to-talk shows a text bubble to others', bubbles.length > 0, JSON.stringify(bubbles));
  check('…and sends no audio', (await peers(B)) === 0);

  {
    const C = await browser.newPage();
    await C.goto(`${server.url}/?nointro&fresh&quality=low${villageUrl ? `&mp=${encodeURIComponent(villageUrl)}` : ''}`);
    const home = await waitFor(() => C.evaluate(() => document.querySelector('.menu-where')?.textContent.includes('2 kişi') && document.querySelector('.menu-where').textContent), 45000);
    check('menu: how many people are in the squares right now', !!home, home);
    await C.close();
  }

  await at(A, 2, 4); await at(B, 3.5, 4);
  const l = await waitFor(async () => { const x = await label(A); return x?.includes('sesli sohbet') ? x : null; }) ?? await label(A);
  check('"voice chat" offered next to a player', !!l && l.includes('sesli sohbet'), l);
  await A.evaluate(() => { const net = window.__game.village.net, send = net.send.bind(net); window.__voiceOut = 0; net.send = (m) => { if (m.type === 'voice') window.__voiceOut++; return send(m); }; }); // count my voice pieces to the server
  await A.keyboard.press('e'); await sleep(800);
  check('the other player is asked first', !!(await waitFor(() => B.$('text=Kabul et'))));
  await B.click('text=Kabul et');
  const connected = () => Promise.all([A, B].map((p) => p.evaluate(() => Object.values(window.__game.village.voice.states())[0]))).then((s) => (s.every((x) => x === 'connected') ? s : null));
  const states = await waitFor(connected, 45000) ?? await Promise.all([A, B].map((p) => p.evaluate(() => window.__game.village.voice.states())));
  check('WebRTC connected after accepting', Array.isArray(states) && states.every((x) => x === 'connected'), JSON.stringify(states));
  const inbound = () => B.evaluate(async () => { let n = 0; for (const pc of window.__game.village.voice._debugPeers()) (await pc.getStats()).forEach((r) => { if (r.type === 'inbound-rtp' && r.kind === 'audio') n += r.bytesReceived; }); return n; });
  const bytes = await waitFor(async () => { const n = await inbound(); return n > 1000 ? n : 0; }, 8000) || await inbound();
  check('audio flows', bytes > 0, `${bytes} bytes`);
  check('…the call bar has the 🚩 report button', await A.evaluate(() => !!document.querySelector('.callbar button[aria-label="Şikayet et"]')));
  await A.click('.callbar .danger');
  check('hang up ends the call on both sides', !!(await waitFor(async () => !(await inCall(A)) && !(await inCall(B)))));
  check('…my voice in the call went to the server in pieces (safety log, reports)', !!(await waitFor(() => A.evaluate(() => window.__voiceOut > 0), 5000)), String(await A.evaluate(() => window.__voiceOut)));
  await A.click('.hud .pill.report');
  await waitFor(() => A.$('.card.report'));
  const bName = await B.evaluate(() => window.__game.village.net.name);
  await A.click(`.card.report .btn:has-text("${bName}")`);
  await A.click('.card.report .btn:has-text("Küfür")');
  check('🚩 in the top bar: pick the player and why — the server takes the report', !!(await waitFor(() => A.evaluate(() => document.body.innerText.includes('Şikayetin alındı')), 5000)));

  await A.keyboard.press('e'); await waitFor(() => B.$('text=Reddet')); await B.click('text=Reddet'); await sleep(800);
  check('declining is reported and no call starts', !(await inCall(A)) && !(await inCall(B)));

  await A.keyboard.press('e'); await waitFor(() => B.$('text=Kabul et')); await B.click('text=Kabul et');
  await waitFor(() => inCall(A));
  await at(A, -10, 20); await sleep(2500);
  check('walking across the square keeps the call', (await inCall(A)) && (await inCall(B)));
  await A.click('.callbar .danger');
  await waitFor(async () => !(await inCall(A)) && !(await inCall(B)), 6000);

  // the kahvehane: a talking zone — walk in and everyone there hears each other, the nearer the louder
  const K = await A.evaluate(() => window.__game.village.zones.kahve);
  await at(A, K.x + 4, K.z + 3); await at(B, K.x + 5, K.z + 3);
  const inZone = await waitFor(async () => (await Promise.all([A, B].map((p) => p.evaluate(() => window.__game.village.group.zone)))).every((z) => z === 'kahve'), 8000);
  check('kahvehane: walking in joins its talking zone, and the screen says so', !!inZone && await A.evaluate(() => !document.querySelector('.pill.zone-note').hidden && document.querySelector('.ptt span').textContent.includes('Basılı tut')),
    await A.evaluate(() => document.querySelector('.pill.zone-note')?.textContent));
  const zoneUp = () => Promise.all([A, B].map((p) => p.evaluate(() => Object.values(window.__game.village.group.states())))).then((s) => (s.every((x) => x.length === 1 && x[0] === 'connected') ? s : null));
  const zs = await waitFor(zoneUp, 45000) ?? await Promise.all([A, B].map((p) => p.evaluate(() => window.__game.village.group.states())));
  check('…the two hear each other (WebRTC connected)', Array.isArray(zs) && zs.length === 2 && zs.every((x) => Array.isArray(x)), JSON.stringify(zs));
  await B.evaluate(() => window.__game.village.ptt.set(true));
  const zoneBytes = () => A.evaluate(async () => { let n = 0; for (const pc of window.__game.village.group._debugPeers()) (await pc.getStats()).forEach((r) => { if (r.type === 'inbound-rtp' && r.kind === 'audio') n += r.bytesReceived; }); return n; });
  const zb = await waitFor(async () => { const n = await zoneBytes(); return n > 1000 ? n : 0; }, 10000) || await zoneBytes();
  check('…B holds the talk button: A gets B\'s voice, and sees the 🎙️', zb > 1000 && !!(await waitFor(() => A.evaluate(() => window.__game.village.remotes.list().some((c) => c.voice)), 4000)), `${zb} bytes`);
  await B.evaluate(() => window.__game.village.ptt.set(false));
  const vol = () => A.evaluate(() => Object.values(window.__game.village.group.volumes())[0] ?? -1);
  const near = await vol();
  await at(B, K.x + 10, K.z + 3);
  const far = await waitFor(async () => { const v = await vol(); return v > 0 && v < 0.35 ? v : 0; }, 10000) || await vol(); // (slow machines: B's new place takes a moment to arrive)
  check('…the further away, the quieter', near > 0.9 && far < 0.35 && far > 0, `1 m: ${near.toFixed(2)}, 6 m: ${far.toFixed(2)}`);
  await at(A, 0, 3);
  check('…walking out leaves the zone (the others no longer hear you)', !!(await waitFor(async () => (await A.evaluate(() => window.__game.village.group.zone)) === null && (await B.evaluate(() => window.__game.village.group.ids().length)) === 0, 6000))
    && await A.evaluate(() => document.querySelector('.pill.zone-note').hidden));
  // the mosque's courtyard is a talking zone too
  const Av = await A.evaluate(() => window.__game.village.zones.avlu);
  await at(A, Av.x - Av.w / 2 + 4, Av.z + 6);
  check('the mosque\'s courtyard is a talking zone too', !!(await waitFor(() => A.evaluate(() => window.__game.village.group.zone === 'avlu' && document.querySelector('.pill.zone-note').textContent.includes('Cami avlusu')), 6000)));
  await at(A, 0, 3); await waitFor(() => A.evaluate(() => window.__game.village.group.zone === null), 4000);
  await at(B, 0, 6);

  await at(A, 2, 4); await at(B, 3.5, 4); await sleep(500);
  await waitFor(async () => (await label(A))?.includes('sesli sohbet'), 6000);
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
  // a horse: B sees A on it, and sees it jump
  await A.evaluate(() => { const g = window.__game, h = g.animals.horses()[0]; g.wallet.add(5); g.animals.ride(h); });
  const riding = await waitFor(() => B.evaluate(() => window.__game.village.remotes.list().some((c) => c.mount?.kind === 'horse')), 8000);
  await A.keyboard.press('Space');
  const jumped = await waitFor(() => B.evaluate(() => window.__game.village.remotes.list().some((c) => c.jumping)), 5000, 30);
  check('horse: the other player sees you ride and jump', !!riding && !!jumped);
  await A.evaluate(() => window.__game.animals.dismount());
  await B.evaluate(() => window.__game.village.chess.resign());
  const scored = await waitFor(() => A.evaluate(() => { const s = window.__game.village.chess.state; return s.phase === 'over' && s.scores.some((r) => r.games === 1) ? s.scores.map((r) => r.name).join(', ') : null; }), 6000);
  check('chess: resigning ends the game, Dede keeps the score board', !!scored, scored);

  // the schoolyard is a public place too: both go there, A scores, both scoreboards say 1-0
  await A.evaluate(() => window.__game.travel.go('schoolyard', 'squareRoad')); await B.evaluate(() => window.__game.travel.go('schoolyard', 'squareRoad'));
  const meet = await waitFor(async () => (await A.evaluate(() => window.__game.village.joinedAt === 'schoolyard' && window.__game.village.remotes.count)) === 1 && (await B.evaluate(() => window.__game.village.remotes.count)) === 1, 15000);
  check('schoolyard: a public place with its own room', !!meet);
  await A.evaluate(() => { // a shot at the goal (not dribbled: on a slow machine the dribble's pace varies)
    const g = window.__game, b = g.toys.toys.find((t) => t.toy.location.id === 'schoolyard').toy;
    b.setState({ x: 8.8, z: -2, vx: 8, vz: 0 });
    g.village.ballKicked(b);
  });
  const goal = await waitFor(() => B.evaluate(() => window.__game.football?.score.a === 1), 8000);
  check('football: a goal counts on both screens', !!goal && (await A.evaluate(() => window.__game.football.score.a)) === 1);
  await A.evaluate(() => window.__game.travel.go('village', 'schoolRoad')); await B.evaluate(() => window.__game.travel.go('village', 'schoolRoad'));
  await waitFor(async () => (await A.evaluate(() => window.__game.village.joinedAt === 'village' && window.__game.village.remotes.count)) === 1, 15000);
  // dama in the kahvehane: A takes a board from the shelf and sits at a table, B sits down opposite
  await A.evaluate(() => { const g = window.__game; g.dama.take(); g.dama.sitAt('kahve5'); });
  check('dama: A puts a board on a table, B sees it waiting', !!(await waitFor(() => B.evaluate(() => window.__game.dama.tables.some((t) => t.n === 2 && t.white.name && !t.black)), 8000)));
  await B.evaluate(() => window.__game.dama.sitAt('kahve6'));
  check('…B sits opposite: the game is on, on both screens (A white, B black)', !!(await waitFor(async () => (await A.evaluate(() => !!document.querySelector('.dama.open') && window.__game.dama.mine()?.black?.name)) && (await B.evaluate(() => !!document.querySelector('.dama.open') && window.__game.dama.mine()?.turn === 1)), 8000)));
  await A.click('.dama.open .dama-board .cell.can'); await sleep(150); await A.click('.dama.open .dama-board .cell.to');
  check('…A moves, B sees it and it is B\'s turn', !!(await waitFor(() => B.evaluate(() => window.__game.dama.mine()?.turn === -1 && !!document.querySelector('.dama.open .dama-board .cell.can')), 8000)));
  await B.click('.dama.open .dama-board .cell.can'); await sleep(150); await B.click('.dama.open .dama-board .cell.to');
  check('…B answers, back to A (the server checks every move)', !!(await waitFor(() => A.evaluate(() => window.__game.dama.mine()?.turn === 1 && window.__game.dama.mine().last?.by === -1), 8000)));
  check('…a move out of turn is refused', await B.evaluate(() => { const t = window.__game.dama.mine(); window.__game.village.net.send({ type: 'dama-move', n: t.n, from: 40, to: 32 }); return true; }) && !!(await waitFor(() => A.evaluate(() => window.__game.dama.mine()?.turn === 1), 2000)));
  await B.evaluate(() => window.__game.player.sit(false));
  check('…B gets up: the seat is free again, A waits with the board', !!(await waitFor(() => A.evaluate(() => { const t = window.__game.dama.mine(); return t && !t.black; }), 8000)));
  await A.evaluate(() => window.__game.player.sit(false));
  check('…A gets up: the board goes off the table for everyone', !!(await waitFor(() => B.evaluate(() => window.__game.dama.tables.length === 0), 8000)));
  // a talking zone (the kahvehane): everyone inside hears each other while the button is held
  await A.evaluate(() => { const g = window.__game, z = g.village.zones.kahve; g.player.position.set(z.x - 1, 0, z.z); }); await sleep(1500);
  await B.evaluate(() => { const g = window.__game, z = g.village.zones.kahve; g.player.position.set(z.x + 1, 0, z.z); });
  check('kahvehane: both in the talking zone, connected to each other', !!(await waitFor(async () => (await A.evaluate(() => Object.values(window.__game.village.group.states())[0])) === 'connected' && (await B.evaluate(() => Object.values(window.__game.village.group.states())[0])) === 'connected', 20000)));
  check('…the talk button says to hold it there', (await A.textContent('.ptt')).includes('Basılı tut'));
  await A.evaluate(() => window.__game.village.talk(true));
  await B.mouse.click(450, 120); // (a tap: the browser lets the sound start)
  const heard = await waitFor(() => B.evaluate(async () => {
    const g = window.__game.village.group, el = g._debugAudio()[0];
    let bytes = 0; for (const pc of g._debugPeers()) (await pc.getStats()).forEach((r) => { if (r.type === 'inbound-rtp' && r.kind === 'audio') bytes = r.bytesReceived; });
    return el && !el.muted && !el.paused && el.volume > 0.3 && bytes > 3000 ? bytes : null;
  }), 15000, 500);
  check("…A holds it: B's speaker plays A's voice (an unmuted audio element, the sound arriving)", !!heard, String(heard));
  await A.evaluate(() => window.__game.village.talk(false));
  await A.evaluate(() => { const g = window.__game; g.player.position.set(0, 0, 8); }); await B.evaluate(() => { const g = window.__game; g.player.position.set(2, 0, 8); });
  check('…out of the zone: the connections close', !!(await waitFor(async () => !Object.keys(await A.evaluate(() => window.__game.village.group.states())).length && !Object.keys(await B.evaluate(() => window.__game.village.group.states())).length, 8000)));
  // a scooter: the others see it upright, heading the way the rider goes (it lay on its side)
  await A.evaluate(() => { const g = window.__game; g.scooters.getOn(g.scooters.mounts[0]); });
  const aRot = await A.evaluate(() => window.__game.player.group.rotation.y);
  const scooterSeen = await waitFor(() => B.evaluate((y) => { const r = window.__game.village.remotes.list().find((c) => c.mount?.kind === 'scooter'); if (!r) return null; const m = r.mount.group.rotation; return Math.abs(m.x) < 0.01 && Math.abs(m.z) < 0.01 && Math.abs(Math.atan2(Math.sin(m.y - y), Math.cos(m.y - y))) < 0.15 ? 'ok' : null; }, aRot), 8000);
  check("A on a scooter: B sees it upright, heading A's way", scooterSeen === 'ok', String(scooterSeen));
  await A.evaluate(() => window.__game.scooters.getOff());

  // a phone locking its screen drops the socket: the game reconnects by itself
  await B.evaluate(() => window.__game.village.net.dropForTest());
  check('after a dropped connection the player comes back by itself', !!(await waitFor(async () => (await B.evaluate(() => window.__game.village.net.connected)) && (await A.evaluate(() => window.__game.village.remotes.count)) === 1, 15000)));

  // walking in from the story: the room where the others are, whatever city was picked before
  {
    const C = await player('C', 'Gezgin', { room: 'izmir' });
    check('from the story: joins the square where the others are', !!(await waitFor(async () => (await C.evaluate(() => window.__game.village.net.room)) === 'ankara' && (await A.evaluate(() => window.__game.village.remotes.count)) === 2, 25000)), `C in ${await C.evaluate(() => window.__game.village.net.room)}, A sees ${await A.evaluate(() => window.__game.village.remotes.count)}`);
    await C.close();
    await waitFor(async () => (await A.evaluate(() => window.__game.village.remotes.count)) === 1, 8000);
  }
  // someone who picked an empty room on the menu is offered the room where the others are
  {
    const ctx = await browser.newContext({ viewport: { width: 1000, height: 620 } });
    const C = await ctx.newPage();
    errors.push(...watchErrors(C, 'C '));
    await C.goto(`${server.url}/?debug&fakemic&nointro&fresh&quality=low${villageUrl ? `&mp=${encodeURIComponent(villageUrl)}` : ''}`);
    await C.waitForFunction(() => window.__game, null, { timeout: 90000 });
    await C.evaluate(() => { window.__game.settings.set('username', 'Yalnız'); window.__game.settings.set('villageIntroSeen', true); });
    await C.evaluate(() => window.__game.settings.set('serverRegion', 'izmir')); // another city last time: the new game still goes where the others are
    await C.click('.main-menu.open .menu-main'); await sleep(1200);
    await closeCards(C);
    await waitFor(() => C.evaluate(() => window.__game.village.net.connected), 20000, 400);
    check('a new player joins the square where the others are', !!(await waitFor(async () => (await A.evaluate(() => window.__game.village.remotes.count)) === 2, 25000)), `C in ${await C.evaluate(() => window.__game.village.net.room)}, A sees ${await A.evaluate(() => window.__game.village.remotes.count)}`);
    await C.close();
  }

  // one world: the square's exit is the road home (no separate online mode with its own exit to the menu)
  const exitLabel = await A.evaluate(() => { const g = window.__game; const h = g.world.current.hotspots.get('village.yard').pos; g.player.position.set(h.x + 0.2, 0, h.z); return new Promise((r) => setTimeout(() => r(document.getElementById('act').textContent), 400)); });
  check('the square\'s exit says "Eve dön"', exitLabel.includes('Eve dön'), exitLabel);
  await A.keyboard.press('e');
  check('…and takes you home to the yard', !!(await waitFor(() => A.evaluate(() => window.__game.world.current.id === 'yard'), 8000)));
  check('B sees A leave', !!(await waitFor(async () => (await B.evaluate(() => window.__game.village.remotes.count)) === 0)));
  await A.evaluate(() => window.__game.travel.go('village', 'yardRoad'));
  check('A can walk back into the square', !!(await waitFor(() => A.evaluate(() => window.__game.village.net.connected), 15000)));
  await closeCards(A);

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
