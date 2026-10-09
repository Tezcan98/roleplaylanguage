/**
 * Reads the safety log with the operator's private key (it is encrypted on the server):
 *   node tools/audit-read.mjs --key audit-private.pem --dir <folder with audit-*.log>
 *        [--from 2026-10-01] [--to 2026-10-31] [--flagged] [--who <name | device id | Play Games id>] [--text <word>] [--json]
 * Copy the files from the server first, e.g.
 *   scp 'tezcan@31.77.63.14:/var/lib/private/yilmaz-village/audit/*' ./audit/   (sudo needed there: see docs)
 */
import { createDecipheriv, createPrivateKey, privateDecrypt, constants } from 'node:crypto';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const arg = (n) => { const i = process.argv.indexOf(n); return i > 0 ? process.argv[i + 1] : null; };
const has = (n) => process.argv.includes(n);
const keyFile = arg('--key'), dir = arg('--dir');
if (!keyFile || !dir) { console.error('usage: node tools/audit-read.mjs --key audit-private.pem --dir ./audit [--from YYYY-MM-DD] [--to YYYY-MM-DD] [--flagged] [--who …] [--text …] [--json]'); process.exit(1); }
const priv = createPrivateKey(readFileSync(keyFile));
const from = arg('--from') ?? '0000', to = arg('--to') ?? '9999', who = arg('--who')?.toLocaleLowerCase('tr'), word = arg('--text')?.toLocaleLowerCase('tr');

const files = readdirSync(dir).filter((f) => /^audit-\d{4}-\d{2}-\d{2}\.log$/.test(f)).sort().filter((f) => { const d = f.slice(6, 16); return d >= from && d <= to; });
let shown = 0, broken = 0;
for (const f of files) {
  let key = null;
  for (const line of readFileSync(join(dir, f), 'utf8').split('\n')) {
    if (!line.trim()) continue;
    let o; try { o = JSON.parse(line); } catch { broken++; continue; }
    if (o.key) { key = privateDecrypt({ key: priv, padding: constants.RSA_PKCS1_OAEP_PADDING, oaepHash: 'sha256' }, Buffer.from(o.key, 'base64')); continue; }
    if (!key) { broken++; continue; }
    let r;
    try {
      const d = createDecipheriv('aes-256-gcm', key, Buffer.from(o.iv, 'base64'));
      d.setAuthTag(Buffer.from(o.tag, 'base64'));
      r = JSON.parse(Buffer.concat([d.update(Buffer.from(o.data, 'base64')), d.final()]).toString('utf8'));
    } catch { broken++; continue; } // altered or damaged: it does not open
    if (has('--flagged') && !r.flag) continue;
    if (who && ![r.name, r.pid, r.gid].some((x) => String(x ?? '').toLocaleLowerCase('tr') === who)) continue;
    if (word && !`${r.text} ${r.reply ?? ''}`.toLocaleLowerCase('tr').includes(word)) continue;
    shown++;
    if (has('--json')) { console.log(JSON.stringify(r)); continue; }
    const where = r.kind === 'npc' ? `sohbet:${r.npc}` : `meydan:${r.room}`;
    console.log(`${r.t}  ${where}  ${r.name ?? '?'}  [cihaz ${r.pid ?? '-'} · PlayGames ${r.gid ?? '-'} · ${r.ip ?? '-'}]${r.flag ? `  ⚠ ${r.flag}` : ''}${r.shown === false ? ' (gösterilmedi)' : ''}\n    “${r.text}”${r.reply ? `\n    → ${r.reply}` : ''}`);
  }
}
console.error(`${shown} kayıt${broken ? `, ${broken} satır açılamadı (bozuk ya da değiştirilmiş)` : ''}`);
