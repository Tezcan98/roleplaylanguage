/**
 * Collects every English gloss shown to the player (content tables + English literals in
 * the UI code) so they can be translated into assets/i18n/<lang>.json.
 *
 *   npm run i18n                       all strings (JSON array)
 *   npm run i18n -- --missing ur       only the ones ur.json doesn't have yet
 *   npm run i18n -- --stub ur          add the missing ones to ur.json with "" values to fill in
 *   npm run i18n -- --coverage         per-language coverage (exit 1 when a listed language is incomplete)
 */
import { readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import * as C from '../src/content/index.js';
import { SLIDES } from '../src/ui/IntroSlides.js';

const out = new Set();
// identifiers (anchors, flags, chapter ids) are not texts
const ID = /^[\w.-]+(:[\w.-]*)+$|^[a-z]+[A-Z]\w*$|^d\d-/; // effect strings ('talk:dede:ab1'), anchors, chapter ids
const add = (s) => { if (typeof s === 'string' && /[a-z]/i.test(s) && s.trim() && !ID.test(s.trim())) out.add(s.trim()); };
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
    if (v.length === 2 && typeof v[0] === 'string' && typeof v[1] === 'string' && key !== 'expect' && key !== 'travel' && key !== 'link' && key !== 'keywords' && key !== 'botAnswers' && key !== 'botWrong') add(v[1]);
    v.forEach((x) => walk(x, key, seen));
    return;
  }
  for (const [k, x] of Object.entries(v)) walk(x, k, seen);
}
for (const [name, table] of Object.entries(C)) walk(table, name);
Object.values(C.KIND_NAMES).forEach((k) => add(k.en));
C.ITEMS.forEach((i) => { add(i.en); add(i.bagEn); });
SLIDES.forEach((x) => { add(x.title); add(x.text); });
Object.values(C.NPCS).forEach((n) => add(String(n.role).split(' · ')[1]));

// English literals in UI code: second argument of toasts.show(...), and gloss('...') calls
function files(dir) { return readdirSync(dir).flatMap((f) => { const p = join(dir, f); return statSync(p).isDirectory() ? files(p) : p.endsWith('.js') ? [p] : []; }); }
for (const f of files(new URL('../src', import.meta.url).pathname)) {
  if (f.includes('/content/') || f.includes('/i18n/')) continue;
  const src = readFileSync(f, 'utf8');
  for (const m of src.matchAll(/(?:gloss|\bg)\(\s*(['"`])((?:\\.|(?!\1).)*)\1/g)) add(m[2].replace(/\\'/g, "'"));
  // toasts.show(…, 'english') / setLine(…, 'english') / en: 'english' in UI code
  for (const m of src.matchAll(/(?:toasts\.show|setLine)\([^;]*?,\s*'([^'$]+)'/g)) add(m[1]);
  for (const m of src.matchAll(/\b(?:en|titleEn):\s*'([^']+)'/g)) add(m[1]);
}
// [tr, en] message pairs inside rule functions (door locks, house rules, decline texts)
for (const f of ['content/hotspots.js', 'content/freeActions.js', 'systems/VillageMultiplayer.js']) {
  const src = readFileSync(new URL(`../src/${f}`, import.meta.url), 'utf8');
  for (const m of src.matchAll(/\['[^'\]]*',\s*(["'])((?:(?!\1).)+)\1\]/g)) if (/\s|[.!?]$/.test(m[2])) add(m[2]); // sentences, not ['yard', 'gate']
}
// options that show meanings (listening / "what does X mean?")
const meaningNodes = [...Object.values(C.DIALOGUES).flatMap((d) => Object.values(d.nodes)), ...C.TEXTBOOK.units.flatMap((u) => u.pages)];
meaningNodes.filter((n) => n.optionsAreMeanings).forEach((n) => n.options.forEach((o) => add(o.tr)));

const all = [...out].sort();
const I18N = new URL('../assets/i18n/', import.meta.url);
const read = (code) => { try { return JSON.parse(readFileSync(new URL(`${code}.json`, I18N), 'utf8')); } catch { return {}; } };
const arg = (name) => { const i = process.argv.indexOf(name); return i > 0 ? process.argv[i + 1] ?? true : null; };

if (arg('--coverage')) {
  const { languages, source } = JSON.parse(readFileSync(new URL('languages.json', I18N), 'utf8'));
  let bad = 0;
  for (const { code } of languages.filter((l) => l.code !== source)) {
    const dict = read(code);
    const missing = all.filter((k) => !dict[k]);
    console.log(`${code}: ${all.length - missing.length}/${all.length}${missing.length ? `  missing e.g. ${JSON.stringify(missing.slice(0, 3))}` : ''}`);
    if (missing.length) bad++;
  }
  process.exit(bad ? 1 : 0);
}
const stub = arg('--stub');
if (stub) {
  const dict = read(stub);
  for (const k of all) if (!(k in dict)) dict[k] = '';
  writeFileSync(new URL(`${stub}.json`, I18N), JSON.stringify(Object.fromEntries(Object.entries(dict).sort(([a], [b]) => a.localeCompare(b))), null, 1) + '\n');
  console.error(`${stub}.json: ${Object.values(dict).filter((v) => !v).length} empty`);
  process.exit(0);
}
const missingFor = arg('--missing');
const list = missingFor ? all.filter((k) => !read(missingFor)[k]) : all;
console.log(JSON.stringify(list, null, 1));
console.error(`${list.length} strings`);
