import { CONFIG } from '../config/remote.js';
/**
 * Serializable game data. Domain classes (Inventory, Vocabulary, TimeSystem)
 * are thin facades over the slices below, so saving is just `snapshot()`.
 */
/** Every new game starts with this many lesson credits. */
export const START_CREDITS = CONFIG.rewards.startCredits; // (set on the server: config/remote.js)
/** …and this much game money (lira) for the shops on the square. */
export const START_MONEY = CONFIG.rewards.startMoney;

export class GameState {
  constructor() { this.reset(); }

  reset() {
    this.day = 1;
    this.minutes = 8 * 60;
    this.chapter = 0;
    this.quest = 0;
    this.location = 'house';
    this.flags = {};
    this.inventory = { para: START_MONEY }; // game money: lira in the bag
    this.taken = [];
    this.words = {};
    this.credits = START_CREDITS;
    this.heldBook = null; // the library book in the player's hand
    this.bookPage = {};   // book id → the page you stopped at
    this.bought = {};     // kind → how many were bought in a shop (those may go on the table or in the bin)
    this.table = [];      // kinds put on the sini at home, in order
  }

  snapshot() {
    const { day, minutes, chapter, quest, location, flags, inventory, taken, words, credits, heldBook, bookPage, bought, table } = this;
    return structuredClone({ v: 1, storyRevision: 5, day, minutes, chapter, quest, location, flags, inventory, taken, words, credits, heldBook, bookPage, bought, table });
  }

  restore(data) {
    this.reset();
    if (!data || data.v !== 1) return false;
    const { v, storyRevision = 1, ...rest } = data;
    Object.assign(this, structuredClone(rest));
    // Revision 2 removed quest index 1 (take-book) from chapter 4 (d1-night).
    if (storyRevision < 2 && this.chapter === 4 && this.quest >= 1) this.quest = Math.max(1, this.quest - 1);
    // Revision 3 inserted four gardening quests after wake in d2-morning.
    if (storyRevision < 3 && this.chapter === 5 && this.quest >= 1) this.quest += 4;
    // Revision 4 moves the lesson from the morning to after shopping, before the letter.
    if (storyRevision < 4 && this.chapter === 5) this.quest = this.quest >= 5 ? this.quest - 4 : this.quest >= 1 ? 1 : 0;
    if (storyRevision < 4 && this.chapter === 7) {
      if (this.quest > 3 || (this.quest === 3 && this.flags['farm-watered'])) this.quest += 4;
      // A player currently on the letter first finishes the unfinished garden lesson.
    }
    // Revision 5 inserted d2-library after d2-school (chapter 7) and d4-imam after d4-home (chapter 14).
    if (storyRevision < 5 && this.chapter >= 7) this.chapter += this.chapter >= 15 ? 2 : 1;
    // Older night saves may not have collected the book yet. School still needs it.
    if (this.chapter >= 4 && !this.inventory.kitap) this.inventory.kitap = 1;
    return true;
  }
}
