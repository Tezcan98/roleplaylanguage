/**
 * The textbook as homework: pick a unit, read, learn the memory cards, solve every
 * exercise. Finishing a unit sets the flag `homework-<unitId>`.
 * Page progress is kept in GameState.flags (`tb-<unit>-<page>`).
 */
export class TextbookController {
  #activity = null;
  #pop = null;

  constructor({ book, view, activities, tts, vocab, state, effects, modes, toasts }) {
    Object.assign(this, { book, view, activities, tts, vocab, state, effects, modes, toasts });
    this.unit = null;
    this.page = -1;
  }

  open(unitId) {
    if (!this.#pop) this.#pop = this.modes.push('overlay');
    this.view.open();
    const u = unitId && this.book.units.find((x) => x.id === unitId);
    if (u) this.#show(u, 0); else this.#index();
  }

  close() {
    this.#activity?.destroy();
    this.view.close();
    this.#pop?.();
    this.#pop = null;
  }

  prev() { if (this.page > 0) this.#show(this.unit, this.page - 1); else this.#index(); }
  next() {
    if (!this.unit) return;
    if (this.page < this.unit.pages.length - 1) this.#show(this.unit, this.page + 1);
    else this.#index();
  }

  #flag(u, i) { return `tb-${u.id}-${i}`; }
  #pageDone(u, i) { return u.pages[i].type !== 'exercise' || !!this.state.flags[this.#flag(u, i)]; }
  status(u) { return this.state.flags[`homework-${u.id}`] ? 'done' : 'open'; }

  #index() {
    this.#activity?.destroy();
    this.unit = null;
    this.page = -1;
    this.view.frame('Türkçe Ders Kitabı', '', { prev: false, next: false });
    this.view.units(this.book.units, (u) => this.status(u), (u) => this.#show(u, 0));
  }

  async #show(u, i) {
    this.#activity?.destroy();
    this.unit = u;
    this.page = i;
    const p = u.pages[i];
    const last = i === u.pages.length - 1;
    const speak = (text) => this.tts.speak(text, { speaker: 'ogretmen' });
    this.view.frame(u.title, `Sayfa ${i + 1}/${u.pages.length}`, {
      prev: true, next: this.#pageDone(u, i) ? true : 'locked', nextLabel: last ? 'Bitir ✓' : undefined,
    });
    (p.words ?? []).forEach(([tr, en]) => this.vocab.learn(tr, en));
    if (p.type === 'read') { this.view.read(p, speak); return; }
    if (p.type === 'memory') { p.cards.forEach((c) => this.vocab.learn(c.tr, c.en)); this.view.memory(p, speak); return; }

    const slot = this.view.exercise(p);
    const act = this.#activity = this.activities.create(p.activity);
    await act.mount(slot, { ...p, onWrong: () => this.view.showHint(p.hint) });
    if (this.unit !== u || this.page !== i) return;
    this.state.flags[this.#flag(u, i)] = true;
    this.view.done('Doğru! ✓');
    this.view.enableNext();
    this.#checkUnit(u);
  }

  #checkUnit(u) {
    if (this.status(u) === 'done' || !u.pages.every((_, i) => this.#pageDone(u, i))) return;
    this.toasts.show('Ödev bitti! 🎉', `${u.titleEn} complete`);
    this.effects.run([`flag:homework-${u.id}`, ...(u.reward ? [`credits:${u.reward}`] : [])]); // extra units earn credits once
  }
}
