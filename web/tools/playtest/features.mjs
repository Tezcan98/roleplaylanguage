/**
 * The player-requested features, each checked in a real browser:
 * character setup (language, girl → Meryem), 50 credits, grandma's advice rotation, free
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
  await page.click('.setup button[data-gender="girl"]');
  await page.fill('.setup .name-in', 'Deneme_1');
  await Promise.all([page.waitForNavigation({ timeout: 30000 }), page.click('.setup button:has-text("Kaydet")')]);
  await page.waitForFunction(() => window.__game, null, { timeout: 30000 });
  const profile = await page.textContent('.main-menu .profile-line');
  check('after setup the menu shows the profile', profile.includes('Meryem') && profile.includes('Español') && profile.includes('Deneme_1'), profile);
  check('no setup the second time', !(await page.$('.overlay.open.setup')));

  // --- girl: texts rewritten, look -----------------------------------------------------
  const texts = await ev(() => JSON.stringify(Object.values(window.__game.dialogue.dialogues).map((d) => d.nodes)));
  check('girl: dialogue texts say Meryem, not Ahmet', !/\bAhmet\b/.test(texts) && texts.includes('Meryem'));
  check('girl: the family says “kızım”', texts.includes('kızım') && !texts.includes('oğlum'));
  check('girl: Spanish meanings (and her name in them)', await ev(() => window.__game.glossProbe('Ahmet! Do your homework first!')).then((t) => t.includes('Meryem') && !t.includes('Do your')), await ev(() => window.__game.glossProbe('Ahmet! Do your homework first!')));

  // --- new game: credits, story --------------------------------------------------------
  await page.goto(`${server.url}/?debug&fakemic&fastclass&nointro&fresh&quality=low`);
  await page.waitForFunction(() => window.__game, null, { timeout: 30000 });
  await page.click('text=Hikayeye başla'); await sleep(1200);
  await ev(() => document.querySelector('.overlay.open .card .btn')?.click()); await sleep(500);
  check('a new game starts with 50 credits', (await ev(() => window.__game.wallet.balance)) === 50);

  // --- grandma (nine) ------------------------------------------------------------------
  const talkTo = async (id) => {
    await ev((npc) => { const g = window.__game; const n = g.cast.get(npc); g.player.position.set(n.position.x, 0, n.position.z + 0.8); }, id);
    await sleep(300);
    await ev((npc) => window.__game.dialogue.open(npc), id); await sleep(400);
  };
  const nodeSay = () => ev(() => window.__game.dialogue.node?.say ?? '');
  await talkTo('nine');
  check('grandma greets the first time', (await nodeSay()).includes('ninenim'));
  await drainUi(page);
  check('…then gives her first advice and checks it', await ev(() => !!window.__game.story.state?.flags?.['nasihat-selam'] || !!window.__game.dialogue.ctx.state.flags['nasihat-selam']));
  await talkTo('nine');
  const second = await nodeSay();
  check('next visit: a different piece of advice', second.includes('Yalan söyleme'), second);
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

  // --- square fence --------------------------------------------------------------------
  await ev(() => window.__game.travel.place('village', 'yardRoad', { force: true })); await sleep(1500);
  await drainUi(page); // first-visit card of the square
  // walk towards each side for a while: the player must reach the fence but never pass it
  let edge = 0;
  for (const key of ['ArrowRight', 'ArrowUp', 'ArrowLeft', 'ArrowDown']) {
    await ev(() => window.__game.player.position.set(11, 0, -1.5)); await sleep(150);
    await page.keyboard.down(key);
    for (let i = 0; i < 16; i++) { await sleep(250); edge = Math.max(edge, await ev(() => { const p = window.__game.player.position; return Math.max(Math.abs(p.x), Math.abs(p.z)); })); }
    await page.keyboard.up(key);
  }
  check('the square fence stops the player', edge > 15.5 && edge <= 16.7, `furthest ${edge.toFixed(2)} m from the centre (fence at 17)`);
  await ev(() => window.__game.travel.place('yard', 'houseDoor', { force: true })); await sleep(600);
  await drainUi(page);

  // --- school practice from the garden gate --------------------------------------------
  const questBefore = await ev(() => window.__game.story.quest?.id);
  await ev(() => { const g = window.__game; g.player.position.set(0, 0, 22.3); }); await sleep(400);
  const gateLabel = await ev(() => document.getElementById('act').textContent);
  check('garden gate offers school practice for 1 credit', gateLabel.includes('pratik'), gateLabel);
  await page.keyboard.press('e');
  await waitFor(() => page.$('.overlay.open .card .btn:has-text("Krediyle")'), 5000);
  await page.click('.overlay.open .card .btn:has-text("Krediyle")');
  await waitFor(() => page.$('.classroom.open'), 10000);
  check('practice: in the classroom, story paused', (await ev(() => window.__game.world.current.id)) === 'classroom' && (await ev(() => window.__game.story.paused)));
  for (let i = 0; i < 40 && !(await ev(() => window.__game.world.current.id === 'yard' && !window.__game.story.paused)); i++) { await drainUi(page); await sleep(800); }
  check('practice: back home afterwards, the day continues', (await ev(() => window.__game.world.current.id)) === 'yard' && (await ev(() => window.__game.story.quest?.id)) === questBefore);
  check('practice cost 1 credit', (await ev(() => window.__game.wallet.balance)) === 49);

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
