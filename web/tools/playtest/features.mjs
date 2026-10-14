/**
 * The player-requested features, each checked in a real browser:
 * character setup (language, girl → Sare), 50 credits, grandma's advice rotation, free
 * NPC chat (dev server's canned answers), physical ball, square fence, school practice for
 * 1 credit (story paused and resumed), classroom door after the lesson, word practice,
 * textbook units with credits.  Exit 1 on the first failed check.
 * Usage: npm run playtest:features
 */
import { args, log, sleep, waitFor, startServer, openBrowser, watchErrors, screenshot, drainUi } from './lib.mjs';

const opt = args();
const server = opt.server ? { url: opt.server, stop() {} } : await startServer();
const browser = await openBrowser();
const checks = [];
const check = (name, ok, detail = '') => { checks.push(ok); log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ` — ${detail}` : ''}`); };
const errors = [];
let failed = false;
let page;

try {
  const ctx = await browser.newContext({ viewport: { width: 1100, height: 700 } });
  page = await ctx.newPage();
  errors.push(...watchErrors(page));
  const ev = (fn, a) => page.evaluate(fn, a);

  // --- first launch: character setup -------------------------------------------------
  await page.goto(`${server.url}/?debug&fakemic&fastclass&quality=low`);
  await page.waitForFunction(() => window.__game, null, { timeout: 90000 });
  check('first launch shows character setup', !!(await page.$('.overlay.open.setup')));
  await page.click('.setup button[data-lang="es"]');
  check('choosing a language re-translates the setup at once', (await page.textContent('.setup .cen')) !== 'Create your character', await page.textContent('.setup .cen'));
  check('…four characters, each a full-length picture, nothing to type', (await page.$$('.setup .char-card img')).length === 4 && !(await page.$('.setup input')));
  await page.click('.setup button[data-char="girl-covered"]');
  await Promise.all([page.waitForNavigation({ timeout: 30000 }), page.click('.setup button:has-text("Başla")')]);
  await page.waitForFunction(() => window.__game, null, { timeout: 90000 });
  const profile = await page.textContent('.main-menu .profile-line');
  const pic = await page.getAttribute('.main-menu .profile-line img', 'src');
  check('after setup the menu shows the profile (her picture, the language)', profile.includes('Español') && /hd_casual_covered/.test(pic ?? ''), `${profile} ${pic}`);
  check('no setup the second time', !(await page.$('.overlay.open.setup')));

  // --- girl: texts rewritten, look -----------------------------------------------------
  const texts = await ev(() => JSON.stringify(Object.values(window.__game.dialogue.dialogues).map((d) => d.nodes)));
  check('no names for the player in the texts', !/\b(Ahmet|Sare|Hakan|Seher)\b/.test(texts));
  check('girl: the family says “kızım”', texts.includes('kızım') && !texts.includes('oğlum'));
  check('girl: Spanish meanings, "hija" for her', await ev(() => window.__game.glossProbe('Dear! Do your homework first!')).then((t) => t.includes('Hija') && !t.includes('Do your')), await ev(() => window.__game.glossProbe('Dear! Do your homework first!')));

  // --- new game: credits, story --------------------------------------------------------
  await page.goto(`${server.url}/?debug&fakemic&fastclass&nointro&fresh&kidout&quality=low`);
  await page.waitForFunction(() => window.__game, null, { timeout: 90000 });
  await page.click('text=Hikayeye başla'); await sleep(1200);
  await ev(() => document.querySelector('.overlay.open .card .btn')?.click()); await sleep(500);
  await page.click('.credits-btn'); await sleep(400);
  check('the credits (coin) in the HUD open the shop', !!(await page.$('.shop.open')));
  await page.evaluate(() => window.__game.shop.close());
  check('a new game starts with 100 credits', (await ev(() => window.__game.wallet.balance)) === 100);

  const talkTo = async (id) => {
    await ev((npc) => { const g = window.__game; const n = g.cast.get(npc); g.player.position.set(n.position.x, 0, n.position.z + 0.8); }, id);
    await sleep(300);
    await ev((npc) => window.__game.dialogue.open(npc), id); await sleep(400);
  };
  const nodeSay = () => ev(() => window.__game.dialogue.node?.say ?? '');
  // --- headscarf: open at home, on outside --------------------------------------------
  const covered = () => ev(() => window.__game.player.covered);
  await sleep(500);
  check('covered girl: hair open at home', (await covered()) === false);
  await ev(() => window.__game.travel.place('yard', 'houseDoor', { force: true })); await sleep(700);
  check('…headscarf on outside', (await covered()) === true);
  await ev(() => window.__game.travel.place('house', 'start', { force: true })); await sleep(700);
  check('mom: hair open at home', (await ev(() => window.__game.cast.get('anne').covered)) === false);

  // --- little brother -------------------------------------------------------------------
  const p0 = await ev(() => { const k = window.__game.cast.get('kardes').position; return [k.x, k.z]; });
  // he may be standing at a stop for a while (jumping on the bed…); slow runners also run game time slower
  const kidDist = () => ev((a) => { const k = window.__game.cast.get('kardes').position; return Math.hypot(k.x - a[0], k.z - a[1]); }, p0);
  await waitFor(async () => (await kidDist()) > 0.5, 30000, 300);
  const moved = await kidDist();
  check('the little brother runs around the house', moved > 0.5, `${moved.toFixed(2)} m`);
  await talkTo('kardes');
  check('he calls you to play, no introducing himself (Abla for a girl)', (await nodeSay()).startsWith('Abla!') && !(await nodeSay()).includes('adım'), await nodeSay());
  await drainUi(page);
  check('…and asks what things are (picture quiz)', await ev(() => !!window.__game.dialogue.ctx.state.flags['kardes-yatak']));

  // --- grandma (nine) ------------------------------------------------------------------
  await talkTo('nine');
  const first = await nodeSay();
  check('grandma just talks to you: did you pray today?', first.includes('namazını kıldın mı') && !first.includes('nasihat'), first);
  await drainUi(page);
  check('…a whole little chat', await ev(() => !!window.__game.dialogue.ctx.state.flags['nine-namaz']));
  await talkTo('nine');
  const second = await nodeSay();
  check('next visit: something else (which surahs do you know?)', second.includes('Hangi sureleri'), second);
  await drainUi(page);

  // --- no typed chat with the characters (switched off) -----------------------------------
  await talkTo('dede');
  check('no 💬 free-chat button in conversations', !(await waitFor(() => ev(() => { const b = document.querySelector('#dlg .chat-btn'); return !!b && getComputedStyle(b).display !== 'none'; }), 1500)));
  await ev(() => window.__game.dialogue.close());

  // --- ball in the yard ----------------------------------------------------------------
  await ev(() => window.__game.travel.place('yard', 'houseDoor', { force: true })); await sleep(400);
  const kicked = await ev(async () => {
    const g = window.__game, b = g.toys.toys.find((t) => t.toy.location.id === 'yard' && t.action === 'ball').toy, p0 = [b.position.x, b.position.z];
    for (let i = 0; i < 30; i++) { g.player.position.set(p0[0] - 1.4 + i * 0.06, 0, p0[1]); await new Promise((r) => requestAnimationFrame(r)); }
    await new Promise((r) => setTimeout(r, 600));
    return Math.hypot(b.position.x - p0[0], b.position.z - p0[1]);
  });
  check('running into the ball kicks it (no button)', kicked > 0.8, `${kicked.toFixed(2)} m`);
  check('no "Topa vur" button any more', !(await ev(() => document.getElementById('act').textContent.includes('Topa vur'))));
  const shot = await ev(async () => {
    const g = window.__game, b = g.toys.toys.find((t) => t.toy.location.id === 'yard' && t.action === 'ball').toy;
    g.player.position.set(b.position.x - 0.8, 0, b.position.z); g.player.group.rotation.y = Math.PI / 2; // facing +x, the ball at the feet
    await new Promise((r) => setTimeout(r, 300));
    const shown = !document.getElementById('shot').hidden;
    g.toys.shoot();
    return { shown, v: Math.hypot(b.vel.x, b.vel.z), dir: b.vel.x > 0 }; // slow CI frames: check the shot's speed, not the distance
  });
  check('⚡ hard shot: the button shows next to the ball and the ball flies the way you face', shot.shown && shot.v > 10 && shot.dir, `${shot.v.toFixed(1)} m/s`);
  // dad works all round his car, not only under the bonnet
  const dad0 = await ev(() => { const b = window.__game.cast.get('baba').position; return [b.x, b.z]; });
  const dadMoved = await waitFor(() => ev((a) => { const b = window.__game.cast.get('baba').position; return Math.hypot(b.x - a[0], b.z - a[1]) > 1; }, dad0), 60000); // ~15 s of game time on a slow runner
  check('dad walks round the car', !!dadMoved);
  // Ali comes out into the garden with you (sometimes) and plays there on his own
  await ev(() => { const g = window.__game; g.travel.place('house', 'start', { force: true }); }); await sleep(400);
  await ev(() => { const g = window.__game; g.bus.emit('hotspot:used', { id: 'house.door' }); g.travel.place('yard', 'houseDoor', { force: true }); }); await sleep(400);
  check('Ali comes out into the garden with you', await ev(() => window.__game.cast.get('kardes').location === 'yard'));
  const kid0 = await ev(() => { const k = window.__game.cast.get('kardes').position; return [k.x, k.z]; });
  const played = await waitFor(() => ev((a) => { const k = window.__game.cast.get('kardes').position; return Math.hypot(k.x - a[0], k.z - a[1]) > 2; }, kid0), 30000);
  check('…and runs about the garden on his own', !!played);

  // --- square fence --------------------------------------------------------------------
  await ev(() => window.__game.travel.place('village', 'yardRoad', { force: true })); await sleep(1500);
  await drainUi(page); // first-visit card of the square
  // walk towards each side: the player must reach the fence but never pass it. After a second the
  // player is put 6 m short of the fence in the direction walked (a slow test machine walks slowly).
  // (The fence is further out in the east, past the mosque: content/square.js SQUARE_EAST.)
  const bounds = await ev(() => window.__game.world.get('village').collision.bounds);
  const fences = [];
  for (const key of ['ArrowRight', 'ArrowUp', 'ArrowLeft', 'ArrowDown']) {
    await ev(() => window.__game.player.position.set(24, 0, -1.5)); await sleep(150);
    await page.keyboard.down(key);
    await waitFor(() => ev(() => Math.hypot(window.__game.player.position.x - 24, window.__game.player.position.z + 1.5) > 0.5), 8000, 100);
    const side = await ev((b) => { // which fence it walks to, and put it near that fence
      const p = window.__game.player.position, dx = p.x - 24, dz = p.z + 1.5, alongX = Math.abs(dx) > Math.abs(dz);
      const fence = alongX ? (dx > 0 ? b.x[1] : b.x[0]) : (dz > 0 ? b.z[1] : b.z[0]); // (the bounds are 0.4 m inside the fence)
      if (alongX) p.set(fence - Math.sign(dx) * 6, 0, -27.5); else p.set(24, 0, fence - Math.sign(dz) * 6); // (z −27.5: clear of the mosque's courtyard, the kahvehane and the library)
      return { alongX, fence, sign: alongX ? Math.sign(dx) : Math.sign(dz) };
    }, bounds);
    let last = null, still = 0, far = -1e9;
    for (let i = 0; i < 80 && still < 4; i++) {
      await sleep(250);
      const v = await ev((alongX) => (alongX ? window.__game.player.position.x : window.__game.player.position.z), side.alongX);
      far = Math.max(far, v * side.sign); still = last != null && Math.abs(v - last) < 0.02 ? still + 1 : 0; last = v;
    }
    await page.keyboard.up(key);
    fences.push({ ...side, far, gap: side.fence * side.sign + 0.4 - far });
  }
  check('the square fence stops the player (all four sides)', fences.every((f) => f.gap >= 0.3 && f.gap < 1.5), fences.map((f) => `${f.alongX ? 'x' : 'z'}${f.sign > 0 ? '+' : '-'}: ${f.gap.toFixed(2)} m short of the fence`).join(', '));

  // --- chess on the giant board, on foot (İsmail Dede runs the table) -----------------
  const stand = (sq) => ev((sq) => { const g = window.__game, f = sq.charCodeAt(0) - 97, r = Number(sq[1]) - 1; g.player.position.set(-15 + (f - 3.5) * 1.1, 0, 15 - (r - 3.5) * 1.1); }, sq);
  const act = () => ev(() => document.getElementById('act').textContent);
  await stand('e2'); await sleep(400);
  check('chess: touching a piece sends you to İsmail Dede (no menu)', (await act()).includes('İsmail Dede'), await act());
  await page.keyboard.press('e'); await sleep(500);
  const dedeOpts = await ev(() => [...document.querySelectorAll('#dlg .choice')].map((c) => c.textContent));
  check('…Dede asks: white, black, or play with him', dedeOpts.some((t) => t.includes('Beyaz')) && dedeOpts.some((t) => t.includes('Siyah')) && dedeOpts.some((t) => t.includes('Seninle oynamak')), JSON.stringify(dedeOpts));
  await ev(() => [...document.querySelectorAll('#dlg .choice')].find((c) => c.textContent.includes('Beyaz'))?.click());
  check('…“Beyaz olmak istiyorum”: Dede gives you the white seat', !!(await waitFor(() => ev(() => window.__game.chess.myColor === 'w'), 5000)));
  await ev(() => window.__game.dialogue.close?.());
  await ev(() => window.__game.chess.leave());
  await waitFor(() => ev(() => window.__game.chess.state.phase === 'idle'), 5000);
  await ev(() => window.__game.dialogue.open('ismail')); await sleep(400);
  await ev(() => [...document.querySelectorAll('#dlg .choice')].find((c) => c.textContent.includes('Seninle oynamak'))?.click());
  check('chess: Dede plays you on a free board', !!(await waitFor(() => ev(() => window.__game.chess.state.phase === 'playing' && window.__game.chess.myColor === 'w'), 5000)));
  check('…no chess menu on the screen, just your clock and turn', !(await page.$('.chess.open')) && (await ev(() => !document.querySelector('.chess-bar').hidden && document.querySelector('.chess-bar').textContent)).includes('Sen beyaz'));
  await ev(() => window.__game.dialogue.close?.()); await sleep(300);
  await stand('e2'); await sleep(400);
  check('chess: on your turn, standing on a pawn offers to take it', (await act()).includes('piyon taşını al'), await act());
  await page.keyboard.press('e'); await sleep(300);
  await stand('e5'); await sleep(300);
  check('chess: a square the pawn can’t reach is refused', (await act()).includes('gidemez'), await act());
  await stand('e4'); await sleep(300);
  check('chess: a lit square offers the move', (await act()).includes('e4 karesine oyna'), await act());
  await page.keyboard.press('e');
  const fen = await waitFor(() => ev(() => { const f = window.__game.chess.state.fen; return f.includes('4P3') && f.split(' ')[1] === 'w' ? f : null; }), 8000);
  check('chess: the move is played and Dede answers', !!fen, fen || await ev(() => window.__game.chess.state.fen));
  const from = await ev(() => { const c = window.__game.chess, g = c.game; return ['d2', 'a2', 'h2', 'b1', 'g1'].find((sq) => g.get(sq)?.color === 'w' && g.moves({ square: sq }).length); });
  await stand(from); await sleep(300); await page.keyboard.press('e'); await sleep(300);
  await ev(() => window.__game.player.position.set(-15 + 7, 0, 15)); await sleep(600);
  check('chess: walking off the board puts the piece back, the game stays yours', (await ev((sq) => window.__game.chess.game.get(sq)?.color === 'w', from)) && (await ev(() => window.__game.chess.myColor)) === 'w' && (await ev(() => window.__game.chess.state.phase)) === 'playing');
  await ev(() => window.__game.chess.resign());

  // --- the square's fenced pitch, the tea garden and the chess benches ------------------
  const sqBalls = () => ev(() => window.__game.toys.toys.filter((t) => t.toy.location.id === 'village' && t.action === 'ball').map((t) => t.toy));
  check('square pitch: two balls', (await ev(() => window.__game.toys.toys.filter((t) => t.toy.location.id === 'village' && t.action === 'ball').length)) === 2);
  const P = await ev(() => window.__game.squareFootball.pitch); // the square's pitch (VillageSquare SQUARE_PITCH)
  const door = (P.fence.gaps[0][0] + P.fence.gaps[0][1]) / 2;
  await ev(([x, z]) => { const b = window.__game.squareFootball.balls[0]; b.setState({ x, z, vx: 0, vz: -8 }); }, [door, P.fence.z0 + 1]); // straight at a door in the fence
  await sleep(1500);
  const bz = await ev(() => window.__game.squareFootball.balls[0].position.z);
  check('square pitch: through a door (no wire) the ball rolls out onto the square', bz < P.fence.z0, `z = ${bz.toFixed(2)}`);
  await ev(([x, z]) => { const b = window.__game.squareFootball.balls[0]; b.setState({ x, z, vx: 0, vz: -8 }); }, [P.fence.gaps[0][1] + 6, P.fence.z0 + 1]); // at the wire
  await sleep(1500);
  const bz2 = await ev(() => window.__game.squareFootball.balls[0].position.z);
  check('…where there is wire it bounces back in', bz2 > P.fence.z0, `z = ${bz2.toFixed(2)}`);
  await ev(([x, z]) => { const b = window.__game.squareFootball.balls[0]; b.setState({ x, z, vx: 0, vz: 0 }); }, [(P.x0 + P.x1) / 2, P.cz]);
  // goals: in over the line from the pitch counts, from behind the goal does not
  const sqScore = () => ev(() => window.__game.squareFootball.score.a + window.__game.squareFootball.score.b);
  const score0 = await sqScore();
  await ev((P) => { const b = window.__game.squareFootball.balls[0]; b.setState({ x: P.x1 + 0.7, z: P.cz, vx: -3, vz: 0 }); }, P); // rolling into the net from behind
  await sleep(1200);
  check('a ball going in from behind the goal is no goal', (await sqScore()) === score0);
  await sleep(2600); // the cool-down after a (non-)goal
  await ev((P) => { const g = window.__game, b = g.squareFootball.balls[0]; g.village.lastKick = Date.now(); b.setState({ x: P.x1 - 2, z: P.cz, vx: 7, vz: 0 }); }, P); // a shot from the pitch (online: my kick)
  const scoredNow = await waitFor(async () => (await sqScore()) === score0 + 1, 4000);
  check('…a shot from the pitch is', !!scoredNow);
  await ev(() => { const g = window.__game, h = g.world.current.hotspots.get('village.scoreReset'); g.player.position.set(h.pos.x, 0, h.pos.z); }); await sleep(500);
  check('under the score board: "Skoru sıfırla"', (await ev(() => document.getElementById('act').textContent)).includes('Skoru sıfırla'));
  await page.keyboard.press('e'); await sleep(400);
  check('…the score is 0 - 0 again', (await sqScore()) === 0);
  await ev(() => window.__game.player.position.set(15, 0, 20)); await sleep(600); // on the pitch, far from the balls
  check('on the pitch: the hard-shot button stays, no talk button', await ev(() => !document.getElementById('shot').hidden && document.querySelector('.ptt-wrap').hidden));
  await ev(() => { const t = window.__game.tts; t._said = []; const speak = t.speak.bind(t); t.speak = (x, o) => { t._said.push(o?.speaker); return speak(x, o); }; }); // who speaks aloud from now on
  await ev(() => { const g = window.__game; g.player.place(g.world.current.anchors.get('cay1')); g.player.sit(true); });
  const heard = await waitFor(() => ev(() => [...document.querySelectorAll('.bubble')].some((b) => b.textContent && b.style.display !== 'none')), 30000); // (the CI machine is slow: game time runs slower there)
  check('tea garden: the regulars talk in speech bubbles', !!heard);
  check('…out loud too, sitting near them (no panel on the screen)', !(await page.$('.talk-panel')) && !!(await waitFor(() => ev(() => (window.__game.tts._said ?? []).some((w) => ['huseyin', 'kadir', 'cayci'].includes(w))), 20000)));
  await ev(() => window.__game.player.sit(false)); await sleep(300);
  await ev(() => { const g = window.__game; g.player.place(g.world.current.anchors.get('chessBench1')); g.player.sit(true); }); await sleep(300);
  check('chess benches: sitting down to watch', (await ev(() => window.__game.talk.listening)) === 'chess');
  await ev(() => { const c = window.__game.chess; c.applyServer({ ...c.state, v: 2, fen: 'rnbqkbnr/pppppppp/8/8/4P3/5N2/PPPP1PPP/RNBQKB1R b KQkq - 1 1', last: { from: 'g1', to: 'f3', san: 'Nf3' } }); });
  const comment = await waitFor(() => ev(() => [...document.querySelectorAll('.bubble')].map((b) => b.textContent).find((t) => t.includes('At oynadı'))), 12000); // (CI machines are slow)
  check('…İsmail Dede comments on the moves', !!comment, comment || '');
  await ev(() => { const c = window.__game.chess; c.applyServer({ ...c.state, v: 2, fen: 'rnbqkbnr/ppp2ppp/8/1B1pp3/4P3/8/PPPP1PPP/RNBQK1NR b KQkq - 1 3', last: { from: 'f1', to: 'b5', san: 'Bb5+' } }); });
  check('check: the king’s square glows red', await ev(() => window.__game.world.get('village').chessPieces.children.some((m) => m.isPointLight && m.color.r > 0.9)));
  await ev(() => window.__game.player.sit(false));

  // --- benches, the library (with a ney in the background) ----------------------------
  const goTo = (id) => ev((id) => { const g = window.__game, h = g.world.current.hotspots.get(id); g.player.position.set(h.pos.x, 0, h.pos.z); }, id);
  await goTo('village.bench1'); await sleep(500);
  await page.keyboard.press('e'); await sleep(600);
  check('a bench by the fountain: the action key sits you down', await ev(() => window.__game.player.seated), await ev(() => document.getElementById('act').textContent));
  await ev(() => window.__game.player.sit(false));
  await goTo('village.libShelf'); await sleep(500);
  check('library shelf: "Kitap al"', (await ev(() => document.getElementById('act').textContent)).includes('Kitap al'));
  await page.keyboard.press('e'); await waitFor(() => page.$('.pick-card'), 4000);
  await page.click('.pick-card button:has-text("Kazan Doğurdu")'); await sleep(400);
  check('…a book in your hand', (await ev(() => window.__game.library.held?.id)) === 'kazan');
  await goTo('village.bench3'); await sleep(500); await page.keyboard.press('e'); await sleep(600);
  check('sitting with the book: "oku" is offered', (await ev(() => document.getElementById('act').textContent)).includes('oku'), await ev(() => document.getElementById('act').textContent));
  await page.keyboard.press('e'); await waitFor(() => page.$('.book.open'), 4000);
  const credits0b = await ev(() => window.__game.wallet.balance);
  for (let i = 0; i < 5; i++) { await page.click('.book.open .book-nav .btn:not(.alt)'); await sleep(250); }
  check('reading a book to the end: +1 credit, its words in the notebook', (await ev(() => window.__game.wallet.balance)) === credits0b + 1 && (await ev(() => window.__game.vocab.entries().some(([w]) => w === 'kazan'))));
  await ev(() => window.__game.player.sit(false));
  await goTo('village.libShelf'); await sleep(500);
  check('…and back on the shelf ("Kitabı rafa koy")', (await ev(() => document.getElementById('act').textContent)).includes('rafa koy'));
  await page.keyboard.press('e'); await sleep(400);
  check('…the hand is empty again', (await ev(() => window.__game.library.held)) === null);
  await goTo('village.kitap1'); await sleep(600);
  check('a library seat: "Otur, kitap oku"', (await ev(() => document.getElementById('act').textContent)).includes('Otur, kitap oku'));
  await page.keyboard.press('e');
  const sub = await waitFor(() => ev(() => { const s = document.querySelector('.subtitles'); return s && !s.hidden && s.querySelector('.sub-tr').textContent && s.querySelector('.sub-en').textContent ? s.textContent : null; }), 15000);
  check('…a book off the shelf, read aloud with subtitles (Turkish and its meaning)', !!sub && !!(await ev(() => window.__game.library.reading)), sub ?? '');
  await ev(() => window.__game.player.sit(false));
  check('…getting up stops it', !!(await waitFor(() => ev(() => document.querySelector('.subtitles').hidden && !window.__game.library.reading), 3000)));
  await goTo('village.libShelf'); await sleep(500); await page.keyboard.press('e'); await sleep(400); // the book back on the shelf
  check('a ney plays softly in the library', (await ev(() => window.__game.ney.level)) > 0.3, String(await ev(() => window.__game.ney.level)));
  await ev(() => window.__game.player.position.set(4, 0, 4)); await sleep(300);
  check('…and not by the fountain', (await ev(() => window.__game.ney.level)) === 0);
  await page.keyboard.press('Shift'); // (a key press: the browser lets sound start)
  const tune = await waitFor(() => ev(() => { const m = window.__game.music; return (m.levels()[m.current] ?? 0) > 0.05 ? m.current : null; }), 10000);
  check('the square has its own background music', tune === 'assets/audio/meydan.mp3', String(tune));
  await ev(() => window.__game.settings.set('musicOn', false));
  check('…"Müzik" off in the settings: it fades out', !!(await waitFor(() => ev(() => Object.values(window.__game.music.levels()).every((v) => v < 0.01)), 25000))); // (slow CI machines: game time runs slow)
  await ev(() => window.__game.settings.set('musicOn', true));
  await ev(() => { const a = window.__game.ads; a._banner = []; a.showBanner = () => a._banner.push('show'); a.hideBanner = () => a._banner.push('hide'); window.__game.idleAd.idle = 89.5; });
  check('standing still for a long while: a banner ad', !!(await waitFor(() => ev(() => window.__game.ads._banner.at(-1) === 'show'), 20000)));
  await page.keyboard.down('ArrowUp'); await sleep(500); await page.keyboard.up('ArrowUp');
  check('…the first step takes it away', !!(await waitFor(() => ev(() => window.__game.ads._banner.at(-1) === 'hide'), 10000)));

  // --- shopping: the bag, rubbish bins, the table at home -------------------------------
  const bag = (k) => ev((k) => window.__game.inventory.count(k), k);
  const picks = () => ev(() => [...document.querySelectorAll('.overlay.open .blist .pick')].map((b) => b.textContent));
  const money0 = await bag('para');
  check('game money: a new game starts with some lira, shown in the HUD', money0 >= 30 && (await page.textContent('.hud .money')).includes(String(money0)));
  await ev(() => window.__game.inventory.add('para', 100));
  await ev(() => window.__game.market.open('manav')); await sleep(300);
  check('the greengrocer\'s shop window: a shelf of slots with prices', (await page.$$('.market.open .mk-slot:not(.mk-none)')).length === 6 && (await page.$$('.market.open .mk-slot.mk-none')).length === 6);
  await page.click('.market.open .mk-slot[aria-label="kilo elma"]'); await sleep(200);
  check('…tap one: what it is and its price in words', (await page.textContent('.market.open .mk-info')).includes('yirmi lira'));
  await page.click('.market.open .mk-buy'); await sleep(300);
  check('…bought: in the bag, paid with the game money', (await bag('elma')) === 1 && (await bag('para')) === money0 + 80 && (await page.textContent('.market.open .mk-purse')).includes(`${money0 + 80} lira`));
  await ev(() => window.__game.market.close());
  await ev(() => window.__game.dialogue.effects.run(['buy:sut:15']));
  check('bought at the greengrocer and the grocer: in the bag, paid from it', (await bag('elma')) === 1 && (await bag('sut')) === 1 && (await bag('para')) === money0 + 65);
  check('…the greengrocer sells any day (his shop window)', await ev(() => window.__game.dialogue.dialogues.manav.nodes.idle.options.some((o) => o.do?.includes('market:manav'))));
  check('no rubbish bins for now (switched off)', await ev(() => !window.__game.world.get('village').hotspots.has('village.trash1')));
  await ev(() => window.__game.travel.place('house', 'start', { force: true })); await sleep(800);
  await goTo('house.tableGoods'); await sleep(500);
  check('at home by the sini: "Masaya koy"', (await ev(() => document.getElementById('act').textContent)).includes('Masaya koy'), await ev(() => document.getElementById('act').textContent));
  await page.keyboard.press('e'); await sleep(400);
  check('…lists only what you bought (no money, no story things)', JSON.stringify(await picks()).includes('süt') && !JSON.stringify(await picks()).includes('lira'), JSON.stringify(await picks()));
  await page.click('.overlay.open .blist .pick:has-text("elma")'); await sleep(300);
  check('…the apples are on the table (and out of the bag)', (await bag('elma')) === 0 && JSON.stringify(await ev(() => window.__game.story.state.table)) === '["elma"]' && (await ev(() => window.__game.tableAndBins.group.children.length)) === 1);
  await page.click('.overlay.open .blist .pick:has-text("Masadan al")'); await sleep(300);
  check('…and back in the bag', (await bag('elma')) === 1 && (await ev(() => window.__game.story.state.table.length)) === 0);
  await page.click('.overlay.open .blist .pick:has-text("elma")'); await sleep(300);
  await ev(() => document.querySelector('.overlay.open .bookin .iconbtn')?.click()); await sleep(200);
  check('…saved with the game', (await ev(() => window.__game.story.state.snapshot().table)).includes('elma'));
  await ev(() => { const g = window.__game; g.labels.bubble(g.player, 'Tamam anne!', null, 3, 'Okay mum!'); });
  check('speech bubbles: the meaning under the Turkish, in the player\'s language', await ev(() => [...document.querySelectorAll('.bubble')].some((b) => b.textContent.includes('Tamam anne!') && b.querySelector('.bubble-en')?.textContent === '¡Vale, mamá!')));
  await ev(() => window.__game.travel.place('yard', 'houseDoor', { force: true })); await sleep(600);
  await drainUi(page);

  // --- school practice from the garden gate --------------------------------------------
  const creditsBeforePractice = await ev(() => window.__game.wallet.balance);
  const questBefore = await ev(() => window.__game.story.quest?.id);
  await ev(() => { const g = window.__game; g.player.position.set(0, 0, 22.3); }); await sleep(400);
  const gateLabel = await ev(() => document.getElementById('act').textContent);
  check('the garden gate leads to the street', gateLabel.includes('Sokağa çık'), gateLabel);
  await page.keyboard.press('e');
  const choices = await waitFor(() => ev(() => [...document.querySelectorAll('.pick-card .btn.pick')].map((b) => b.textContent)), 5000);
  check('street: choose school or the village square', !!choices && choices.some((t) => t.includes('Okula git')) && choices.some((t) => t.includes('meydan')), JSON.stringify(choices));
  await page.click('.pick-card .btn.pick:has-text("Okula git")');
  check('"Okula git" leads to the schoolyard first, not straight into a lesson', !!(await waitFor(() => ev(() => window.__game.world.current.id === 'schoolyard'), 6000)) && !(await page.$('.classroom.open')));
  await ev(() => { const g = window.__game, d = g.world.current.hotspots.get('school.door'); g.player.position.set(d.pos.x, 0, d.pos.z + 0.6); }); await sleep(500);
  const doorPractice = await ev(() => document.getElementById('act').textContent);
  check('the classroom door offers practice (1 credit)', doorPractice.includes('pratik'), doorPractice);
  await page.keyboard.press('e');
  await waitFor(() => page.$('.overlay.open .card .btn:has-text("Krediyle")'), 5000);
  await page.click('.overlay.open .card .btn:has-text("Krediyle")');
  await waitFor(() => page.$('.classroom.open'), 10000);
  check('practice: in the classroom, story paused', (await ev(() => window.__game.world.current.id)) === 'classroom' && (await ev(() => window.__game.story.paused)));
  for (let i = 0; i < 40 && !(await ev(() => window.__game.world.current.id === 'schoolyard' && !window.__game.story.paused)); i++) { await drainUi(page); await sleep(800); }
  check('practice: back in the schoolyard afterwards, the day continues', (await ev(() => window.__game.world.current.id)) === 'schoolyard' && (await ev(() => window.__game.story.quest?.id)) === questBefore);
  check('practice cost 1 credit', (await ev(() => window.__game.wallet.balance)) === creditsBeforePractice - 1);

  // --- the schoolyard: benches to sit on, the canteen -------------------------------------
  await goTo('school.bench1'); await sleep(400);
  check('schoolyard benches: "Banka otur"', (await ev(() => document.getElementById('act').textContent)).includes('Banka otur'));
  await page.keyboard.press('e'); await sleep(600);
  check('…and you sit down', await ev(() => !!window.__game.player.seated));
  await ev(() => window.__game.player.sit(false));
  await ev(() => window.__game.player.position.set(-13.6, 0, -5.6)); await sleep(400);
  check('the canteen: "Hasan Amca ile konuş"', !!(await waitFor(() => ev(() => document.getElementById('act').textContent.includes('Hasan Amca')), 4000)));
  await page.keyboard.press('e'); await sleep(600);
  check('…first you greet him (say "Kolay gelsin")', (await ev(() => window.__game.dialogue.node?.ask)) === 'speak');
  await ev(() => document.querySelector('#dlg .mic')?.click());
  const asked = await waitFor(() => ev(() => (window.__game.dialogue.node?.say ?? '').includes('Ne alırsın') && !!window.__game.story.state.flags['met-kantinci']), 8000); // (slow machines: the answer takes a while)
  check('…then he asks what you will have', !!asked, await ev(() => window.__game.dialogue.node?.say));
  await ev(() => document.querySelectorAll('#dlg .choice')[1]?.click()); // "Neler var?"
  await waitFor(() => page.$('.market.open'), 3000);
  check('…"Neler var?" opens the canteen shelf', (await page.$$('.market.open .mk-slot:not(.mk-none)')).length === 6);
  const lira = await bag('para');
  await page.click('.market.open .mk-slot[aria-label="tost"]'); await sleep(200);
  await page.click('.market.open .mk-buy'); await sleep(300);
  check('…a toast for twenty-five lira', (await bag('tost')) === 1 && (await bag('para')) === lira - 25);
  await ev(() => window.__game.market.close());

  // --- the bicycle in the yard: a skill bought with credits -------------------------------
  await ev(() => window.__game.travel.place('yard', 'houseDoor', { force: true })); await sleep(500);
  await ev(() => { const b = window.__game.bicycle.bike.group.position; window.__game.player.position.set(b.x, 0, b.z + 1.2); }); await sleep(400);
  check('bicycle: "Bisiklete bin" (no price on the button)', !!(await waitFor(() => ev(() => { const t = document.getElementById('act').textContent; return t.includes('Bisiklete bin') && !t.includes('kredi'); }), 4000)));
  const bikeCredits = await ev(() => window.__game.wallet.balance);
  await page.keyboard.press('e');
  await waitFor(() => page.$('.overlay.open .card .btn'), 3000);
  check('…"Bisiklet sürmeyi bilmiyorsun": learn it for 3 credits', (await page.textContent('.overlay.open .ctitle')).includes('bilmiyorsun') && (await page.textContent('.overlay.open .card .btn:not(.alt)')).includes('3 kredi'));
  await page.click('.overlay.open .card .btn:not(.alt)');
  check('…learnt for credits, now riding', !!(await waitFor(() => ev((c) => window.__game.wallet.balance === c - 3 && window.__game.player.mount?.kind === 'bike', bikeCredits), 5000)));
  check('…"Bisikletten in" (not "Attan in")', !!(await waitFor(() => ev(() => document.getElementById('act').textContent.includes('Bisikletten in')), 3000)));
  await page.keyboard.press('e');
  check('…off again', !!(await waitFor(() => ev(() => !window.__game.player.mount), 3000)));
  await page.keyboard.press('e'); await waitFor(() => ev(() => window.__game.player.mount?.kind === 'bike'), 3000); // on again
  await ev(() => window.__game.travel.go('village', 'yardRoad')); // out of the gate to the square, riding
  check('…ridden out of the gate, the bike comes along to the square', !!(await waitFor(() => ev(() => window.__game.world.current.id === 'village' && window.__game.player.mount?.kind === 'bike' && window.__game.bicycle.place === 'village'), 8000)));
  await page.keyboard.press('e'); await waitFor(() => ev(() => !window.__game.player.mount), 3000); // left in the square
  await ev(() => window.__game.travel.go('yard', 'gate'));
  check('…walking home without it: it is back at the wall', !!(await waitFor(() => ev(() => window.__game.world.current.id === 'yard' && window.__game.bicycle.place === 'yard'), 8000)));

  // --- villagers don't open with the same line every time ---------------------------------
  const firsts = new Set();
  for (let i = 0; i < 4; i++) { await ev(() => window.__game.dialogue.open('seyis')); await sleep(400); firsts.add(await ev(() => document.querySelector('#dlg .line, #dlg .say')?.textContent ?? window.__game.dialogue.lastLine)); await ev(() => window.__game.dialogue.close()); await sleep(200); }
  check('the groom opens with a different line each time', firsts.size >= 2 && [...firsts].every((t) => t && t.includes('Ata binmek ister misin')), [...firsts].join(' | '));

  // --- the groom by the horses ------------------------------------------------------------
  await ev(() => window.__game.travel.place('village', 'yardRoad', { force: true })); await sleep(800);
  await ev(() => window.__game.player.position.set(-4.2, 0, -21)); await sleep(400);
  check('the square: Hamdi the groom by the horses', !!(await waitFor(() => ev(() => document.getElementById('act').textContent.includes('Hamdi Amca')), 5000)));
  const rideCredits = await ev(() => window.__game.wallet.balance);
  await ev(() => { const g = window.__game; g.animals.ride(g.animals.horses()[0]); });
  check('a ride on a horse: 1 credit, and the 🐎 Zıpla button is there', (await ev(() => window.__game.wallet.balance)) === rideCredits - 1 && !!(await waitFor(() => ev(() => !document.getElementById('jump').hidden), 3000)));
  await page.keyboard.press('Space');
  const leap = await waitFor(() => ev(() => { const m = window.__game.player.mount; return m?.group.position.y > 0.4 ? m.group.position.y : 0; }), 8000, 30); // (slow CI machines: few frames a second)
  check('…Space: the horse jumps, then lands', !!leap && !!(await waitFor(() => ev(() => !window.__game.player.jumping && window.__game.player.mount.group.position.y === 0), 15000)), `up to ${Number(leap).toFixed(2)} m`);
  // a jump from a gallop flies on that way, even with the stick let go
  await page.keyboard.down('ArrowUp'); await sleep(900);
  const before = await ev(() => ({ x: window.__game.player.position.x, z: window.__game.player.position.z }));
  await page.keyboard.press('Space'); await page.keyboard.up('ArrowUp');
  await waitFor(() => ev(() => !window.__game.player.jumping), 15000);
  const flew = await ev((b) => Math.hypot(window.__game.player.position.x - b.x, window.__game.player.position.z - b.z), before);
  check('…jumping at a gallop: it flies on forward (the stick let go)', flew > 2, `${flew.toFixed(1)} m`);
  check('on horseback: no "Sert vur" button', await ev(() => document.getElementById('shot').hidden));
  await ev(() => window.__game.animals.dismount());
  await ev(() => window.__game.travel.place('yard', 'gate', { force: true })); await sleep(500);

  // --- word practice -------------------------------------------------------------------
  check('word practice is offered from the notebook', await ev(() => window.__game.drill.available));
  await ev(() => { window.__game.drill.open(); }); await sleep(300);
  for (let i = 0; i < 8; i++) {
    await ev(() => {
      const right = [...document.querySelectorAll('.drill .choice')];
      const spec = window.__game.drill;
      // click options until the activity moves on (wrong ones are struck through)
      for (const b of right) if (!b.classList.contains('no')) { b.click(); break; }
      document.querySelector('.drill .mic:not(.rec)')?.click();
    });
    await sleep(900);
    await ev(() => { for (const b of document.querySelectorAll('.drill .choice:not(.no)')) b.click(); });
    await sleep(500);
  }
  const drillDone = await waitFor(() => ev(() => /\d+\/\d+ ✓/.test(document.querySelector('.drill .drill-q').textContent)), 8000);
  check('word practice runs to the end', !!drillDone, await ev(() => document.querySelector('.drill .drill-q').textContent));
  await ev(() => window.__game.drill.close());

  // --- textbook units ------------------------------------------------------------------
  const units = await ev(() => window.__game.textbook.book.units.filter((u) => !u.locked && u.pages.length).length);
  check('textbook has 6 open units', units === 6, String(units));
  const credits0 = await ev(() => window.__game.wallet.balance);
  await ev(() => window.__game.textbook.open('u2')); await sleep(300);
  for (let i = 0; i < 40 && !(await ev(() => !!window.__game.dialogue.ctx.state.flags['homework-u2'])); i++) {
    await ev(() => {
      const tb = window.__game.textbook, p = tb.unit?.pages[tb.page], next = document.querySelector('.tb-nav .chipbtn.primary');
      if (!p) return;
      if (next && !next.disabled && !next.hidden) { next.click(); return; }
      if (p.activity === 'order') { let rest = p.answer; for (let k = 0; k < 20 && rest; k++) { const t = [...document.querySelectorAll('.tb-body .tile:not([disabled])')].filter((x) => rest.startsWith(x.textContent)).sort((a, b) => b.textContent.length - a.textContent.length)[0]; if (!t) break; t.click(); rest = rest.slice(t.textContent.length).trimStart(); }  return; }
      if (p.activity === 'speak') { document.querySelector('.tb-body .mic')?.click(); return; }
      const k = Math.max(0, (p.options ?? []).findIndex((o) => !o.wrong));
      document.querySelectorAll('.tb-body .choice')[k]?.click();
    });
    await sleep(700);
  }
  check('unit 2 can be finished', await ev(() => !!window.__game.dialogue.ctx.state.flags['homework-u2']));
  check('…and earns 2 credits', (await ev(() => window.__game.wallet.balance)) === credits0 + 2);
  await ev(() => window.__game.textbook.close());

  // --- classroom door after the lesson (talk to the teacher) ---------------------------
  await ev(() => {
    const g = window.__game, i = g.story.story.chapters.findIndex((c) => c.id === 'd2-school');
    g.story.startChapter(i);
  });
  await sleep(800); await drainUi(page);
  await ev(() => { const g = window.__game; g.dialogue.ctx.state.flags['lesson-l1'] = true; g.dialogue.ctx.state.quest = g.story.questIndex('homework-assign'); g.travel.place('schoolyard', 'door', { force: true }); });
  await sleep(500);
  const doorLabel = await ev(() => document.getElementById('act').textContent);
  check('after the lesson the classroom door opens to talk to the teacher', doorLabel.includes('Sınıfa gir'), doorLabel);
  await page.keyboard.press('e');
  check('…and leads into the classroom', !!(await waitFor(() => ev(() => window.__game.world.current.id === 'classroom'), 6000)));

  // --- a phone held sideways (with the browser bar): a conversation fits without scrolling ---
  await page.setViewportSize({ width: 740, height: 300 }); await sleep(400);
  const fits = [];
  for (const who of ['anne', 'nine', 'kardes']) {
    await ev((w) => { const g = window.__game; g.dialogue.close?.(); g.travel.place('house', 'start', { force: true }); g.dialogue.open(w); }, who); await sleep(700);
    fits.push(await ev(() => { const d = document.getElementById('dlg'), sh = d.querySelector('.sheet'); return sh.scrollHeight - sh.clientHeight <= 2 && d.getBoundingClientRect().top >= 0; }));
  }
  check('phone sideways: the conversation fits on screen, no scrolling', fits.every(Boolean), JSON.stringify(fits));
  await page.setViewportSize({ width: 1100, height: 700 });

  // --- credits: daily reward, shop, rewarded video, ad between story days ----------------
  {
    const p2 = await (await browser.newContext({ viewport: { width: 1000, height: 620 } })).newPage();
    errors.push(...watchErrors(p2, 'shop '));
    const e2 = (fn, a) => p2.evaluate(fn, a);
    await p2.goto(`${server.url}/?debug&fakemic&nointro&fresh&daily&mockads&fastads&nobilling&quality=low`);
    await p2.waitForFunction(() => window.__game, null, { timeout: 90000 });
    const daily = await waitFor(() => p2.$('.overlay.open.daily'), 8000);
    check('daily reward on opening the game (day 1: +3)', !!daily && (await p2.textContent('.daily .btn')).includes('+3'));
    await p2.click('.daily .btn'); await sleep(300);
    check('…credits 100 → 103', (await e2(() => window.__game.wallet.balance)) === 103);
    await p2.reload(); await p2.waitForFunction(() => window.__game, null, { timeout: 90000 }); await sleep(800);
    check('…not twice the same day, and the credits are kept', !(await p2.$('.overlay.open.daily')) && (await e2(() => window.__game.wallet.balance)) === 103);
    check('…tomorrow is day 2 (+4)', JSON.stringify(await e2(() => window.__game.wallet.daily(Date.now() + 864e5))) === '{"day":2,"amount":4}');
    await p2.click('.main-menu.open [aria-label="Dükkan"]'); await sleep(400);
    check('shop opens from the menu', !!(await p2.$('.shop.open')));
    check('blocky player: the villagers on the square are blocky too', await e2(() => !window.__game.cast.get('manav').hdOn));
    await p2.click('.shop.open .shop-card:has-text("Video izle") button');
    await waitFor(() => p2.$('.overlay.ad button:not([disabled])'), 6000); await p2.click('.overlay.ad button');
    await sleep(300);
    check('rewarded video: +3, then the next one in 3 hours', (await e2(() => window.__game.wallet.balance)) === 106 && (await e2(() => [...document.querySelectorAll('.shop.open .shop-card')].find((c) => c.textContent.includes('Video izle')).querySelector('button').disabled)));
    check('no credit packs for sale for now', !(await p2.$('.shop.open .shop-card.pack')) && !(await page.evaluate(() => window.__game.billing.available)));
    await e2(() => { window.__game.wallet.trySpend(50); window.__game.shop.render(); }); // 56
    check('not enough credits for ad-free mode (100) yet: its button is off', await e2(() => [...document.querySelectorAll('.shop.open .shop-card')].find((i) => i.textContent.includes('Reklamsız mod')).querySelector('button').disabled));
    check('outfits need the HD character first', await e2(() => [...document.querySelectorAll('.shop.open .shop-card')].find((c) => c.textContent.includes('Günlük kıyafet')).querySelector('button').disabled));
    await e2(() => { window.__game.wallet.add(45); window.__game.shop.render(); }); // 101
    await p2.click('.shop.open .shop-card:has-text("HD karakter") button'); await sleep(300);
    check('the HD character (40 credits): bought and on, in its everyday clothes', (await e2(() => window.__game.wallet.equipped('hd'))) === 'hd' && (await e2(() => window.__game.wallet.balance)) === 61);
    check('…and the villagers on the square are HD for you now', await waitFor(() => e2(() => window.__game.cast.get('manav').hdOn === true), 4000));
    await p2.click('.shop.open .shop-card:has-text("Günlük kıyafet") button'); await sleep(300);
    check('an outfit (30 credits, shown as a picture): bought and put on', (await e2(() => window.__game.wallet.equipped('body'))) === 'hd-casual' && (await e2(() => window.__game.wallet.balance)) === 31);
    await p2.click('.shop.open .shop-card:has-text("Yıldız Işığı") button'); await sleep(300);
    check('the glowing ring (25 credits)', (await e2(() => window.__game.wallet.equipped('aura'))) === 'aura' && (await e2(() => window.__game.wallet.balance)) === 6);
    await e2(() => window.__game.shop.close());
    // a full-screen ad between two story days (not within the same day)
    await e2(() => document.querySelector('.main-menu.open .btn')?.click()); await sleep(1500);
    await e2(() => document.querySelector('.overlay.open .card .btn')?.click()); await sleep(300);
    const i = await e2(() => { const g = window.__game, ch = g.story.story.chapters; return ch.findIndex((c, k) => k > 0 && c.day !== ch[k - 1].day) - 1; });
    await e2((i) => { const g = window.__game; g.story.state.chapter = i; g.story.state.day = g.story.story.chapters[i].day; g.story.nextChapter(); }, i);
    check('story: a full-screen ad between two days', !!(await waitFor(() => p2.$('.overlay.ad.interstitial'), 4000)));
    await waitFor(() => p2.$('.overlay.ad.interstitial button:not([disabled])'), 5000); await p2.click('.overlay.ad.interstitial button');
    check('…and the new day starts after it', !!(await waitFor(() => e2((i) => window.__game.story.state.chapter === i + 1, i), 6000)));
    await e2(() => { const w = window.__game.wallet; w.add(100); w.buy({ id: 'adFree', price: 100 }); });
    const j = await e2((i) => window.__game.story.story.chapters.findIndex((c, k) => k > i + 1 && c.day !== window.__game.story.story.chapters[k - 1].day) - 1, i);
    await e2((j) => { const g = window.__game; g.story.state.chapter = j; g.story.state.day = g.story.story.chapters[j].day; g.story.nextChapter(); }, j);
    await sleep(1500);
    check('ad-free mode: no ad between days', !(await p2.$('.overlay.ad.interstitial')) && (await e2((j) => window.__game.story.state.chapter === j + 1, j)));
    await p2.close();
  }
} catch (e) {
  failed = true;
  log('FAIL ', e.stack ?? e.message);
  if (page) await screenshot(page, 'features-failure');
}

await browser.close();
server.stop();
if (errors.length) log('errors:\n  ' + errors.join('\n  '));
const ok = !failed && !errors.length && checks.every(Boolean);
log(ok ? `PASS — ${checks.length} checks` : 'FAIL');
process.exit(ok ? 0 : 1);
