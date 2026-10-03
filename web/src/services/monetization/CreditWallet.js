import { EV } from '../../core/events.js';

const KEY = 'wallet';
const DAY = 24 * 60 * 60 * 1000;
export const AD_EVERY = 3 * 60 * 60 * 1000; // a rewarded video at most every 3 hours
export const AD_REWARD = 3;
/** Daily reward by how many days in a row you came: day 1 → 3, … day 7 and on → 10. */
export const DAILY = [3, 4, 5, 6, 7, 8, 10];

const today = (now = Date.now()) => { const d = new Date(now); return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`; };

/**
 * Credits, kept on the device apart from the story save (a new game never takes away what you
 * bought or earned). Also what you own: ad-free mode, outfits, and when you last watched a video
 * or took the daily reward. Earned by playing, the daily reward, rewarded videos and credit packs.
 */
export class CreditWallet {
  /** @param {{ settings: { get, set }, bus, start?: number }} o */
  constructor({ settings, bus, start = 50 }) {
    this.settings = settings; this.bus = bus;
    this.data = { credits: start, adFree: false, owned: [], equipped: {}, adAt: 0, streak: 0, dailyDay: '', ...settings.get(KEY, {}) };
    if (!settings.get(KEY)) this.#save();
  }

  #save() { this.settings.set(KEY, this.data); }
  #changed(delta, reason) { this.#save(); this.bus.emit(EV.CREDITS, { balance: this.balance, delta, reason }); }

  get balance() { return this.data.credits; }
  get adFree() { return !!this.data.adFree; }

  add(n, reason = '') { this.data.credits += n; this.#changed(n, reason); }

  trySpend(n) {
    if (this.balance < n) return false;
    this.data.credits -= n;
    this.#changed(-n, 'spend');
    return true;
  }

  // --- what you own ---------------------------------------------------------------
  owns(id) { return id === 'adFree' ? this.adFree : this.data.owned.includes(id); }

  /** Buy a shop item with credits. */
  buy(item) {
    if (this.owns(item.id) || !this.trySpend(item.price)) return false;
    if (item.id === 'adFree') this.data.adFree = true; else this.data.owned.push(item.id);
    if (item.slot) this.data.equipped[item.slot] = item.id;
    this.#save();
    return true;
  }

  equip(item) { if (!this.owns(item.id)) return false; this.data.equipped[item.slot] = item.id; this.#save(); return true; }
  unequip(slot) { delete this.data.equipped[slot]; this.#save(); }
  equipped(slot) { return this.data.equipped[slot] ?? null; }

  // --- rewarded video ---------------------------------------------------------------
  /** ms until the next rewarded video may be watched (0 = now). */
  adWait(now = Date.now()) { return Math.max(0, this.data.adAt + AD_EVERY - now); }
  adWatched(now = Date.now()) { this.data.adAt = now; this.add(AD_REWARD, 'ad'); }

  // --- daily reward -------------------------------------------------------------------
  /** Today's reward if it has not been taken yet: { day, amount }, else null. */
  daily(now = Date.now()) {
    if (this.data.dailyDay === today(now)) return null;
    const day = this.data.dailyDay === today(now - DAY) ? this.data.streak + 1 : 1;
    return { day, amount: DAILY[Math.min(day, DAILY.length) - 1] };
  }

  takeDaily(now = Date.now()) {
    const d = this.daily(now);
    if (!d) return null;
    Object.assign(this.data, { streak: d.day, dailyDay: today(now) });
    this.add(d.amount, 'daily');
    return d;
  }
}
