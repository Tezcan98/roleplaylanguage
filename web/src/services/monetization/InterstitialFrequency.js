/** Shared across travel, day changes and chess; persisted so reopening does not reset the cadence. */
export class InterstitialFrequency {
  constructor({ settings, every = 2 }) { this.settings = settings; this.every = Math.max(1, Math.floor(every) || 1); }
  take() {
    const previous = this.settings.get('interstitialOpportunities', 0);
    const next = (Number.isSafeInteger(previous) && previous >= 0 ? previous : 0) + 1;
    this.settings.set('interstitialOpportunities', next);
    return next % this.every === 0;
  }
}
