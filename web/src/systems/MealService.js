import { EV } from '../core/events.js';

/** Puts food on the sini only at meal times (chapter meals, or after setting the table). */
export class MealService {
  constructor({ bus, world, meals }) {
    const house = () => world.get('house');
    bus.on(EV.CHAPTER, ({ chapter }) => house().setMeal?.(meals[chapter.id] ?? null));
    bus.on(EV.FREE_ACTION, ({ id }) => { if (id === 'set_table') house().setMeal?.('dinner'); });
  }
}
