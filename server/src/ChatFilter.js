/**
 * Keeps usernames and public speech bubbles clean. Whole words only, so ordinary words
 * that contain a bad one ("sikke", "amper") stay untouched. Kept deliberately short: the
 * game is for language learners, and over-blocking normal words is worse than a rare miss.
 */
const BLOCKED = new Set([
  'amk', 'aq', 'amq', 'orospu', 'oç', 'sik', 'sikik', 'siktir', 'sikerim', 'yarrak', 'yarak', 'piç', 'ibne', 'göt', 'götveren', 'kahpe', 'pezevenk',
  'fuck', 'fucking', 'shit', 'bitch', 'asshole', 'cunt', 'dick', 'pussy', 'bastard', 'whore', 'slut',
  'كس', 'قحبة', 'شرموط', 'شرموطة', 'عاهرة', 'منيوك', 'زب',
]);
const WORD = /[\p{L}\p{N}]+/gu;
// "S1kt1r" → "siktir": undo common digit swaps and fold dotless/dotted i
const LEET = { 0: 'o', 1: 'i', 3: 'e', 4: 'a', 5: 's', 7: 't', '@': 'a', '$': 's' };
const norm = (w) => w.normalize('NFKC').toLocaleLowerCase('tr').replace(/[013457@$]/g, (c) => LEET[c]).replace(/ı/g, 'i');
const bad = (w) => BLOCKED.has(norm(w)) || BLOCKED.has(w.toLocaleLowerCase('tr'));

export const ChatFilter = {
  /** True when the text contains a blocked word. */
  blocks: (text) => (String(text).match(WORD) ?? []).some(bad),
  /** The text with blocked words replaced by ***. */
  clean: (text) => String(text).replace(WORD, (w) => (bad(w) ? '***' : w)),
};
