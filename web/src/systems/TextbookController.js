/**
 * The textbook as homework: pick a unit, read, learn the memory cards, solve every
 * exercise (or skip the whole homework unit after one rewarded ad). Finishing a unit sets
 * `homework-<unitId>`; skipped units have a separate flag from correct answers.
 * Page progress is kept in GameState.flags (`tb-<unit>-<page>`).
 */
export class TextbookController {
  #activity = null;
  #pop = null;
  #skipping = false;

  constructor({ book, view, activities, tts, vocab, state, effects, modes, toasts, canSkip = () => false, skipLabel = () => 'Ödevi reklamla geç', requestSkip = null }) {
    Object.assign(this, { book, view, activities, tts, vocab, state, effects, modes, toasts, canSkip, skipLabel, requestSkip });
    this.unit = null;
    this.page = -1;
  }

  open(unitId) {
    if (this.#skipping) return;
    if (!this.#pop) this.#pop = this.modes.push('overlay');
    this.view.open();
    const u = unitId && this.book.units.find((x) => x.id === unitId);
    if (u) this.#show(u, 0); else this.#index();
  }

  close() {
    if (this.#skipping) return;
    this.unit = null; this.page = -1;
    this.#activity?.destroy();
    this.view.close();
    this.#pop?.();
    this.#pop = null;
  }

  prev() { if (this.#skipping) return; if (this.page > 0) this.#show(this.unit, this.page - 1); else this.#index(); }
  next() {
    if (!this.unit || this.#skipping) return;
    if (this.page < this.unit.pages.length - 1) this.#show(this.unit, this.page + 1);
    else this.#index();
  }

  #flag(u, i) { return `tb-${u.id}-${i}`; }
  #pageDone(u, i) { return !!this.state.flags[`tb-${u.id}-skipped`] || u.pages[i].type !== 'exercise' || !!this.state.flags[this.#flag(u, i)] || !!this.state.flags[`${this.#flag(u, i)}-skipped`]; }
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
    if (this.status(u) !== 'done' && this.canSkip()) this.view.offerSkip(() => this.skip(), this.skipLabel());
    (p.words ?? []).forEach(([tr, en]) => this.vocab.learn(tr, en));
    if (p.type === 'read') { this.view.read(p, speak); return; }
    if (p.type === 'memory') { p.cards.forEach((c) => this.vocab.learn(c.tr, c.en)); this.view.memory(p, speak); return; }

    const slot = this.view.exercise(p);
    const act = this.#activity = this.activities.create(p.activity);
    await act.mount(slot, { ...p, onWrong: () => this.view.showHint(p.hint) });
    if (this.unit !== u || this.page !== i || this.#activity !== act) return;
    if (!this.state.flags[this.#flag(u, i)]) this.onProgress?.('solved', u.id, i);
    this.state.flags[this.#flag(u, i)] = true;
    this.view.done('Doğru! ✓');
    this.view.enableNext();
    this.#checkUnit(u);
    if (this.status(u) === 'done') this.view.offerSkip(null);
  }

  async skip() {
    const u = this.unit;
    if (this.#skipping || !u || this.status(u) === 'done' || !this.canSkip() || !this.requestSkip) return;
    this.#skipping = true;
    this.view.skipBusy(true);
    const pop = this.modes.push('overlay');
    this.tts.cancel();
    let earned = false;
    try { earned = (await this.requestSkip()) === true; } catch { /* allow retry */ }
    finally { this.#skipping = false; pop(); this.view.skipBusy(false); }
    if (!earned) {
      this.toasts.show('Geçmek için reklamı sonuna kadar izle. Reklam açılamadıysa tekrar deneyebilirsin.', 'Watch the full ad to skip this homework.');
      return;
    }
    if (this.status(u) === 'done') return;
    this.state.flags[`tb-${u.id}-skipped`] = true;
    this.onProgress?.('unit_skipped', u.id);
    const act = this.#activity;
    this.#activity = null; act?.destroy();
    this.view.offerSkip(null);
    this.view.enableNext();
    this.#checkUnit(u);
    this.close();
  }

  #checkUnit(u) {
    if (this.status(u) === 'done' || !u.pages.every((_, i) => this.#pageDone(u, i))) return;
    this.toasts.show('Ödev bitti! 🎉', `${u.titleEn} complete`);
    this.effects.run([`flag:homework-${u.id}`, ...(u.reward ? [`credits:${u.reward}`] : [])]); // extra units earn credits once
  }
}
