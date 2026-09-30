/**
 * Who owns input right now. The base mode is 'menu' or 'play'; dialogues, cards and
 * overlays push on top. The player only moves while the top is 'play'.
 */
export class ModeStack {
  #base = 'menu';
  #stack = [];

  setBase(mode) { this.#base = mode; }
  push(mode) {
    const token = { mode };
    this.#stack.push(token);
    return () => { const i = this.#stack.indexOf(token); if (i >= 0) this.#stack.splice(i, 1); };
  }
  get top() { return this.#stack.length ? this.#stack[this.#stack.length - 1].mode : this.#base; }
  get base() { return this.#base; }
  is(mode) { return this.top === mode; }
  has(mode) { return this.#base === mode || this.#stack.some((t) => t.mode === mode); }
}
