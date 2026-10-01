/**
 * Shared helpers for the automated play-tests: start the game server, open a browser,
 * answer whatever UI is open (dialogues, cards, lessons, textbook, ads…), and fail with
 * a useful diagnosis when the story gets stuck.
 */
import { spawn } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import { createServer } from 'node:net';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

export const ROOT = fileURLToPath(new URL('../..', import.meta.url));
export const OUT = `${ROOT}playtest-results`;

export const log = (...a) => console.log(new Date().toISOString().slice(11, 19), ...a);
export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** Poll `fn` (async) until it returns a truthy value or the timeout passes; returns the last value. */
export async function waitFor(fn, timeout = 8000, every = 200) {
  const end = Date.now() + timeout;
  let v;
  while (Date.now() < end) { v = await fn(); if (v) return v; await sleep(every); }
  return v;
}

export function args() {
  const a = Object.fromEntries(process.argv.slice(2).map((x) => { const [k, v] = x.replace(/^--/, '').split('='); return [k, v ?? true]; }));
  return a;
}

async function freePort() {
  return new Promise((resolve) => { const s = createServer(); s.listen(0, () => { const { port } = s.address(); s.close(() => resolve(port)); }); });
}

/** Start tools/serve.mjs (game + village server) on a free port; `dir` = 'dist' serves the build. */
export async function startServer(dir) {
  const port = await freePort();
  const proc = spawn(process.execPath, ['tools/serve.mjs', String(port), ...(dir ? [dir] : [])], { cwd: ROOT, stdio: ['ignore', 'pipe', 'pipe'] });
  await new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error('server did not start')), 10000);
    proc.stdout.on('data', (d) => { if (String(d).includes('http://localhost')) { clearTimeout(t); resolve(); } });
    proc.on('exit', (c) => reject(new Error(`server exited (${c})`)));
  });
  return { url: `http://localhost:${port}`, stop: () => proc.kill() };
}

/** Start the production village server (server/src/index.mjs) on its own port, as on a real host. */
export async function startVillageServer() {
  const port = await freePort();
  const proc = spawn(process.execPath, ['../server/src/index.mjs', String(port)], { cwd: ROOT, stdio: ['ignore', 'pipe', 'pipe'], env: { ...process.env, HOST: '127.0.0.1' } });
  await new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error('village server did not start')), 10000);
    proc.stdout.on('data', (d) => { if (String(d).includes('village server')) { clearTimeout(t); resolve(); } });
    proc.on('exit', (c) => reject(new Error(`village server exited (${c})`)));
  });
  return { url: `ws://127.0.0.1:${port}/ws/village`, stop: () => proc.kill() };
}

/**
 * Browser for the tests. Default: Playwright's bundled Chromium (CI). PLAYTEST_CHANNEL=chrome
 * uses the local Chrome with the GPU (faster locally).
 */
export async function openBrowser(extraArgs = []) {
  const channel = process.env.PLAYTEST_CHANNEL;
  return chromium.launch({
    ...(channel ? { channel } : {}),
    headless: !process.env.PLAYTEST_HEADED,
    args: ['--ignore-gpu-blocklist', '--enable-unsafe-swiftshader', '--autoplay-policy=no-user-gesture-required', ...extraArgs],
  });
}

/** Collects uncaught exceptions and console errors (a play-test fails on any of them). */
export function watchErrors(page, tag = '') {
  const errors = [];
  page.on('pageerror', (e) => errors.push(`${tag}pageerror: ${e.message}`));
  page.on('console', (m) => {
    if (m.type() !== 'error') return;
    const t = m.text();
    if (/Failed to load resource|net::ERR_|GL Driver/.test(t)) return; // optional assets / offline CDNs
    errors.push(`${tag}console: ${t}`);
  });
  return errors;
}

export async function screenshot(page, name) {
  mkdirSync(OUT, { recursive: true });
  const path = `${OUT}/${name}.png`;
  await page.screenshot({ path }).catch(() => {});
  return path;
}

/** Everything the game shows right now that a test needs to decide what to do. */
export const snapshot = (page) => page.evaluate(() => {
  const g = window.__game;
  const q = g.story.quest;
  const d = g.dialogue;
  return {
    chapter: g.story.chapter?.id, quest: q?.id ?? null, location: g.world.current.id, time: g.time.label, day: g.time.dayName,
    mode: g.modes.top, talking: d.talking, node: d.node ? { ask: d.node.ask ?? 'choice', say: d.node.say } : null,
    action: document.getElementById('act')?.hidden ? null : document.getElementById('act')?.textContent,
    overlays: [...document.querySelectorAll('.overlay.open')].map((o) => o.querySelector('.ctitle,h2')?.textContent ?? o.className),
    words: g.vocab.size,
  };
});

/**
 * Answer whatever UI is open until the game is back to free play. Picks correct answers
 * (options without `wrong`), builds sentences, "speaks" (the test recognizer hears the
 * expected answer), finishes lessons and the textbook, pays for lessons, skips name prompts.
 * @returns {'outro' | undefined}
 */
export async function drainUi(page, { pace = 1 } = {}) {
  const ev = (fn, arg) => page.evaluate(fn, arg);
  const wait = (ms) => sleep(ms * pace);
  for (let k = 0; k < 150; k++) {
    if (await page.$('.overlay.open.ad')) { await wait(1000); await ev(() => { const b = document.querySelector('.overlay.open.ad button'); if (b && !b.disabled) b.click(); }); continue; }
    if (await ev(() => !!document.querySelector('.overlay.open input'))) { await ev(() => [...document.querySelectorAll('.overlay.open .btn')].find((b) => b.textContent === 'Tek başıma gez')?.click()); await wait(400); continue; }
    const gate = await ev(() => [...document.querySelectorAll('.overlay.open .card .btn')].map((b) => [b.textContent, b.disabled]));
    if (gate.some(([t]) => t.includes('Reklam izle'))) {
      const pay = gate.find(([t]) => t.startsWith('Krediyle'));
      await ev((p) => [...document.querySelectorAll('.overlay.open .card .btn')].find((b) => b.textContent.includes(p ? 'Krediyle' : 'Reklam'))?.click(), !pay[1]);
      await wait(800); continue;
    }
    if (await page.$('.classroom.open')) {
      await ev(() => { const f = [...document.querySelectorAll('.classroom .btn')].find((b) => b.textContent === 'Dersi bitir'); if (f) f.click(); else document.querySelector('.classroom .mic:not(.rec)')?.click(); });
      await wait(1500); continue;
    }
    if (await page.$('.overlay.open .textbook')) {
      await ev(() => {
        const tb = window.__game.textbook;
        if (!tb.unit) { if (window.__game.story.state.flags['homework-u1']) tb.close(); else document.querySelector('.unit:not([disabled])').click(); return; }
        const p = tb.unit.pages[tb.page], next = document.querySelector('.tb-nav .chipbtn.primary');
        if (next && !next.disabled && !next.hidden) { next.click(); return; }
        if (p.activity === 'order') { for (const w of p.answer.split(' ')) [...document.querySelectorAll('.tb-body .tile:not([disabled])')].find((t) => t.textContent === w)?.click(); return; }
        if (p.activity === 'speak') { document.querySelector('.tb-body .mic')?.click(); return; }
        const i = Math.max(0, (p.options ?? []).findIndex((o) => !o.wrong));
        document.querySelectorAll('.tb-body .choice')[i]?.click();
      });
      await wait(900); continue;
    }
    if (await page.$('.overlay.open.intro')) { await ev(() => document.querySelector('.overlay.open.intro .linkbtn')?.click()); await wait(300); continue; }
    const card = await ev(() => document.querySelector('.overlay.open .ctitle')?.textContent);
    if (card) {
      log('  card:', card);
      if (card === 'Devam edecek…') return 'outro';
      await ev(() => document.querySelector('.overlay.open .card .btn')?.click()); await wait(500); continue;
    }
    if (await page.$('.overlay.open')) { await ev(() => document.querySelector('.overlay.open .iconbtn, .overlay.open .btn')?.click()); await wait(300); continue; }
    const node = await ev(() => { const d = window.__game.dialogue; return d.talking ? { ask: d.node?.ask ?? 'choice', answer: d.node?.answer } : null; });
    if (!node) return undefined;
    if (node.ask === 'order') {
      await ev((ws) => { for (const w of ws) [...document.querySelectorAll('#dlg .tiles .tile:not([disabled])')].find((t) => t.textContent === w)?.click(); }, node.answer.split(' '));
      await wait(900);
    } else if (node.ask === 'speak') {
      await ev(() => document.querySelector('#dlg .mic')?.click());
      await wait(1300);
    } else {
      await ev(() => { const opts = window.__game.dialogue.node?.options ?? []; const i = Math.max(0, opts.findIndex((o) => !o.wrong)); document.querySelectorAll('#dlg .choice')[i]?.click(); });
      await wait(node.ask === 'listen' ? 1700 : 300);
    }
  }
  throw new Error('UI did not settle after 150 steps (a dialogue or overlay loops)');
}
