/**
 * The game's content with add-ons applied. Import content from here (not from the single
 * files) so every system sees the same, composed tables.
 */
import { STORY } from './story.js';
import { NPCS, PLAYER_LOOK, VOICES } from './characters.js';
import { DIALOGUES } from './dialogues.js';
import { ITEMS, KIND_NAMES } from './items.js';
import { HOTSPOTS, LINKS } from './hotspots.js';
import { FREE_ACTIONS, HOUSE_RULES } from './freeActions.js';
import { LESSONS, CLASSMATE_BOTS } from './lessons.js';
import { TEXTBOOK } from './textbook.js';
import { ADDONS, MEALS } from './addons/index.js';
import { PRAYER_STEPS, PRAYER_WORDS } from './addons/prayer.js';
import { composeContent } from '../core/ContentComposer.js';

composeContent({ story: STORY, dialogues: DIALOGUES, hotspots: HOTSPOTS, kindNames: KIND_NAMES, npcs: NPCS, voices: VOICES }, ADDONS);

export {
  STORY, NPCS, PLAYER_LOOK, VOICES, DIALOGUES, ITEMS, KIND_NAMES, HOTSPOTS, LINKS, FREE_ACTIONS, HOUSE_RULES,
  LESSONS, CLASSMATE_BOTS, TEXTBOOK, MEALS, PRAYER_STEPS, PRAYER_WORDS,
};
