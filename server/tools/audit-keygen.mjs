/**
 * Makes the operator's key pair for the safety log (src/AuditLog.js):
 *   node tools/audit-keygen.mjs <folder>
 * → <folder>/audit-public.pem  (goes to the server: AUDIT_PUBLIC_KEY)
 *   <folder>/audit-private.pem (stays with the operator, never on the server; without it the
 *                               log cannot be read, so keep a safe copy)
 */
import { generateKeyPairSync } from 'node:crypto';
import { writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const dir = process.argv[2];
if (!dir) { console.error('usage: node tools/audit-keygen.mjs <folder>'); process.exit(1); }
mkdirSync(dir, { recursive: true, mode: 0o700 });
const priv = join(dir, 'audit-private.pem'), pub = join(dir, 'audit-public.pem');
if (existsSync(priv)) { console.error(`${priv} already exists: not overwritten (the log written with it would become unreadable)`); process.exit(1); }
const { publicKey, privateKey } = generateKeyPairSync('rsa', { modulusLength: 3072 });
writeFileSync(pub, publicKey.export({ type: 'spki', format: 'pem' }), { mode: 0o644 });
writeFileSync(priv, privateKey.export({ type: 'pkcs8', format: 'pem' }), { mode: 0o600 });
console.log(`public key  → ${pub}\nprivate key → ${priv} (keep it safe, off the server)`);
