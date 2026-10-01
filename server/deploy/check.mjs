/**
 * Checks a deployed server from your computer, the way the GitHub Pages game connects:
 *   node deploy/check.mjs wss://meydan.ornek.com/ws/village
 * Joins with two test players, sends a speech bubble and leaves.
 */
import WebSocket from 'ws';

const url = process.argv[2];
if (!url) { console.error('usage: node deploy/check.mjs wss://host/ws/village'); process.exit(2); }
const health = url.replace(/^ws/, 'http').replace(/\/ws\/village$/, '/health');
const step = (ok, msg) => { console.log(`${ok ? 'PASS' : 'FAIL'}  ${msg}`); if (!ok) process.exit(1); };

const h = await fetch(health).then((r) => r.json()).catch((e) => ({ error: e.message }));
step(h.ok, `health ${health} → ${JSON.stringify(h)}`);

const open = (name) => new Promise((resolve, reject) => {
  const ws = new WebSocket(url, { origin: 'https://tezcan98.github.io' });
  const t = setTimeout(() => reject(new Error('timeout')), 8000);
  ws.on('error', reject);
  ws.on('unexpected-response', (_, r) => reject(new Error(`HTTP ${r.statusCode}`)));
  ws.on('open', () => ws.send(JSON.stringify({ type: 'hello', name, room: 'check' })));
  ws.on('message', (d) => { const m = JSON.parse(d); if (m.type === 'welcome') { clearTimeout(t); resolve({ ws, m }); } if (m.type === 'error') reject(new Error(m.message)); });
});
try {
  const a = await open('Kontrol');
  const b = await open('Kontrol');
  step(true, `two players joined as ${a.m.name} / ${b.m.name}`);
  const got = new Promise((r) => b.ws.on('message', (d) => { const m = JSON.parse(d); if (m.type === 'say') r(m.text); }));
  a.ws.send(JSON.stringify({ type: 'say', text: 'Merhaba!' }));
  step((await Promise.race([got, new Promise((r) => setTimeout(() => r(null), 3000))])) === 'Merhaba!', 'speech bubble relayed');
  a.ws.close(); b.ws.close();
  console.log('Sunucu hazır. assets/manifest.json → "villageServer": "' + url + '"');
} catch (e) {
  step(false, `connect ${url}: ${e.message}`);
}
