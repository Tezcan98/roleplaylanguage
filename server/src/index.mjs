/**
 * Stand-alone village server for production (your own server behind Caddy/nginx for HTTPS).
 *
 *   PORT=8090 HOST=127.0.0.1 node src/index.mjs
 *
 * Environment (all optional):
 *   PORT              default 8090
 *   HOST              default 0.0.0.0 (use 127.0.0.1 when a reverse proxy runs on the same machine)
 *   ALLOWED_ORIGINS   comma separated; `*` allows all. A trailing `:*` allows any port.
 *                     default: the GitHub Pages site, the Android app and localhost
 *   MAX_PER_IP        simultaneous connections per IP, default 8
 *   TRUST_PROXY       1 → read the client IP from X-Forwarded-For (set it behind Caddy/nginx)
 *   GEMINI_API_KEY    enables free conversation with village characters (POST /api/npc-chat)
 *   GEMINI_MODEL      default gemini-flash-latest
 *   NPC_CHAT_PER_MINUTE / NPC_CHAT_PER_DAY (per IP, default 8 / 150), NPC_CHAT_GLOBAL_PER_DAY (default 1200)
 *
 * Endpoints: ws(s)://host/ws/village · GET /health · POST /api/npc-chat
 */
import { createServer } from 'node:http';
import { VillageServer } from './VillageServer.js';
import { DEFAULT_ORIGINS, parseOrigins, originAllowed } from './origins.js';
import { NpcChat } from './NpcChat.js';
import { npcChatRoute } from './npcChatRoute.js';

const env = process.env;
const port = Number(process.argv[2] ?? env.PORT ?? 8090);
const host = env.HOST ?? '0.0.0.0';
const origins = parseOrigins(env.ALLOWED_ORIGINS ?? DEFAULT_ORIGINS);
const clientIp = (req) => (env.TRUST_PROXY === '1' && String(req.headers['x-forwarded-for'] ?? '').split(',')[0].trim()) || req.socket.remoteAddress;
const started = Date.now();
const chat = new NpcChat({
  apiKey: env.GEMINI_API_KEY, model: env.GEMINI_MODEL || undefined,
  perMinute: Number(env.NPC_CHAT_PER_MINUTE ?? 8), perDay: Number(env.NPC_CHAT_PER_DAY ?? 150), globalPerDay: Number(env.NPC_CHAT_GLOBAL_PER_DAY ?? 1200),
});

const http = createServer((req, res) => {
  if (req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*', 'Cache-Control': 'no-store' });
    return res.end(JSON.stringify({ ok: true, uptime: Math.round((Date.now() - started) / 1000), npcChat: chat.enabled, ...village.stats() }));
  }
  if (npcChatRoute(req, res, { chat, allowOrigin: (o) => originAllowed(o, origins), clientIp })) return;
  res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' });
  res.end('Yılmaz Ailesi köy meydanı sunucusu — WebSocket: /ws/village, durum: /health\n');
});

const village = new VillageServer({ server: http, allowOrigin: (o) => originAllowed(o, origins), maxPerIp: Number(env.MAX_PER_IP ?? 8), clientIp });
http.listen(port, host, () => console.log(`village server → ws://${host}:${port}/ws/village  (origins: ${origins.join(' ')}; npc chat ${chat.enabled ? 'on' : 'off'})`));

for (const sig of ['SIGINT', 'SIGTERM']) {
  process.on(sig, () => {
    console.log(`[village] ${sig}, closing`);
    village.close();
    http.close(() => process.exit(0));
    setTimeout(() => process.exit(0), 3000).unref();
  });
}
