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
 *   AUDIT_VOICE_HOURS  how long the voice pieces (calls, talking zones) stay in that folder (default 48)
 *   MODERATION_TURKISH_ONLY=0  allow other languages · MODERATION_FAIL_CLOSED=1  hold back everything while the model is down
 *   CHESS_SCORES      file for İsmail Dede's chess score board, default /tmp/yilmaz-chess-scores.json
 *   GEMINI_API_KEY    enables free conversation with village characters (POST /api/npc-chat) and the women's voices
 *   TTS_GEMINI_PER_DAY, GEMINI_TTS_MODEL  new women's lines per day (default 1500); TTS model (default gemini-3.8-flash-tts, then 2.5)
 *   GEMINI_MODEL      default gemini-flash-latest
 *   NPC_CHAT_PER_MINUTE / NPC_CHAT_PER_DAY (per IP, default 8 / 150), NPC_CHAT_GLOBAL_PER_DAY (default 1200)
 *   AD_STATS_KEY, AD_STATS_DIR  the live ad numbers page (GET /api/ad-stats?key=…) and where its day files go (AdStats.js)
 *   FEEDBACK_DIR, FEEDBACK_KEY (default AD_STATS_KEY), FEEDBACK_MODEL  the players' feedback, graded by Gemini for credits (Feedback.js)
 *   REPORTS_DIR, REPORT_KEY (default AD_STATS_KEY), REPORT_MODEL  player reports ("Şikayet et"): the reported player's last
 *                     ten minutes (bubbles + voice) go to Gemini; the operator decides on a ban from the mail (Reports.js)
 *   PUBLIC_URL        this server's https address for the links in those mails, e.g. https://sehem2.com.tr
 *   MAIL_API_URL, MAIL_API_KEY, REPORT_MAIL_TO  the mail API on the SMTP machine and the operator's address (Mailer.js; TODO)
 *
 * Endpoints: ws(s)://host/ws/village · GET /health · GET /health?name=&pid= (is the username free) · POST /api/npc-chat
 *            · POST /api/ad-event · GET /api/ad-stats?key= · POST /api/feedback · GET /api/feedback-list?key=
 *            · GET /api/reports?key= · GET /api/report-action?id=&key=&do=ban7|ban|dismiss|unban
 */
import { createServer } from 'node:http';
import { dirname, join } from 'node:path';
import { NameRegistry } from './NameRegistry.js';
import { VillageServer } from './VillageServer.js';
import { DEFAULT_ORIGINS, parseOrigins, originAllowed } from './origins.js';
import { NpcChat } from './NpcChat.js';
import { npcChatRoute } from './npcChatRoute.js';
import { TurnRelay } from './TurnRelay.js';
import { Tts } from './Tts.js';
import { AuditLog } from './AuditLog.js';
import { ChessScoreFile } from './ChessScoreFile.js';
import { Moderator } from './Moderator.js';
import { AdStats } from './AdStats.js';
import { Feedback } from './Feedback.js';
import { Reports } from './Reports.js';
import { Mailer } from './Mailer.js';

const env = process.env;
const port = Number(process.argv[2] ?? env.PORT ?? 8090);
const host = env.HOST ?? '0.0.0.0';
const origins = parseOrigins(env.ALLOWED_ORIGINS ?? DEFAULT_ORIGINS);
// the safety log: square bubbles and character chat, encrypted for the operator, kept AUDIT_DAYS (90) days (AuditLog.js)
const audit = AuditLog.fromEnv(env);
const voiceAudit = AuditLog.voiceFromEnv(env); // voice in calls and talking zones: the same key, kept AUDIT_VOICE_HOURS (48) hours
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

// live ad numbers from the app (AdMob's own come a day or two late)
const adStats = new AdStats({ dir: env.AD_STATS_DIR || (env.CHESS_SCORES ? join(dirname(env.CHESS_SCORES), 'ads') : null), key: env.AD_STATS_KEY ?? '' });

// what the players think of the game: once a day, credits for a real opinion
const feedback = new Feedback({
  apiKey: env.GEMINI_API_KEY ?? '', model: env.FEEDBACK_MODEL || undefined, key: env.FEEDBACK_KEY || env.AD_STATS_KEY || '',
  dir: env.FEEDBACK_DIR || (env.CHESS_SCORES ? join(dirname(env.CHESS_SCORES), 'feedback') : null),
});

// player reports: Gemini listens to the reported player's last ten minutes, the operator decides from the mail
const reports = new Reports({
  apiKey: env.GEMINI_API_KEY ?? '', model: env.REPORT_MODEL || undefined, key: env.REPORT_KEY || env.AD_STATS_KEY || '',
  dir: env.REPORTS_DIR || (env.CHESS_SCORES ? join(dirname(env.CHESS_SCORES), 'reports') : null),
  publicUrl: env.PUBLIC_URL ?? '', mailer: Mailer.fromEnv(env), onBan: (ban) => village.kick(ban),
});

const http = createServer((req, res) => {
  if (adStats.route(req, res, { clientIp })) return;
  if (reports.route(req, res)) return;
  if (feedback.route(req, res, { allowOrigin: (o) => originAllowed(o, origins), clientIp })) return;
  if (req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*', 'Cache-Control': 'no-store' });
    return res.end(JSON.stringify({ ok: true, uptime: Math.round((Date.now() - started) / 1000), npcChat: chat.enabled, tts: tts.enabled, ...village.stats() }));
  }
  if (req.url.startsWith('/health?name=')) { // the username box asks before it saves: free (or this device's own) or taken (on /health: the proxy passes it already)
    const u = new URL(req.url, 'http://x'), origin = req.headers.origin;
    const cors = origin && originAllowed(origin, origins) ? { 'Access-Control-Allow-Origin': origin, Vary: 'Origin' } : {};
    const n = String(u.searchParams.get('name') ?? '').trim();
    const ok = /^[\p{L}\p{N}_ .-]{2,16}$/u.test(n) && names.check(n, u.searchParams.get('pid') ?? '') === 'ok';
    res.writeHead(200, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', ...cors });
    return res.end(JSON.stringify({ ok }));
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
  res.end('Türk Ailem köy meydanı sunucusu — WebSocket: /ws/village, durum: /health\n');
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
const names = new NameRegistry(env.USERNAMES || (env.CHESS_SCORES ? join(dirname(env.CHESS_SCORES), 'usernames.json') : null)).load(); // next to the chess scores on the real server; without them (tests, a quick local run) only in memory
const village = new VillageServer({ server: http, allowOrigin: (o) => originAllowed(o, origins), maxPerIp: Number(env.MAX_PER_IP ?? 8), clientIp, turn, chessScores: chessScores.load(), onChessScore: () => chessScores.save(), moderator, audit, voiceAudit, names, reports });
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
