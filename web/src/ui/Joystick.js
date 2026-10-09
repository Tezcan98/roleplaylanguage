import { el } from './dom.js';

/** On-screen thumbstick. Reports a normalised vector through `onMove`. */
export class Joystick {
  constructor(host, radius = 62) {
    this.onMove = () => {};
    this.knob = el('div', { attrs: { id: 'knob' } });
    this.root = el('div', { attrs: { id: 'joy', 'aria-hidden': 'true' } }, [this.knob]);
    // 🏃 above the stick: tap to run, tap again to walk (Shift on a keyboard)
    this.running = false;
    this.runBtn = el('button', { attrs: { id: 'run', type: 'button', 'aria-label': 'Koş', 'aria-pressed': 'false' }, text: '🏃', on: { click: () => { this.running = !this.running; this.runBtn.setAttribute('aria-pressed', String(this.running)); } } });
    host.append(this.root); // the 🏃 button (this.runBtn) is not shown while running is off (PlayerController)
    let id = null;
    const move = (e) => {
      const r = this.root.getBoundingClientRect();
      let dx = e.clientX - (r.left + r.width / 2), dy = e.clientY - (r.top + r.height / 2);
      const m = Math.hypot(dx, dy);
      if (m > radius) { dx *= radius / m; dy *= radius / m; }
      this.knob.style.transform = `translate(${dx}px,${dy}px)`;
      this.onMove(dx / radius, dy / radius);
    };
    const end = (e) => { if (e.pointerId !== id) return; id = null; this.knob.style.transform = ''; this.onMove(0, 0); };
    this.root.addEventListener('pointerdown', (e) => { id = e.pointerId; this.root.setPointerCapture(id); move(e); });
    this.root.addEventListener('pointermove', (e) => { if (e.pointerId === id) move(e); });
    this.root.addEventListener('pointerup', end);
    this.root.addEventListener('pointercancel', end);
  }
  set visible(v) { this.root.hidden = !v; this.runBtn.hidden = !v; }
}
