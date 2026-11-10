/** Shared football tuning: one full charge takes 1.2 s, and release always decides when to kick. */
export const CHARGE_MS = 1200;
export const clampPower = (p, fallback = 0.5) => Number.isFinite(p) ? Math.max(0, Math.min(1, p)) : fallback;
export const passSpeed = (power = 0.2) => 4 + 15 * clampPower(power, 0.2);
export const shotSpeed = (power = 0.5) => 8 + 12 * clampPower(power);

export class KickCharge {
  constructor(now = () => performance.now()) { this.now = now; this.started = null; }
  get active() { return this.started !== null; }
  get power() { return this.active ? Math.max(0.04, Math.min(1, (this.now() - this.started) / CHARGE_MS)) : 0; }
  start() { if (this.active) return false; this.started = this.now(); return true; }
  release() { if (!this.active) return null; const power = this.power; this.cancel(); return power; }
  cancel() { this.started = null; }
}

/** Select a receiver near a ground tap, or inside a narrow cone in the intended direction. */
export function passReceiver(origin, direction, targets = [], point = null) {
  const n = Math.hypot(direction.x, direction.z) || 1;
  let best = null, bestScore = Infinity;
  for (const target of targets) {
    if (target.seated || target.mount || target.group?.visible === false) continue;
    const p = target.position ?? target;
    if (!Number.isFinite(p?.x) || !Number.isFinite(p?.z)) continue;
    const x = p.x - origin.x, z = p.z - origin.z, distance = Math.hypot(x, z);
    if (distance < 1 || distance > 32) continue;
    const cosine = (x * direction.x + z * direction.z) / (distance * n);
    const nearTap = point ? Math.hypot(point.x - p.x, point.z - p.z) : 0;
    if (point ? nearTap > 3.5 || cosine < 0.7 : cosine < Math.cos(Math.PI / 7)) continue;
    const score = point ? nearTap + distance * 0.01 : (1 - cosine) * 30 + distance * 0.03;
    if (score < bestScore) { best = target; bestScore = score; }
  }
  return best;
}
