/**
 * Serializable game data. Domain classes (Inventory, Vocabulary, TimeSystem)
 * are thin facades over the slices below, so saving is just `snapshot()`.
 */
/** Every new game starts with this many lesson credits. */
export const START_CREDITS = 50;

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
    this.credits = START_CREDITS;
    this.heldBook = null; // the library book in the player's hand
    this.bookPage = {};   // book id → the page you stopped at
  }

  snapshot() {
    const { day, minutes, chapter, quest, location, flags, inventory, taken, words, credits, heldBook, bookPage } = this;
    return structuredClone({ v: 1, day, minutes, chapter, quest, location, flags, inventory, taken, words, credits, heldBook, bookPage });
  }

  restore(data) {
    this.reset();
    if (!data || data.v !== 1) return false;
    const { v, ...rest } = data;
    Object.assign(this, structuredClone(rest));
    return true;
  }
}
