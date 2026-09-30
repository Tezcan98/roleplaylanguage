/**
 * Serializable game data. Domain classes (Inventory, Vocabulary, TimeSystem)
 * are thin facades over the slices below, so saving is just `snapshot()`.
 */
export class GameState {
  constructor() { this.reset(); }

  reset() {
    this.day = 1;
    this.minutes = 8 * 60;
    this.chapter = 0;
    this.quest = 0;
    this.location = 'house';
    this.flags = {};
    this.inventory = {};
    this.taken = [];
    this.words = {};
  }

  snapshot() {
    const { day, minutes, chapter, quest, location, flags, inventory, taken, words } = this;
    return structuredClone({ v: 1, day, minutes, chapter, quest, location, flags, inventory, taken, words });
  }

  restore(data) {
    this.reset();
    if (!data || data.v !== 1) return false;
    const { v, ...rest } = data;
    Object.assign(this, structuredClone(rest));
    return true;
  }
}
