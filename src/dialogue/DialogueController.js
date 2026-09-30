import { EV } from '../core/events.js';

/**
 * Walks a character's dialogue graph. Each node shows a line and runs one activity;
 * the chosen option decides the next node and which effects fire.
 *
 * Node shape: { say, en, words?: [tr, en][], hint?, ask?: 'choice', options: [{ tr, en, next?, do?, wrong? }] }
 * `next: 'end'` (or missing) closes the conversation.
 */
export class DialogueController {
  #session = 0;
  #activity = null;
  #popMode = null;

  constructor({ dialogues, cast, view, activities, effects, vocab, speech, modes, bus, input }) {
    Object.assign(this, { dialogues, cast, view, activities, effects, vocab, speech, modes, bus });
    this.talking = null;
    input.onKey((e) => {
      if (!this.talking) return;
      const n = parseInt(e.key, 10);
      if (n >= 1 && n <= 9) this.#activity?.key(n);
      if (e.key === 'Escape') this.close();
    });
  }

  setContext(ctx) { this.ctx = ctx; }

  open(npcId) {
    const d = this.dialogues[npcId];
    const start = d?.start(this.ctx);
    if (!start) return;
    this.talking = npcId;
    this.cast.get(npcId).talking = true;
    this.#popMode = this.modes.push('dialogue');
    this.view.open(this.cast.get(npcId).def);
    this.bus.emit(EV.DIALOGUE_OPEN, { npc: npcId });
    this.show(start);
  }

  async show(id) {
    const d = this.dialogues[this.talking], node = d.nodes[id];
    if (!node) throw new Error(`${this.talking}: missing node "${id}"`);
    const session = ++this.#session;
    this.lastLine = node.say;
    this.view.setLine(node.say, node.en);
    this.view.setHint(null);
    this.view.setWords(node.words);
    (node.words || []).forEach(([tr, en]) => this.vocab.learn(tr, en));

    this.#activity?.destroy();
    this.view.clearActivity();
    const activity = this.#activity = this.activities.create(node.ask ?? 'choice');
    const result = await activity.mount(this.view.slot, {
      ...node,
      onWrong: () => { this.view.setLine('Hayır, tekrar dene!', 'Try again!'); this.view.setHint(node.hint); },
    });
    if (session !== this.#session || !this.talking) return; // closed or moved on meanwhile

    const opt = result.option ?? {};
    const next = opt.next ?? 'end';
    this.effects.run(opt.do);
    if (next === 'end') this.close(); else this.show(next);
  }

  speak() { if (this.lastLine) this.speech.speak(this.lastLine); }

  close() {
    if (!this.talking) return;
    this.#session++;
    this.#activity?.destroy();
    this.#activity = null;
    this.cast.get(this.talking).talking = false;
    const npc = this.talking;
    this.talking = null;
    this.view.close();
    this.speech.cancel();
    this.#popMode?.();
    this.bus.emit(EV.DIALOGUE_CLOSE, { npc });
  }
}
