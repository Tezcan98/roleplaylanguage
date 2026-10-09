import * as THREE from 'three';
import { Location } from '../Location.js';
import { Foliage } from '../../engine/Foliage.js';
// import { addTrashBin } from '../trashBin.js';

const DARK = { tex: 'darkWood' };

/** Village courtyard: house front, fountain, vine pergola, vegetable garden, old car. */
export class Yard extends Location {
  constructor() {
    super({ id: 'yard', name: 'Avlu', spawn: 'houseDoor', bounds: { x: [-23, 23], z: [-23, 23] } });
  }

  /** House front at z = -11, 19 m × 8 m (the rooms inside are 25 m long: a little magic, but close). */
  #house(mf, C) {
    const add = (m) => this.add(m), W = 19, D = 8, H = 4.2, z = -15, front = z + D / 2;
    add(mf.at(mf.box(W, H, D, { tex: 'whiteWall', repeat: [6, 1] }), 0, H / 2, z));
    add(mf.at(mf.box(W + 0.3, 0.45, D + 0.3, { tex: 'stone', repeat: [8, 1] }), 0, 0.22, z)); // stone plinth
    add(mf.at(mf.hipRoof(W + 1.4, D + 1.4, 2.6, { tex: 'roof', repeat: [10, 3] }), 0, H, z));
    add(mf.at(mf.box(W + 1.5, 0.2, D + 1.5, DARK), 0, H - 0.05, z)); // fascia
    [[-5, -1.5], [5.5, 1.2]].forEach(([x, dz]) => add(mf.at(mf.box(0.75, 2.1, 0.75, { tex: 'brick' }), x, H + 1.6, z + dz))); // chimneys
    // the front door under a little porch roof on two posts, two steps up
    add(mf.at(mf.box(1.4, 2.4, 0.14, DARK), 0, 1.2 + 0.25, front + 0.04));
    add(mf.at(mf.box(1.7, 2.6, 0.1, 0xF4F1EA), 0, 1.3 + 0.2, front + 0.01)); // door frame
    add(mf.at(mf.sphere(0.05, 0xD4AF37, 8), 0.5, 1.3, front + 0.14)); // knob
    add(mf.at(mf.box(2.6, 0.2, 1.4, { tex: 'stone' }), 0, 0.1, front + 0.7));
    add(mf.at(mf.box(2.2, 0.2, 0.8, { tex: 'stone' }), 0, 0.3, front + 0.4));
    const porch = add(mf.at(mf.box(3.4, 0.12, 2.0, { tex: 'roof', repeat: [2, 1] }), 0, 3.05, front + 0.95)); porch.rotation.x = 0.18;
    [-1.45, 1.45].forEach((x) => add(mf.at(mf.box(0.14, 2.9, 0.14, DARK), x, 1.45, front + 1.75)));
    C.addCircle(-1.45, front + 1.75, 0.12); C.addCircle(1.45, front + 1.75, 0.12);
    // windows: white frame and cross, green shutters, a sill with geraniums; they glow warm at night
    const glass = mf.uniqueMat(0x8EC5FF, { emissive: 0x000000, roughness: 0.25 });
    this.glows.push(glass);
    const win = (x, y, wz, ry) => {
      const g = new THREE.Group();
      g.add(mf.at(new THREE.Mesh(new THREE.BoxGeometry(1.3, 1.5, 0.1), glass), 0, 0, 0));
      g.add(mf.at(mf.box(1.5, 0.12, 0.16, 0xF4F1EA), 0, 0.81, 0.02));
      g.add(mf.at(mf.box(0.12, 1.7, 0.16, 0xF4F1EA), -0.71, 0, 0.02));
      g.add(mf.at(mf.box(0.12, 1.7, 0.16, 0xF4F1EA), 0.71, 0, 0.02));
      g.add(mf.at(mf.box(0.07, 1.5, 0.14, 0xF4F1EA), 0, 0, 0.03));
      g.add(mf.at(mf.box(1.3, 0.07, 0.14, 0xF4F1EA), 0, 0.2, 0.03));
      [-1, 1].forEach((side) => { // shutters, open
        const sh = mf.box(0.62, 1.6, 0.06, 0x2E7D5B); sh.position.set(side * 1.1, 0, 0.06); g.add(sh);
        for (let k = -2; k <= 2; k++) g.add(mf.at(mf.box(0.5, 0.04, 0.03, 0x24664A), side * 1.1, k * 0.28, 0.1));
      });
      g.add(mf.at(mf.box(1.6, 0.1, 0.3, 0xE8E2D4), 0, -0.82, 0.12)); // sill
      g.add(mf.at(mf.box(1.3, 0.22, 0.26, 0x9A5B3A), 0, -0.66, 0.2)); // flower box
      for (let k = 0; k < 5; k++) {
        g.add(mf.at(mf.sphere(0.11, { tex: 'leaves' }, 6), -0.5 + k * 0.25, -0.5, 0.2));
        g.add(mf.at(mf.sphere(0.06, k % 2 ? 0xE4574A : 0xF06292, 6), -0.5 + k * 0.25, -0.4, 0.26));
      }
      g.position.set(x, y, wz); g.rotation.y = ry;
      return add(g);
    };
    [-7.6, -3.6, 3.6, 7.6].forEach((x) => win(x, 2.2, front + 0.05, 0));
    [-2.2, 2.2].forEach((dz) => { win(W / 2 + 0.05, 2.2, z + dz, Math.PI / 2); win(-W / 2 - 0.05, 2.2, z + dz, -Math.PI / 2); });
    // a bench by the wall, a lamp over the door
    add(mf.at(mf.box(1.8, 0.08, 0.45, { tex: 'lightWood' }), -2.6, 0.48, front + 0.35));
    [-3.35, -1.85].forEach((x) => add(mf.at(mf.box(0.08, 0.46, 0.4, DARK), x, 0.23, front + 0.35)));
    C.addBox(-W / 2 - 0.15, W / 2 + 0.15, z - D / 2 - 0.15, front + 0.15);
    C.addBox(-1.3, 1.3, front, front + 1.4); // the steps
    C.addBox(-3.5, -1.7, front, front + 0.6);
  }

  build(kit) {
    const { mf } = kit, C = this.collision, add = (m) => this.add(m);

    add(mf.ground(120, 120, { tex: 'grass', repeat: [30, 30] }));
    add(mf.ground(2.4, 16, { tex: 'dirt', repeat: [1, 6] }, 0.02)).position.z = -3;
    add(mf.disc(5, { tex: 'dirt', repeat: [3, 3] }, 0.015)).position.set(-3, 0.015, -5);

    // the house: as long as the rooms inside (living room, kitchen, bedrooms), one storey under a
    // hip roof, a porch over the door, windows with shutters and flower boxes
    this.#house(mf, C);
    this.hotspot('yard.door', 0, -10.2);
    // addTrashBin(this, mf, C, 'yard.trash', -3.2, -10.45);
    this.anchor('houseDoor', 0, -9.4, 0);

    // fountain (çeşme)
    this.prop(kit, 'prop.cesme', 5.6, 0, -10.75, 0, () => {
      const g = mf.group(mf.at(mf.box(0.8, 1.2, 0.5, { tex: 'stone' }), 0, 0.6, 0));
      const tap = mf.cyl(0.05, 0.05, 0.35, { tex: 'metal' }, 6); tap.rotation.x = Math.PI / 2;
      g.add(mf.at(tap, 0, 1, 0.35));
      return g;
    });
    C.addBox(5.2, 6.0, -11.05, -10.45);
    this.hotspot('yard.tap', 5.6, -9.8, 1.2);

    // vine pergola with breakfast table
    const P = this.prop(kit, 'prop.pergola', -8, 0, -4, 0, () => {
      const g = new THREE.Group();
      [[-2.5, -2], [2.5, -2], [-2.5, 2], [2.5, 2]].forEach(([x, z]) => g.add(mf.at(mf.cyl(0.12, 0.14, 2.8, { tex: 'bark' }), x, 1.4, z)));
      for (let z = -2.2; z <= 2.2; z += 0.55) g.add(mf.at(mf.box(5.6, 0.08, 0.12, DARK), 0, 2.85, z));
      for (let i = 0; i < 46; i++) {
        const l = mf.box(0.7, 0.12, 0.7, { tex: 'leaves' });
        l.position.set(-2.6 + Math.random() * 5.2, 2.95 + Math.random() * 0.1, -2.2 + Math.random() * 4.4);
        l.rotation.y = Math.random() * 3; g.add(l);
      }
      for (let i = 0; i < 9; i++) {
        const bunch = new THREE.Group();
        for (let k = 0; k < 7; k++) bunch.add(mf.at(mf.sphere(0.09, 0x6A2C70, 8), (Math.random() - 0.5) * 0.22, -k * 0.07, (Math.random() - 0.5) * 0.22));
        bunch.position.set(-2.2 + Math.random() * 4.4, 2.72, -1.8 + Math.random() * 3.6); g.add(bunch);
      }
      g.add(mf.at(mf.box(2, 0.1, 1.1, { tex: 'lightWood' }), 0, 0.8, 0));
      [[-0.85, -0.45], [0.85, -0.45], [-0.85, 0.45], [0.85, 0.45]].forEach(([x, z]) => g.add(mf.at(mf.box(0.1, 0.8, 0.1, DARK), x, 0.4, z)));
      [[-0.4, 0.1], [0.2, -0.2], [-0.7, -0.3]].forEach(([x, z]) => {
        g.add(mf.at(mf.cyl(0.06, 0.045, 0.18, 0xC8451F, 8), x, 0.94, z));
        g.add(mf.at(mf.cyl(0.1, 0.1, 0.015, 0xffffff, 12), x, 0.855, z));
      });
      const simit = mf.torus(0.12, 0.05, 0xC98A3E); simit.rotation.x = Math.PI / 2; g.add(mf.at(simit, -0.1, 0.88, -0.25));
      return g;
    });
    [[-2.5, -2], [2.5, -2], [-2.5, 2], [2.5, 2]].forEach(([x, z]) => C.addCircle(P.position.x + x, P.position.z + z, 0.3));
    C.addBox(-9.1, -6.9, -4.6, -3.4);

    // clothesline (çamaşır ipi)
    [-4.8, -1.6].forEach((x) => { add(mf.at(mf.cyl(0.05, 0.06, 1.8, { tex: 'bark' }, 6), x, 0.9, -7.6)); C.addCircle(x, -7.6, 0.15); });
    add(mf.at(mf.box(3.2, 0.015, 0.015, 0xF4F1DE), -3.2, 1.72, -7.6));
    this.anchor('laundry', -5.4, -6.9, Math.PI * 0.75);
    this.anchor('pergolaSeat', -8, -2.85, Math.PI);

    // vegetable garden
    add(mf.at(mf.box(6, 0.12, 5, { tex: 'dirt', repeat: [2, 2], color: 0x9A6E4E }), 9, 0.06, -3));
    for (let r = 0; r < 3; r++) for (let c = 0; c < 4; c++) {
      const x = 6.9 + c * 1.4, z = -4.8 + r * 1.5;
      add(mf.at(mf.cyl(0.03, 0.03, 0.5, 0x3E7A2A, 6), x, 0.35, z));
      add(mf.at(mf.sphere(0.26, { tex: 'leaves' }, 8), x, 0.62, z));
    }
    this.anchor('garden', 9, 0.2, Math.PI);
    this.hotspot('yard.garden', 12.4, -3, 1.4);

    // the player's own little garden bed (empty for now: planting comes when you are older)
    add(mf.at(mf.box(2.6, 0.1, 1.8, { tex: 'dirt', color: 0x8A5E40 }), 12.4, 0.05, 2.8));
    [[12.4, 1.85, 2.8, 0.1], [12.4, 3.75, 2.8, 0.1]].forEach(([x, z, w, d]) => add(mf.at(mf.box(w, 0.18, d, DARK), x, 0.09, z)));
    [[11.05, 2.8], [13.75, 2.8]].forEach(([x, z]) => add(mf.at(mf.box(0.1, 0.18, 2, DARK), x, 0.09, z)));
    add(mf.at(mf.box(0.08, 0.9, 0.08, DARK), 11.2, 0.45, 3.9));
    add(mf.at(mf.box(0.9, 0.45, 0.05, { tex: 'myGardenSign' }), 11.2, 0.95, 3.94));
    this.hotspot('yard.myGarden', 12.4, 4.4, 1.3);

    // dad's old car (a classic Turkish sedan) with a flat tyre
    this.prop(kit, 'prop.car', -11, 0, 7, 0, () => oldCar(mf));
    C.addBox(-13.2, -8.8, 6, 8);
    this.anchor('car', -8.2, 7.3, -Math.PI / 2);

    // trees
    const tree = (x, z, s) => this.prop(kit, 'prop.tree', x, 0, z, Math.random() * 6, () => {
      const g = mf.group(mf.at(mf.cyl(0.2, 0.3, 1.8, { tex: 'bark' }), 0, 0.9, 0));
      g.add(mf.at(mf.ico(1.4, { tex: 'leaves', repeat: [2, 2] }), 0, 2.6, 0));
      g.add(mf.at(mf.ico(1, { tex: 'leaves' }), 0.5, 3.4, 0.2));
      return g;
    }).scale.setScalar(s);
    for (let i = 0; i < 26; i++) {
      const a = i / 26 * Math.PI * 2 + Math.random() * 0.2, r = 28 + Math.random() * 8;
      tree(Math.cos(a) * r, Math.sin(a) * r, 0.9 + Math.random() * 0.7);
    }
    [[15, 11, 1.1], [7, 15, 1], [-17, -9, 1.2]].forEach(([x, z, s]) => { tree(x, z, s); C.addCircle(x, z, 0.6); });

    // meadow: grass tufts and flowers everywhere nothing else is
    const C2 = this.collision;
    const clear = [
      [-1.8, 1.8, -11, 24], [6, 12, -5.8, -0.2], [10.8, 14, 1.6, 4.2], [-10.8, -5.2, -6.3, -1.7], [-13.6, -8.4, 5.5, 8.5], [-5.2, -1.2, -8.2, -7.0],
    ];
    const blocked = (x, z) => (x + 3) ** 2 + (z + 5) ** 2 < 27
      || clear.some(([x0, x1, z0, z1]) => x > x0 && x < x1 && z > z0 && z < z1)
      || C2.boxes.some(([x0, x1, z0, z1]) => x > x0 - 0.3 && x < x1 + 0.3 && z > z0 - 0.3 && z < z1 + 0.3);
    add(Foliage.meadow({ area: { x: [-23.5, 23.5], z: [-23.5, 23.5] }, count: kit.quality === 'low' ? 2500 : 9000, flowers: kit.quality === 'low' ? 200 : 600, blocked }));

    // fence with a garden gate on the south side (the road to school)
    const post = (x, z) => add(mf.at(mf.box(0.18, 1, 0.18, DARK), x, 0.5, z));
    for (let i = -24; i <= 24; i += 2) {
      [[i, -24], [-24, i], [24, i]].forEach(([x, z]) => post(x, z));
      if (Math.abs(i) > 1) post(i, 24);
    }
    const rail = (x, z, w, d) => [0.75, 0.4].forEach((y) => add(mf.at(mf.box(w, 0.08, d, DARK), x, y, z)));
    rail(0, -24, 48, 0.08); rail(-24, 0, 0.08, 48); rail(24, 0, 0.08, 48);
    rail(-12.75, 24, 22.5, 0.08); rail(12.75, 24, 22.5, 0.08);
    this.prop(kit, 'prop.gate', 0, 0, 24, 0, () => mf.group(
      mf.at(mf.box(0.2, 2.2, 0.2, DARK), -1.4, 1.1, 0), mf.at(mf.box(0.2, 2.2, 0.2, DARK), 1.4, 1.1, 0),
      mf.at(mf.box(3.2, 0.25, 0.25, DARK), 0, 2.2, 0),
      mf.at(mf.box(1.6, 0.45, 0.06, { tex: 'lightWood' }), 0, 2.65, 0)));
    add(mf.ground(2.4, 19.5, { tex: 'dirt', repeat: [1, 7] }, 0.021)).position.z = 14.25; // from the yard to the garden gate, no gap
    this.hotspot('yard.gate', 0, 22.8, 1.9); // the street: school or the village square
    this.anchor('gate', 0, 22, Math.PI);
  }
}

/**
 * Dad's old car: a classic 1970s–80s Turkish sedan (the Şahin / Doğan look) — its side profile
 * extruded with rounded edges (bonnet, cabin, boot), tinted windows between the pillars, chrome
 * bumpers and grille, round headlights, red tail lights, door lines, mirrors, hubcaps and a
 * Turkish number plate. The front right tyre is flat (dad is fixing it). Front = +x, 4.3 m long.
 */
function oldCar(mf) {
  const g = new THREE.Group();
  const paint = mf.mat(0x3E7FA0, { roughness: 0.38, metalness: 0.2 }); // the old blue
  const chrome = mf.mat(0xD9DEE3, { roughness: 0.25, metalness: 0.8 });
  const dark = mf.mat(0x1E1E22, { roughness: 0.8 });
  const glass = mf.mat(0x9FC4D8, { roughness: 0.1, metalness: 0.3, transparent: true, opacity: 0.85 });
  const W = 1.7; // width
  const side = (pts, depth, mat, bevel = 0.06) => {
    const shape = new THREE.Shape(pts.map(([x, y]) => new THREE.Vector2(x, y)));
    const geo = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: true, bevelThickness: bevel, bevelSize: bevel, bevelSegments: 3, curveSegments: 4 });
    geo.translate(0, 0, -depth / 2);
    return mf.mesh(geo, mat);
  };
  // the body: low boot at the back, long bonnet at the front
  g.add(side([[-2.1, 0.34], [2.08, 0.34], [2.14, 0.62], [2.02, 0.84], [0.62, 0.92], [-1.25, 0.92], [-2.06, 0.86], [-2.16, 0.6]], W - 0.12, paint));
  // the cabin: glass all round, then the roof and the pillars in the car's colour
  const cabin = [[0.62, 0.92], [-1.22, 0.92], [-0.98, 1.46], [0.16, 1.46]];
  g.add(side(cabin, W - 0.34, glass, 0.03));
  g.add(mf.at(side([[0.2, 1.42], [-1.02, 1.42], [-0.99, 1.5], [0.17, 1.5]], W - 0.3, paint, 0.03), 0, 0, 0)); // roof
  for (const z of [-1, 1]) {
    const zz = z * (W - 0.32) / 2;
    const pillar = (x0, y0, x1, y1) => { // a pillar from (x0, y0) up to (x1, y1) on this side
      const len = Math.hypot(x1 - x0, y1 - y0), m = mf.box(0.08, len, 0.05, paint);
      m.position.set((x0 + x1) / 2, (y0 + y1) / 2, zz); m.rotation.z = Math.atan2(x0 - x1, y1 - y0); g.add(m);
    };
    pillar(0.6, 0.93, 0.17, 1.46); pillar(-0.32, 0.93, -0.32, 1.46); pillar(-1.2, 0.93, -0.99, 1.46); // A, B, C
    g.add(mf.at(mf.box(1.72, 0.05, 0.05, paint), -0.3, 0.95, zz)); // window sill
    g.add(mf.at(mf.box(0.02, 0.5, 0.02, dark), -0.32, 0.62, z * (W / 2 + 0.005))); // door lines
    g.add(mf.at(mf.box(0.02, 0.5, 0.02, dark), 0.55, 0.62, z * (W / 2 + 0.005)));
    g.add(mf.at(mf.box(0.16, 0.03, 0.04, chrome), 0.42, 0.78, z * (W / 2 + 0.02))); // door handles
    g.add(mf.at(mf.box(0.16, 0.03, 0.04, chrome), -0.5, 0.78, z * (W / 2 + 0.02)));
    g.add(mf.at(mf.box(3.6, 0.04, 0.02, chrome), 0, 0.5, z * (W / 2 + 0.01))); // chrome strip along the side
    g.add(mf.at(mf.box(0.1, 0.08, 0.12, dark), 0.62, 1.0, z * (W / 2 + 0.05))); // mirror
  }
  // front: chrome bumper, dark grille with chrome bars, round headlights; back: bumper, red lights
  g.add(mf.at(mf.box(0.12, 0.12, W + 0.04, chrome), 2.2, 0.42, 0));
  g.add(mf.at(mf.box(0.12, 0.12, W + 0.04, chrome), -2.22, 0.42, 0));
  g.add(mf.at(mf.box(0.04, 0.22, 0.8, dark), 2.17, 0.66, 0));
  for (const y of [0.6, 0.67, 0.74]) g.add(mf.at(mf.box(0.05, 0.02, 0.82, chrome), 2.18, y, 0));
  const lamp = mf.mat(0xFFF2C0, { emissive: 0x6B5A20, roughness: 0.2 });
  for (const z of [-0.6, 0.6]) {
    const ring = mf.cyl(0.13, 0.13, 0.05, chrome, 18); ring.rotation.z = Math.PI / 2; ring.position.set(2.16, 0.68, z); g.add(ring);
    const l = mf.cyl(0.1, 0.1, 0.06, lamp, 18); l.rotation.z = Math.PI / 2; l.position.set(2.18, 0.68, z); g.add(l);
    g.add(mf.at(mf.box(0.05, 0.14, 0.3, mf.mat(0xC8202A, { emissive: 0x3A0608, roughness: 0.3 })), -2.19, 0.68, z));
  }
  // number plates (06 = Ankara)
  const c = document.createElement('canvas'); c.width = 256; c.height = 56;
  const x = c.getContext('2d');
  x.fillStyle = '#F5F5F0'; x.fillRect(0, 0, 256, 56); x.fillStyle = '#1F4FA8'; x.fillRect(0, 0, 30, 56);
  x.fillStyle = '#fff'; x.font = 'bold 16px sans-serif'; x.textAlign = 'center'; x.fillText('TR', 15, 44);
  x.fillStyle = '#111'; x.font = 'bold 34px sans-serif'; x.fillText('06 YA 1979', 143, 40);
  const plateTex = new THREE.CanvasTexture(c); plateTex.colorSpace = THREE.SRGBColorSpace;
  const plate = new THREE.MeshBasicMaterial({ map: plateTex });
  for (const [px, ry] of [[2.27, Math.PI / 2], [-2.29, -Math.PI / 2]]) {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(0.52, 0.11), plate); m.position.set(px, 0.42, 0); m.rotation.y = ry; g.add(m);
  }
  // wheels: tyre, hubcap; the front right one is flat
  [[1.35, 1], [-1.35, 1], [1.35, -1], [-1.35, -1]].forEach(([wx, z], i) => {
    const flat = i === 0;
    const w = new THREE.Group();
    const tyre = mf.cyl(0.36, 0.36, 0.24, dark, 22); tyre.rotation.x = Math.PI / 2; w.add(tyre);
    const cap = mf.cyl(0.2, 0.2, 0.26, chrome, 18); cap.rotation.x = Math.PI / 2; w.add(cap);
    w.position.set(wx, flat ? 0.29 : 0.36, z * (W / 2 - 0.08));
    if (flat) w.scale.set(1, 0.8, 1);
    g.add(w);
  });
  return g;
}
