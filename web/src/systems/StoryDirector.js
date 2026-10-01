import { EV } from '../core/events.js';
import { parseTime } from './TimeSystem.js';

const val = (v, ctx) => (typeof v === 'function' ? v(ctx) : v);

/**
 * Runs the story script: chapters (time of day, who is where) and the quest chain
 * inside each chapter. Quests complete from events (pick up, enter a location, use a
 * hotspot) or from dialogue effects — the director never needs to know who caused it.
 */
export class StoryDirector {
  #talking = false;
  #pendingNext = false;
  #started = false;
  #paused = false;

  constructor({ story, state, bus, time, cast, travel, cards, toasts, fader }) {
    Object.assign(this, { story, state, bus, time, cast, travel, cards, toasts, fader });
    bus.on(EV.ITEM_PICKED, ({ item }) => { if (this.quest?.complete?.pick === item.kind) this.complete(); });
    bus.on(EV.LOCATION, ({ id }) => { if (this.quest?.complete?.enter === id) this.complete(); });
    bus.on(EV.HOTSPOT, ({ id }) => { if (this.quest?.complete?.use === id) this.complete(); });
    bus.on(EV.FLAG, ({ name }) => { if (this.quest?.complete?.flag === name) this.complete(); });
    bus.on(EV.DIALOGUE_OPEN, () => { this.#talking = true; });
    bus.on(EV.DIALOGUE_CLOSE, () => {
      this.#talking = false;
      if (this.#pendingNext) { this.#pendingNext = false; setTimeout(() => this.nextChapter(), 400); }
    });
  }

  /** Late-bound: content functions read the game through the context facade; chapters run effects. */
  setContext(ctx) { this.ctx = ctx; }
  setEffects(effects) { this.effects = effects; }

  get chapter() { return this.story.chapters[this.state.chapter] ?? null; }
  get quest() { return this.#paused ? null : this.chapter?.quests[this.state.quest] ?? null; }

  /**
   * Off-story time (online square, school practice): no quest, no arrow, nothing completes;
   * NPCs fall back to small talk. `resumeStory()` picks up exactly where it was.
   */
  pause() { this.#paused = true; this.bus.emit(EV.QUEST, { quest: null }); }
  resumeStory() { this.#paused = false; this.bus.emit(EV.QUEST, { quest: this.quest }); }
  get paused() { return this.#paused; }
  questIndex(id) { return this.chapter?.quests.findIndex((q) => q.id === id) ?? -1; }
  /** True once the quest with `id` has become current (or is already done) in this chapter. */
  reached(id) { const i = this.questIndex(id); return i >= 0 && this.state.quest >= i; }

  objective() {
    const q = this.quest;
    if (!q) return null;
    return { title: q.title, text: val(q.obj, this.ctx), en: val(q.en, this.ctx) };
  }
  target() { return this.quest ? val(this.quest.target, this.ctx) ?? null : null; }

  /** Set up chapter `i` (call behind a fade), then show its intro card. */
  startChapter(i, onPlay) {
    const ch = this.story.chapters[i];
    const minutes = parseTime(ch.time);
    const sameDay = this.#started && ch.day === this.state.day && minutes > this.state.minutes;
    this.#started = true;
    this.state.chapter = i;
    this.state.quest = 0;
    if (sameDay) this.time.advanceTo(minutes, 3); // the sky visibly moves on behind the card
    else this.time.set(ch.day, minutes);
    this.cast.apply(ch.cast);
    this.travel.place(ch.location, ch.spawn, { silent: true, force: true });
    this.effects?.run(ch.enter);
    this.bus.emit(EV.CHAPTER, { chapter: ch });
    this.bus.emit(EV.QUEST, { quest: this.quest });
    this.cards.show(ch.intro, () => { this.#announce(); onPlay?.(); });
  }

  /** Continue a saved game: same chapter and quest, player at the saved location. */
  resume(spawn, onPlay) {
    const ch = this.chapter;
    this.#started = true;
    this.time.set(this.state.day, this.state.minutes);
    this.cast.apply(ch.cast);
    this.travel.place(this.state.location, spawn, { silent: true, force: true });
    this.bus.emit(EV.CHAPTER, { chapter: ch, resumed: true });
    this.bus.emit(EV.QUEST, { quest: this.quest });
    this.cards.show({ num: ch.intro.num, title: ch.intro.title, text: 'Kaldığın yerden devam ediyorsun.', en: 'Continuing where you left off.', button: 'Devam' }, () => { this.#announce(); onPlay?.(); });
  }

  /** Move to the next chapter once any open conversation has ended. */
  nextChapter() {
    if (this.#talking) { this.#pendingNext = true; return; }
    const i = this.state.chapter + 1;
    if (!this.story.chapters[i]) {
      const o = this.story.outro;
      if (o) this.cards.show({ ...o, text: val(o.text, this.ctx) });
      return;
    }
    this.fader.run(() => this.startChapter(i));
  }

  complete(id) {
    const q = this.quest;
    if (!q || (id && id !== q.id)) return;
    this.bus.emit(EV.QUEST_DONE, { quest: q });
    this.time.advance(q.minutes ?? 10);
    this.state.quest++;
    this.toasts.show('Görev tamamlandı!', 'Quest complete');
    const next = this.quest;
    if (next?.intro) this.pendingIntro = next.intro;
    else if (next) setTimeout(() => this.#announce(), 900);
    this.bus.emit(EV.QUEST, { quest: next });
    this.effects?.run(q.after);
  }

  /** Called by travel after the fade, so intro cards appear in the new place. */
  flushIntro() {
    if (!this.pendingIntro) return;
    const intro = this.pendingIntro;
    this.pendingIntro = null;
    this.cards.show(intro, () => this.#announce());
  }

  #announce() {
    const q = this.quest;
    this.bus.emit(EV.QUEST, { quest: q });
    if (q && !q.final) this.toasts.show(`Yeni görev: ${q.title}`, val(q.en, this.ctx));
  }
}
