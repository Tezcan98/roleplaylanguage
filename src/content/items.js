/**
 * Pickups. `kind` is what goes in the bag (and the GLB id: item.<kind>),
 * `activeIn` lists quests during which the item can be taken, `chapters` when it exists.
 * `bagTr/bagEn` name the kind in the bag when several words share it (laundry).
 */
export const ITEMS = [
  {
    id: 'mont', kind: 'mont', tr: 'mont', en: 'jacket', verb: 'Montu al', location: 'house', pos: [-5.05, 1.35, 3.9],
    activeIn: ['take-jacket'], chapters: ['d1-morning'], wearable: true, spin: false, onPick: ['wear:jacket'],
    build: (mf) => mf.group(mf.box(0.5, 0.6, 0.18, 0xB5482E), mf.at(mf.box(0.06, 0.5, 0.02, 0xE0B04A), 0, 0, 0.1)),
  },
  {
    id: 'kova', kind: 'kova', tr: 'kova', en: 'bucket', verb: 'Kovayı al', location: 'yard', pos: [6.3, 0.18, -10.5],
    activeIn: ['bucket'], chapters: ['d1-morning'],
    build: (mf) => {
      const handle = mf.torus(0.2, 0.015, 0x2A2F3A, 16, Math.PI); handle.position.y = 0.17;
      return mf.group(mf.cyl(0.22, 0.17, 0.35, { tex: 'metal', color: 0x8FAFD0 }, 12), handle);
    },
  },
  {
    id: 'anahtar', kind: 'anahtar', tr: 'anahtar', en: 'wrench / key', verb: 'Anahtarı al', location: 'yard', pos: [-7.6, 0.87, -3.7],
    activeIn: ['wrench'], chapters: ['d1-morning'],
    build: (mf) => mf.group(mf.box(0.34, 0.04, 0.07, { tex: 'metal' }), mf.at(mf.box(0.1, 0.04, 0.14, { tex: 'metal' }), 0.18, 0, 0)),
  },
  ...[[6.6, -1.6], [9.7, -3.3], [11.5, -1.5]].map(([x, z], i) => ({
    id: `domates${i}`, kind: 'domates', tr: 'domates', en: 'tomato', verb: 'Domatesi al', location: 'yard', pos: [x, 0.42, z],
    activeIn: ['tomatoes'], chapters: ['d1-morning'], goal: 3,
    build: (mf) => mf.group(mf.sphere(0.17, 0xE0392B, 12), mf.at(mf.cyl(0.02, 0.06, 0.06, 0x3E7A2A, 6), 0, 0.17, 0)),
  })),
  {
    id: 'ekmek', kind: 'ekmek', tr: 'ekmek', en: 'bread', verb: 'Ekmeği al', location: 'house', pos: [3.4, 1.02, -4.2],
    activeIn: ['bring-bread'], chapters: ['d1-breakfast'],
    build: (mf) => {
      const loaf = mf.sphere(0.2, 0xD9A05B, 12); loaf.scale.set(1.5, 0.7, 0.9);
      return mf.group(loaf, mf.at(mf.box(0.02, 0.02, 0.2, 0xB7793A), 0, 0.12, 0));
    },
  },
  // accusative with consonant change: çorap → çorabı, gömlek → gömleği
  ...[['corap', 'çorap', 'sock', 'Çorabı al', 0xE0B04A, [0.18, 0.35, 0.05]], ['havlu', 'havlu', 'towel', 'Havluyu al', 0x8EC5FF, [0.5, 0.6, 0.03]], ['gomlek', 'gömlek', 'shirt', 'Gömleği al', 0xFFFFFF, [0.55, 0.6, 0.05]]]
    .map(([id, tr, en, verb, color, size], i) => ({
      id, kind: 'camasir', tr, en, verb, bagTr: 'çamaşır', bagEn: 'laundry',
      location: 'yard', pos: [-4.2 + i, 1.4, -7.6], activeIn: ['laundry'], chapters: ['d1-afternoon'], goal: 3, spin: false,
      build: (mf) => mf.group(mf.at(mf.box(...size, color), 0, -size[1] / 2 + 0.3, 0), mf.at(mf.box(0.04, 0.08, 0.04, 0xB5482E), 0, 0.3, 0)),
    })),
  {
    id: 'kitap', kind: 'kitap', tr: 'kitap', en: 'book', verb: 'Kitabı al', location: 'house', pos: [-5.35, 1.12, -2.55],
    activeIn: ['take-book'], chapters: ['d1-night'], spin: false,
    build: (mf) => mf.group(mf.box(0.08, 0.42, 0.32, 0xE4574A), mf.at(mf.box(0.085, 0.3, 0.2, 0xFFF9EC), 0, 0, 0)),
  },
  {
    id: 'mont2', kind: 'mont', tr: 'mont', en: 'jacket', verb: 'Montu al', location: 'house', pos: [-5.05, 1.35, 3.9],
    activeIn: ['jacket2'], chapters: ['d2-morning'], wearable: true, spin: false, onPick: ['wear:jacket'],
    build: (mf) => mf.group(mf.box(0.5, 0.6, 0.18, 0xB5482E), mf.at(mf.box(0.06, 0.5, 0.02, 0xE0B04A), 0, 0, 0.1)),
  },
];
