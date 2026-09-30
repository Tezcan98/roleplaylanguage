import * as THREE from 'three';
import { Location } from '../Location.js';
import { Foliage } from '../../engine/Foliage.js';

const DARK = { tex: 'darkWood' };

/** Village courtyard: house front, fountain, vine pergola, vegetable garden, old car. */
export class Yard extends Location {
  constructor() {
    super({ id: 'yard', name: 'Avlu', bounds: { x: [-23, 23], z: [-23, 23] } });
  }

  build(kit) {
    const { mf } = kit, C = this.collision, add = (m) => this.add(m);

    add(mf.ground(120, 120, { tex: 'grass', repeat: [30, 30] }));
    add(mf.ground(2.4, 16, { tex: 'dirt', repeat: [1, 6] }, 0.02)).position.z = -3;
    add(mf.disc(5, { tex: 'dirt', repeat: [3, 3] }, 0.015)).position.set(-3, 0.015, -5);

    // house front
    this.prop(kit, 'prop.house', 0, 0, -14, 0, () => {
      const g = mf.group(mf.at(mf.box(10, 4, 6, { tex: 'whiteWall', repeat: [3, 1] }), 0, 2, 0));
      const roof = mf.cone(7.6, 2.6, { tex: 'roof', repeat: [4, 2] }, 4);
      roof.rotation.y = Math.PI / 4; roof.scale.z = 0.66; g.add(mf.at(roof, 0, 5.3, 0));
      g.add(mf.at(mf.box(1.3, 2.3, 0.12, DARK), 0, 1.15, 3.05));
      g.add(mf.at(mf.box(0.7, 1.6, 0.7, { tex: 'brick' }), 3, 6, -1));
      return g;
    });
    // windows glow warm at night
    [-3, 3].forEach((x) => {
      const glass = mf.uniqueMat(0x8EC5FF, { emissive: 0x000000 });
      this.glows.push(glass);
      add(mf.at(new THREE.Mesh(new THREE.BoxGeometry(1.4, 1.2, 0.12), glass), x, 2.3, -10.95));
      add(mf.at(mf.box(1.6, 0.15, 0.2, DARK), x, 1.65, -10.9));
    });
    C.addBox(-5.1, 5.1, -17.1, -10.9);
    this.hotspot('yard.door', 0, -10.2);
    this.anchor('houseDoor', 0, -9.4, 0);

    // fountain (çeşme)
    this.prop(kit, 'prop.cesme', 6.3, 0, -11.3, 0, () => {
      const g = mf.group(mf.at(mf.box(0.8, 1.2, 0.5, { tex: 'stone' }), 0, 0.6, 0));
      const tap = mf.cyl(0.05, 0.05, 0.35, { tex: 'metal' }, 6); tap.rotation.x = Math.PI / 2;
      g.add(mf.at(tap, 0, 1, 0.35));
      return g;
    });
    C.addBox(5.9, 6.7, -11.6, -11);
    this.hotspot('yard.tap', 6.9, -10.4, 1.2);

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

    // old car with a flat tyre
    this.prop(kit, 'prop.car', -11, 0, 7, 0, () => {
      const g = new THREE.Group();
      g.add(mf.at(mf.box(4.2, 0.8, 1.9, 0xE9E2CF), 0, 0.75, 0));
      g.add(mf.at(mf.box(2.2, 0.75, 1.72, 0xE9E2CF), -0.2, 1.52, 0));
      g.add(mf.at(mf.box(2.1, 0.6, 1.76, 0x7FB8E0), -0.2, 1.52, 0));
      [[1.35, 0.97], [-1.35, 0.97], [1.35, -0.97], [-1.35, -0.97]].forEach(([x, z], i) => {
        const w = mf.cyl(0.38, 0.38, 0.28, 0x222222, 14); w.rotation.x = Math.PI / 2; w.position.set(x, 0.38, z);
        if (i === 0) { w.scale.set(1, 1, 0.7); w.position.y = 0.3; }
        g.add(w);
      });
      g.add(mf.at(mf.box(0.1, 0.25, 0.4, 0xFFE08A), 2.12, 0.85, 0.6));
      g.add(mf.at(mf.box(0.1, 0.25, 0.4, 0xFFE08A), 2.12, 0.85, -0.6));
      return g;
    });
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
      [-1.8, 1.8, -11, 24], [6, 12, -5.8, -0.2], [-10.8, -5.2, -6.3, -1.7], [-13.6, -8.4, 5.5, 8.5], [-5.2, -1.2, -8.2, -7.0],
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
    add(mf.ground(2.4, 17, { tex: 'dirt', repeat: [1, 6] }, 0.021)).position.z = 15.5;
    this.hotspot('yard.gate', 0, 22.8, 1.9);
    this.anchor('gate', 0, 22, Math.PI);
  }
}
