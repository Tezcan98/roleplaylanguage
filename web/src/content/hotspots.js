import { FREE_ACTIONS } from './freeActions.js';

const free = (id) => ({ label: FREE_ACTIONS[id].label, use: [`free:${id}`] });
/** A school day of the story (not a visit, not paused for practice). */
export const schoolDay = (c) => String(c.chapter ?? '').endsWith('-school') && !c.story?.paused;

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
  'village.yard': { label: 'Eve dön', travel: ['yard', 'gate'], available: (c) => !c.online },
  // online play from the main menu: leaving the square goes back to the menu, not home
  'village.menu': { label: 'Ana menüye dön', use: ['main-menu'], available: (c) => c.online },
  'village.fountain': free('village_fountain'),
  'village.well': free('village_well'),
  ...Object.fromEntries(Array.from({ length: 10 }, (_, i) => [`village.bench${i + 1}`, { label: 'Banka otur', use: [`sit:bench${i + 1}`, 'free:village_bench'], available: (c) => !c.seated }])), // BENCH_SEATS in VillageSquare
  'village.bakkalCounter': free('village_shop'),
  // giant chess on the square (ChessGame), and the stools of the tea garden
  // seats in the tea garden and on the benches round the chess board (counts: TEA_SEATS / CHESS_SEATS in VillageSquare)
  ...Object.fromEntries(Array.from({ length: 22 }, (_, i) => [`village.cay${i + 1}`, { label: 'Çay bahçesinde otur', use: [`sit:cay${i + 1}`, 'free:village_tea'], available: (c) => !c.seated }])),
  ...Object.fromEntries(Array.from({ length: 8 }, (_, i) => [`village.chessBench${i + 1}`, { label: 'Banka otur, maçı izle', use: [`sit:chessBench${i + 1}`, 'free:village_bench'], available: (c) => !c.seated }])),
  // the open-air kahvehane and the open library (VillageSquare)
  ...Object.fromEntries([1, 2, 3, 4].map((n) => [`village.kahve${n}`, { label: 'Kahvehanede otur', use: [`sit:kahve${n}`, 'free:village_coffee'], available: (c) => !c.seated }])),
  ...Object.fromEntries([1, 2, 3, 4].map((n) => [`village.kitap${n}`, { label: 'Otur, kitap oku', use: [`sit:kitap${n}`, 'free:village_read'], available: (c) => !c.seated }])),
  ...Object.fromEntries(['libShelf', 'libShelf2', 'libShelf3', 'libShelf4'].map((id) => [`village.${id}`, { label: (c) => (c.state?.heldBook ? 'Kitabı rafa koy' : 'Kitap al'), use: ['library'] }])), // systems/Library.js
  // garden gate = the street: choose school or the village square (see the 'street' effect)
  'yard.gate': { label: 'Sokağa çık', use: ['street'], link: ['schoolyard', 'village'] },
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
  // school days: the lesson (open for it, and afterwards whenever the quest leads back
  // inside to talk to the teacher); other days: a practice lesson for 1 credit
  'school.door': {
    label: (c) => (schoolDay(c) ? 'Sınıfa gir' : 'Sınıfa gir: pratik (1 kredi)'), lockedLabel: 'Sınıf kapısı', use: ['school-door'], link: 'classroom',
    locked: (c) => {
      if (schoolDay(c)) return String(c.q ?? '').startsWith('lesson') || c.targetNpcLoc === 'classroom' ? null : ['Önce arkadaşınla tanış!', 'Meet your friend first!'];
      if (c.online) return ['Dersler hikaye modunda.', 'Lessons are in story mode.'];
      if (c.isNight) return ['Okul gece kapalı.', 'The school is closed at night.'];
      return null;
    },
  },
  'classroom.door': { label: 'Bahçeye çık', travel: ['schoolyard', 'door'] },
  'school.exit': {
    label: 'Eve dön', lockedLabel: 'Okul kapısı', use: ['chapter'],
    available: (c) => schoolDay(c),
    locked: (c) => (c.targetHotspot === 'school.exit' || c.reached('go-home') ? null : ['Daha ders bitmedi!', "The lesson isn't over yet!"]),
  },
  // outside a school day (a match, a visit): the same gate just leads home
  'school.leave': { label: 'Eve dön', travel: ['yard', 'gate'], available: (c) => !schoolDay(c) && !c.online },
  // the two public places are connected: schoolyard ↔ village square
  'school.square': { label: 'Köy meydanına git', travel: ['village', 'schoolRoad'] },
  'village.school': { label: 'Okul bahçesine git ⚽', travel: ['schoolyard', 'squareRoad'] },
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
  .flatMap(([hotspot, r]) => [r.travel?.[0] ?? r.link].flat().map((to) => ({ hotspot, from: hotspot.split('.')[0], to })));
