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
  await page.waitForFunction(() => window.__game, null, { timeout: 30000 });
  check('first launch shows character setup', !!(await page.$('.overlay.open.setup')));
  await page.click('.setup button[data-lang="es"]');
  check('choosing a language re-translates the setup at once', (await page.textContent('.setup .cen')) !== 'Create your character', await page.textContent('.setup .cen'));
  await page.click('.setup button[data-char="girl-covered"]');
  await page.fill('.setup .name-in', 'Deneme_1');
  await Promise.all([page.waitForNavigation({ timeout: 30000 }), page.click('.setup button:has-text("Kaydet")')]);
  await page.waitForFunction(() => window.__game, null, { timeout: 30000 });
  const profile = await page.textContent('.main-menu .profile-line');
  check('after setup the menu shows the profile', profile.includes('Sare') && profile.includes('Español') && profile.includes('Deneme_1'), profile);
  check('no setup the second time', !(await page.$('.overlay.open.setup')));

  // --- girl: texts rewritten, look -----------------------------------------------------
  const texts = await ev(() => JSON.stringify(Object.values(window.__game.dialogue.dialogues).map((d) => d.nodes)));
  check('girl: dialogue texts say Sare, not Ahmet', !/\bAhmet\b/.test(texts) && texts.includes('Sare'));
  check('girl: the family says “kızım”', texts.includes('kızım') && !texts.includes('oğlum'));
  check('girl: Spanish meanings (and her name in them)', await ev(() => window.__game.glossProbe('Ahmet! Do your homework first!')).then((t) => t.includes('Sare') && !t.includes('Do your')), await ev(() => window.__game.glossProbe('Ahmet! Do your homework first!')));

  // --- new game: credits, story --------------------------------------------------------
  await page.goto(`${server.url}/?debug&fakemic&fastclass&nointro&fresh&kidout&quality=low`);
  await page.waitForFunction(() => window.__game, null, { timeout: 30000 });
  await page.click('text=Hikayeye başla'); await sleep(1200);
  await ev(() => document.querySelector('.overlay.open .card .btn')?.click()); await sleep(500);
  await page.click('.credits-btn'); await sleep(400);
  check('the 🪙 credits in the HUD open the shop', !!(await page.$('.shop.open')));
  await page.evaluate(() => window.__game.shop.close());
  check('a new game starts with 50 credits', (await ev(() => window.__game.wallet.balance)) === 50);

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

  // --- free chat (dev server: canned answers) ------------------------------------------
  await talkTo('dede');
  const chatBtn = await waitFor(() => page.$('#dlg .chat-btn:not([hidden])'), 5000);
  check('💬 free chat offered with a character who is not the quest target', !!chatBtn);
  if (chatBtn) {
    await chatBtn.click();
    await waitFor(() => ev(() => document.querySelector('#dlg .line').textContent.includes('Merhaba')), 5000);
    await page.fill('#dlg .chat-in', 'Bugün hava çok güzel');
    await page.click('#dlg .chatbox button:has-text("Gönder")');
    const line = await waitFor(() => ev(() => { const t = document.querySelector('#dlg .line').textContent; return t.includes('hava') ? t : null; }), 5000);
    check('chat: the character answers what you wrote', !!line, line);
    check('chat: words from the answer go into the notebook', await ev(() => window.__game.vocab.entries().some(([w]) => w === 'bugün')));
  }
  await ev(() => window.__game.dialogue.close());
  const anneChat = await ev(() => { const g = window.__game; return g.story.target()?.npc; });
  if (anneChat) {
    await talkTo(anneChat); await sleep(500);
    check('no chat button with the quest target (story comes first)', !(await page.$('#dlg .chat-btn:not([hidden])')));
    await ev(() => window.__game.dialogue.close());
  }

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
  // walk towards each side for a while: the player must reach the fence but never pass it
  let edge = 0;
  for (const key of ['ArrowRight', 'ArrowUp', 'ArrowLeft', 'ArrowDown']) {
    await ev(() => window.__game.player.position.set(24, 0, -1.5)); await sleep(150);
    await page.keyboard.down(key);
    for (let i = 0; i < 36; i++) { await sleep(250); edge = Math.max(edge, await ev(() => { const p = window.__game.player.position; return Math.max(Math.abs(p.x), Math.abs(p.z)); })); }
    await page.keyboard.up(key);
  }
  check('the square fence stops the player', edge > 32.5 && edge <= 33.7, `furthest ${edge.toFixed(2)} m from the centre (fence at 34)`);

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
  await ev(() => { const b = window.__game.squareFootball.balls[0]; b.setState({ x: 8.3, z: 15, vx: 0, vz: -8 }); }); // straight at the door in the fence (8.3: between 7.4 and 9.2)
  await sleep(1500);
  const bz = await ev(() => window.__game.squareFootball.balls[0].position.z);
  check('square pitch: the wire fence keeps the ball in (even at the door)', bz > 14, `z = ${bz.toFixed(2)}`);
  // goals: in over the line from the pitch counts, from behind the goal does not
  const sqScore = () => ev(() => window.__game.squareFootball.score.a + window.__game.squareFootball.score.b);
  const score0 = await sqScore();
  await ev(() => { const P = { x1: 26.5, cz: 21 }, b = window.__game.squareFootball.balls[0]; b.setState({ x: P.x1 + 0.7, z: P.cz, vx: -3, vz: 0 }); }); // rolling into the net from behind
  await sleep(1200);
  check('a ball going in from behind the goal is no goal', (await sqScore()) === score0);
  await sleep(2600); // the cool-down after a (non-)goal
  await ev(() => { const g = window.__game, b = g.squareFootball.balls[0]; g.village.lastKick = Date.now(); b.setState({ x: 24.5, z: 21, vx: 7, vz: 0 }); }); // a shot from the pitch (online: my kick)
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
  const heard = await waitFor(() => ev(() => [...document.querySelectorAll('.bubble')].some((b) => b.textContent && b.style.display !== 'none')), 16000);
  check('tea garden: the regulars talk in speech bubbles', !!heard);
  check('…quietly: no voice, no panel on the screen', !(await page.$('.talk-panel')) && !(await ev(() => (window.__game.tts._said ?? []).some((w) => ['huseyin', 'kadir', 'cayci'].includes(w)))));
  await ev(() => window.__game.player.sit(false)); await sleep(300);
  await ev(() => { const g = window.__game; g.player.place(g.world.current.anchors.get('chessBench1')); g.player.sit(true); }); await sleep(300);
  check('chess benches: sitting down to watch', (await ev(() => window.__game.talk.listening)) === 'chess');
  await ev(() => { const c = window.__game.chess; c.applyServer({ ...c.state, v: 2, fen: 'rnbqkbnr/pppppppp/8/8/4P3/5N2/PPPP1PPP/RNBQKB1R b KQkq - 1 1', last: { from: 'g1', to: 'f3', san: 'Nf3' } }); });
  const comment = await waitFor(() => ev(() => [...document.querySelectorAll('.bubble')].map((b) => b.textContent).find((t) => t.includes('At oynadı'))), 6000);
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
  check('a ney plays softly in the library', (await ev(() => window.__game.ney.level)) > 0.3, String(await ev(() => window.__game.ney.level)));
  await ev(() => window.__game.player.position.set(4, 0, 4)); await sleep(300);
  check('…and not by the fountain', (await ev(() => window.__game.ney.level)) === 0);
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
      if (p.activity === 'order') { for (const w of p.answer.split(' ')) [...document.querySelectorAll('.tb-body .tile:not([disabled])')].find((t) => t.textContent === w)?.click(); return; }
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
    await p2.goto(`${server.url}/?debug&fakemic&nointro&fresh&daily&mockads&fastads&quality=low`);
    await p2.waitForFunction(() => window.__game, null, { timeout: 30000 });
    const daily = await waitFor(() => p2.$('.overlay.open.daily'), 8000);
    check('daily reward on opening the game (day 1: +3)', !!daily && (await p2.textContent('.daily .btn')).includes('+3'));
    await p2.click('.daily .btn'); await sleep(300);
    check('…credits 50 → 53', (await e2(() => window.__game.wallet.balance)) === 53);
    await p2.reload(); await p2.waitForFunction(() => window.__game, null, { timeout: 30000 }); await sleep(800);
    check('…not twice the same day, and the credits are kept', !(await p2.$('.overlay.open.daily')) && (await e2(() => window.__game.wallet.balance)) === 53);
    check('…tomorrow is day 2 (+4)', JSON.stringify(await e2(() => window.__game.wallet.daily(Date.now() + 864e5))) === '{"day":2,"amount":4}');
    await p2.click('.main-menu.open [aria-label="Dükkan"]'); await sleep(400);
    check('shop opens from the menu', !!(await p2.$('.shop.open')));
    await p2.click('.shop.open button:has-text("Video izle")');
    await waitFor(() => p2.$('.overlay.ad button:not([disabled])'), 6000); await p2.click('.overlay.ad button');
    await sleep(300);
    check('rewarded video: +3, then the next one in 3 hours', (await e2(() => window.__game.wallet.balance)) === 56 && (await p2.textContent('.shop.open .shop-body')).includes('Sonraki video'));
    check('credit packs are sold in the Android app (not on the web)', (await p2.textContent('.shop.open')).includes('Android uygulamasında'));
    check('not enough credits for ad-free mode (100) yet: its button is off', await e2(() => [...document.querySelectorAll('.shop.open .shop-item')].find((i) => i.textContent.includes('Reklamsız mod')).querySelector('button').disabled));
    await e2(() => { window.__game.wallet.add(150); window.__game.shop.render(); });
    await p2.click('.shop.open .shop-item:has-text("HD karakter") button'); await sleep(300);
    check('buying the HD character (150 credits): switched on', (await e2(() => window.__game.wallet.equipped('body'))) === 'hd' && (await e2(() => window.__game.wallet.balance)) === 56);
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
