/**
 * Things bought at the grocer's (bakkal) and the greengrocer's (manav): they go in the bag, can be
 * put on the sini at home ("Masaya koy") and taken back, or thrown in a rubbish bin ("Çöpe at").
 * Only what was bought counts (state.bought), so the story's own things (the letter, mom's
 * potatoes…) can never end up in the bin by mistake. Used by systems/TableAndBins.js.
 */

/** [kind, n] of the bought things still in the bag. */
export const looseGoods = (state) => Object.entries(state.bought ?? {})
  .map(([kind, n]) => [kind, Math.min(n, state.inventory?.[kind] ?? 0)])
  .filter(([, n]) => n > 0);

/** How each of them looks on the table (MeshFactory), about 0.1–0.3 big. */
export const GOOD_LOOKS = {
  ekmek: (mf) => { const loaf = mf.sphere(0.16, 0xD9A05B, 12); loaf.scale.set(1.5, 0.7, 0.9); return mf.group(mf.at(loaf, 0, 0.08, 0)); },
  sut: (mf) => mf.group(mf.at(mf.box(0.12, 0.24, 0.12, 0xFFFFFF), 0, 0.12, 0), mf.at(mf.box(0.125, 0.07, 0.125, 0x5DADE2), 0, 0.12, 0)),
  simit: (mf) => { const t = mf.torus(0.1, 0.035, 0xB7793A, 14); t.rotation.x = Math.PI / 2; return mf.group(mf.at(t, 0, 0.035, 0)); },
  ayran: (mf) => mf.group(mf.at(mf.cyl(0.06, 0.05, 0.14, 0xF4F1EA, 12), 0, 0.07, 0), mf.at(mf.cyl(0.062, 0.062, 0.01, 0x3E8E4A, 12), 0, 0.145, 0)),
  peynir: (mf) => mf.group(mf.at(mf.box(0.2, 0.08, 0.14, 0xFBF6E6), 0, 0.04, 0)),
  yumurta: (mf) => {
    const g = mf.group();
    [[-0.06, 0], [0.06, 0], [0, 0.07]].forEach(([x, z]) => { const e = mf.sphere(0.045, 0xF3E2C3, 10); e.scale.y = 1.3; g.add(mf.at(e, x, 0.06, z)); });
    return g;
  },
  elma: (mf) => mf.group(mf.at(mf.sphere(0.075, 0xD8322B, 12), -0.05, 0.075, 0), mf.at(mf.sphere(0.075, 0xE4574A, 12), 0.06, 0.075, 0.03)),
  portakal: (mf) => mf.group(mf.at(mf.sphere(0.08, 0xF39C12, 12), -0.05, 0.08, 0), mf.at(mf.sphere(0.08, 0xF5A623, 12), 0.07, 0.08, 0.02)),
  armut: (mf) => {
    const body = mf.sphere(0.075, 0xC8C24A, 12); const top = mf.sphere(0.05, 0xC8C24A, 10);
    return mf.group(mf.at(body, 0, 0.075, 0), mf.at(top, 0, 0.16, 0), mf.at(mf.cyl(0.008, 0.008, 0.05, 0x5A3A20, 4), 0, 0.22, 0));
  },
  domates: (mf) => mf.group(mf.at(mf.sphere(0.08, 0xE0392B, 12), 0, 0.075, 0), mf.at(mf.cyl(0.02, 0.04, 0.03, 0x3E7A2A, 6), 0, 0.15, 0)),
  patates: (mf) => {
    const g = mf.group();
    [[-0.05, 0], [0.06, 0.03]].forEach(([x, z]) => { const p = mf.sphere(0.07, 0xB08A57, 10); p.scale.set(1.3, 0.8, 1); g.add(mf.at(p, x, 0.055, z)); });
    return g;
  },
  muz: (mf) => { const b = mf.torus(0.13, 0.03, 0xF4D03F, 12, Math.PI * 0.6); b.rotation.x = Math.PI / 2; return mf.group(mf.at(b, 0, 0.03, 0)); },
};
const anything = (mf) => mf.group(mf.at(mf.box(0.16, 0.12, 0.16, 0xC9A26A), 0, 0.06, 0)); // a little parcel
export const goodLook = (kind) => GOOD_LOOKS[kind] ?? anything;

/** Words the table and the bins teach. */
export const TABLE_WORDS = [['masa', 'table'], ['koymak', 'to put'], ['almak', 'to take']];
export const BIN_WORDS = [['çöp kutusu', 'rubbish bin'], ['çöp', 'rubbish'], ['atmak', 'to throw (away)']];

