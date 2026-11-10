import * as THREE from 'three';
import { bakeStatic } from '../engine/StaticBatch.js';

/**
 * The five crops of the player's garden as little 3D plants. Each is `{ root, ripe }`: `root` is
 * scaled with the growth (a sprout → a full plant); `ripe` (the fruit) shows only when it can be
 * harvested. Built once per bed by the yard (world/locations/Yard.js).
 */
const GREEN = [0x4E7B37, 0x558E3F, 0x83B451, 0x3F6B2E];

export function buildPlant(mf, crop) {
  const body = new THREE.Group(), ripe = new THREE.Group();
  const leaf = (r, x, y, z, color, sx = 1.2, sy = .22, sz = .65, rz = 0, ry = 0) => {
    const m = mf.at(mf.sphere(r, color, 8), x, y, z); m.scale.set(sx, sy, sz); m.rotation.set(0, ry, rz); body.add(m); return m;
  };
  const stake = (h) => body.add(mf.at(mf.cyl(.025, .03, h, 0x9A7448, 6), .0, h / 2, -.12));
  if (crop === 'bean') {
    stake(1.05);
    body.add(mf.at(mf.cyl(.03, .04, .9, GREEN[0], 6), 0, .45, -.1));
    for (let k = 0; k < 4; k++) for (const s of [-1, 1]) leaf(.2, s * .2, .25 + k * .2, -.1, GREEN[(k + (s > 0)) % 3], 1.2, .22, .65, s * .4);
    for (const [x, y] of [[-.26, .5], [.24, .72], [.02, .34], [-.2, .85]]) { const p = mf.at(mf.sphere(.1, 0xA8C653, 8), x, y, .02); p.scale.set(.5, 2.1, .6); ripe.add(p); }
  } else if (crop === 'tomato') {
    stake(1.15);
    body.add(mf.at(mf.cyl(.035, .045, .8, GREEN[3], 6), 0, .4, 0));
    for (let k = 0; k < 4; k++) for (const s of [-1, 1]) leaf(.24, s * .24, .22 + k * .22, 0, GREEN[(k + (s > 0)) % 4], 1.15, .45, .8, s * .3);
    for (const [x, y, z] of [[-.3, .35, .14], [.3, .6, .1], [.05, .25, .22], [-.2, .8, .12]]) ripe.add(mf.at(mf.sphere(.14, 0xE35F40, 10), x, y, z));
  } else if (crop === 'pepper') {
    body.add(mf.at(mf.cyl(.035, .05, .5, GREEN[0], 6), 0, .25, 0));
    for (let k = 0; k < 3; k++) for (const s of [-1, 1]) leaf(.27, s * .22, .2 + k * .2, 0, GREEN[(k + (s > 0)) % 3], 1.1, .8, .9, s * .15);
    for (const [x, y, z] of [[-.3, .22, .2], [.28, .36, .15], [.02, .52, .24], [-.1, .16, -.24]]) { const p = mf.at(mf.cone(.09, .3, 0xE8B83D, 8), x, y, z); p.rotation.x = Math.PI; ripe.add(p); }
  } else if (crop === 'carrot') {
    for (let k = 0; k < 7; k++) {
      const a = k / 7 * Math.PI * 2, f = mf.at(mf.cone(.05, .55, GREEN[k % 3], 5), Math.cos(a) * .12, .27, Math.sin(a) * .12);
      f.rotation.set(Math.sin(a) * .5, 0, -Math.cos(a) * .5); body.add(f);
      for (const t of [.15, .3]) leaf(.07, Math.cos(a) * (.14 + t * .6), .3 + t, Math.sin(a) * (.14 + t * .6), GREEN[(k + 1) % 3], 1, 1, 1);
    }
    for (const [x, z] of [[-.28, .16], [.3, .05], [0, -.3], [.12, .3]]) { const c = mf.at(mf.cone(.1, .28, 0xF08A2E, 8), x, .13, z); c.rotation.x = Math.PI; ripe.add(c); }
  } else { // corn
    body.add(mf.at(mf.cyl(.05, .07, 1.3, GREEN[0], 6), 0, .65, 0));
    for (let k = 0; k < 6; k++) {
      const a = k * 2.4, m = mf.at(mf.box(.62, .03, .12, GREEN[k % 3 + 1 > 3 ? 0 : k % 3 + 1]), Math.cos(a) * .3, .35 + k * .17, Math.sin(a) * .3);
      m.rotation.set(0, -a, -.5); body.add(m);
    }
    for (const [x, y] of [[.12, .75], [-.1, .55]]) {
      const cob = mf.at(mf.sphere(.1, 0xF2C94C, 8), x, y, .12); cob.scale.set(.7, 1.9, .7); ripe.add(cob);
      const husk = mf.at(mf.cone(.09, .3, GREEN[2], 6), x, y - .17, .12); husk.rotation.x = Math.PI; ripe.add(husk);
    }
  }
  bakeStatic(body); bakeStatic(ripe);
  ripe.userData.live = true;
  const root = new THREE.Group(); root.add(body, ripe);
  return { root, ripe };
}

/** A scarecrow at the corner of the garden (collision is added by the yard). */
export function buildScarecrow(mf) {
  const g = new THREE.Group(), wood = 0x7A5A38, straw = 0xD9B45B, cloth = 0x8C5A3C;
  g.add(mf.at(mf.cyl(.04, .05, 1.75, wood, 6), 0, .87, 0));
  g.add(mf.at(mf.box(1.25, .07, .07, wood), 0, 1.3, 0));
  g.add(mf.at(mf.box(.42, .6, .22, cloth), 0, 1.1, 0));
  g.add(mf.at(mf.sphere(.19, 0xE3CBA0, 10), 0, 1.6, 0));
  g.add(mf.at(mf.cyl(.34, .34, .035, straw, 14), 0, 1.74, 0));
  g.add(mf.at(mf.cyl(.17, .2, .2, straw, 12), 0, 1.84, 0));
  for (const s of [-1, 1]) {
    g.add(mf.at(mf.cyl(.025, .03, .3, straw, 5), s * .66, 1.2, 0));
    g.add(mf.at(mf.sphere(.07, 0x2B2B2B, 6), s * .07, 1.62, .17));
  }
  bakeStatic(g);
  return g;
}

/** A sunflower for the garden's edge. */
export function buildSunflower(mf, tilt = 0) {
  const g = new THREE.Group();
  g.add(mf.at(mf.cyl(.03, .045, 1.2, GREEN[0], 6), 0, .6, 0));
  const leaf = mf.at(mf.sphere(.14, GREEN[2], 8), .12, .5, 0); leaf.scale.set(1.3, .2, .7); leaf.rotation.z = .4; g.add(leaf);
  const head = new THREE.Group(); head.position.set(0, 1.22, .04); head.rotation.x = -.5 + tilt; g.add(head);
  const petals = mf.at(mf.cyl(.24, .24, .04, 0xF4C430, 16), 0, 0, 0); petals.rotation.x = Math.PI / 2; head.add(petals);
  const core = mf.at(mf.cyl(.13, .13, .06, 0x5A3A22, 14), 0, 0, .03); core.rotation.x = Math.PI / 2; head.add(core);
  bakeStatic(g);
  return g;
}
