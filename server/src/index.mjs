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
 *   TURN_PUBLIC_IP    voice calls across networks: run the built-in TURN relay on this public IPv4
 *                     (UDP 3478 + 49160-49260; TURN_HOST = name in the turn: URL, default the IP)
 *   TURN_SECRET, TURN_URLS  …or use an external coturn: its static-auth-secret and turn: URLs (comma separated)
 *   PIPER_DIR, TTS_CACHE  Turkish speech: Piper binary + voices folder, and where generated lines are kept
 *                     (voices: tr_TR-fahrettin-medium, tr_TR-fettah-medium and tr_TR-dfki-medium — women speak with dfki)
 *   MODERATION        decision model for public bubbles: systemone (Jev / Laya) | gemini | off
 *                     (default: systemone when TYPESAFE_API_KEY or MODERATION_URL is set, else off —
 *                     the word list and the Turkish-only check always run)
 *   MODERATION_URL    System 1 server, default https://api.typesafe.ai (Jev); a self-hosted Laya:
 *                     `pip install "laya[serve]" && LAYA_MODELS=multilingual laya-serve` → http://127.0.0.1:8000
 *   TYPESAFE_API_KEY / MODERATION_KEY  Jev key (Laya needs none) · MODERATION_MODEL e.g. multilingual
 *   MODERATION_LOG    held-back bubbles (JSON lines), default /tmp/yilmaz-moderation.log
 *   AUDIT_PUBLIC_KEY  the operator's public key (.pem, tools/audit-keygen.mjs): turns on the encrypted
 *                     safety log of square bubbles and character chat (AuditLog.js; read it with tools/audit-read.mjs)
 *   AUDIT_DIR, AUDIT_DAYS  where the day files go (default /var/lib/yilmaz-village/audit) and how long they stay (90)
 *   MODERATION_TURKISH_ONLY=0  allow other languages · MODERATION_FAIL_CLOSED=1  hold back everything while the model is down
 *   CHESS_SCORES      file for İsmail Dede's chess score board, default /tmp/yilmaz-chess-scores.json
 *   GEMINI_API_KEY    enables free conversation with village characters (POST /api/npc-chat) and the women's voices
 *   TTS_GEMINI_PER_DAY, GEMINI_TTS_MODEL  new women's lines per day (default 1500); TTS model (default gemini-3.8-flash-tts, then 2.5)
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
import { TurnRelay } from './TurnRelay.js';
import { Tts } from './Tts.js';
import { AuditLog } from './AuditLog.js';
import { ChessScoreFile } from './ChessScoreFile.js';
import { Moderator } from './Moderator.js';

const env = process.env;
const port = Number(process.argv[2] ?? env.PORT ?? 8090);
const host = env.HOST ?? '0.0.0.0';
const origins = parseOrigins(env.ALLOWED_ORIGINS ?? DEFAULT_ORIGINS);
// the safety log: square bubbles and character chat, encrypted for the operator, kept AUDIT_DAYS (90) days (AuditLog.js)
const audit = AuditLog.fromEnv(env);
const clientIp = (req) => (env.TRUST_PROXY === '1' && String(req.headers['x-forwarded-for'] ?? '').split(',')[0].trim()) || req.socket.remoteAddress;
const started = Date.now();
const tts = new Tts({
  piperDir: env.PIPER_DIR, cacheDir: env.TTS_CACHE ?? '/tmp/yilmaz-tts',
  // women and girls speak with Gemini's voices (Piper has no Turkish woman's voice)
  gemini: env.GEMINI_API_KEY ? { key: env.GEMINI_API_KEY, perDay: Number(env.TTS_GEMINI_PER_DAY ?? 1500), ...(env.GEMINI_TTS_MODEL ? { models: [env.GEMINI_TTS_MODEL] } : {}) } : null,
});
const chat = new NpcChat({
  apiKey: env.GEMINI_API_KEY, model: env.GEMINI_MODEL || undefined,
  perMinute: Number(env.NPC_CHAT_PER_MINUTE ?? 8), perDay: Number(env.NPC_CHAT_PER_DAY ?? 150), globalPerDay: Number(env.NPC_CHAT_GLOBAL_PER_DAY ?? 1200),
});

const http = createServer((req, res) => {
  if (req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*', 'Cache-Control': 'no-store' });
    return res.end(JSON.stringify({ ok: true, uptime: Math.round((Date.now() - started) / 1000), npcChat: chat.enabled, tts: tts.enabled, ...village.stats() }));
  }
  if (npcChatRoute(req, res, { chat, allowOrigin: (o) => originAllowed(o, origins), clientIp, audit })) return;
  if (req.url.startsWith('/api/tts')) {
    const u = new URL(req.url, 'http://x');
    const origin = req.headers.origin;
    const cors = origin && originAllowed(origin, origins) ? { 'Access-Control-Allow-Origin': origin, Vary: 'Origin' } : {};
    tts.handle(u.searchParams.get('v'), u.searchParams.get('t'), clientIp(req), u.searchParams.get('f') ?? undefined).then((r) => {
      if (r.status !== 200) { res.writeHead(r.status, { 'Content-Type': 'application/json', ...cors }); return res.end(JSON.stringify({ error: r.error })); }
      res.writeHead(200, { 'Content-Type': 'audio/wav', 'Content-Length': r.body.length, 'Cache-Control': 'public, max-age=31536000, immutable', ...cors });
      res.end(r.body);
    });
    return;
  }
  res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' });
  res.end('Anadolu Ailesi köy meydanı sunucusu — WebSocket: /ws/village, durum: /health\n');
});

const turnHost = env.TURN_HOST || env.TURN_PUBLIC_IP;
const turn = env.TURN_PUBLIC_IP
  ? new TurnRelay({ publicIp: env.TURN_PUBLIC_IP, urls: [`turn:${turnHost}:3478?transport=udp`], allowPrivate: env.TURN_ALLOW_PRIVATE === '1' })
  : env.TURN_SECRET ? { secret: env.TURN_SECRET, urls: String(env.TURN_URLS ?? '').split(',').map((u) => u.trim()).filter(Boolean) } : null;
// public bubbles: word list + language check, and a decision model when configured (Jev / Laya / Gemini)
const modProvider = env.MODERATION ?? (env.TYPESAFE_API_KEY || env.MODERATION_URL ? 'systemone' : 'off');
const moderator = new Moderator({
  provider: modProvider,
  url: env.MODERATION_URL ?? (modProvider === 'systemone' ? 'https://api.typesafe.ai' : ''),
  apiKey: modProvider === 'gemini' ? env.GEMINI_API_KEY : (env.MODERATION_KEY ?? env.TYPESAFE_API_KEY ?? ''),
  model: env.MODERATION_MODEL ?? '',
  turkishOnly: env.MODERATION_TURKISH_ONLY !== '0',
  failClosed: env.MODERATION_FAIL_CLOSED === '1',
  logFile: env.MODERATION_LOG ?? '/tmp/yilmaz-moderation.log',
});
const chessScores = new ChessScoreFile(env.CHESS_SCORES ?? '/tmp/yilmaz-chess-scores.json');
const village = new VillageServer({ server: http, allowOrigin: (o) => originAllowed(o, origins), maxPerIp: Number(env.MAX_PER_IP ?? 8), clientIp, turn, chessScores: chessScores.load(), onChessScore: () => chessScores.save(), moderator, audit });
http.listen(port, host, () => console.log(`village server → ws://${host}:${port}/ws/village  (origins: ${origins.join(' ')}; npc chat ${chat.enabled ? 'on' : 'off'}; moderation ${moderator.provider}; safety log ${audit ? `on (${audit.days} days)` : 'off'}; turn ${village.turn ? 'on' : 'off'})`));

for (const sig of ['SIGINT', 'SIGTERM']) {
  process.on(sig, () => {
    console.log(`[village] ${sig}, closing`);
    village.close();
    turn?.stop?.();
    http.close(() => process.exit(0));
    setTimeout(() => process.exit(0), 3000).unref();
  });
}
