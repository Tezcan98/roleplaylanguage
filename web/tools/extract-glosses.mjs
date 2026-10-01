/**
 * Collects every English gloss shown to the player (content tables + English literals in
 * the UI code) so they can be translated. Prints JSON; with --missing <lang> only the ones
 * without a translation in src/i18n/<lang>.js.
 * Usage: node tools/extract-glosses.mjs [--missing ar]
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import * as C from '../src/content/index.js';

const out = new Set();
// identifiers (anchors, flags, chapter ids) are not texts
const add = (s) => { if (typeof s === 'string' && /[a-z]/i.test(s) && s.trim() && !/:|^[a-z]+[A-Z]|^d\d-/.test(s.trim())) out.add(s.trim()); };
const EN_KEYS = new Set(['en', 'answerEn', 'showEn', 'titleEn', 'bagEn']);

// walk content; call functions (quest texts) with a few fake contexts
const ctxs = [false, true].map((v) => ({ has: () => v, count: () => (v ? 3 : 0), flag: () => v, isNight: v, words: 0, q: null, chapter: null, reached: () => v }));
function walk(v, key, seen = new Set()) {
  if (v == null) return;
  if (typeof v === 'function') { if (EN_KEYS.has(key)) ctxs.forEach((c) => { try { add(v(c)); } catch { /* not a text function */ } }); return; }
  if (typeof v === 'string') { if (EN_KEYS.has(key)) add(v); return; }
  if (typeof v !== 'object' || seen.has(v)) return;
  seen.add(v);
  if (Array.isArray(v)) {
    // [tr, en] word pairs and textbook lines
    if (v.length === 2 && typeof v[0] === 'string' && typeof v[1] === 'string' && key !== 'expect' && key !== 'keywords' && key !== 'botAnswers' && key !== 'botWrong') add(v[1]);
    v.forEach((x) => walk(x, key, seen));
    return;
  }
  for (const [k, x] of Object.entries(v)) walk(x, k, seen);
}
for (const [name, table] of Object.entries(C)) walk(table, name);
Object.values(C.KIND_NAMES).forEach((k) => add(k.en));
C.ITEMS.forEach((i) => { add(i.en); add(i.bagEn); });

// English literals in UI code: second argument of toasts.show(...), and gloss('...') calls
function files(dir) { return readdirSync(dir).flatMap((f) => { const p = join(dir, f); return statSync(p).isDirectory() ? files(p) : p.endsWith('.js') ? [p] : []; }); }
for (const f of files(new URL('../src', import.meta.url).pathname)) {
  if (f.includes('/content/') || f.includes('/i18n/')) continue;
  const src = readFileSync(f, 'utf8');
  for (const m of src.matchAll(/gloss\(\s*(['"`])((?:\\.|(?!\1).)*)\1/g)) add(m[2].replace(/\\'/g, "'"));
  // toasts.show(…, 'english') / setLine(…, 'english') / en: 'english' in UI code
  for (const m of src.matchAll(/(?:toasts\.show|setLine)\([^;]*?,\s*'([^'$]+)'/g)) add(m[1]);
  for (const m of src.matchAll(/\ben:\s*'([^']+)'/g)) add(m[1]);
}
// [tr, en] message pairs inside rule functions (door locks, house rules, decline texts)
for (const f of ['content/hotspots.js', 'content/freeActions.js', 'systems/VillageMultiplayer.js']) {
  const src = readFileSync(new URL(`../src/${f}`, import.meta.url), 'utf8');
  for (const m of src.matchAll(/\['[^'\]]*',\s*(["'])((?:(?!\1).)+)\1\]/g)) add(m[2]);
}
// options that show meanings (listening / "what does X mean?")
const meaningNodes = [...Object.values(C.DIALOGUES).flatMap((d) => Object.values(d.nodes)), ...C.TEXTBOOK.units.flatMap((u) => u.pages)];
meaningNodes.filter((n) => n.optionsAreMeanings).forEach((n) => n.options.forEach((o) => add(o.tr)));

let list = [...out].sort();
const mi = process.argv.indexOf('--missing');
if (mi > 0) {
  const lang = process.argv[mi + 1];
  const { default: dict } = await import(`../src/i18n/${lang}.js`);
  list = list.filter((s) => !(s in dict));
}
console.log(JSON.stringify(list, null, 1));
console.error(`${list.length} strings`);
