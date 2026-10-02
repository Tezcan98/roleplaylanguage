import { el } from './dom.js';

/** On-screen thumbstick. Reports a normalised vector through `onMove`. */
export class Joystick {
  constructor(host, radius = 62) {
    this.onMove = () => {};
    this.knob = el('div', { attrs: { id: 'knob' } });
    this.root = el('div', { attrs: { id: 'joy', 'aria-hidden': 'true' } }, [this.knob]);
    host.append(this.root);
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
  set visible(v) { this.root.hidden = !v; }
}
