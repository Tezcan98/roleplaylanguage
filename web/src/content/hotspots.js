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
  'village.yard': { label: 'Avluya dön', travel: ['yard', 'squareRoad'], available: (c) => !c.online },
  // online play from the main menu: leaving the square goes back to the menu, not home
  'village.menu': { label: 'Ana menüye dön', use: ['main-menu'], available: (c) => c.online },
  'village.fountain': free('village_fountain'),
  'village.well': free('village_well'),
  'village.benchWest': free('village_bench'),
  'village.benchEast': free('village_bench'),
  'village.bakkalCounter': free('village_shop'),
  'yard.gate': {
    label: 'Okula git', lockedLabel: 'Bahçe kapısı', use: ['chapter'],
    available: (c) => c.q === 'go-school' || c.targetHotspot === 'yard.gate',
  },
  // any other time: go to school to practise (1 credit); home life waits until you are back
  'yard.practice': {
    label: 'Okula git: pratik (1 kredi)', lockedLabel: 'Bahçe kapısı', use: ['school-practice'],
    available: (c) => c.q !== 'go-school' && c.targetHotspot !== 'yard.gate' && !c.online,
    locked: (c) => (c.isNight ? ['Gece okul kapalı.', 'The school is closed at night.'] : null),
  },
  'house.sofra': { label: 'Sofraya otur', use: ['sit:sofraS'], available: (c) => !c.seated },
  'house.breadTable': {
    label: 'Ekmeği sofraya koy',
    available: (c) => c.has('ekmek') && !c.flag('bread-on-table'),
    use: ['place-bread'],
  },
  'house.tea': free('make_tea'),
  'house.table': free('set_table'),
  'house.dishes': free('wash_dishes'),
  'house.sweep': free('sweep_house'),
  'house.plant': free('water_plant'),
  'house.tv': free('tv'),
  'house.kitchen': free('water'),
  'house.shelf': free('read'),
  'house.window': free('window'),
  'yard.tap': free('wash'),
  'yard.garden': free('water_garden'),
  'school.door': {
    label: 'Sınıfa gir', lockedLabel: 'Sınıf kapısı', use: ['lesson'], link: 'classroom',
    // open for the lesson, and afterwards whenever the quest leads back inside (talk to the teacher)
    locked: (c) => (String(c.q ?? '').startsWith('lesson') || c.targetNpcLoc === 'classroom' ? null : ['Önce arkadaşınla tanış!', 'Meet your friend first!']),
  },
  'classroom.door': { label: 'Bahçeye çık', travel: ['schoolyard', 'door'] },
  'school.exit': {
    label: 'Eve dön', lockedLabel: 'Okul kapısı', use: ['chapter'],
    locked: (c) => (c.targetHotspot === 'school.exit' || c.reached('go-home') ? null : ['Daha ders bitmedi!', "The lesson isn't over yet!"]),
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
