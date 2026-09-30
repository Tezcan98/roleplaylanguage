/**
 * What fixed spots in the world do. Keys match hotspot ids declared by locations.
 * `travel: [location, anchor]`; `lockedUntil` keeps a door shut until that quest is reached.
 */
export const HOTSPOTS = {
  'house.door': {
    label: 'Dışarı çık', lockedLabel: 'Kapı', travel: ['yard', 'houseDoor'],
    lockedUntil: 'go-out', lockedMsg: ['Önce annenle konuş, montunu al.', 'Talk to mom and get your jacket first.'],
  },
  'yard.door': { label: 'Eve gir', travel: ['house', 'door'] },
};

/** Location graph derived from the travel rules, used to point the quest arrow at the right door. */
export const LINKS = Object.entries(HOTSPOTS)
  .filter(([, r]) => r.travel)
  .map(([hotspot, r]) => ({ hotspot, from: hotspot.split('.')[0], to: r.travel[0] }));
