/**
 * Keyboard + on-screen joystick → a movement vector and discrete key presses.
 * Consumers subscribe with `onKey`; they never read DOM events themselves.
 */
export class InputSystem {
  #keys = {};
  #joy = { x: 0, y: 0 };
  #listeners = new Set();

  constructor(joystick) {
    this.joystick = joystick;
    joystick.onMove = (x, y) => { this.#joy.x = x; this.#joy.y = y; };
    addEventListener('keydown', (e) => {
      if (document.activeElement?.tagName === 'INPUT') return;
      this.#keys[e.key.toLowerCase()] = true;
      this.#listeners.forEach((fn) => fn(e));
    });
    addEventListener('keyup', (e) => { this.#keys[e.key.toLowerCase()] = false; });
    addEventListener('blur', () => { this.#keys = {}; });
  }

  onKey(fn) { this.#listeners.add(fn); return () => this.#listeners.delete(fn); }

  /** @returns {{x:number, z:number}} unclamped movement intent */
  axis() {
    const k = this.#keys;
    let x = this.#joy.x, z = this.#joy.y;
    if (k.w || k.arrowup) z -= 1;
    if (k.s || k.arrowdown) z += 1;
    if (k.a || k.arrowleft) x -= 1;
    if (k.d || k.arrowright) x += 1;
    return { x, z };
  }
}
