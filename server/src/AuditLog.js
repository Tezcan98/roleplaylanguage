/**
 * The safety log: what players say in the square (speech bubbles) and to the characters (free
 * chat) is kept for 90 days, encrypted, for an operator who looks into harmful conversations.
 *
 * Encryption (the server can write but never read it):
 *   - every day file gets its own random 256-bit key; each record is AES-256-GCM with it;
 *   - that day key is stored in the file's first line, encrypted with the operator's RSA public
 *     key (RSA-OAEP, SHA-256). Only the operator's private key — kept off the server — opens it
 *     (tools/audit-read.mjs; keys from tools/audit-keygen.mjs).
 * Files: <dir>/audit-YYYY-MM-DD.log, one JSON line each: { key } lines (a new one at every server
 * start) and { iv, data, tag } records, each sealed with the key line above it.
 * Files older than `days` are deleted (at start and every hour).
 *
 * A record: { t, kind: 'say' | 'npc', room?, npc?, name, pid?, gid?, ip?, text, reply?, shown?, flag? }
 * (pid = the game's device id, gid = Play Games player id, flag = why a bubble was held back).
 */
import { createCipheriv, createPublicKey, publicEncrypt, randomBytes, constants } from 'node:crypto';
import { mkdirSync, appendFileSync, readdirSync, unlinkSync, existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const DAY_FILE = /^audit-(\d{4}-\d{2}-\d{2})\.log$/;

export class AuditLog {
  #day = null; // { date, key }
  #timer = null;

  /** @param {{ dir: string, publicKey: string | Buffer, days?: number, now?: () => Date, log?: Function }} o */
  constructor({ dir, publicKey, days = 90, now = () => new Date(), log = console.log }) {
    Object.assign(this, { dir, days, now, log });
    this.key = createPublicKey(publicKey);
    mkdirSync(dir, { recursive: true, mode: 0o700 });
    this.prune();
    this.#timer = setInterval(() => this.prune(), 3600_000);
    this.#timer.unref?.();
  }

  /** Turned on only when a public key is configured (AUDIT_PUBLIC_KEY = path to the .pem). */
  static fromEnv(env, log = console.log) {
    const file = env.AUDIT_PUBLIC_KEY;
    if (!file || !existsSync(file)) return null;
    return new AuditLog({ dir: env.AUDIT_DIR ?? '/var/lib/yilmaz-village/audit', publicKey: readFileSync(file), days: Number(env.AUDIT_DAYS ?? 90), log });
  }

  /** Writes one record (never throws: the game goes on if the disk is full). */
  write(record) {
    try {
      const now = this.now(), date = now.toISOString().slice(0, 10);
      const file = join(this.dir, `audit-${date}.log`);
      if (this.#day?.date !== date) { // a new day, or the server (re)started: a fresh key, sealed for the operator
        const key = randomBytes(32);
        const sealed = publicEncrypt({ key: this.key, padding: constants.RSA_PKCS1_OAEP_PADDING, oaepHash: 'sha256' }, key);
        appendFileSync(file, `${JSON.stringify({ v: 1, key: sealed.toString('base64') })}\n`, { mode: 0o600 });
        this.#day = { date, key };
      }
      appendFileSync(file, `${JSON.stringify(seal(this.#day.key, { t: now.toISOString(), ...record }))}\n`);
    } catch (e) { this.log(`[audit] not written: ${e.message}`); }
  }

  /** Deletes the day files older than `days`. */
  prune() {
    const limit = new Date(this.now().getTime() - this.days * 86400_000).toISOString().slice(0, 10);
    for (const f of readdirSync(this.dir)) {
      const m = DAY_FILE.exec(f);
      if (m && m[1] < limit) { try { unlinkSync(join(this.dir, f)); } catch { /* next hour */ } }
    }
  }

  close() { clearInterval(this.#timer); }
}

function seal(key, obj) {
  const iv = randomBytes(12), c = createCipheriv('aes-256-gcm', key, iv);
  const data = Buffer.concat([c.update(JSON.stringify(obj), 'utf8'), c.final()]);
  return { iv: iv.toString('base64'), data: data.toString('base64'), tag: c.getAuthTag().toString('base64') };
}
