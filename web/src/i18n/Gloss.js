import { boyKey, personalizeGloss } from './Persona.js';

/**
 * Translations of the English glosses (meanings, hints, sub-titles, UI help). The game text
 * itself stays Turkish; the gloss line under it is shown in the player's language.
 *
 * Everything is data: assets/i18n/languages.json lists the languages, and each one is a
 * flat JSON file assets/i18n/<code>.json keyed by the English source text (`{name}`
 * placeholders are filled from `vars`). Adding a language needs no code change.
 */
let languages = [{ code: 'en', name: 'English', short: 'EN', dir: 'ltr' }];
let source = 'en';
let lang = 'en';
let dict = {};
let words = {}; // Turkish-only mode: the word → a simple Turkish explanation (assets/i18n/tr-words.json)
let examples = {}; // …and an example sentence from the game's own lines (tr-examples.json, tools/build-examples.mjs)

async function getJson(url) {
  const r = await fetch(url, { cache: 'no-cache' });
  if (!r.ok) throw new Error(`${url}: ${r.status}`);
  return r.json();
}

/** Load the language list and the dictionary for `code` (falls back to English). Call before the UI is built. */
export async function loadGlossLang(code, base = 'assets/i18n/') {
  try {
    const index = await getJson(`${base}languages.json`);
    languages = index.languages;
    source = index.source ?? 'en';
  } catch (e) { console.warn('[i18n] no language list', e); }
  const known = languages.some((l) => l.code === code) ? code : source;
  dict = {}; words = {}; examples = {};
  if (known !== source) {
    try { dict = await getJson(`${base}${known}.json`); } catch (e) { console.warn(`[i18n] ${known} missing`, e); }
  }
  lang = known;
  if (turkishOnly()) {
    try { words = await getJson(`${base}${known}-words.json`); } catch (e) { console.warn(`[i18n] ${known}-words missing`, e); }
    try { examples = await getJson(`${base}${known}-examples.json`); } catch { /* no examples: the dictionary meaning alone */ }
  }
  document.body.classList.toggle('tr-only', turkishOnly());
  const dir = glossDir();
  document.body.classList.toggle('gloss-rtl', dir === 'rtl');
  document.documentElement.dataset.gloss = lang;
  const font = glossInfo()?.font;
  document.documentElement.style.setProperty('--gloss-font', font ? `'${font}', Nunito, sans-serif` : 'Nunito, sans-serif');
  const scale = glossInfo()?.scale;
  if (scale) document.documentElement.style.setProperty('--gloss-scale', String(scale)); else document.documentElement.style.removeProperty('--gloss-scale');
  document.documentElement.toggleAttribute('data-gloss-scale', !!scale);
  return lang;
}

export const glossLanguages = () => languages;
export const glossLang = () => lang;
export const glossInfo = () => languages.find((l) => l.code === lang) ?? languages[0];
/** Text direction of the gloss language (e.g. Arabic and Urdu are right-to-left). */
export const glossDir = () => glossInfo()?.dir ?? 'ltr';

/**
 * "Yalnızca Türkçe" (languages.json `turkishOnly`): no foreign language anywhere, for children
 * who speak Turkish (primary school). The meaning lines under the Turkish are hidden
 * (body.tr-only), the help and the introduction are in simple Turkish (tr.json: English → Turkish,
 * only for texts that stand alone), and a word is explained in Turkish (tr-words.json).
 */
export const turkishOnly = () => !!glossInfo()?.turkishOnly;

/** English → current gloss language (falls back to English; in Turkish-only mode to nothing). */
export function gloss(en, vars) {
  if (en == null || en === '') return en;
  const hit = lang !== source && (dict[en] || dict[boyKey(en)]);
  if (!hit && turkishOnly()) return '';
  let s = hit ? personalizeGloss(hit, lang) : en;
  if (vars) s = s.replace(/\{(\w+)\}/g, (_, k) => vars[k] ?? '');
  return s;
}

/** "anne · mom" → "anne · أم" */
export const glossRole = (role) => { const [tr, en] = String(role).split(' · '); return en ? withGloss(tr, en) : role; };

/** What a Turkish word means: in the player's language, or explained in Turkish in Turkish-only mode ('' when there is no explanation yet). */
export const meaning = (tr, en) => (turkishOnly() ? words[tr] ?? words[String(tr).toLocaleLowerCase('tr')] ?? '' : gloss(en));

/** An example sentence with the word in it (Turkish-only mode), or ''. */
export const example = (tr) => (turkishOnly() ? examples[tr] ?? examples[String(tr).toLocaleLowerCase('tr')] ?? '' : '');

/** "tr = gloss" for word notes (only the word when there is nothing to say about it). */
export const wordNote = (tr, en) => { const m = meaning(tr, en); return m ? `${tr} = ${m}` : tr; };

/** "Türkçe · meaning" — just the Turkish when there is no meaning to add (Turkish-only mode). */
export const withGloss = (tr, en, sep = ' · ') => { const g = gloss(en); return g ? `${tr}${sep}${g}` : tr; };

/** A hint such as "süt = milk": the English side explained in Turkish, or left out, in Turkish-only mode. */
export function hintText(hint) {
  if (!hint || !turkishOnly()) return hint;
  const out = String(hint).split(/,\s*/).map((part) => {
    const m = /^(.*?)\s*=\s*(.+)$/.exec(part);
    if (!m || /^\d/.test(m[2])) return part;
    const def = meaning(m[1].trim(), m[2].trim());
    return def ? `${m[1].trim()} = ${def}` : m[1].trim();
  }).join(', ');
  return out;
}
