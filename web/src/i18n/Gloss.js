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
  dict = {};
  if (known !== source) {
    try { dict = await getJson(`${base}${known}.json`); } catch (e) { console.warn(`[i18n] ${known} missing`, e); }
  }
  lang = known;
  const dir = glossDir();
  document.body.classList.toggle('gloss-rtl', dir === 'rtl');
  document.documentElement.dataset.gloss = lang;
  return lang;
}

export const glossLanguages = () => languages;
export const glossLang = () => lang;
export const glossInfo = () => languages.find((l) => l.code === lang) ?? languages[0];
/** Text direction of the gloss language (e.g. Arabic and Urdu are right-to-left). */
export const glossDir = () => glossInfo()?.dir ?? 'ltr';

/** English → current gloss language (falls back to English). */
export function gloss(en, vars) {
  if (en == null || en === '') return en;
  const hit = lang !== source && (dict[en] || dict[boyKey(en)]);
  let s = hit ? personalizeGloss(hit, lang) : en;
  if (vars) s = s.replace(/\{(\w+)\}/g, (_, k) => vars[k] ?? '');
  return s;
}

/** "anne · mom" → "anne · أم" */
export const glossRole = (role) => { const [tr, en] = String(role).split(' · '); return en ? `${tr} · ${gloss(en)}` : role; };

/** "tr = gloss" for word notes. */
export const wordNote = (tr, en) => `${tr} = ${gloss(en)}`;
