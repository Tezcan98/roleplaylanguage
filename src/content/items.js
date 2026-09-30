/**
 * Pickups. `kind` is what goes in the bag (and the GLB id: item.<kind>),
 * `activeIn` lists quests during which the item can be taken.
 */
export const ITEMS = [
  {
    id: 'mont', kind: 'mont', tr: 'mont', en: 'jacket', verb: 'Montu al', location: 'house', pos: [-5.05, 1.35, 3.9],
    activeIn: ['take-jacket'], wearable: true, spin: false, onPick: ['wear:jacket'],
    build: (mf) => mf.group(mf.box(0.5, 0.6, 0.18, 0xB5482E), mf.at(mf.box(0.06, 0.5, 0.02, 0xE0B04A), 0, 0, 0.1)),
  },
  {
    id: 'kova', kind: 'kova', tr: 'kova', en: 'bucket', verb: 'Kovayı al', location: 'yard', pos: [6.3, 0.18, -10.5],
    activeIn: ['bucket'],
    build: (mf) => {
      const handle = mf.torus(0.2, 0.015, 0x2A2F3A, 16, Math.PI); handle.position.y = 0.17;
      return mf.group(mf.cyl(0.22, 0.17, 0.35, { tex: 'metal', color: 0x8FAFD0 }, 12), handle);
    },
  },
  {
    id: 'anahtar', kind: 'anahtar', tr: 'anahtar', en: 'wrench / key', verb: 'Anahtarı al', location: 'yard', pos: [-7.6, 0.87, -3.7],
    activeIn: ['wrench'],
    build: (mf) => mf.group(mf.box(0.34, 0.04, 0.07, { tex: 'metal' }), mf.at(mf.box(0.1, 0.04, 0.14, { tex: 'metal' }), 0.18, 0, 0)),
  },
  ...[[6.6, -1.6], [9.7, -3.3], [11.5, -1.5]].map(([x, z], i) => ({
    id: `domates${i}`, kind: 'domates', tr: 'domates', en: 'tomato', verb: 'Domatesi al', location: 'yard', pos: [x, 0.42, z],
    activeIn: ['tomatoes'], goal: 3,
    build: (mf) => mf.group(mf.sphere(0.17, 0xE0392B, 12), mf.at(mf.cyl(0.02, 0.06, 0.06, 0x3E7A2A, 6), 0, 0.17, 0)),
  })),
];
