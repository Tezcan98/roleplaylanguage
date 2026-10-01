/**
 * Read-only view of the game handed to content scripts (dialogue `start`, quest objectives).
 * Content never touches systems directly — only this facade.
 */
export class GameContext {
  constructor({ state, inventory, story, world, time, vocab, player }) {
    Object.assign(this, { state, inventory, story, world, time, vocab, player });
  }
  get seated() { return !!this.player?.seated; }
  /** Hotspot id the current quest points at (doors use it to open exactly when needed). */
  get targetHotspot() { return this.story.target()?.hotspot ?? null; }
  get q() { return this.story.quest?.id ?? null; }
  get chapter() { return this.story.chapter?.id ?? null; }
  get loc() { return this.world.current?.id ?? null; }
  get isNight() { return this.time.isNight; }
  /** Ahmet has been given a job he hasn't finished yet. */
  get hasDuty() { const q = this.story.quest; return !!q && !q.final; }
  get words() { return this.vocab.size; }
  reached(questId) { return this.story.reached(questId); }
  has(kind) { return this.inventory.count(kind) > 0; }
  count(kind) { return this.inventory.count(kind); }
  flag(name) { return !!this.state.flags[name]; }
}
