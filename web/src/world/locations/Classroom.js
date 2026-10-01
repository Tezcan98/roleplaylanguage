import * as THREE from 'three';
import { Location } from '../Location.js';

const DARK = { tex: 'darkWood' };
const WALL = { tex: 'plaster', repeat: [3, 1] };

/** Classroom: chalkboard, teacher's desk and two rows of desks. */
export class Classroom extends Location {
  constructor() {
    super({ id: 'classroom', name: 'Sınıf', indoor: true, bounds: { x: [-5.6, 5.6], z: [-4.1, 4.4] }, cameraRig: 'indoor' });
    this.seats = [];
  }

  build(kit) {
    const { mf } = kit, C = this.collision, add = (m) => this.add(m);
    const noCast = (m) => { m.castShadow = false; return add(m); };
    add(mf.at(mf.box(12.4, 0.1, 9.4, { tex: 'schoolFloor', repeat: [6, 4] }), 0, -0.05, 0));
    noCast(mf.at(mf.box(12.4, 3.4, 0.2, WALL), 0, 1.7, -4.7));
    noCast(mf.at(mf.box(0.2, 3.4, 9.4, WALL), -6.1, 1.7, 0));
    noCast(mf.at(mf.box(0.2, 3.4, 5.4, WALL), 6.1, 1.7, -2));
    noCast(mf.at(mf.box(0.2, 3.4, 1.6, WALL), 6.1, 1.7, 3.9));
    noCast(mf.at(mf.box(0.2, 1.1, 2.4, WALL), 6.1, 2.85, 1.9));
    add(mf.at(mf.box(0.12, 2.3, 2, DARK), 6.02, 1.15, 1.9));
    this.hotspot('classroom.door', 5.3, 1.9, 1.5);

    add(mf.at(mf.box(5, 2, 0.08, { tex: 'chalkboard' }), 0, 1.8, -4.55));
    add(mf.at(mf.box(5.2, 0.1, 0.2, DARK), 0, 0.78, -4.5));
    add(mf.at(mf.box(2.4, 1.2, 0.04, { tex: 'alphabet' }), -4.3, 2, -4.57));
    add(mf.at(mf.box(1.2, 0.8, 0.04, { tex: 'flag' }), 4, 2.3, -4.57));
    // windows on the left wall
    [-2, 1.5].forEach((z) => {
      const glass = mf.uniqueMat(0xBFE3FF);
      this.windows.push(glass);
      add(mf.at(new THREE.Mesh(new THREE.BoxGeometry(0.1, 1.4, 2), glass), -6.02, 2, z));
    });
    this.lamps.push(new THREE.Vector3(0, 3, -1), new THREE.Vector3(0, 3, 2.5));

    this.prop(kit, 'prop.teacherDesk', 1.8, 0, -3.3, 0, () => mf.group(
      mf.at(mf.box(1.8, 0.08, 0.8, { tex: 'lightWood' }), 0, 0.78, 0), mf.at(mf.box(1.7, 0.7, 0.05, DARK), 0, 0.4, 0.35),
      mf.at(mf.box(0.3, 0.05, 0.22, 0xE4574A), 0.5, 0.84, 0)));
    C.addBox(0.9, 2.7, -3.7, -2.9);
    this.anchor('teacher', 0, -3.6, 0);

    // 2 × 3 desks with chairs; seats face the board (−z)
    let i = 0;
    for (const z of [-0.6, 1.9]) for (const x of [-3, 0, 3]) {
      this.prop(kit, 'prop.schoolDesk', x, 0, z, 0, () => mf.group(
        mf.at(mf.box(1.3, 0.06, 0.6, { tex: 'lightWood' }), 0, 0.72, 0),
        ...[[-0.6, -0.25], [0.6, -0.25], [-0.6, 0.25], [0.6, 0.25]].map(([a, b]) => mf.at(mf.box(0.05, 0.72, 0.05, { tex: 'metal' }), a, 0.36, b)),
        mf.at(mf.box(0.45, 0.05, 0.4, DARK), 0, 0.45, 0.75), mf.at(mf.box(0.45, 0.45, 0.05, DARK), 0, 0.7, 0.95)));
      C.addBox(x - 0.7, x + 0.7, z - 0.35, z + 0.35);
      this.anchor(`seat${i}`, x, z + 0.75, Math.PI);
      this.seats.push(`seat${i++}`);
    }
    this.anchor('door', 4.6, 1.9, -Math.PI / 2);
  }
}
