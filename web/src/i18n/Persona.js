/**
 * Boy or girl. The content is written for Ahmet (a boy); for a girl the player is Sare
 * and the family says "kızım" (my daughter) instead of "oğlum" (my son). Content tables are
 * rewritten once at start-up (`personalizeContent`), translated glosses on the way out
 * (`personalizeGloss`, used by Gloss.js).
 */
let gender = 'boy';
export const playerGender = () => gender;
export const playerName = () => (gender === 'girl' ? 'Sare' : 'Ahmet');

const SOURCE = [ // Turkish text and English glosses
  // Turkish suffixes after a vowel need a buffer letter: Ahmet'in → Sare'nin, Ahmet'e → Sare'ye
  [/\bAhmet['’]in\b/g, 'Sare’nin'], [/\bAhmet['’]e\b/g, 'Sare’ye'], [/\bAhmet['’]i\b/g, 'Sare’yi'], [/\bAhmet['’]le\b/g, 'Sare’yle'],
  [/\bAhmet/g, 'Sare'], [/oğlum/g, 'kızım'], [/Oğlum/g, 'Kızım'], [/oğluma/g, 'kızıma'],
  [/\bson\b/g, 'dear'], [/\bSon\b/g, 'Dear'],
  [/\bAbi\b/g, 'Abla'], [/\babi\b/g, 'abla'], [/\bbig brother\b/g, 'big sister'], [/\bBig brother\b/g, 'Big sister'],
];
const TRANSLATED = { // what the source swaps become in each gloss language
  ar: [[/أحمد/g, 'سارة'], [/يا بنيّ?/g, 'يا بنتي'], [/ابني/g, 'ابنتي'], [/أخي الكبير/g, 'أختي الكبيرة'], [/يا أخي/g, 'يا أختي']],
  ur: [[/احمد/g, 'سارہ'], [/بیٹا/g, 'بیٹی'], [/بیٹے/g, 'بیٹی'], [/بھائی جان/g, 'آپی'], [/بڑے بھائی/g, 'بڑی بہن']],
  es: [[/\bAhmet/g, 'Sare'], [/\bhijo\b/g, 'hija'], [/\bHijo\b/g, 'Hija'], [/hermano mayor/g, 'hermana mayor'], [/Hermano mayor/g, 'Hermana mayor']],
  fr: [[/\bAhmet/g, 'Sare'], [/mon fils/g, 'ma fille'], [/Mon fils/g, 'Ma fille'], [/\bfils\b/g, 'fille'], [/grand frère/g, 'grande sœur'], [/Grand frère/g, 'Grande sœur']],
  en: [],
};
// glosses were translated from the boy's English: map a personalised key back to look it up
const UNDO = [[/\bSare's/g, "Ahmet's"], [/\bSare/g, 'Ahmet'], [/\bdear\b/g, 'son'], [/\bDear\b/g, 'Son'], [/\bbig sister\b/g, 'big brother'], [/\bBig sister\b/g, 'Big brother']];

const swap = (s, rules) => rules.reduce((t, [re, to]) => t.replace(re, to), s);

export function setPlayerGender(g) { gender = g === 'girl' ? 'girl' : 'boy'; }

/** The English key the translations were made for. */
export const boyKey = (en) => (gender === 'girl' ? swap(en, UNDO) : en);
/** A translated gloss, adjusted for a girl. */
export const personalizeGloss = (text, lang) => (gender === 'girl' ? swap(text, TRANSLATED[lang] ?? []) : text);

/** Rewrite strings in content tables in place (functions are wrapped so their results are rewritten too). */
export function personalizeContent(...tables) {
  if (gender !== 'girl') return;
  const seen = new Set();
  const tx = (v) => (typeof v === 'string' ? swap(v, SOURCE) : v && typeof v === 'object' ? (walk(v), v) : v);
  const walk = (o) => {
    if (seen.has(o)) return;
    seen.add(o);
    for (const k of Object.keys(o)) {
      const v = o[k];
      if (typeof v === 'string') o[k] = swap(v, SOURCE);
      else if (typeof v === 'function') o[k] = (...a) => tx(v(...a));
      else if (v && typeof v === 'object') walk(v);
    }
  };
  tables.forEach((t) => t && walk(t));
}
