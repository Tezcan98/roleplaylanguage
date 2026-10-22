'use strict';
/**
 * Türk Ailem's mail sender, for the mail machine (mail.te-robotik.com.tr: Postfix + OpenDKIM). The
 * game server (server/src/Mailer.js) posts here over HTTPS; this hands the message to the local
 * Postfix (`sendmail`), which signs it with DKIM for sorexdigital.com (SPF / DKIM / DMARC are in DNS).
 *
 *   POST /anadolu-mail/send   Authorization: Bearer <MAIL_API_KEY>
 *     { to, subject, text, html?, replyTo?, fromName?, attachments?: [{ filename, contentType, content: base64 }] }
 *     → 200 { ok: true, id } · 400 bad request · 401 key · 413 too big · 429 too many · 502 Postfix refused
 *   GET  /anadolu-mail/health → 200 { ok: true }
 *
 * Env (/etc/anadolu-mail.env): MAIL_API_KEY (required), PORT (8095), FROM (bildirim@sorexdigital.com),
 * FROM_NAME (Türk Ailem), ALLOW_TO (a comma list of exact addresses / "@domain" suffixes; empty = anyone),
 * PER_HOUR (120 mails an hour in all), PER_RECIPIENT_HOUR (6), MAX_BYTES (25 MB), SENDMAIL (/usr/sbin/sendmail).
 * No dependencies: Node 18+.
 */
const http = require('http');
const crypto = require('crypto');
const { spawn } = require('child_process');

const env = process.env;
const KEY = env.MAIL_API_KEY || '';
const PORT = Number(env.PORT || 8095);
const FROM = env.FROM || 'bildirim@sorexdigital.com';
const FROM_NAME = env.FROM_NAME || 'Türk Ailem';
const ALLOW = (env.ALLOW_TO || '').split(',').map((s) => s.trim().toLowerCase()).filter(Boolean);
const PER_HOUR = Number(env.PER_HOUR || 120);
const PER_RECIPIENT = Number(env.PER_RECIPIENT_HOUR || 6);
const MAX_BYTES = Number(env.MAX_BYTES || 25 * 1024 * 1024);
const SENDMAIL = env.SENDMAIL || '/usr/sbin/sendmail';
const log = (...a) => console.log(new Date().toISOString(), ...a);
if (!KEY || KEY.length < 24) { console.error('MAIL_API_KEY (at least 24 characters) is required'); process.exit(1); }

const EMAIL = /^[^\s@<>",;]+@[^\s@<>",;]+\.[^\s@<>",;]+$/;
const clean = (s) => String(s ?? '').replace(/[\r\n]+/g, ' ').trim(); // header values: one line, no injection
const word = (s) => `=?UTF-8?B?${Buffer.from(String(s), 'utf8').toString('base64')}?=`;
const wrap = (b64) => b64.replace(/.{1,76}/g, '$&\r\n');
const allowed = (to) => !ALLOW.length || ALLOW.some((a) => (a.startsWith('@') ? to.endsWith(a) : to === a));

/** The hour's counts: all mails, and per recipient. */
const sent = []; // [time, to]
function room(to, now = Date.now()) {
  while (sent.length && now - sent[0][0] > 3600000) sent.shift();
  return sent.length < PER_HOUR && sent.filter((s) => s[1] === to).length < PER_RECIPIENT;
}

function build({ to, subject, text, html, replyTo, fromName, attachments }) {
  const id = `${crypto.randomBytes(12).toString('hex')}@${FROM.split('@')[1]}`;
  const head = [
    `From: ${word(clean(fromName) || FROM_NAME)} <${FROM}>`, `To: ${to}`, `Subject: ${word(clean(subject))}`,
    `Date: ${new Date().toUTCString()}`, `Message-ID: <${id}>`, 'MIME-Version: 1.0',
    ...(replyTo && EMAIL.test(replyTo) ? [`Reply-To: ${replyTo}`] : []),
  ];
  const body = (type, content) => `Content-Type: ${type}; charset=UTF-8\r\nContent-Transfer-Encoding: base64\r\n\r\n${wrap(Buffer.from(content, 'utf8').toString('base64'))}`;
  const alt = html
    ? (() => { const b = `alt_${crypto.randomBytes(8).toString('hex')}`; return { type: `multipart/alternative; boundary="${b}"`, content: `--${b}\r\n${body('text/plain', text)}--${b}\r\n${body('text/html', html)}--${b}--\r\n` }; })()
    : { type: 'text/plain; charset=UTF-8', content: null };
  let message;
  if (attachments?.length) {
    const b = `mix_${crypto.randomBytes(8).toString('hex')}`;
    const first = html ? `Content-Type: ${alt.type}\r\n\r\n${alt.content}` : body('text/plain', text);
    const files = attachments.map((a) => `--${b}\r\nContent-Type: ${clean(a.contentType) || 'application/octet-stream'}; name="${word(clean(a.filename))}"\r\nContent-Transfer-Encoding: base64\r\nContent-Disposition: attachment; filename="${word(clean(a.filename))}"\r\n\r\n${wrap(String(a.content))}`).join('');
    message = `${head.join('\r\n')}\r\nContent-Type: multipart/mixed; boundary="${b}"\r\n\r\n--${b}\r\n${first}${files}--${b}--\r\n`;
  } else if (html) message = `${head.join('\r\n')}\r\nContent-Type: ${alt.type}\r\n\r\n${alt.content}`;
  else message = `${head.join('\r\n')}\r\n${body('text/plain', text)}`;
  return { id, message };
}

function deliver(message, to) {
  return new Promise((resolve, reject) => {
    const p = spawn(SENDMAIL, ['-i', '-f', FROM, '--', to]); // the envelope from the message's own header: DKIM + SPF line up
    let err = '';
    p.stderr.on('data', (c) => { err += c; });
    p.on('error', reject);
    p.on('close', (code) => (code === 0 ? resolve() : reject(new Error(`sendmail ${code}: ${err.slice(0, 200)}`))));
    p.stdin.end(message);
  });
}

const json = (res, status, body) => { res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' }); res.end(JSON.stringify(body)); };
const sameKey = (given) => { const a = crypto.createHash('sha256').update(given).digest(), b = crypto.createHash('sha256').update(KEY).digest(); return crypto.timingSafeEqual(a, b); };

const server = http.createServer((req, res) => {
  if (req.method === 'GET' && req.url === '/anadolu-mail/health') return json(res, 200, { ok: true });
  if (req.method !== 'POST' || req.url !== '/anadolu-mail/send') return json(res, 404, { ok: false, error: 'not_found' });
  const auth = String(req.headers.authorization || '');
  if (!auth.startsWith('Bearer ') || !sameKey(auth.slice(7))) { log('refused: wrong key', req.headers['x-forwarded-for'] || ''); return json(res, 401, { ok: false, error: 'unauthorized' }); }
  const chunks = []; let size = 0, over = false;
  req.on('data', (c) => { size += c.length; if (size > MAX_BYTES) { over = true; req.destroy(); } else chunks.push(c); });
  req.on('close', () => { if (over && !res.writableEnded) json(res, 413, { ok: false, error: 'too_large' }); });
  req.on('end', async () => {
    if (over) return;
    let d;
    try { d = JSON.parse(Buffer.concat(chunks).toString('utf8')); } catch { return json(res, 400, { ok: false, error: 'json' }); }
    const to = clean(d.to).toLowerCase();
    if (!EMAIL.test(to) || !clean(d.subject) || typeof d.text !== 'string' || !d.text) return json(res, 400, { ok: false, error: 'fields' });
    if (!allowed(to)) return json(res, 400, { ok: false, error: 'recipient_not_allowed' });
    if (d.attachments && (!Array.isArray(d.attachments) || d.attachments.some((a) => !a || typeof a.content !== 'string' || !/^[A-Za-z0-9+/=\s]+$/.test(a.content) || !clean(a.filename)))) return json(res, 400, { ok: false, error: 'attachments' });
    if (!room(to)) return json(res, 429, { ok: false, error: 'too_many' });
    try {
      const { id, message } = build({ ...d, to });
      await deliver(message, to);
      sent.push([Date.now(), to]);
      log('sent', id, '→', to, `(${clean(d.subject).slice(0, 60)})`);
      json(res, 200, { ok: true, id });
    } catch (e) { log('failed', e.message); json(res, 502, { ok: false, error: 'mta' }); }
  });
});
server.listen(PORT, '127.0.0.1', () => log(`anadolu-mail on 127.0.0.1:${PORT}, from ${FROM}${ALLOW.length ? `, only to ${ALLOW.join(' ')}` : ''}`));
