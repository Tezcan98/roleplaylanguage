/**
 * Developer codes (the hidden "Kod" card: hold the settings title down). A code is a word and an
 * optional number ("Elma ağacı 5"): spaces, case and Turkish letters don't matter.
 * Only a salted hash of each word is here, so the codes can't be read out of the game's files.
 */
const SALT = 'türk-ailem·dev';

/** "Elma ağacı 5" → { word: 'ELMAAGACI', n: 5 }; "Şeker" → { word: 'SEKER', n: null }. */
export function parseCode(text) {
  const flat = String(text).replace(/[ıiİ]/g, 'I').replace(/[şŞ]/g, 'S').replace(/[ğĞ]/g, 'G').replace(/[üÜ]/g, 'U').replace(/[öÖ]/g, 'O').replace(/[çÇ]/g, 'C')
    .toUpperCase().replace(/[^A-Z0-9]/g, '');
  const m = flat.match(/^([A-Z]+)(\d*)$/);
  return m ? { word: m[1], n: m[2] ? Number(m[2]) : null } : null;
}

async function hash(word) {
  const d = await globalThis.crypto.subtle.digest('SHA-256', new TextEncoder().encode(SALT + word));
  return [...new Uint8Array(d)].map((b) => b.toString(16).padStart(2, '0')).join('').slice(0, 24);
}

export class DevCodes {
  /** @param {Record<string, (n: number|null) => string|null>} actions — by the word's hash: does it, says what it did (null: not with that number) */
  constructor(actions) { this.actions = actions; }

  /** @returns {Promise<string|null>} what was done, or null for a wrong code */
  async redeem(text) {
    const c = parseCode(text);
    const run = c && this.actions[await hash(c.word)];
    return run ? run(c.n) : null;
  }
}
