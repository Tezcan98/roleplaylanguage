import { readFileSync } from 'node:fs';

/**
 * Addresses whose play and ad numbers are not counted (the developer's own connections): one per line in a text file
 * (STATS_IGNORE_IPS, default next to the chess scores), `#` starts a comment. Read again at most every 30 s, so a new
 * address needs no restart. A request from one of them is answered as usual and simply not recorded.
 */
export class IgnoreIps {
  #set = new Set();
  #at = 0;

  constructor(file = '') { this.file = file; }

  has(ip) {
    if (!this.file || !ip) return false;
    const now = Date.now();
    if (now - this.#at > 30000) {
      this.#at = now;
      try { this.#set = new Set(readFileSync(this.file, 'utf8').split('\n').map((l) => l.replace(/#.*/, '').trim()).filter(Boolean)); } catch { this.#set = new Set(); }
    }
    const v4 = String(ip).replace(/^::ffff:/, '');
    return this.#set.has(v4);
  }
}
