import * as THREE from 'three';
import { Location } from '../Location.js';
import { Foliage } from '../../engine/Foliage.js';
import { buildPitch } from '../Pitch.js';
import { Townscape } from '../Townscape.js';
// import { addTrashBin } from '../trashBin.js';

const DARK = { tex: 'darkWood' };

/** The village primary school from outside: courtyard, flagpole, entrance. */
/** The football pitch on the yard: goals at both ends (x), centre spot. */
export const PITCH = { x0: -10, x1: 10, z0: -8.6, z1: 4.6, goalHalf: 2 }; // wide goals: easier to score
PITCH.cz = (PITCH.z0 + PITCH.z1) / 2;
/** The canteen kiosk beside the school building, west of the pitch (its window faces south). */
const CANTEEN = { x: -13.6, z: -7.7 };

export class SchoolYard extends Location {
  /** Score on the board by the pitch. */
  writeScore(a, b) { this.scoreWriter?.(a, b); }

  /** White lines, two goals with nets, a score board. */
  #pitch(mf) {
    this.scoreWriter = buildPitch(this, mf, { ...PITCH, board: { x: -12.6, z: PITCH.cz, rot: Math.PI / 2 } });
    this.anchor('kickoff', 0, PITCH.cz + 2.5, Math.PI);
    this.hotspot('school.scoreReset', -12.0, PITCH.cz, 1.3); // under the score board
  }

  /**
   * The canteen: a little kiosk beside the school building, open at the front (south, towards the
   * camera) over a counter with toasts, simits and drinks; Hasan Amca behind it
   * (content/addons/kantin.js), shelves at the back.
   */
  #canteen(mf, C) {
    const add = (m) => this.add(m), x = CANTEEN.x, z = CANTEEN.z, w = 4, d = 2.4, H = 2.7, T = 0.15;
    const x0 = x - w / 2, x1 = x + w / 2, z0 = z - d / 2, z1 = z + d / 2, wall = { tex: 'whiteWall' };
    add(mf.at(mf.box(w, H, T, wall), x, H / 2, z0)); // back
    [x0, x1].forEach((wx) => add(mf.at(mf.box(T, H, d, wall), wx, H / 2, z)));
    add(mf.at(mf.box(w, 0.5, T, wall), x, H - 0.25, z1)); // over the window
    add(mf.at(mf.box(w + 0.5, 0.14, d + 0.6, { tex: 'roof', repeat: [2, 1] }), x, H + 0.07, z - 0.1));
    add(mf.at(mf.box(w + 0.4, 0.05, 1.1, { tex: 'awning', repeat: [3, 1] }), x, H - 0.45, z1 + 0.5)).rotation.x = 0.25;
    const floor = add(mf.ground(w - 0.2, d - 0.2, { tex: 'floorWood', repeat: [2, 1] }, 0.03)); floor.position.set(x, 0.03, z);
    // shelves at the back, the counter in front
    add(mf.at(mf.box(w - 0.5, 1.6, 0.35, { tex: 'darkWood' }), x, 1.35, z0 + 0.3));
    add(mf.at(mf.box(w - 0.6, 1.4, 0.02, { tex: 'groceryShelf', repeat: [2, 1] }), x, 1.35, z0 + 0.49));
    add(mf.at(mf.box(w - 0.1, 1.0, 0.5, { tex: 'lightWood' }), x, 0.5, z1 - 0.25));
    add(mf.at(mf.box(w, 0.06, 0.62, DARK), x, 1.03, z1 - 0.25));
    // on the counter: a toaster, a tray of toasts, simits on a stick, ayran and juice
    const cz = z1 - 0.3;
    add(mf.at(mf.box(0.55, 0.22, 0.4, { tex: 'metal' }), x - 1.2, 1.17, cz));
    add(mf.at(mf.box(0.5, 0.02, 0.38, { tex: 'metal' }), x - 1.2, 1.29, cz));
    [-0.15, 0, 0.15].forEach((o) => { add(mf.at(mf.box(0.22, 0.04, 0.13, 0xD9A05B), x - 0.35 + o, 1.08 + (o + 0.15) * 0.15, cz)).rotation.y = o; });
    add(mf.at(mf.cyl(0.015, 0.015, 0.6, DARK, 6), x + 0.45, 1.36, cz));
    [0, 1, 2].forEach((k) => { const r = mf.torus(0.09, 0.03, 0xB7793A, 12); r.rotation.y = Math.PI / 2; add(mf.at(r, x + 0.45, 1.2 + k * 0.17, cz)); });
    [0, 1, 2, 3].forEach((k) => add(mf.at(mf.cyl(0.05, 0.045, 0.13, k % 2 ? 0xF39C12 : 0xF4F1EA, 10), x + 0.95 + k * 0.16, 1.12, cz)));
    C.addBox(x0 - 0.1, x1 + 0.1, z0 - 0.1, z1 + 0.05);
    this.anchor('kantinci', x, z1 - 0.95, 0); // behind the counter, facing the yard
    // sign over the window
    const c = document.createElement('canvas'); c.width = 512; c.height = 96;
    const g = c.getContext('2d');
    g.fillStyle = '#1F4E8C'; g.fillRect(0, 0, 512, 96);
    g.fillStyle = '#F4D58D'; g.font = 'bold 62px Fredoka, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText('KANTİN', 256, 51);
    const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace;
    const sign = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 0.45), new THREE.MeshBasicMaterial({ map: tex }));
    sign.position.set(x, H + 0.42, z1 + 0.06); add(sign);
    add(mf.at(mf.box(2.5, 0.52, 0.05, DARK), x, H + 0.42, z1 + 0.02));
  }

  /**
   * Outside the school: a stone wall all round (the gate in the south, the opening to the square
   * in the east), a road with cars beyond it, and the town — shops across the road (a stationer's
   * by the gate), houses on the other sides. Seen, never reached (the bounds stop you at the wall).
   */
  #town(mf) {
    const T = new Townscape(mf, this, 11), X = 16.8, S = 12.8, N = -17;
    T.ground(0, 0, 220, 220, { tex: 'grass', repeat: [50, 50] }, -0.02);
    T.wall(-X, S, X, S, { h: 1.0, gaps: [[-1.8, 1.8]] }); // low on the camera's side: it never hides you
    T.wall(-X, N, X, N);
    T.wall(-X, N, -X, S);
    T.wall(X, N, X, S, { gaps: [[-1.0, 1.4]] });
    // the road along the south, another one east (the way to the square crosses it)
    T.road(-80, 15.2, 80, 21.2);
    T.road(21, -80, 27, 80);
    T.traffic('x', 18.2, -80, 80, 3);
    T.traffic('z', 24, -80, 80, 2);
    // across the south road: shops by the gate, houses further on
    [['KIRTASİYE', -5], ['FIRIN', 4.5], ['BERBER', -14.5], ['ECZANE', 14]].forEach(([name, x]) => T.shop(x, 27.5, Math.PI, name, { w: 8, d: 6 }));
    [-24, -33, -42, 33, 42].forEach((x) => T.house(x, 27.5, Math.PI));
    // across the east road: shops facing the road
    [['BAKKAL', -6], ['MANAV', 3], ['TERZİ', 12]].forEach(([name, z]) => T.shop(33, z, -Math.PI / 2, name, { w: 7.5, d: 6 }));
    [-15, -24, 21, 30].forEach((z) => T.house(33, z, -Math.PI / 2));
    // west and north: houses in gardens, trees between them
    [-14, -4, 6].forEach((z) => T.house(-25, z, Math.PI / 2, { w: 6.5 }));
    [-12, -1, 10].forEach((x) => T.house(x, -26, 0, { w: 7 }));
    [[-20, 9], [-20, -9], [-21, 14], [-6, -21], [5, -21], [16, -22], [-17, -21], [20, -12]].forEach(([x, z]) => T.tree(x, z, 1 + (Math.abs(x * z) % 3) * 0.15));
    T.done();
  }

  constructor() {
    super({ id: 'schoolyard', name: 'Okul bahçesi', spawn: 'gate', bounds: { x: [-16, 16], z: [-9.4, 12] } });
  }

  build(kit) {
    const { mf } = kit, C = this.collision, add = (m) => this.add(m);
    add(mf.ground(90, 90, { tex: 'grass', repeat: [22, 22] }));
    add(mf.ground(22, 16, { tex: 'stone', repeat: [6, 4] }, 0.02)).position.z = -2;
    add(mf.ground(2.4, 10, { tex: 'dirt', repeat: [1, 3] }, 0.021)).position.z = 10;

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
    // addTrashBin(this, mf, C, 'school.trash1', 3.5, -8.6);
    // addTrashBin(this, mf, C, 'school.trash2', 2.6, 10.4);

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
    this.#canteen(mf, C);

    // benches for the spectators and trees
    [[-5.5, 8], [5.5, 8]].forEach(([x, z], b) => {
      // two seats each, to sit and watch the match ("Banka otur": content/hotspots.js school.bench1…4)
      [-0.55, 0.55].forEach((o, i) => {
        const n = b * 2 + i + 1;
        this.anchor(`schoolBench${n}`, x - o, z, Math.PI);
        this.hotspot(`school.bench${n}`, x - o, z - 0.75, 0.6);
      });
      this.prop(kit, 'prop.bench', x, 0, z, Math.PI, () => mf.group(
        mf.at(mf.box(2, 0.08, 0.5, { tex: 'lightWood' }), 0, 0.45, 0), mf.at(mf.box(2, 0.5, 0.08, { tex: 'lightWood' }), 0, 0.75, -0.25),
        mf.at(mf.box(0.08, 0.45, 0.45, DARK), -0.9, 0.22, 0), mf.at(mf.box(0.08, 0.45, 0.45, DARK), 0.9, 0.22, 0)));
      C.addBox(x - 1, x + 1, z - 0.3, z + 0.3);
    });
    const tree = (x, z, s) => this.prop(kit, 'prop.tree', x, 0, z, Math.random() * 6, () => mf.group(
      mf.at(mf.cyl(0.2, 0.3, 1.8, { tex: 'bark' }), 0, 0.9, 0),
      mf.at(mf.ico(1.4, { tex: 'leaves', repeat: [2, 2] }), 0, 2.6, 0),
      mf.at(mf.ico(1, { tex: 'leaves' }), 0.5, 3.4, 0.2))).scale.setScalar(s);
    [[13, -3], [-12, 7], [12, 8], [-15, 2], [15, 3]].forEach(([x, z]) => { tree(x, z, 1.1); C.addCircle(x, z, 0.6); });
    add(Foliage.meadow({
      area: { x: [-16, 16], z: [-9.5, 12] }, count: kit.quality === 'low' ? 800 : 2500, flowers: 200,
      blocked: (x, z) => (Math.abs(x) < 11.2 && z > -10.2 && z < 6.2) || (Math.abs(x) < 1.6 && z > 4) || (x < -11 && z < -5.6),
    }));

    this.#town(mf);

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
