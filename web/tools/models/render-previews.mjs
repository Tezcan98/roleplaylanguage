/** Shop pictures of the outfits (assets/shop/hd_<outfit>_<boy|girl|covered>.png) from the models. */
import { writeFileSync } from 'node:fs';
import { startServer, openBrowser } from '../playtest/lib.mjs';
const server = await startServer(); const browser = await openBrowser();
const p = await (await browser.newContext()).newPage();
await p.goto(`${server.url}/tools/models/preview.html`); await p.waitForFunction(() => window.ready, null, { timeout: 30000 });
// who: the picture's suffix; body: that character's everyday HD body (shop.js outfitModel); file: boy | girl
const WHO = [['boy', 'casual', 'boy', false], ['strong', 'curly', 'boy', false], ['girl', 'brown', 'girl', false], ['covered', 'casual', 'girl', true]];
for (const o of ['casual', 'suit', 'dress', 'aura']) for (const [who, body, file, covered] of WHO) {
  if ((o === 'suit' && file === 'girl') || (o === 'dress' && file === 'boy')) continue; // suits for boys, dresses for girls
  // 'aura': the everyday outfit standing in the golden light; 'dress': the everyday girl with a long skirt
  const url = await p.evaluate(([f, c, a, d]) => window.render(f, c, a, d), [`../../assets/models/hd_${o === 'suit' ? 'suit' : body}_${file}.glb`, covered, o === 'aura', o === 'dress']);
  writeFileSync(`assets/shop/hd_${o}_${who}.png`, Buffer.from(url.split(',')[1], 'base64'));
}
await browser.close(); server.stop(); console.log('done');
