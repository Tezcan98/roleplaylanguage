import { CONFIG } from '../../config/remote.js';
import { EV } from '../../core/events.js';

const KEY = 'wallet';
const DAY = 24 * 60 * 60 * 1000;
export const AD_EVERY = CONFIG.rewards.videoEveryHours * 60 * 60 * 1000; // a rewarded video at most every hour (set on the server: config/remote.js)
export const AD_REWARD = CONFIG.rewards.video;
/** "Paylaş, kazan": credits for sharing the game, once a day (a new day at midnight). */
export const SHARE_REWARD = CONFIG.rewards.share;
/** Daily reward by how many days in a row you came: day 1 → 3, … day 7 and on → 10. */
export const DAILY = CONFIG.rewards.daily;
/** An outfit tried on for a rewarded video: this long (a day). */
export const TRIAL_MS = 24 * 60 * 60 * 1000;

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
  owns(id) { return this.bought(id) || this.trialLeft(id) > 0; }
  /** Bought for good (not just tried on for a day). */
  bought(id) { return id === 'adFree' ? this.adFree : this.data.owned.includes(id); }

  /** Buy a shop item with credits. */
  buy(item) {
    if (this.bought(item.id) || !this.trySpend(item.price)) return false;
    if (item.id === 'adFree') this.data.adFree = true; else this.data.owned.push(item.id);
    if (item.slot) this.data.equipped[item.slot] = item.id;
    this.#save();
    return true;
  }

  // --- food: good for a while ------------------------------------------------------
  /** ms left of a food's boost (0: none). */
  boostLeft(id, now = Date.now()) { return Math.max(0, (this.data.boosts?.[id] ?? 0) - now); }

  /** Eat a food from the shop: its price in credits, its minutes added on to what is left. */
  eat(food, now = Date.now()) {
    if (!this.trySpend(food.price)) return false;
    this.data.boosts = { ...this.data.boosts, [food.id]: now + this.boostLeft(food.id, now) + food.minutes * 60000 };
    this.#save();
    return true;
  }

  equip(item) { if (!this.owns(item.id)) return false; this.data.equipped[item.slot] = item.id; this.#save(); return true; }
  unequip(slot) { delete this.data.equipped[slot]; this.#save(); }
  equipped(slot) { this.#expire(); return this.data.equipped[slot] ?? null; }

  // --- tried on for a day (a rewarded video in the shop) ------------------------------
  /** ms left of an item tried on (0: none). */
  trialLeft(id, now = Date.now()) { return Math.max(0, (this.data.trials?.[id] ?? 0) - now); }
  /** `ids`: the item and what it needs (an outfit: the HD character too), each for TRIAL_MS. */
  tryOn(ids, now = Date.now()) {
    this.data.trials = { ...this.data.trials };
    for (const id of ids) if (!this.bought(id)) this.data.trials[id] = now + TRIAL_MS;
    this.#save();
  }
  /** A day is up: the item comes off (unless it was bought meanwhile). */
  #expire(now = Date.now()) {
    const t = this.data.trials;
    if (!t) return;
    for (const [id, until] of Object.entries(t)) {
      if (until > now) continue;
      delete t[id];
      if (this.bought(id)) continue;
      for (const [slot, on] of Object.entries(this.data.equipped)) if (on === id) delete this.data.equipped[slot];
      this.#save();
    }
  }

  // --- rewarded video ---------------------------------------------------------------
  /** ms until the next rewarded video may be watched (0 = now). */
  adWait(now = Date.now()) { return Math.max(0, this.data.adAt + AD_EVERY - now); }
  adWatched(now = Date.now()) { this.data.adAt = now; this.add(AD_REWARD, 'ad'); }
  /** Shared for credits today already? (once a day: tomorrow again) */
  sharedToday(now = Date.now()) { return this.data.shareDay === today(now); }
  shared(now = Date.now()) { this.data.shareDay = today(now); this.add(SHARE_REWARD, 'share'); }

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
