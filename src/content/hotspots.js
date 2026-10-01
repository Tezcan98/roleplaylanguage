import { FREE_ACTIONS } from './freeActions.js';

const free = (id) => ({ label: FREE_ACTIONS[id].label, use: [`free:${id}`] });

/**
 * What fixed spots in the world do. Keys match hotspot ids declared by locations.
 * `travel: [location, anchor]`, `use: effects[]`, `link` (location a `use` leads to, for the quest arrow), `available(ctx)` hides the action,
 * `locked(ctx)` returns a [message, english] toast instead of acting.
 */
const DOOR_LOCKS = {
  'd1-breakfast': ['Sofradan kalkma, kahvaltı bitmedi!', "Don't leave the table, breakfast isn't over!"],
  'd1-dinner': ['Önce yemeğini bitir.', 'Finish your dinner first.'],
};

export const HOTSPOTS = {
  'house.door': {
    label: 'Dışarı çık', lockedLabel: 'Kapı', travel: ['yard', 'houseDoor'],
    locked: (c) => {
      if (c.chapter === 'd1-morning' && !c.reached('go-out')) return ['Önce annenle konuş, montunu al.', 'Talk to mom and get your jacket first.'];
      if (c.chapter === 'd2-morning' && !c.reached('go-school')) return ['Önce annene günaydın de, montunu al.', 'Say good morning to mom and take your jacket first.'];
      if (DOOR_LOCKS[c.chapter]) return DOOR_LOCKS[c.chapter];
      if (c.isNight) return ['Gece oldu, dışarı çıkma.', "It's night — stay inside."];
      return null;
    },
  },
  'yard.door': { label: 'Eve gir', travel: ['house', 'door'] },
  'yard.square': { label: 'Köy meydanına git', travel: ['village', 'yardRoad'] },
  'village.yard': { label: 'Avluya dön', travel: ['yard', 'squareRoad'] },
  'village.fountain': free('village_fountain'),
  'village.well': free('village_well'),
  'village.benchWest': free('village_bench'),
  'village.benchEast': free('village_bench'),
  'village.bakkalCounter': free('village_shop'),
  'yard.gate': {
    label: 'Okula git', lockedLabel: 'Bahçe kapısı', use: ['chapter'],
    locked: (c) => (c.q === 'go-school' ? null : ['Okul yolu. Bugün okula gitmiyorsun.', "The road to school. You're not going today."]),
  },
  'house.sofra': { label: 'Sofraya otur', use: ['sit:sofraGuest'] },
  'house.breadTable': {
    label: 'Ekmeği sofraya koy',
    available: (c) => c.has('ekmek') && !c.flag('bread-on-table'),
    use: ['place-bread'],
  },
  'house.tv': free('tv'),
  'house.kitchen': free('water'),
  'house.shelf': free('read'),
  'house.window': free('window'),
  'yard.tap': free('wash'),
  'yard.garden': free('water_garden'),
  'school.door': {
    label: 'Sınıfa gir', lockedLabel: 'Sınıf kapısı', use: ['lesson:l1'], link: 'classroom',
    locked: (c) => (c.reached('lesson') ? null : ['Önce yeni arkadaşınla tanış!', 'Meet your new friend first!']),
  },
  'classroom.door': { label: 'Bahçeye çık', travel: ['schoolyard', 'door'] },
  'school.exit': {
    label: 'Eve dön', lockedLabel: 'Okul kapısı', use: ['chapter'],
    locked: (c) => (c.reached('go-home') ? null : ['Daha ders bitmedi!', "The lesson isn't over yet!"]),
  },
  'house.desk': {
    label: 'Ödev yap', use: ['textbook'],
    available: (c) => c.has('kitap'),
  },
  'house.bed': {
    label: 'Yat, uyu', use: ['chapter'],
    available: (c) => c.q === 'sleep',
  },
};

/** Location graph derived from the travel rules, used to point the quest arrow at the right door. */
export const LINKS = Object.entries(HOTSPOTS)
  .filter(([, r]) => r.travel || r.link)
  .map(([hotspot, r]) => ({ hotspot, from: hotspot.split('.')[0], to: r.travel?.[0] ?? r.link }));
