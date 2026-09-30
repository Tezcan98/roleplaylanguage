/**
 * What fixed spots in the world do. Keys match hotspot ids declared by locations.
 * `travel: [location, anchor]`, `use: effects[]`, `available(ctx)` hides the action,
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
  'yard.gate': {
    label: 'Okula git', lockedLabel: 'Bahçe kapısı', use: ['chapter'],
    locked: (c) => (c.q === 'go-school' ? null : ['Okul yolu. Bugün okula gitmiyorsun.', "The road to school. You're not going today."]),
  },
  'house.bed': {
    label: 'Yat, uyu', use: ['chapter'],
    available: (c) => c.q === 'sleep',
  },
};

/** Location graph derived from the travel rules, used to point the quest arrow at the right door. */
export const LINKS = Object.entries(HOTSPOTS)
  .filter(([, r]) => r.travel)
  .map(([hotspot, r]) => ({ hotspot, from: hotspot.split('.')[0], to: r.travel[0] }));
