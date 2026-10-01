import { EV } from '../core/events.js';
import { wordNote } from '../i18n/Gloss.js';

const val = (v, ctx) => (typeof v === 'function' ? v(ctx) : v);

/**
 * Runs free-roam actions (watch TV, wash hands…) and enforces house rules: if a rule
 * forbids the action right now, the family member reacts instead of the action happening.
 */
export class FreeActionSystem {
  constructor({ actions, rules, ctx, cast, world, dialogue, vocab, time, labels, toasts, tts, bus, clock }) {
    Object.assign(this, { actions, rules, ctx, cast, world, dialogue, vocab, time, labels, toasts, tts, bus, clock });
  }

  label(id) { return this.actions[id]?.label; }

  perform(id) {
    const a = this.actions[id];
    if (!a) throw new Error(`Unknown free action ${id}`);
    const rule = this.rules.find((r) => r.on === id && r.when(this.ctx));
    if (rule) { this.#enforce(rule); return; }

    const words = val(a.words, this.ctx) ?? [];
    words.forEach(([tr, en]) => this.vocab.learn(tr, en));
    this.labels.think(val(a.think, this.ctx), 3.5, this.clock());
    this.toasts.show(`🗣 ${val(a.say, this.ctx)}`, words.map(([tr, en]) => wordNote(tr, en)).join(' · '));
    if (a.minutes) this.time.advance(a.minutes);
    if (a.anim) this.world.current.play?.(a.anim);
    this.bus.emit(EV.FREE_ACTION, { id });
  }

  #enforce(rule) {
    const npc = this.cast.get(rule.by);
    if (npc?.location === this.world.current.id) { this.dialogue.open(rule.by, rule.node); return; }
    const [tr, en] = rule.shout;
    this.toasts.show(`${npc?.def.short ?? ''} seslendi: “${tr}”`, en);
    this.tts.speak(tr, { speaker: rule.by });
  }
}
