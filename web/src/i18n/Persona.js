/**
 * Boy or girl. The content is written for Ahmet (a boy); for a girl the player is Sare
 * and the family says "kızım" (my daughter) instead of "oğlum" (my son). Content tables are
 * rewritten once at start-up (`personalizeContent`), translated glosses on the way out
 * (`personalizeGloss`, used by Gloss.js).
 */
let gender = 'boy';
let name = 'Ahmet';
/** The four player characters: name in each script; `vowel` = the name ends in a vowel (Turkish buffer letters). */
export const PLAYER_NAMES_BY_LOOK = {
  'boy-modest': { tr: 'Ahmet', ar: 'أحمد', ur: 'احمد' },
  'boy-strong': { tr: 'Hakan', ar: 'هاكان', ur: 'ہاکان', back: true },
  'girl-covered': { tr: 'Sare', ar: 'سارة', ur: 'سارہ', vowel: true },
  'girl-open': { tr: 'Seher', ar: 'سحر', ur: 'سحر' },
};
let names = PLAYER_NAMES_BY_LOOK['boy-modest'];
/** The class teacher, picked at random once per device: name + gender (content says "Zeynep", a woman). */
export const TEACHERS = {
  f: [['Zeynep', 'زينب', 'زینب'], ['Merve', 'مروة', 'مروہ'], ['Esra', 'إسراء', 'اسراء'], ['Hatice', 'خديجة', 'خدیجہ']],
  m: [['Murat', 'مراد', 'مراد'], ['Mustafa', 'مصطفى', 'مصطفیٰ'], ['Ömer', 'عمر', 'عمر'], ['Yusuf', 'يوسف', 'یوسف']],
};
let teacher = { gender: 'f', name: 'Zeynep', ar: 'زينب', ur: 'زینب' };
export const teacherInfo = () => teacher;
/** "f:Merve" (saved setting) → teacher; anything unknown picks one at random. */
export function setTeacher(key) {
  const [g, name] = String(key ?? '').split(':');
  const list = TEACHERS[g];
  const hit = list?.find(([n]) => n === name);
  const [gg, row] = hit ? [g, hit] : (() => { const k = Math.random() < 0.5 ? 'f' : 'm'; return [k, TEACHERS[k][(Math.random() * 4) | 0]]; })();
  teacher = { gender: gg, name: row[0], ar: row[1], ur: row[2] };
  return `${gg}:${row[0]}`;
}
const teacherSwaps = () => {
  if (teacher.name === 'Zeynep' && teacher.gender === 'f') return { src: [], tr: {} };
  const male = teacher.gender === 'm';
  return {
    src: [[/\bZeynep\b/g, teacher.name], ...(male ? [[/\(she points/g, '(he points']] : [])],
    tr: {
      ar: [[/زينب/g, teacher.ar], ...(male ? [[/معلمتكم/g, 'معلمكم'], [/معلمتي/g, 'معلمي'], [/معلمتك/g, 'معلمك'], [/المعلمة/g, 'المعلم'], [/معلمة/g, 'معلم'], [/تشير/g, 'يشير']] : [])],
      ur: [[/زینب/g, teacher.ur], ...(male ? [[/استانی جی/g, 'استاد جی'], [/استانی/g, 'استاد'], [/کرتی ہیں/g, 'کرتے ہیں'], [/پوچھتی ہوں/g, 'پوچھتا ہوں'], [/کروں گی/g, 'کروں گا']] : [])],
      es: [[/\bZeynep\b/g, teacher.name], ...(male ? [[/vuestra maestra/g, 'vuestro maestro'], [/la maestra/g, 'el maestro'], [/tu maestra/g, 'tu maestro'], [/[Mm]aestra/g, (m) => (m[0] === 'M' ? 'Maestro' : 'maestro')], [/señala/g, 'señala']] : [])],
      fr: [[/\bZeynep\b/g, teacher.name], ...(male ? [[/votre maîtresse/g, 'votre maître'], [/ta maîtresse/g, 'ton maître'], [/la maîtresse/g, 'le maître'], [/[Mm]aîtresse/g, (m) => (m[0] === 'M' ? 'Maître' : 'maître')], [/elle montre/g, 'il montre']] : [])],
      en: [],
    },
  };
};
export const playerGender = () => gender;
export const playerName = () => name;
/** Which of the four characters (see CharacterSetup): sets the name used in every text. */
export function setPlayerLook(key) { names = PLAYER_NAMES_BY_LOOK[key] ?? PLAYER_NAMES_BY_LOOK['boy-modest']; name = names.tr; }

/** Rewrites for the player: their name (with the right Turkish suffix after it) and, for a girl, how the family calls her. */
function sourceRules() {
  const n = names.tr, rules = [];
  if (n !== 'Ahmet') {
    // Ahmet'in / Ahmet'e / Ahmet'i / Ahmet'le → the suffixes for this name (vowel harmony, buffer letters)
    const sfx = names.vowel ? { in: 'nin', e: 'ye', i: 'yi', le: 'yle' } : names.back ? { in: 'ın', e: 'a', i: 'ı', le: 'la' } : { in: 'in', e: 'e', i: 'i', le: 'le' };
    for (const [k, v] of Object.entries(sfx)) rules.push([new RegExp(`\\bAhmet['’]${k}\\b`, 'g'), `${n}’${v}`]);
    rules.push([/\bAhmet/g, n]);
  }
  if (gender === 'girl') rules.push([/oğlum/g, 'kızım'], [/Oğlum/g, 'Kızım'], [/oğluma/g, 'kızıma'], [/\bson\b/g, 'dear'], [/\bSon\b/g, 'Dear'],
    [/\bAbi\b/g, 'Abla'], [/\babi\b/g, 'abla'], [/\bbig brother\b/g, 'big sister'], [/\bBig brother\b/g, 'Big sister']);
  return rules;
}
const TRANSLATED = { // what the source swaps become in each gloss language
  ar: [[/يا بنيّ?/g, 'يا بنتي'], [/ابني/g, 'ابنتي'], [/أخي الكبير/g, 'أختي الكبيرة'], [/يا أخي/g, 'يا أختي']],
  ur: [[/بیٹا/g, 'بیٹی'], [/بیٹے/g, 'بیٹی'], [/بھائی جان/g, 'آپی'], [/بڑے بھائی/g, 'بڑی بہن']],
  es: [[/\bhijo\b/g, 'hija'], [/\bHijo\b/g, 'Hija'], [/hermano mayor/g, 'hermana mayor'], [/Hermano mayor/g, 'Hermana mayor']],
  fr: [[/mon fils/g, 'ma fille'], [/Mon fils/g, 'Ma fille'], [/\bfils\b/g, 'fille'], [/grand frère/g, 'grande sœur'], [/Grand frère/g, 'Grande sœur']],
  en: [],
};
// glosses were translated from the boy's English: map a personalised key back to look it up
const UNDO = [ [/\bdear\b/g, 'son'], [/\bDear\b/g, 'Son'], [/\bbig sister\b/g, 'big brother'], [/\bBig sister\b/g, 'Big brother']];

const swap = (s, rules) => rules.reduce((t, [re, to]) => t.replace(re, to), s);

export function setPlayerGender(g) { gender = g === 'girl' ? 'girl' : 'boy'; }

/** The English key the translations were made for. */
export const boyKey = (en) => {
  let k = gender === 'girl' ? swap(en, UNDO) : en;
  if (name !== 'Ahmet') k = k.replace(new RegExp(`\\b${name}\\b`, 'g'), 'Ahmet');
  if (teacher.name !== 'Zeynep') k = k.replace(new RegExp(`\\b${teacher.name}\\b`, 'g'), 'Zeynep').replace('(he points', '(she points');
  return k;
};
/** A translated gloss, adjusted for a girl. */
const nameSwap = (lang) => (name === 'Ahmet' ? [] : lang === 'ar' ? [[/أحمد/g, names.ar]] : lang === 'ur' ? [[/احمد/g, names.ur]] : [[/\bAhmet/g, name]]);
export const personalizeGloss = (text, lang) => swap(swap(gender === 'girl' ? swap(text, TRANSLATED[lang] ?? []) : text, nameSwap(lang)), teacherSwaps().tr[lang] ?? []);

/** Rewrite strings in content tables in place (functions are wrapped so their results are rewritten too). */
export function personalizeContent(...tables) {
  const rules = [...sourceRules(), ...teacherSwaps().src];
  if (!rules.length) return;
  const seen = new Set();
  const tx = (v) => (typeof v === 'string' ? swap(v, rules) : v && typeof v === 'object' ? (walk(v), v) : v);
  const walk = (o) => {
    if (seen.has(o)) return;
    seen.add(o);
    for (const k of Object.keys(o)) {
      const v = o[k];
      if (typeof v === 'string') o[k] = swap(v, rules);
      else if (typeof v === 'function') o[k] = (...a) => tx(v(...a));
      else if (v && typeof v === 'object') walk(v);
    }
  };
  tables.forEach((t) => t && walk(t));
}
