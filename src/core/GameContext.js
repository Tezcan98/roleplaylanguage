/**
 * Read-only view of the game handed to content scripts (dialogue `start`, quest objectives).
 * Content never touches systems directly — only this facade.
 */
export class GameContext {
  constructor({ state, inventory, story, world }) {
    Object.assign(this, { state, inventory, story, world });
  }
  get q() { return this.story.quest?.id ?? null; }
  get chapter() { return this.story.chapter?.id ?? null; }
  get loc() { return this.world.current?.id ?? null; }
  reached(questId) { return this.story.reached(questId); }
  has(kind) { return this.inventory.count(kind) > 0; }
  count(kind) { return this.inventory.count(kind); }
  flag(name) { return !!this.state.flags[name]; }
}
