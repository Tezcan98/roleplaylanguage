/** Setup screen pictures of the four blocky player characters (assets/setup/<look>.png) from the game's own rig. */
import { writeFileSync } from 'node:fs';
import { startServer, openBrowser } from '../playtest/lib.mjs';
const server = await startServer(); const browser = await openBrowser();
const p = await (await browser.newContext()).newPage();
p.on('pageerror', (e) => console.error(e.message));
await p.goto(`${server.url}/tools/models/blocky.html`); await p.waitForFunction(() => window.ready, null, { timeout: 30000 });
for (const key of ['boy-modest', 'boy-strong', 'girl-covered', 'girl-open']) {
  const url = await p.evaluate((k) => window.render(k), key);
  writeFileSync(`assets/setup/${key}.png`, Buffer.from(url.split(',')[1], 'base64'));
}
await browser.close(); server.stop(); console.log('done');
