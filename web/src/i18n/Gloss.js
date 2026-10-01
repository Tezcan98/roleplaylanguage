import AR from './ar.js';
import AR_UI from './ar-ui.js';

/**
 * Translations of the English glosses (meanings, hints, sub-titles). The game text itself
 * stays Turkish; the gloss line under it is shown in the player's language.
 * Keys are the English source strings; `{name}` placeholders are filled from `vars`.
 */
const DICTS = { ar: { ...AR, ...AR_UI } };
const RTL = new Set(['ar']);
let lang = 'ar';

export function setGlossLang(l) {
  lang = DICTS[l] || l === 'en' ? l : 'en';
  document.body.classList.toggle('gloss-rtl', RTL.has(lang));
  document.documentElement.dataset.gloss = lang;
}
export const glossLang = () => lang;

/** English → current gloss language (falls back to English). */
export function gloss(en, vars) {
  if (en == null || en === '') return en;
  let s = (lang !== 'en' && DICTS[lang]?.[en]) || en;
  if (vars) s = s.replace(/\{(\w+)\}/g, (_, k) => vars[k] ?? '');
  return s;
}

/** "anne · mom" → "anne · أم" */
export const glossRole = (role) => { const [tr, en] = String(role).split(' · '); return en ? `${tr} · ${gloss(en)}` : role; };

/** "tr = gloss" for word notes. */
export const wordNote = (tr, en) => `${tr} = ${gloss(en)}`;
