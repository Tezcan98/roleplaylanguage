export const AGE_BANDS = ['18-24', '25-34', '35-44', '45-54', '55-64', '65+'];
export const AGE_VERSION = 1;
export function ageChoice(settings) {
  const a = settings.get('ageAnalysis');
  return a?.v === AGE_VERSION && AGE_BANDS.includes(a.band) && Number.isSafeInteger(a.at) && a.at > 0 ? a : null;
}

/** Keep opt-in observations separate; never relabel historical play with a newly supplied age. */
export class AgeAnalysis {
  constructor(settings) { this.settings = settings; this.sync(); }
  sync() {
    const choice = ageChoice(this.settings), token = choice ? `${choice.band}:${choice.at}` : '';
    if (this.token !== token) { this.token = token; this.sec = 0; this.counts = {}; }
    this.choice = choice;
    return choice;
  }
  count(key, n) { if (/^(quest|textbook:solved|q:[a-z0-9:._-]{1,36})$/.test(key) && this.sync()) this.counts[key] = (this.counts[key] ?? 0) + n; }
  tick() { if (this.sync()) this.sec++; }
  take() {
    this.sync();
    const sample = this.choice ? { ...this.choice, sec: Math.min(this.sec, 3600), counts: this.counts } : null;
    const token = this.token; this.sec = 0; this.counts = {};
    return { sample, token };
  }
  retry({ sample, token }) {
    this.sync();
    if (!sample || token !== this.token) return;
    this.sec += sample.sec;
    for (const [key, n] of Object.entries(sample.counts)) this.counts[key] = (this.counts[key] ?? 0) + n;
  }
}
