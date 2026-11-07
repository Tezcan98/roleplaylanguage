import { CROPS } from '../systems/GardenSystem.js';

// Reserved range, separate from daily reward reminders (7001/7002).
const FIRST_ID = 7200, WATER_ID = 7210;
const IDS = [...Array.from({ length: 9 }, (_, i) => FIRST_ID + i), WATER_ID];
export const WATER_DELAY = 5 * 60000;

/** Group nearby harvests into one message; reminders are one-shot, never repeating. */
export function gardenNotificationPlan(plots, now = Date.now()) {
  const groups = new Map(), dry = [];
  plots.slice(0, 9).forEach((p, i) => {
    if (!p?.crop || !CROPS[p.crop]) return;
    if (p.wateredAt == null) {
      if (Number.isFinite(p.plantedAt)) dry.push({ i, at: p.plantedAt + WATER_DELAY });
      return;
    }
    if (!Number.isFinite(p.wateredAt)) return;
    const at = p.wateredAt + CROPS[p.crop].minutes * 60000;
    if (at <= now) return; // Delivered while closed: do not repeat it at every launch.
    const bucket = Math.floor(at / 60000);
    if (!groups.has(bucket)) groups.set(bucket, []);
    groups.get(bucket).push({ i, at, crop: p.crop });
  });
  const plan = [...groups.values()].map(group => ({
    id: FIRST_ID + group[0].i,
    title: 'Bahçende hasat zamanı! 🌱',
    body: group.length === 1
      ? `${group[0].i + 1}. gözdeki ${CROPS[group[0].crop].name.toLocaleLowerCase('tr')} olgunlaştı. Bahçene gel, olgun ürünlerini topla!`
      : `${group.map(p => p.i + 1).join(', ')}. gözlerdeki ürünlerin olgunlaştı. Bahçene gel, olgun ürünlerini topla!`,
    // Last plant in the group must also be mature before announcing it.
    schedule: { at: new Date(Math.max(...group.map(p => p.at))) },
    extra: { garden: true, kind: 'harvest', plots: group.map(p => p.i) },
  }));
  const upcomingDry = dry.filter(p => p.at > now);
  if (upcomingDry.length) {
    const at = Math.min(...upcomingDry.map(p => p.at));
    plan.push({
      id: WATER_ID, title: 'Bahçen can suyu bekliyor! 💧',
      body: `${dry.map(p => p.i + 1).join(', ')}. gözlerdeki tohumların henüz sulanmadı. Büyümeye başlamaları için can suyu ver.`,
      schedule: { at: new Date(at) },
      extra: { garden: true, kind: 'water', plots: dry.map(p => p.i) },
    });
  }
  return plan;
}

/** Serial reconciliation prevents a slow permission/schedule call from reviving stale alerts. */
export class GardenNotifications {
  constructor({ plugin, now = Date.now, warn = (...args) => console.warn(...args) }) {
    Object.assign(this, { plugin, now, warn });
    this.queue = Promise.resolve();
    this.asked = false;
  }
  sync({ plots = [], ask = false } = {}) {
    const snapshot = structuredClone(plots);
    this.queue = this.queue.then(() => this.#sync(snapshot, ask)).catch(e => this.warn('[garden notifications]', e));
    return this.queue;
  }
  async #sync(plots, ask) {
    let permission = await this.plugin.checkPermissions();
    if (ask && !this.asked && plots.some(p => p?.crop) && ['prompt', 'prompt-with-rationale'].includes(permission.display)) {
      this.asked = true;
      permission = await this.plugin.requestPermissions();
    }
    if (permission.display !== 'granted') return;
    const plan = gardenNotificationPlan(plots, this.now());
    const { notifications: pending } = await this.plugin.getPending();
    const ours = pending.filter(n => IDS.includes(n.id));
    const fingerprint = n => JSON.stringify([n.id, n.body, new Date(n.schedule?.at).getTime()]);
    const wanted = new Map(plan.map(n => [n.id, n]));
    const stale = ours.filter(n => !wanted.has(n.id) || fingerprint(n) !== fingerprint(wanted.get(n.id)));
    if (stale.length) await this.plugin.cancel({ notifications: stale.map(({ id }) => ({ id })) });
    const keep = new Set(ours.filter(n => !stale.includes(n)).map(n => n.id));
    const fresh = plan.filter(n => !keep.has(n.id) && n.schedule.at.getTime() > this.now());
    if (fresh.length) await this.plugin.schedule({ notifications: fresh });
  }
}
