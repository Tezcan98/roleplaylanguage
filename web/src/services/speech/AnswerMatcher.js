const FOLD = { ç: 'c', ğ: 'g', ı: 'i', ö: 'o', ş: 's', ü: 'u', â: 'a', î: 'i', û: 'u' };

const ONES = ['', 'bir', 'iki', 'üç', 'dört', 'beş', 'altı', 'yedi', 'sekiz', 'dokuz'];
const TENS = ['', 'on', 'yirmi', 'otuz', 'kırk', 'elli', 'altmış', 'yetmiş', 'seksen', 'doksan'];
/** 10 → "on", 25 → "yirmi beş", 1453 → "bin dört yüz elli üç" (speech recognition writes numbers as digits). */
export function numberWords(n) {
  if (n === 0) return 'sıfır';
  const w = [];
  const th = Math.floor(n / 1000), h = Math.floor(n / 100) % 10;
  if (th) w.push(th > 1 ? `${numberWords(th)} bin` : 'bin');
  if (h) w.push(h > 1 ? `${ONES[h]} yüz` : 'yüz');
  w.push(TENS[Math.floor(n / 10) % 10], ONES[n % 10]);
  return w.filter(Boolean).join(' ');
}

export const normalize = (s) => s.toLocaleLowerCase('tr-TR').replace(/[^\p{L}\p{N}\s]/gu, ' ')
  .replace(/\d+/g, (d) => (d.length <= 6 ? ` ${numberWords(Number(d))} ` : d)) // "Ben 10 yaşındayım" = "Ben on yaşındayım"
  .replace(/\s+/g, ' ').trim();
const fold = (s) => s.replace(/[çğıöşüâîû]/g, (c) => FOLD[c]);

function levenshtein(a, b) {
  const row = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    let prev = row[0];
    row[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const tmp = row[j];
      row[j] = Math.min(row[j] + 1, row[j - 1] + 1, prev + (a[i - 1] === b[j - 1] ? 0 : 1));
      prev = tmp;
    }
  }
  return row[b.length];
}

const similarity = (a, b) => (!a && !b ? 1 : 1 - levenshtein(a, b) / Math.max(a.length, b.length));

/**
 * How close a spoken/typed answer is to the accepted ones (0..1).
 * Exact Turkish spelling scores best; answers without Turkish letters get a small penalty.
 * `keywords` accepts any answer containing one of them (open questions).
 */
export class AnswerMatcher {
  score(answer, { expect = [], keywords = [] }) {
    const a = normalize(answer);
    let best = { score: 0, match: null };
    for (const e of expect) {
      const n = normalize(e);
      const s = Math.max(similarity(a, n), similarity(fold(a), fold(n)) * 0.95);
      if (s > best.score) best = { score: s, match: e };
    }
    const words = a.split(' ');
    for (const k of keywords) {
      const nk = normalize(k);
      if (words.some((w) => w.startsWith(nk) || similarity(fold(w), fold(nk)) > 0.8)) return { score: 1, match: k };
    }
    return best;
  }
}
