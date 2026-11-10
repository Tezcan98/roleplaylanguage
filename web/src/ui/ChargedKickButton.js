import { ShotButton } from './ActionButton.js';
import { el } from './dom.js';
import { withGloss } from '../i18n/Gloss.js';
import { KickCharge } from '../systems/FootballKick.js';

/** Capture the kicking thumb independently of the joystick; kick exactly once on release. */
export class ChargedKickButton extends ShotButton {
  constructor(host, onKick, anchor, { canUse = () => true, onStart = () => {}, ...options } = {}) {
    super(host, () => {}, anchor, { ...options, press: false });
    Object.assign(this, { onKick, canUse, onStart });
    this.charge = new KickCharge();
    this.owner = null;
    this.root.classList.add('charged-kick');
    this.root.title = withGloss('Basılı tut, bırakınca vur', 'Hold, then release');
    this.fill = el('span', { class: 'kick-fill' });
    this.value = el('span', { class: 'kick-value' });
    this.meter = el('span', { class: 'kick-meter', attrs: { role: 'progressbar', 'aria-label': withGloss('Güç', 'Power'), 'aria-valuemin': '0', 'aria-valuemax': '100', 'aria-valuenow': '0' } }, [this.fill]);
    this.root.append(this.meter, this.value);
    this.root.addEventListener('pointerdown', (e) => {
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      e.preventDefault();
      if (this.begin({ pointerId: e.pointerId })) {
        try { this.root.setPointerCapture(e.pointerId); } catch { /* fallback: pointerup still works on the button */ }
      }
    });
    this.root.addEventListener('pointerup', (e) => { if (this.owner?.pointerId === e.pointerId) { e.preventDefault(); this.finish(); } });
    for (const event of ['pointercancel', 'lostpointercapture']) this.root.addEventListener(event, (e) => { if (this.owner?.pointerId === e.pointerId) this.cancel(); });
    this.root.addEventListener('keydown', (e) => {
      if (e.code === 'Space' || e.code === 'Enter') this.keyDown(e);
    });
    this.root.addEventListener('blur', () => { if (this.owner?.key) this.cancel(); });
    this.root.addEventListener('click', (e) => {
      e.preventDefault();
      // Screen-reader activation is a short kick; ignore the click synthesized after key release.
      if (e.detail === 0 && !this.charging && performance.now() > (this.suppressClickUntil ?? 0) && !this.root.hidden && this.canUse()) { this.onStart(); this.onKick(0.04); }
    });
    addEventListener('blur', () => this.cancel());
    document.addEventListener('visibilitychange', () => { if (document.hidden) this.cancel(); });
  }

  get charging() { return this.charge.active; }
  get power() { return this.charge.power; }

  begin(owner) {
    if (this.charging || this.root.hidden || !this.canUse()) return false;
    this.onStart();
    this.owner = owner;
    this.charge.start();
    this.root.classList.add('charging');
    this.paint();
    const frame = () => {
      if (!this.charging) return;
      if (!this.canUse() || document.hidden) { this.cancel(); return; }
      this.paint(); this.frame = requestAnimationFrame(frame);
    };
    this.frame = requestAnimationFrame(frame);
    return true;
  }

  keyDown(e) {
    if (e.repeat || e.altKey || e.ctrlKey || e.metaKey || e.target?.closest?.('input,textarea,select,[contenteditable="true"]')) return;
    if (this.begin({ key: e.code || e.key.toLowerCase() })) e.preventDefault();
  }

  keyUp(e) {
    if (this.owner?.key === (e.code || e.key.toLowerCase())) { e.preventDefault(); this.finish(); }
  }

  paint() {
    const power = this.power, percent = Math.round(power * 100);
    this.fill.style.transform = `scaleX(${power})`;
    this.meter.setAttribute('aria-valuenow', String(percent));
    this.value.textContent = `${percent}%`;
    this.root.classList.toggle('full-power', power >= 0.99);
  }

  finish() {
    if (!this.charging) return;
    const usable = this.canUse() && !document.hidden && !this.root.hidden;
    const power = this.charge.release();
    this.suppressClickUntil = performance.now() + 350;
    this.cancel();
    if (usable) this.onKick(power);
  }

  cancel() {
    if (!this.charging && !this.owner) return;
    const pointerId = this.owner?.pointerId;
    this.owner = null; this.charge.cancel();
    cancelAnimationFrame(this.frame);
    this.root.classList.remove('charging', 'full-power');
    this.fill.style.transform = 'scaleX(0)';
    this.meter.setAttribute('aria-valuenow', '0'); this.value.textContent = '';
    if (pointerId != null) { try { if (this.root.hasPointerCapture(pointerId)) this.root.releasePointerCapture(pointerId); } catch { /* capture already lost */ } }
  }

  show(on) { if (!on) this.cancel(); super.show(on); }
}
