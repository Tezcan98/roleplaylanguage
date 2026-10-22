/**
 * Remote settings: anadoluailesi.com.tr/config.json (site/config.json in the repository, docs/remote-config.md)
 * — prices, rewards, ad timing, the city rooms and the "please update" card, changed on the server
 * without a new build. Read once at start, before the content (prices are in the dialogues' texts:
 * content modules import CONFIG, so they wait for it). The last copy is kept for an offline start;
 * anything missing or of the wrong kind falls back to DEFAULTS. Only the real game reads it (the
 * site and the Android app): local test pages and node tools always use the defaults.
 */
export const DEFAULTS = {
  prices: { horseRide: 1, bikeLearn: 3, hd: 40, outfit: 20, aura: 25, adFree: 100, pepper: 5 },
  rewards: { startCredits: 100, startMoney: 200, video: 3, videoEveryHours: 1, daily: [3, 4, 5, 6, 7, 8, 10], share: 5 },
  rides: { minutes: 10 },
  boosts: { pepperMinutes: 30, pepperSpeed: 1.5, glowDays: 3 }, // Urfa biberi: this much faster for this long; Altın baklava: shining this many days
  ads: { idleBannerSeconds: 90, menuBannerChance: 1, betweenDays: true, travelChance: 0.35, travelGapMinutes: 3 },
  sellPacks: false, // credit packs for sale (Google Play): on once the Play Console products are live
  roomFull: 30, // a room this busy: newcomers who didn't pick a city go to a quieter one
  cities: [['ankara', 'Ankara'], ['istanbul', 'İstanbul'], ['izmir', 'İzmir'], ['manisa', 'Manisa']],
  update: { latestApp: 0, store: 'https://play.google.com/store/apps/details?id=com.anadolu', text: '', en: '' },
};

const URL_ = 'https://anadoluailesi.com.tr/config.json';
const KEY = 'remoteConfig';
const WAIT = 2000; // ms at most at start (a slow network: the last copy instead)

async function load() {
  if (typeof window === 'undefined') return null; // node tools
  const native = !!window.Capacitor?.isNativePlatform?.();
  if (!native && !['anadoluailesi.com.tr', 'www.anadoluailesi.com.tr', 'sehem2.com.tr'].includes(location.hostname)) return null; // local test pages: the defaults
  let cached = null;
  try { cached = JSON.parse(localStorage.getItem(KEY) ?? 'null'); } catch { /* none */ }
  try {
    const url = `${URL_}?t=${Date.now()}`;
    const get = native // (a native request in the app: the site's files carry no CORS header for it)
      ? import('@capacitor/core').then(({ CapacitorHttp }) => CapacitorHttp.get({ url, responseType: 'json' }))
        .then((r) => (r.status === 200 ? (typeof r.data === 'string' ? JSON.parse(r.data) : r.data) : null))
      : fetch(url, { cache: 'no-store' }).then((r) => (r.ok ? r.json() : null));
    const fresh = await Promise.race([get, new Promise((r) => setTimeout(() => r(undefined), WAIT))]);
    if (fresh && typeof fresh === 'object') {
      try { localStorage.setItem(KEY, JSON.stringify(fresh)); } catch { /* private mode */ }
      return fresh;
    }
  } catch { /* offline */ }
  return cached;
}

/** The defaults with what the server says on top — only values of the same kind (a typo can't break the game). */
export function merge(base, over) {
  if (!over || typeof over !== 'object' || Array.isArray(over)) return base;
  const out = Array.isArray(base) ? [...base] : { ...base };
  for (const [k, b] of Object.entries(base)) {
    const o = over[k];
    if (o === undefined || o === null) continue;
    if (Array.isArray(b)) out[k] = Array.isArray(o) && o.length && o.every((x) => typeof x === typeof b[0] && Array.isArray(x) === Array.isArray(b[0])) ? o : b;
    else if (typeof b === 'object') out[k] = merge(b, o);
    else if (typeof o === typeof b && (typeof o !== 'number' || (Number.isFinite(o) && o >= 0))) out[k] = o;
  }
  return out;
}

export const CONFIG = merge(DEFAULTS, await load());
