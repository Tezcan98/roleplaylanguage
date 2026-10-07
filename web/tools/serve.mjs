/**
 * Local dev server. Sends COOP/COEP headers so the page is cross-origin isolated,
 * which lets the Piper TTS worker run ONNX with several threads (much faster speech),
 * and hosts the multiplayer village square WebSocket at /ws/village.
 * Usage: node tools/serve.mjs [port] [dir]
 */
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';
import { VillageServer } from '../../server/src/VillageServer.js';
import { NpcChat } from '../../server/src/NpcChat.js';
import { npcChatRoute } from '../../server/src/npcChatRoute.js';
import { Tts } from '../../server/src/Tts.js';

// NPC chat: real Gemini with GEMINI_API_KEY, otherwise canned answers so the UI can be tried and tested
// Turkish speech: PIPER_DIR=<piper folder> npm start (otherwise the game falls back to the browser)
const tts = new Tts({ piperDir: process.env.PIPER_DIR, cacheDir: process.env.TTS_CACHE ?? '/tmp/yilmaz-tts', log: () => {} });
const chat = new NpcChat({ apiKey: process.env.GEMINI_API_KEY, fake: !process.env.GEMINI_API_KEY, perMinute: 60 });

// usage: node tools/serve.mjs [port] [dir]  (dir defaults to web/; `dist` serves the build)
const repo = fileURLToPath(new URL('..', import.meta.url));
const port = Number(process.argv[2] ?? 8080);
const root = process.argv[3] ? join(repo, process.argv[3]) : repo;
const TYPES = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg',
  '.webp': 'image/webp', '.glb': 'model/gltf-binary', '.onnx': 'application/octet-stream', '.svg': 'image/svg+xml', '.wav': 'audio/wav',
};

const http = createServer(async (req, res) => {
  if (npcChatRoute(req, res, { chat })) return;
  if (req.url.startsWith('/api/tts')) {
    const u = new URL(req.url, 'http://x');
    const r = await tts.handle(u.searchParams.get('v'), u.searchParams.get('t'), req.socket.remoteAddress, u.searchParams.get('f') ?? undefined);
    res.writeHead(r.status, { 'Content-Type': r.status === 200 ? 'audio/wav' : 'application/json' });
    return res.end(r.status === 200 ? r.body : JSON.stringify({ error: r.error }));
  }
  if (req.url === '/health') { // same as the production server: players per room for the menu
    res.writeHead(200, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
    return res.end(JSON.stringify({ ok: true, ...village.stats() }));
  }
  const path = normalize(decodeURIComponent(new URL(req.url, 'http://x').pathname)).replace(/^(\.\.[/\\])+/, '');
  let file = join(root, path);
  try {
    if ((await stat(file)).isDirectory()) file = join(file, 'index.html');
    const body = await readFile(file);
    res.writeHead(200, {
      'Content-Type': TYPES[extname(file)] ?? 'application/octet-stream',
      'Cache-Control': 'no-cache',
      'Cross-Origin-Opener-Policy': 'same-origin',
      'Cross-Origin-Embedder-Policy': 'credentialless',
    });
    res.end(body);
  } catch {
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('Not found');
  }
});
const village = new VillageServer({ server: http }); // multiplayer village square on ws://…/ws/village
http.listen(port, () => console.log(`Anadolu Ailesi → http://localhost:${port}`));
