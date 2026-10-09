/** The safety log: written encrypted with the operator's public key, read only with the private key, 90 days. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { generateKeyPairSync, createDecipheriv, privateDecrypt, constants } from 'node:crypto';
import { mkdtempSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { AuditLog } from '../src/AuditLog.js';

const keys = () => generateKeyPairSync('rsa', { modulusLength: 2048 });
/** What tools/audit-read.mjs does: the key line above each record opens it. */
function read(file, privateKey) {
  let key = null; const out = [];
  for (const line of readFileSync(file, 'utf8').trim().split('\n')) {
    const o = JSON.parse(line);
    if (o.key) { key = privateDecrypt({ key: privateKey, padding: constants.RSA_PKCS1_OAEP_PADDING, oaepHash: 'sha256' }, Buffer.from(o.key, 'base64')); continue; }
    const d = createDecipheriv('aes-256-gcm', key, Buffer.from(o.iv, 'base64')); d.setAuthTag(Buffer.from(o.tag, 'base64'));
    out.push(JSON.parse(Buffer.concat([d.update(Buffer.from(o.data, 'base64')), d.final()]).toString('utf8')));
  }
  return out;
}

test('records are encrypted: the text is not in the file, the private key opens them', () => {
  const { publicKey, privateKey } = keys(), dir = mkdtempSync(join(tmpdir(), 'audit-'));
  const log = new AuditLog({ dir, publicKey: publicKey.export({ type: 'spki', format: 'pem' }), now: () => new Date('2026-10-10T12:00:00Z'), log: () => {} });
  log.write({ kind: 'say', room: 'ankara', name: 'Ali', pid: 'abcdefgh12', gid: 'g123456', ip: '1.2.3.4', text: 'Merhaba arkadaşlar', shown: true });
  log.write({ kind: 'npc', npc: 'anne', name: 'Ali', text: 'Bugün ne yemek var?', reply: 'Mercimek çorbası.' });
  log.close();
  const file = join(dir, 'audit-2026-10-10.log'), raw = readFileSync(file, 'utf8');
  assert.ok(!raw.includes('Merhaba') && !raw.includes('Ali') && !raw.includes('1.2.3.4'), 'nothing readable on the server');
  const r = read(file, privateKey);
  assert.equal(r.length, 2);
  assert.equal(r[0].text, 'Merhaba arkadaşlar'); assert.equal(r[0].gid, 'g123456'); assert.equal(r[1].reply, 'Mercimek çorbası.');
});

test('a restarted server starts a new key line; both parts still open', () => {
  const { publicKey, privateKey } = keys(), dir = mkdtempSync(join(tmpdir(), 'audit-')), pem = publicKey.export({ type: 'spki', format: 'pem' });
  const now = () => new Date('2026-10-10T12:00:00Z');
  const a = new AuditLog({ dir, publicKey: pem, now, log: () => {} }); a.write({ kind: 'say', text: 'bir' }); a.close();
  const b = new AuditLog({ dir, publicKey: pem, now, log: () => {} }); b.write({ kind: 'say', text: 'iki' }); b.close();
  assert.deepEqual(read(join(dir, 'audit-2026-10-10.log'), privateKey).map((x) => x.text), ['bir', 'iki']);
});

test('a changed record does not open (GCM tag)', () => {
  const { publicKey, privateKey } = keys(), dir = mkdtempSync(join(tmpdir(), 'audit-'));
  const log = new AuditLog({ dir, publicKey: publicKey.export({ type: 'spki', format: 'pem' }), now: () => new Date('2026-10-10T12:00:00Z'), log: () => {} });
  log.write({ kind: 'say', text: 'gerçek' }); log.close();
  const file = join(dir, 'audit-2026-10-10.log'), lines = readFileSync(file, 'utf8').trim().split('\n');
  const rec = JSON.parse(lines[1]); const data = Buffer.from(rec.data, 'base64'); data[0] ^= 1; rec.data = data.toString('base64');
  writeFileSync(file, `${lines[0]}\n${JSON.stringify(rec)}\n`);
  assert.throws(() => read(file, privateKey));
});

test('day files older than 90 days are deleted', () => {
  const { publicKey } = keys(), dir = mkdtempSync(join(tmpdir(), 'audit-'));
  for (const d of ['2026-06-01', '2026-07-12', '2026-07-13', '2026-10-09']) writeFileSync(join(dir, `audit-${d}.log`), '');
  const log = new AuditLog({ dir, publicKey: publicKey.export({ type: 'spki', format: 'pem' }), now: () => new Date('2026-10-10T12:00:00Z'), log: () => {} });
  log.close();
  assert.deepEqual(readdirSync(dir).sort(), ['audit-2026-07-12.log', 'audit-2026-07-13.log', 'audit-2026-10-09.log']);
});
