import prayer from './prayer.js';
import market from './market.js';
import nine from './nine.js';
import kardes from './kardes.js';
import meydan from './meydan.js';
import kahvehane from './kahvehane.js';
import kutuphane from './kutuphane.js';
import satranc from './satranc.js';
import bahce from './bahce.js';
import musiki from './musiki.js';

/** Teaching add-ons applied on top of the base story (see core/ContentComposer.js). */
export const ADDONS = [prayer, market, nine, kardes, meydan, kahvehane, kutuphane, satranc, bahce, musiki];

/** Which meal is on the sini in which chapter (the evening chore "set the table" adds dinner). */
export const MEALS = { 'd1-breakfast': 'breakfast', 'd1-dinner': 'dinner' };
