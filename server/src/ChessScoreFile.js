/** İsmail Dede's chess score board on disk, so a restart doesn't wipe it (a small JSON file). */
import { readFileSync, writeFileSync, renameSync } from 'node:fs';

export class ChessScoreFile {
  #timer = null;

  constructor(path) { this.path = path; this.scores = new Map(); }

  load() {
    try {
      for (const row of JSON.parse(readFileSync(this.path, 'utf8'))) if (row?.name) this.scores.set(String(row.name).toLocaleLowerCase('tr'), row);
    } catch { /* no file yet */ }
    return this.scores;
  }

  /** Written a moment after a game ends (several games ending together → one write). */
  save() {
    clearTimeout(this.#timer);
    this.#timer = setTimeout(() => {
      try {
        writeFileSync(`${this.path}.tmp`, JSON.stringify([...this.scores.values()]));
        renameSync(`${this.path}.tmp`, this.path);
      } catch (e) { console.warn(`[chess] could not save scores: ${e.message}`); }
    }, 2000);
    this.#timer.unref?.();
  }
}
