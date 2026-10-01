import { EV } from '../core/events.js';

/**
 * Walks a character's dialogue graph. Each node shows a line and runs one activity;
 * the result decides the next node and which effects fire.
 *
 * Node: { say, en, words?: [tr, en][], hint?, ask?: 'choice'|'listen'|'order'|'speak', ... }
 *  - choice / listen: options: [{ tr, en, next?, do?, wrong? }]  (listen hides `say` until solved)
 *  - order: answer, en?, next?, do?
 *  - speak: expect: string[], keywords?, show?, hide?, next?, do?
 * `next: 'end'` (or missing) closes the conversation.
 */
export class DialogueController {
  #session = 0;
  #activity = null;
  #popMode = null;

  constructor({ dialogues, cast, view, activities, effects, vocab, tts, modes, bus, input }) {
    Object.assign(this, { dialogues, cast, view, activities, effects, vocab, tts, modes, bus });
    this.talking = null;
    this.node = null;
    input.onKey((e) => {
      if (!this.talking) return;
      const n = parseInt(e.key, 10);
      if (n >= 1 && n <= 9) this.#activity?.key(n);
      if (e.key === 'Escape') this.close();
    });
  }

  setContext(ctx) { this.ctx = ctx; }

  /** Open with the NPC's own `start`, or at a specific node (used by house rules). */
  open(npcId, nodeId) {
    const d = this.dialogues[npcId];
    const start = nodeId ?? d?.start(this.ctx);
    if (!start || this.talking) return;
    this.talking = npcId;
    this.cast.get(npcId).talking = true;
    this.#popMode = this.modes.push('dialogue');
    this.view.open(this.cast.get(npcId).def);
    this.bus.emit(EV.DIALOGUE_OPEN, { npc: npcId });
    this.show(start);
  }

  async show(id) {
    const node = this.dialogues[this.talking].nodes[id];
    if (!node) throw new Error(`${this.talking}: missing node "${id}"`);
    const session = ++this.#session;
    const type = node.ask ?? 'choice';
    const hidden = type === 'listen';
    this.node = node;
    this.lastLine = node.say;
    this.tts.warm?.(node.say, this.talking);
    if (hidden) this.view.setLine('🔊 …', 'Listen carefully', true);
    else this.view.setLine(node.say, node.en);
    this.view.setHint(null);
    this.view.setWords(hidden ? [] : node.words);
    if (!hidden) this.#learn(node);

    this.#activity?.destroy();
    this.view.clearActivity();
    const activity = this.#activity = this.activities.create(type);
    const result = await activity.mount(this.view.slot, {
      ...node,
      speaker: this.talking,
      onWrong: () => { this.view.setLine(hidden ? '🔊 Hayır, tekrar dinle!' : 'Hayır, tekrar dene!', 'Try again!', hidden); this.view.setHint(node.hint); },
    });
    if (session !== this.#session || !this.talking) return; // closed or moved on meanwhile

    if (hidden) { // reveal what was said before moving on
      this.view.setLine(node.say, node.en);
      this.view.setWords(node.words);
      this.#learn(node);
      this.#activity.destroy();
      await new Promise((r) => setTimeout(r, 1400));
      if (session !== this.#session || !this.talking) return;
    }
    const opt = result.option ?? {};
    const next = opt.next ?? 'end';
    this.effects.run(opt.do);
    if (next === 'end') this.close(); else this.show(next);
  }

  #learn(node) { (node.words || []).forEach(([tr, en]) => this.vocab.learn(tr, en)); }

  speak() { if (this.lastLine && this.talking) this.tts.speak(this.lastLine, { speaker: this.talking }); }

  close() {
    if (!this.talking) return;
    this.#session++;
    this.#activity?.destroy();
    this.#activity = null;
    this.node = null;
    this.cast.get(this.talking).talking = false;
    const npc = this.talking;
    this.talking = null;
    this.view.close();
    this.tts.cancel();
    this.#popMode?.();
    this.bus.emit(EV.DIALOGUE_CLOSE, { npc });
  }
}
