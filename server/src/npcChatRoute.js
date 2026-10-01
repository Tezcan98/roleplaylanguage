/**
 * HTTP route for NpcChat: POST /api/npc-chat (JSON), with CORS for the allowed origins
 * (the game on GitHub Pages calls this server from another domain).
 * @returns {boolean} whether the request was handled
 */
export function npcChatRoute(req, res, { chat, allowOrigin = () => true, clientIp = (r) => r.socket.remoteAddress }) {
  if (!req.url.startsWith('/api/npc-chat')) return false;
  const origin = req.headers.origin;
  const cors = origin && allowOrigin(origin)
    ? { 'Access-Control-Allow-Origin': origin, 'Access-Control-Allow-Methods': 'POST, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type', 'Access-Control-Max-Age': '600', Vary: 'Origin' }
    : {};
  const reply = (status, body) => { res.writeHead(status, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', ...cors }); res.end(JSON.stringify(body)); };
  if (origin && !allowOrigin(origin)) { reply(403, { error: 'origin' }); return true; }
  if (req.method === 'OPTIONS') { res.writeHead(204, cors); res.end(); return true; }
  if (req.method === 'GET') { reply(200, { enabled: chat.enabled }); return true; }
  if (req.method !== 'POST') { reply(405, { error: 'method' }); return true; }
  let raw = '';
  req.setEncoding('utf8');
  req.on('data', (d) => { raw += d; if (raw.length > 8192) { reply(413, { error: 'too large' }); req.destroy(); } });
  req.on('end', async () => {
    if (res.headersSent) return;
    let body;
    try { body = JSON.parse(raw); } catch { reply(400, { error: 'json' }); return; }
    const out = await chat.handle(body, clientIp(req));
    reply(out.status, out.body);
  });
  return true;
}
