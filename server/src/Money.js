import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * The money of the game, by day, as the owner types it on the numbers page (AdStats.js): what AdMob
 * earned and what Google Ads spent, in the account's currency. (Both could come from Google's APIs
 * one day; they need the owner's OAuth consent, so for now they are typed.) One small file, DIR/money.json.
 *
 *   { "2026-10-28": { "revenue": 4.58, "spend": 20 }, … }
 */
const DAY = /^\d{4}-\d{2}-\d{2}$/;
const MAX = 1_000_000; // a day's amount can't be more than this (a typo guard)

export class Money {
  #days = {};

  constructor({ dir = null } = {}) {
    this.dir = dir;
    if (dir) {
      mkdirSync(dir, { recursive: true });
      try { this.#days = JSON.parse(readFileSync(join(dir, 'money.json'), 'utf8')); } catch { /* none yet */ }
    }
  }

  /** Sets a day's `revenue` and / or `spend` (an empty string clears it); false when the day or an amount is not valid. */
  set(day, { revenue, spend } = {}) {
    if (!DAY.test(String(day))) return false;
    const cur = { ...(this.#days[day] ?? {}) };
    for (const [k, v] of [['revenue', revenue], ['spend', spend]]) {
      if (v === undefined) continue;
      if (v === '' || v === null) { delete cur[k]; continue; }
      const n = Number(String(v).replace(',', '.'));
      if (!Number.isFinite(n) || n < 0 || n > MAX) return false;
      cur[k] = Math.round(n * 100) / 100;
    }
    if (Object.keys(cur).length) this.#days[day] = cur; else delete this.#days[day];
    this.#save();
    return true;
  }

  #save() {
    if (!this.dir) return;
    try { const f = join(this.dir, 'money.json'), t = `${f}.tmp`; writeFileSync(t, JSON.stringify(this.#days)); renameSync(t, f); } catch { /* disk full: the memory still has it */ }
  }

  /** Newest day first: [{ day, revenue, spend }], and the sums. */
  summary() {
    const days = Object.keys(this.#days).sort().reverse().map((day) => ({ day, revenue: this.#days[day].revenue ?? null, spend: this.#days[day].spend ?? null }));
    const sum = (k) => Math.round(days.reduce((s, d) => s + (d[k] ?? 0), 0) * 100) / 100;
    return { days, revenue: sum('revenue'), spend: sum('spend') };
  }
}
