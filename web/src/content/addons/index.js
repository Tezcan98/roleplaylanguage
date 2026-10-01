import prayer from './prayer.js';
import market from './market.js';
import nine from './nine.js';

/** Teaching add-ons applied on top of the base story (see core/ContentComposer.js). */
export const ADDONS = [prayer, market, nine];

/** Which meal is on the sini in which chapter (the evening chore "set the table" adds dinner). */
export const MEALS = { 'd1-breakfast': 'breakfast', 'd1-dinner': 'dinner' };
