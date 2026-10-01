/**
 * Stand-alone multiplayer server (for hosting the game statically, e.g. GitHub Pages,
 * with the server elsewhere). Usage: node server/index.mjs [port]
 * Then set "villageServer": "wss://your-host/ws/village" in assets/manifest.json.
 */
import { createServer } from 'node:http';
import { VillageServer } from './VillageServer.js';

const port = Number(process.argv[2] ?? process.env.PORT ?? 8090);
const http = createServer((req, res) => { res.writeHead(200, { 'Content-Type': 'text/plain' }); res.end('Yılmaz Ailesi village server'); });
new VillageServer({ server: http });
http.listen(port, () => console.log(`village server → ws://localhost:${port}/ws/village`));
