const TR_WORDS = new Set(('ve bir bu şu o ne evet hayır merhaba teşekkür teşekkürler ben sen biz siz çok var yok mı mi mu mü '
  + 'için ile gibi ama değil tamam anne baba dede günaydın iyi geceler lütfen afiyet olsun sağlık adım benim nasılsın '
  + 'kaç yaş yaşındayım eder kırmızı beş üç iki dört on okul ev kitap su çay ekmek').split(' '));
const EN_WORDS = new Set(('the a an is are am i you he she it we they what yes no hello hi thank thanks my your to and of in '
  + 'on this that please good morning night name how old red five three water tea bread school home book').split(' '));
const TR_CHARS = /[çğıöşü]/;
const TR_SUFFIX = /(yor|yorum|dım|dim|dum|düm|tım|tim|lar|ler|ım|im|um|üm|sın|sin|mış|miş|acak|ecek|dır|dir)$/;

/**
 * Decides whether an utterance is Turkish. Prefers a language reported by the
 * recognizer (Whisper LID); otherwise scores the transcript with word lists,
 * Turkish-only letters and common suffixes.
 */
export class LanguageDetector {
  detect({ transcript = '', language, languageConfidence }) {
    if (language) return { lang: language.slice(0, 2).toLowerCase(), confidence: languageConfidence ?? 1, source: 'model' };
    // plain toLowerCase: the Turkish locale would turn English "I" into "ı"
    const words = transcript.toLowerCase().match(/[a-zçğıöşüi̇]+/g) ?? [];
    if (!words.length) return { lang: 'unknown', confidence: 0, source: 'heuristic' };
    let tr = 0, en = 0;
    for (const w of words) {
      if (TR_WORDS.has(w) || TR_CHARS.test(w)) tr += 1;
      else if (TR_SUFFIX.test(w) && w.length > 3) tr += 0.6;
      if (EN_WORDS.has(w)) en += 1;
    }
    const total = Math.max(1, tr + en);
    if (tr === 0 && en === 0) return { lang: 'unknown', confidence: 0.3, source: 'heuristic' };
    if (tr === en) return { lang: 'unknown', confidence: 0.5, source: 'heuristic' };
    return tr > en ? { lang: 'tr', confidence: tr / total, source: 'heuristic' } : { lang: 'en', confidence: en / total, source: 'heuristic' };
  }
}
