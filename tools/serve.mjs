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
import { VillageServer } from '../server/VillageServer.js';

// usage: node tools/serve.mjs [port] [dir]  (dir defaults to the repo root; `dist` serves the build)
const repo = fileURLToPath(new URL('..', import.meta.url));
const port = Number(process.argv[2] ?? 8080);
const root = process.argv[3] ? join(repo, process.argv[3]) : repo;
const TYPES = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg',
  '.webp': 'image/webp', '.glb': 'model/gltf-binary', '.onnx': 'application/octet-stream', '.svg': 'image/svg+xml', '.wav': 'audio/wav',
};

const http = createServer(async (req, res) => {
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
new VillageServer({ server: http }); // multiplayer village square on ws://…/ws/village
http.listen(port, () => console.log(`Yılmaz Ailesi → http://localhost:${port}`));
