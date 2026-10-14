/**
 * What riding costs (credits) and how long a horse is yours (content, so the dialogues can say it;
 * no three.js here: the voice tools read the content without it). Set on the server: config/remote.js.
 */
import { CONFIG } from '../config/remote.js';

export const RIDE_PRICE = CONFIG.prices.horseRide;
/** A ride lasts this long (real seconds): get off and on again as you like, the horse waits for you. */
export const RIDE_SECONDS = Math.round(CONFIG.rides.minutes * 60);
export const BIKE_PRICE = CONFIG.prices.bikeLearn;
