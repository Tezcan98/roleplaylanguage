import { EV } from '../core/events.js';
import { parseTime } from './TimeSystem.js';

const val = (v, ctx) => (typeof v === 'function' ? v(ctx) : v);

/**
 * Runs the story script: chapters (who is where, what time it is) and the quest chain
 * inside each chapter. Quests complete from events (pick up, enter location) or from
 * dialogue effects — the director never needs to know which system caused it.
 */
export class StoryDirector {
  constructor({ story, state, bus, time, cast, travel, cards, toasts }) {
    Object.assign(this, { story, state, bus, time, cast, travel, cards, toasts });
    bus.on(EV.ITEM_PICKED, ({ item }) => { if (this.quest?.complete?.pick === item.kind) this.complete(); });
    bus.on(EV.LOCATION, ({ id }) => { if (this.quest?.complete?.enter === id) this.complete(); });
  }

  /** Late-bound so content functions can read the game through the context facade. */
  setContext(ctx) { this.ctx = ctx; }

  get chapter() { return this.story.chapters[this.state.chapter] ?? null; }
  get quest() { return this.chapter?.quests[this.state.quest] ?? null; }
  questIndex(id) { return this.chapter?.quests.findIndex((q) => q.id === id) ?? -1; }
  /** True once the quest with `id` has become current (or is already done). */
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
    this.state.chapter = i;
    this.state.quest = 0;
    this.time.set(ch.day, parseTime(ch.time));
    this.cast.apply(ch.cast);
    this.travel.place(ch.location, ch.spawn, { silent: true });
    this.bus.emit(EV.CHAPTER, { chapter: ch });
    this.cards.show(ch.intro, () => { this.#announce(); onPlay?.(); });
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
    else setTimeout(() => this.#announce(), 900);
    this.bus.emit(EV.QUEST, { quest: next });
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
