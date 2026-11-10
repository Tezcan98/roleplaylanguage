#!/usr/bin/env node
/**
 * Sends a status-bar notification to every player who allowed them (Firebase Cloud Messaging,
 * topic "all": the app subscribes to it in web/src/main.js joinNews).
 *
 *   node tools/push.mjs "Title" "Message" [--dry]
 *
 * --dry only asks Firebase to validate the message (nothing is sent). The sender key is a
 * Firebase service account JSON (Firebase console → Project settings → Service accounts →
 * Generate new private key) kept OUTSIDE the repo: ~/AnadoluAilesi-imza/fcm-service-account.json
 * (or the path in FCM_KEY). Never commit it.
 */
import { readFileSync } from 'node:fs';
import { createSign } from 'node:crypto';
import { homedir } from 'node:os';
import { join } from 'node:path';

const args = process.argv.slice(2).filter((a) => !a.startsWith('--'));
const dry = process.argv.includes('--dry');
const [title, body] = args;
if (!title || !body) { console.error('usage: node tools/push.mjs "Title" "Message" [--dry]'); process.exit(1); }

const keyPath = process.env.FCM_KEY || join(homedir(), 'AnadoluAilesi-imza', 'fcm-service-account.json');
let key;
try { key = JSON.parse(readFileSync(keyPath, 'utf8')); } catch { console.error(`sender key not found: ${keyPath}`); process.exit(1); }

const b64 = (o) => Buffer.from(typeof o === 'string' ? o : JSON.stringify(o)).toString('base64url');

async function accessToken() {
  const now = Math.floor(Date.now() / 1000);
  const head = b64({ alg: 'RS256', typ: 'JWT' });
  const claim = b64({ iss: key.client_email, scope: 'https://www.googleapis.com/auth/firebase.messaging', aud: 'https://oauth2.googleapis.com/token', iat: now, exp: now + 3600 });
  const sig = createSign('RSA-SHA256').update(`${head}.${claim}`).sign(key.private_key, 'base64url');
  const r = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion: `${head}.${claim}.${sig}` }),
  });
  const j = await r.json();
  if (!j.access_token) throw new Error(`token: ${JSON.stringify(j)}`);
  return j.access_token;
}

const token = await accessToken();
const r = await fetch(`https://fcm.googleapis.com/v1/projects/${key.project_id}/messages:send`, {
  method: 'POST', headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
  body: JSON.stringify({ validate_only: dry, message: { topic: 'all', notification: { title, body }, android: { priority: 'HIGH', notification: { channel_id: 'fcm_fallback_notification_channel' } } } }),
});
const out = await r.text();
console.log(r.ok ? (dry ? 'valid (nothing sent)' : `sent: ${out}`) : `FAILED ${r.status}: ${out}`);
process.exit(r.ok ? 0 : 1);
