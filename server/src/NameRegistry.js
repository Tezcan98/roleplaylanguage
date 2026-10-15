/**
 * Usernames are unique: a name belongs to the device (`pid`, the game's device id) that took it
 * first, and nobody else can use it (case and Turkish İ/ı don't matter). Taking a new name lets the
 * device's old one go. Automatic story-mode names ("Oyuncu37") are not kept: in a room they are told
 * apart by a number. Saved as a small JSON file, a moment after a change.
 */
import { readFileSync, writeFileSync, renameSync } from 'node:fs';

const AUTO = /^Oyuncu\d+$/i;
const key = (name) => String(name).trim().toLocaleLowerCase('tr');

export class NameRegistry {
  #timer = null;

  constructor(path = null) { this.path = path; this.names = new Map(); } // key → { name, pid, at }

  load() {
    if (!this.path) return this;
    try { for (const row of JSON.parse(readFileSync(this.path, 'utf8'))) if (row?.name && row?.pid) this.names.set(key(row.name), row); } catch { /* no file yet */ }
    return this;
  }

  /** Whether this device may use the name: 'ok' (free or its own) or 'taken'. */
  check(name, pid) {
    if (AUTO.test(name)) return 'ok';
    const row = this.names.get(key(name));
    return !row || (pid && row.pid === pid) ? 'ok' : 'taken';
  }

  /** The device takes the name (its previous one is let go). 'ok' or 'taken'. */
  claim(name, pid) {
    const verdict = this.check(name, pid);
    if (verdict !== 'ok' || AUTO.test(name) || !pid) return verdict;
    const k = key(name);
    if (this.names.get(k)?.pid === pid && this.names.get(k)?.name === name) return 'ok';
    for (const [other, row] of this.names) if (row.pid === pid && other !== k) this.names.delete(other);
    this.names.set(k, { name, pid, at: Date.now() });
    this.#save();
    return 'ok';
  }

  #save() {
    if (!this.path) return;
    clearTimeout(this.#timer);
    this.#timer = setTimeout(() => {
      try {
        writeFileSync(`${this.path}.tmp`, JSON.stringify([...this.names.values()]));
        renameSync(`${this.path}.tmp`, this.path);
      } catch (e) { console.warn(`[names] could not save: ${e.message}`); }
    }, 1000);
    this.#timer.unref?.();
  }
}
