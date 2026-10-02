import * as THREE from 'three';
import { Location } from '../Location.js';
import { Foliage } from '../../engine/Foliage.js';
import { buildPitch } from '../Pitch.js';

const DARK = { tex: 'darkWood' };

/** The village primary school from outside: courtyard, flagpole, entrance. */
/** The football pitch on the yard: goals at both ends (x), centre spot. */
export const PITCH = { x0: -10, x1: 10, z0: -8.6, z1: 4.6, goalHalf: 1.5 };
PITCH.cz = (PITCH.z0 + PITCH.z1) / 2;

export class SchoolYard extends Location {
  /** Score on the board by the pitch. */
  writeScore(a, b) { this.scoreWriter?.(a, b); }

  /** White lines, two goals with nets, a score board. */
  #pitch(mf) {
    this.scoreWriter = buildPitch(this, mf, { ...PITCH, board: { x: -12.6, z: PITCH.cz, rot: Math.PI / 2 } });
    this.anchor('kickoff', 0, PITCH.cz + 2.5, Math.PI);
  }

  constructor() {
    super({ id: 'schoolyard', name: 'Okul bahçesi', spawn: 'gate', bounds: { x: [-16, 16], z: [-9.4, 12] } });
  }

  build(kit) {
    const { mf } = kit, C = this.collision, add = (m) => this.add(m);
    add(mf.ground(90, 90, { tex: 'grass', repeat: [22, 22] }));
    add(mf.ground(22, 16, { tex: 'stone', repeat: [6, 4] }, 0.02)).position.z = -2;
    add(mf.ground(2.4, 8, { tex: 'dirt', repeat: [1, 3] }, 0.021)).position.z = 9;

    this.prop(kit, 'prop.school', 0, 0, -13, 0, () => {
      const g = mf.group(mf.at(mf.box(20, 6, 6, { tex: 'brick', repeat: [5, 2] }), 0, 3, 0));
      g.add(mf.at(mf.hipRoof(21.2, 7.2, 2.4, { tex: 'roof', repeat: [10, 2] }), 0, 6, 0));
      g.add(mf.at(mf.box(21.3, 0.2, 7.3, DARK), 0, 5.95, 0));
      g.add(mf.at(mf.box(2, 2.8, 0.15, DARK), 0, 1.4, 3.02));
      g.add(mf.at(mf.box(3.4, 1.2, 0.1, { tex: 'schoolSign' }), 0, 4.2, 3.05));
      return g;
    });
    [-7, -3.8, 3.8, 7].forEach((x) => {
      const glass = mf.uniqueMat(0x9FC9E8, { emissive: 0x000000 });
      this.glows.push(glass);
      add(mf.at(new THREE.Mesh(new THREE.BoxGeometry(2, 1.6, 0.1), glass), x, 3, -9.95));
      add(mf.at(mf.box(2.2, 0.15, 0.25, { tex: 'whiteWall' }), x, 2.15, -9.9));
    });
    C.addBox(-10.1, 10.1, -16.1, -9.9);
    this.hotspot('school.door', 0, -9.2, 1.6);

    // flagpole with the Turkish flag (beside the pitch)
    add(mf.at(mf.cyl(0.06, 0.08, 7, { tex: 'metal' }, 8), 12.6, 3.5, -8.6));
    C.addCircle(12.6, -8.6, 0.2);
    const flag = new THREE.Mesh(new THREE.PlaneGeometry(1.8, 1.2, 12, 1), mf.mat({ tex: 'flag' }, { side: THREE.DoubleSide }));
    flag.position.set(13.5, 6.3, -8.6);
    add(flag);
    const base = flag.geometry.attributes.position.array.slice();
    this.animated.push((dt, t) => {
      const p = flag.geometry.attributes.position;
      for (let i = 0; i < p.count; i++) {
        const x = base[i * 3] + 0.9;
        p.setZ(i, Math.sin(t * 4 - x * 3) * 0.12 * x);
      }
      p.needsUpdate = true;
      flag.geometry.computeVertexNormals();
    });

    this.#pitch(mf, C);

    // benches for the spectators and trees
    [[-5.5, 8], [5.5, 8]].forEach(([x, z]) => {
      this.prop(kit, 'prop.bench', x, 0, z, Math.PI, () => mf.group(
        mf.at(mf.box(2, 0.08, 0.5, { tex: 'lightWood' }), 0, 0.45, 0), mf.at(mf.box(2, 0.5, 0.08, { tex: 'lightWood' }), 0, 0.75, -0.25),
        mf.at(mf.box(0.08, 0.45, 0.45, DARK), -0.9, 0.22, 0), mf.at(mf.box(0.08, 0.45, 0.45, DARK), 0.9, 0.22, 0)));
      C.addBox(x - 1, x + 1, z - 0.3, z + 0.3);
    });
    const tree = (x, z, s) => this.prop(kit, 'prop.tree', x, 0, z, Math.random() * 6, () => mf.group(
      mf.at(mf.cyl(0.2, 0.3, 1.8, { tex: 'bark' }), 0, 0.9, 0),
      mf.at(mf.ico(1.4, { tex: 'leaves', repeat: [2, 2] }), 0, 2.6, 0),
      mf.at(mf.ico(1, { tex: 'leaves' }), 0.5, 3.4, 0.2))).scale.setScalar(s);
    [[-13, -6], [13, -3], [-12, 7], [12, 8], [-15, 2], [15, 3]].forEach(([x, z]) => { tree(x, z, 1.1); C.addCircle(x, z, 0.6); });
    add(Foliage.meadow({
      area: { x: [-16, 16], z: [-9.5, 12] }, count: kit.quality === 'low' ? 800 : 2500, flowers: 200,
      blocked: (x, z) => (Math.abs(x) < 11.2 && z > -10.2 && z < 6.2) || (Math.abs(x) < 1.6 && z > 4),
    }));

    this.hotspot('school.exit', 0, 11, 1.8);
    this.hotspot('school.leave', 0, 11, 1.8); // the same gate outside school days
    // a path east to the village square (the square is the other public place)
    add(mf.ground(5, 2.2, { tex: 'dirt', repeat: [2, 1] }, 0.021)).position.set(13.5, 0.021, 0.2);
    this.hotspot('school.square', 15.2, 0.2, 1.8);
    this.anchor('squareRoad', 13.6, 0.2, -Math.PI / 2);
    this.anchor('gate', 0, 10, Math.PI);
    this.anchor('door', 0, -8.4, 0);
    this.anchor('elif', -3, -5, 0.6);
    this.anchor('can', 3.5, -3.5, -0.7);
    this.anchor('zehra', 1.2, -5.5, 0.3);
  }
}
