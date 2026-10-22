/**
 * "Sadece Türkçe" mode: for every word of assets/i18n/tr-words.json an example sentence, taken from
 * the game's own Turkish lines (dialogues, books, the textbook, talks) → assets/i18n/tr-examples.json.
 *   node tools/build-examples.mjs
 */
import { readFileSync, writeFileSync } from 'node:fs';
import * as C from '../src/content/index.js';

const words = Object.keys(JSON.parse(readFileSync(new URL('../assets/i18n/tr-words.json', import.meta.url), 'utf8'))).filter((k) => !k.startsWith('_'));
const sentences = new Set();
const seen = new Set();
const add = (t) => { for (const s of String(t).split(/(?<=[.!?…])\s+/)) { const x = s.replace(/^[“"”'’\s-]+|[“"”\s]+$/g, '').trim(); if (x.length >= 12 && x.length <= 90 && /[a-zçğıöşü]/i.test(x) && !/[=→]|\bneden:|^\W*$/.test(x) && !/^[A-ZÇĞİÖŞÜ][a-zçğıöşü]+ [A-ZÇĞİÖŞÜ]/.test(x)) sentences.add(x); } };
const walk = (v, key) => {
  if (v == null || typeof v === 'function') return;
  if (typeof v === 'string') { if (['say', 'tr', 'show', 'text', 'line'].includes(key)) add(v); return; }
  if (typeof v !== 'object' || seen.has(v)) return; seen.add(v);
  if (Array.isArray(v)) { if (v.length === 2 && typeof v[0] === 'string' && typeof v[1] === 'string' && /[a-zçğıöşü]/i.test(v[0]) && v[0].length > 20) add(v[0]); v.forEach((x) => walk(x, key)); return; }
  for (const [k, x] of Object.entries(v)) walk(x, k);
};
for (const t of Object.values(C)) walk(t, '');
const list = [...sentences];
const lower = (s) => s.toLocaleLowerCase('tr');
/** The word's stem: "yatmak" → "yat", "dua etmek" → "dua et", a plain noun stays (and may take suffixes). */
const stem = (w) => lower(w).replace(/(mak|mek)$/, '');
const out = {};
for (const w of words) {
  const st = stem(w);
  if (st.length < 3) continue;
  // the stem, then at most a few letters of suffix ("cuma" must not find "cumartesi")
  const re = new RegExp(`(^|[^a-zçğıöşü])${st.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}[a-zçğıöşü]{0,${st.length >= 6 ? 5 : 2}}($|[^a-zçğıöşü])`, 'iu');
  const hits = list.filter((s) => re.test(lower(s)) && !lower(s).startsWith(lower(w) + ' ='));
  if (!hits.length) continue;
  hits.sort((a, b) => Math.abs(a.length - 40) - Math.abs(b.length - 40)); // not too short, not too long
  out[w] = hits[0];
}
writeFileSync(new URL('../assets/i18n/tr-examples.json', import.meta.url), JSON.stringify(out, null, 1) + '\n');
console.log(`${Object.keys(out).length} of ${words.length} words have an example`);
