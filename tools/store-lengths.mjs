/**
 * Checks docs/store/listing.md against Google Play's limits (name 30, short 80, full 4000) and,
 * with an output folder, writes each language's texts as plain files to paste into Play Console.
 *   node tools/store-lengths.mjs [outDir]
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

const md = readFileSync(new URL('../docs/store/listing.md', import.meta.url), 'utf8');
const out = process.argv[2];
const LIMITS = { name: 30, short: 80, full: 4000 };
let bad = 0;
for (const sec of md.split(/^## /m).slice(1)) {
  const lang = sec.split('\n')[0].trim();
  const [name = '', short = ''] = [...sec.matchAll(/^\*\*[^*]+:\*\* (.+)$/gm)].map((m) => m[1].trim()); // "**Ad:** …", "**Kısa açıklama:** …"
  const full = sec.split(/^\*\*[^*]+:\*\*\n/m)[1]?.trim() ?? '';
  const n = { name: [...name].length, short: [...short].length, full: [...full].length };
  const over = Object.entries(n).filter(([k, v]) => v > LIMITS[k] || v === 0);
  bad += over.length;
  console.log(`${lang.padEnd(6)} name ${n.name}/30  short ${n.short}/80  full ${n.full}/4000${over.length ? `  ✗ ${over.map(([k]) => k).join(', ')}` : ''}`);
  if (out) {
    mkdirSync(join(out, lang), { recursive: true });
    writeFileSync(join(out, lang, '1-ad.txt'), `${name}\n`);
    writeFileSync(join(out, lang, '2-kisa-aciklama.txt'), `${short}\n`);
    writeFileSync(join(out, lang, '3-tam-aciklama.txt'), `${full}\n`);
  }
}
process.exit(bad ? 1 : 0);
