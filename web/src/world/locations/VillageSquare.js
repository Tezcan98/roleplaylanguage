import * as THREE from 'three';
import { Location } from '../Location.js';
import { buildPitch } from '../Pitch.js';

const WOOD = { tex: 'darkWood' };
const LIGHT_WOOD = { tex: 'lightWood' };
const STONE = { tex: 'stone' };
const HALF = 32; // expanded village square; the fence runs at ±32 m

/** Chess board in the square: square size, centre and which way the ranks run. */
export const CHESS = { cx: -15, cz: 15, size: 1.1 };
/** "e4" → world x/z on the giant board (white at +z, the side facing the fountain). */
export function chessSquare(sq) {
  const file = sq.charCodeAt(0) - 97, rank = Number(sq[1]) - 1;
  return { x: CHESS.cx + (file - 3.5) * CHESS.size, z: CHESS.cz - (rank - 3.5) * CHESS.size };
}

/** Football pitch in the south of the square, fenced with wire (doors on the north side). */
export const SQUARE_PITCH = {
  x0: 4.5, x1: 22.5, z0: 15, z1: 24, goalHalf: 1.5, cz: 19.5,
  fence: { x0: 3.2, x1: 23.8, z0: 14, z1: 25, gaps: [[7.4, 9.2], [16.8, 18.6]] },
};

/** Tea garden tables (3 columns × 4 rows) and how many free chairs they have (the regulars keep two). */
const TEA_TABLES = [9.2, 12, 14.8].flatMap((x) => [1.5, 4.5, 7.5, 10.5].map((z) => [x, z]));
const REGULARS_TABLE = 5; // (12, 4.5): Hüseyin and Kemal play tavla here
export const TEA_SEATS = TEA_TABLES.length * 2 - 2;

/** Benches round the chess board: [x, z, facing]; two seats each (İsmail Dede keeps the first). */
const CHESS_BENCHES = [[-17.5, 8.6, 0], [-12.5, 8.6, 0], [-17.5, 21.4, Math.PI], [-12.5, 21.4, Math.PI], [-21.4, 13, Math.PI / 2], [-21.4, 17, Math.PI / 2]];
export const CHESS_SEATS = CHESS_BENCHES.length * 2 - 1;

/** Places where people sit and talk; sitting in one lets you listen in (TalkAreas). */
export const TALK_SPOTS = {
  cay: { x: 12, z: 6, r: 7.5 },
  chess: { x: CHESS.cx, z: CHESS.cz, r: 8 },
};

/**
 * Village square east of the yard: a working fountain in the middle, the grocer, the
 * muhtar's office, the greengrocer's stall, a tea garden (çay ocağı) with tables, a giant
 * chess board with benches round it, a fenced football pitch, the well, benches and trees in stone rings.
 */
export class VillageSquare extends Location {
  constructor() {
    super({ id: 'village', name: 'Köy Meydanı', spawn: 'yardRoad', bounds: { x: [-HALF + 0.4, HALF - 0.4], z: [-HALF + 0.4, HALF - 0.4] } });
  }

  build(kit) {
    const { mf } = kit, C = this.collision, add = (m) => this.add(m);
    const low = kit.quality === 'low';

    add(mf.ground(HALF * 2 + 2, HALF * 2 + 2, { tex: 'stone', repeat: [17, 17] }, 0.01));
    add(mf.ground(10, HALF * 2, { tex: 'dirt', repeat: [2, 16] }, 0.0)).position.x = -HALF - 5;

    this.#fountain(mf, low);
    C.addCircle(0, 0, 2.8);
    this.hotspot('village.fountain', 0, 3.4, 1.8);

    // grocer
    this.prop(kit, 'prop.bakkal', 9.8, 0, -7.5, 0, () => mf.group(
      mf.at(mf.box(7, 3.6, 5.2, { tex: 'plaster', repeat: [2, 1] }), 0, 1.8, 0),
      mf.at(mf.box(7.5, 0.25, 1.3, { tex: 'roof', repeat: [3, 1] }), 0, 3.75, 0),
      mf.at(mf.box(3.4, 1.8, 0.15, WOOD), 0, 1.3, 2.66),
      mf.at(mf.box(3.8, 0.35, 1.1, LIGHT_WOOD), 0, 2.75, 2.9),
      mf.at(mf.box(0.8, 0.9, 0.8, LIGHT_WOOD), -2.3, 0.45, 2.85),
      mf.at(mf.box(0.8, 0.9, 0.8, LIGHT_WOOD), 2.3, 0.45, 2.85)));
    C.addBox(6.1, 13.5, -10.2, -4.9);
    this.anchor('bakkal', 9.8, -3.7, Math.PI);
    // by the side crates, outside the grocer's talk range so both actions are reachable
    this.hotspot('village.bakkalCounter', 12.9, -4.2, 1.0);

    // muhtar's office with a flag
    this.prop(kit, 'prop.muhtarOffice', -10, 0, -7.5, 0, () => mf.group(
      mf.at(mf.box(6.5, 3.5, 5.5, { tex: 'whiteWall', repeat: [2, 1] }), 0, 1.75, 0),
      mf.at(mf.box(7, 0.25, 1.4, { tex: 'roof', repeat: [3, 1] }), 0, 3.65, 0),
      mf.at(mf.box(2.6, 1.9, 0.15, WOOD), 0, 1.25, 2.78),
      mf.at(mf.box(0.08, 3.2, 0.08, WOOD), -2.3, 2.7, 2.95),
      mf.at(mf.box(0.9, 0.55, 0.05, { tex: 'flag' }), -1.8, 3.65, 2.95)));
    C.addBox(-13.3, -6.7, -10.3, -4.7);
    this.anchor('muhtar', -10, -3.7, Math.PI);

    // greengrocer's stall (manav) behind the fountain
    this.prop(kit, 'prop.manavStall', 0, 0, -9.2, 0, () => {
      const g = mf.group(
        mf.at(mf.box(4.2, 0.08, 1.4, LIGHT_WOOD), 0, 0.85, 0),
        ...[[-1.95, -0.6], [1.95, -0.6], [-1.95, 0.6], [1.95, 0.6]].map(([x, z]) => mf.at(mf.box(0.1, 2.4, 0.1, WOOD), x, 1.2, z)),
        mf.at(mf.box(4.5, 0.06, 1.8, 0x3E8E4A), 0, 2.42, 0), // awning
      );
      const fruit = [0xE4574A, 0xF39C12, 0xC8A15B, 0xE0392B, 0xD4C64A];
      fruit.forEach((color, i) => {
        const x = -1.6 + i * 0.8;
        g.add(mf.at(mf.box(0.65, 0.22, 0.55, LIGHT_WOOD), x, 1.0, 0.25));
        for (let k = 0; k < 6; k++) g.add(mf.at(mf.sphere(0.09, color, 8), x - 0.18 + (k % 3) * 0.18, 1.17, 0.13 + Math.floor(k / 3) * 0.22));
      });
      return g;
    });
    C.addBox(-2.2, 2.2, -10.0, -8.4);
    this.anchor('manav', 0, -7.8, 0);

    // benches facing the fountain
    [-5.8, 5.8].forEach((x) => {
      add(mf.at(mf.box(3.8, 0.25, 0.8, LIGHT_WOOD), x, 0.85, 5));
      [-1.5, 1.5].forEach((dx) => add(mf.at(mf.box(0.12, 0.8, 0.12, WOOD), x + dx, 0.4, 5)));
      C.addBox(x - 1.9, x + 1.9, 4.6, 5.4);
    });
    this.anchor('benchWest', -5.8, 4.2, 0);
    this.anchor('benchEast', 5.8, 4.2, Math.PI);
    this.anchor('zehra', 2.8, 3.6, -0.6); // friends hang out by the fountain
    this.hotspot('village.benchWest', -5.8, 6.15, 1.8);
    this.hotspot('village.benchEast', 5.8, 6.15, 1.8);

    // well
    this.prop(kit, 'prop.well', -1, 0, 9, 0, () => mf.group(
      mf.at(mf.cyl(1.15, 1.3, 0.8, STONE, 18), 0, 0.4, 0),
      mf.at(mf.box(2.5, 0.12, 0.12, WOOD), 0, 2, 0),
      mf.at(mf.cyl(0.06, 0.06, 1.8, WOOD, 8), 0, 1.1, 0)));
    C.addCircle(-1, 9, 1.5);
    this.hotspot('village.well', -1, 7.2, 1.8);

    // open-air village coffeehouse: low walls and a pergola frame, no ceiling
    add(mf.at(mf.box(8, 1.8, 0.3, { tex: 'plaster' }), -18, 0.9, -8));
    add(mf.at(mf.box(8, 0.18, 4.8, { tex: 'darkWood' }), -18, 2.55, -6));
    [-21.6, -18, -14.4].forEach((x) => {
      add(mf.at(mf.cyl(0.14, 0.18, 3.1, WOOD, 8), x, 1.55, -3.8));
      C.addCircle(x, -3.8, 0.28);
    });
    // open front, small tables and chairs
    [[-20.2, -2.2], [-16.0, -2.2], [-18.1, -0.3]].forEach(([x, z]) => {
      add(mf.at(mf.cyl(0.58, 0.58, 0.16, LIGHT_WOOD, 16), x, 0.8, z));
      [[-0.72, 0], [0.72, 0]].forEach(([dx]) => add(mf.at(mf.box(0.35, 0.7, 0.35, WOOD), x + dx, 0.35, z)));
    });
    this.hotspot('village.coffee', -18, -1.4, 2.0);
    this.anchor('huseyin', -20.2, -2.0, 0.2);
    this.anchor('kemal', -16.0, -2.0, -0.2);
    this.anchor('osman', -18.1, -0.3, Math.PI);
    this.anchor('aliAmca', -21.2, -0.3, Math.PI / 2);

    // open village library / reading room: shelves under a wide awning, open on all sides
    add(mf.at(mf.box(8, 0.3, 0.45, { tex: 'darkWood' }), -17.5, 3.0, 13.5));
    [[-21, 15], [-17.5, 15], [-14, 15]].forEach(([x, z]) => {
      add(mf.at(mf.box(2.6, 2.0, 0.28, LIGHT_WOOD), x, 1.0, z));
      for (let row = 0; row < 3; row++) {
        for (let col = 0; col < 5; col++) add(mf.at(mf.box(0.16, 0.75, 0.22, [0xA85A44, 0x3D6B8C, 0x6B7A45, 0x8E6A3D, 0x7A4C8A][(row + col) % 5]), x - 0.9 + col * 0.45, 0.58 + row * 0.55, z - 0.25));
      }
    });
    add(mf.at(mf.box(8.8, 0.16, 0.18, LIGHT_WOOD), -17.5, 3.15, 13.5));
    add(mf.at(mf.box(0.12, 3.0, 0.12, WOOD), -21.8, 1.5, 13.5));
    add(mf.at(mf.box(0.12, 3.0, 0.12, WOOD), -13.2, 1.5, 13.5));
    add(mf.at(mf.box(4.5, 0.12, 2.2, LIGHT_WOOD), -17.5, 0.85, 10.8));
    add(mf.at(mf.box(0.18, 0.7, 0.18, WOOD), -19.4, 0.42, 10.3));
    add(mf.at(mf.box(0.18, 0.7, 0.18, WOOD), -15.6, 0.42, 10.3));
    this.hotspot('village.library', -17.5, 11.8, 2.2);
    this.anchor('aslanBey', -17.5, 11.7, Math.PI);
    this.anchor('library', -17.5, 10.8, 0);

    this.#teaGarden(kit, mf, C);
    this.#chessBoard(mf);
    this.hotspot('village.chess', CHESS.cx + 5.2, CHESS.cz, 1.8);
    this.anchor('chessWatch', CHESS.cx + 5.6, CHESS.cz, -Math.PI / 2);
    this.#chessBenches(mf, C);

    this.writeScore = buildPitch(this, mf, { ...SQUARE_PITCH, board: { x: (SQUARE_PITCH.x0 + SQUARE_PITCH.x1) / 2, z: 13.3, rot: Math.PI } });
    add(mf.ground(SQUARE_PITCH.fence.x1 - SQUARE_PITCH.fence.x0, SQUARE_PITCH.fence.z1 - SQUARE_PITCH.fence.z0, { tex: 'grass', repeat: [6, 3] }, 0.02))
      .position.set((SQUARE_PITCH.fence.x0 + SQUARE_PITCH.fence.x1) / 2, 0.02, (SQUARE_PITCH.fence.z0 + SQUARE_PITCH.fence.z1) / 2);
    this.anchor('kickoff', (SQUARE_PITCH.x0 + SQUARE_PITCH.x1) / 2, SQUARE_PITCH.cz - 2.5, 0);

    // trees, each in a ring of stones with soil inside
    [[-5, 12], [6, 12], [14, -14], [-4, -14], [-21, -6], [-21, 6], [21, -20], [-20, -20], [-6, 22], [-3.5, 23.6], [24.4, 11], [-23, 23.5], [22, -6]].forEach(([x, z]) => {
      this.prop(kit, 'prop.tree', x, 0, z, Math.random() * 6, () => mf.group(
        mf.at(mf.cyl(0.22, 0.3, 1.8, { tex: 'bark' }), 0, 0.9, 0),
        mf.at(mf.ico(1.55, { tex: 'leaves', repeat: [2, 2] }), 0, 2.7, 0)));
      add(mf.at(mf.torus(1.0, 0.16, STONE, 14), x, 0.1, z)).rotation.x = Math.PI / 2;
      add(mf.disc(0.95, { tex: 'dirt' }, 0.03)).position.set(x, 0.03, z);
      C.addCircle(x, z, 0.9);
    });

    // fence with an opening on the west side (the road back to the yard)
    const post = (x, z) => add(mf.at(mf.box(0.18, 1, 0.18, WOOD), x, 0.5, z));
    for (let i = -HALF; i <= HALF; i += 2) {
      if (Math.abs(i) > 2) post(-HALF, i);
      post(HALF, i); post(i, -HALF);
      if (Math.abs(i) > 2) post(i, HALF); // south gate: the road to the school
    }
    const rail = (x, z, w, d) => [0.75, 0.4].forEach((y) => add(mf.at(mf.box(w, 0.08, d, WOOD), x, y, z)));
    rail(0, -HALF, HALF * 2, 0.08); rail(HALF, 0, 0.08, HALF * 2);
    rail(-(HALF + 2) / 2, HALF, HALF - 2, 0.08); rail((HALF + 2) / 2, HALF, HALF - 2, 0.08);
    rail(-HALF, -(HALF + 2) / 2, 0.08, HALF - 2); rail(-HALF, (HALF + 2) / 2, 0.08, HALF - 2);

    add(mf.ground(2.4, 8, { tex: 'dirt', repeat: [1, 3] }, 0.0)).position.set(0, 0, HALF + 3);
    this.hotspot('village.school', 0, HALF - 0.8, 2.0);
    this.anchor('schoolRoad', 0, HALF - 2.2, Math.PI);
    this.anchor('yardRoad', -HALF + 2.2, 0, Math.PI / 2);
    this.hotspot('village.yard', -HALF + 0.8, 0, 2.2);
    this.hotspot('village.menu', -HALF + 0.8, 0, 2.2); // same exit when playing online from the menu
  }

  /** Octagonal basin, a column with a bowl, a rippling water surface and jets of water drops. */
  #fountain(mf, low) {
    const add = (m) => this.add(m);
    add(mf.at(mf.cyl(2.7, 2.9, 0.5, { tex: 'stone' }, 8), 0, 0.25, 0));
    add(mf.at(mf.cyl(2.45, 2.45, 0.52, 0x5E7F8A, 8), 0, 0.27, 0)); // inner wall (darker, wet)
    const surface = new THREE.Mesh(new THREE.CircleGeometry(2.42, 40, 0, Math.PI * 2), new THREE.MeshStandardMaterial({ color: 0x5FB3D0, roughness: 0.15, metalness: 0.1, transparent: true, opacity: 0.85 }));
    surface.rotation.x = -Math.PI / 2; surface.position.y = 0.44;
    add(surface);
    add(mf.at(mf.cyl(0.32, 0.45, 1.6, { tex: 'stone' }, 12), 0, 1.2, 0));
    add(mf.at(mf.cyl(0.95, 0.35, 0.3, { tex: 'stone' }, 16), 0, 2.05, 0)); // upper bowl
    add(mf.at(mf.cyl(0.08, 0.1, 0.5, { tex: 'stone' }, 8), 0, 2.45, 0)); // spout

    // ripples: the surface vertices bob in rings
    const pos = surface.geometry.attributes.position, base = pos.array.slice();
    this.animated.push((dt, t) => {
      for (let i = 0; i < pos.count; i++) {
        const x = base[i * 3], y = base[i * 3 + 1], r = Math.hypot(x, y);
        pos.setZ(i, Math.sin(r * 5 - t * 4) * 0.025 * Math.min(1, r));
      }
      pos.needsUpdate = true;
    });

    // water drops: from the spout up and out into the bowl, and over the bowl's rim into the basin
    const N = low ? 90 : 240;
    const geo = new THREE.BufferGeometry();
    const p = new Float32Array(N * 3), v = new Float32Array(N * 3);
    geo.setAttribute('position', new THREE.BufferAttribute(p, 3));
    const drops = new THREE.Points(geo, new THREE.PointsMaterial({ color: 0xD6F1FF, size: 0.07, transparent: true, opacity: 0.9, depthWrite: false }));
    drops.frustumCulled = false;
    add(drops);
    const spawn = (i) => {
      const a = Math.random() * Math.PI * 2;
      if (i % 3) { // jet from the spout
        const s = 0.5 + Math.random() * 0.5;
        p.set([0, 2.7, 0], i * 3); v.set([Math.cos(a) * s, 2.6 + Math.random() * 0.8, Math.sin(a) * s], i * 3);
      } else { // overflow from the bowl rim
        p.set([Math.cos(a) * 0.95, 2.15, Math.sin(a) * 0.95], i * 3); v.set([Math.cos(a) * 0.5, 0, Math.sin(a) * 0.5], i * 3);
      }
    };
    for (let i = 0; i < N; i++) { spawn(i); p[i * 3 + 1] -= Math.random() * 2; }
    this.animated.push((dt) => {
      for (let i = 0; i < N; i++) {
        v[i * 3 + 1] -= 9.8 * dt;
        p[i * 3] += v[i * 3] * dt; p[i * 3 + 1] += v[i * 3 + 1] * dt; p[i * 3 + 2] += v[i * 3 + 2] * dt;
        const r = Math.hypot(p[i * 3], p[i * 3 + 2]);
        if (p[i * 3 + 1] < (r < 0.95 ? 2.15 : 0.45)) spawn(i); // landed in the bowl or the basin
      }
      geo.attributes.position.needsUpdate = true;
    });
  }

  /** Çay ocağı: a small kiosk with a samovar and tables with stools where people can sit. */
  #teaGarden(kit, mf, C) {
    const add = (m) => this.add(m);
    const kx = 19, kz = 7;
    this.prop(kit, 'prop.cayOcagi', kx, 0, kz, Math.PI / 2, () => mf.group( // counter faces the square (west)
      mf.at(mf.box(3.6, 2.8, 2.6, { tex: 'whiteWall' }), 0, 1.4, 0),
      mf.at(mf.box(4.4, 0.18, 3.4, { tex: 'roof', repeat: [2, 1] }), 0, 2.95, -0.2),
      mf.at(mf.box(3.0, 1.0, 0.5, LIGHT_WOOD), 0, 0.5, -1.55), // counter, facing west
      mf.at(mf.cyl(0.25, 0.3, 0.6, 0xB87333, 12), -0.8, 1.3, -1.55), // samovar
      mf.at(mf.cyl(0.05, 0.05, 0.5, 0x555555, 6), -0.8, 1.85, -1.55),
      ...[-0.2, 0.2, 0.6].map((x) => mf.at(mf.cyl(0.04, 0.03, 0.1, 0xC8451F, 8), x, 1.06, -1.6)), // tea glasses
      mf.at(mf.box(1.8, 0.4, 0.05, { tex: 'cayOcagiSign' }), 0, 2.45, -1.33),
    ));
    C.addBox(kx - 1.85, kx + 1.35, kz - 1.85, kz + 1.85);
    this.anchor('cayci', kx - 2.2, kz, -Math.PI / 2);

    // twelve tables with two chairs each, under a vine pergola; the regulars' table has a tavla board
    let seat = 0;
    TEA_TABLES.forEach(([x, z], ti) => {
      add(mf.at(mf.cyl(0.45, 0.45, 0.05, LIGHT_WOOD, 16), x, 0.72, z));
      add(mf.at(mf.cyl(0.05, 0.08, 0.7, WOOD, 8), x, 0.36, z));
      if (ti === REGULARS_TABLE) {
        add(mf.at(mf.box(0.5, 0.05, 0.36, 0x7A4B2A), x, 0.77, z));
        add(mf.at(mf.box(0.46, 0.01, 0.32, 0xE8D5A8), x, 0.8, z));
      } else add(mf.at(mf.cyl(0.04, 0.03, 0.1, 0xC8451F, 8), x + 0.15, 0.8, z)); // a glass of tea
      C.addCircle(x, z, 0.5);
      [-1, 1].forEach((side) => {
        const sx = x + side * 0.85, facing = side > 0 ? -Math.PI / 2 : Math.PI / 2;
        add(this.#chair(mf, sx, z, facing));
        if (ti === REGULARS_TABLE) { this.anchor(side < 0 ? 'regular1' : 'regular2', sx, z, facing); return; }
        const id = `cay${++seat}`;
        this.anchor(id, sx, z, facing);
        this.hotspot(`village.${id}`, sx + side * 0.5, z, 0.7);
      });
    });
    // pergola over the tables
    const [px0, px1, pz0, pz1] = [7.9, 16.1, 0.2, 11.8];
    [[px0, pz0], [px1, pz0], [px0, pz1], [px1, pz1]].forEach(([x, z]) => { add(mf.at(mf.box(0.15, 2.6, 0.15, WOOD), x, 1.3, z)); C.addCircle(x, z, 0.12); });
    for (let z = pz0; z <= pz1 + 0.01; z += (pz1 - pz0) / 7) add(mf.at(mf.box(px1 - px0 + 0.3, 0.08, 0.1, WOOD), (px0 + px1) / 2, 2.62, z));
    for (let i = 0; i < 24; i++) add(mf.at(mf.box(1.7, 0.06, 1.5, { tex: 'leaves' }), px0 + 1 + (i % 4) * 2.05, 2.7, pz0 + 1 + Math.floor(i / 4) * 1.95)).rotation.y = ((i * 7) % 5 - 2) * 0.06;
  }

  /** A wooden chair facing `rot` (the back on the far side). */
  #chair(mf, x, z, rot) {
    const g = mf.group(
      mf.at(mf.box(0.46, 0.06, 0.46, LIGHT_WOOD), 0, 0.42, 0),
      mf.at(mf.box(0.46, 0.5, 0.06, LIGHT_WOOD), 0, 0.7, -0.21),
      ...[[-0.19, -0.19], [0.19, -0.19], [-0.19, 0.19], [0.19, 0.19]].map(([lx, lz]) => mf.at(mf.box(0.05, 0.42, 0.05, WOOD), lx, 0.21, lz)),
    );
    g.position.set(x, 0, z); g.rotation.y = rot;
    return g;
  }

  /** Low benches round the chess board, facing it: sit down to watch (and listen in). */
  #chessBenches(mf, C) {
    let seat = 0;
    CHESS_BENCHES.forEach(([x, z, rot], bi) => {
      const g = mf.group(
        mf.at(mf.box(2.4, 0.08, 0.5, LIGHT_WOOD), 0, 0.44, 0),
        mf.at(mf.box(2.4, 0.4, 0.06, LIGHT_WOOD), 0, 0.78, -0.24),
        ...[-1, 1].map((sx) => mf.at(mf.box(0.08, 0.44, 0.44, WOOD), sx * 1.05, 0.22, 0)),
      );
      g.position.set(x, 0, z); g.rotation.y = rot;
      this.add(g);
      const along = { x: Math.cos(rot), z: -Math.sin(rot) }, front = { x: Math.sin(rot), z: Math.cos(rot) };
      const hw = Math.abs(along.x) * 1.2 + Math.abs(along.z) * 0.25, hd = Math.abs(along.z) * 1.2 + Math.abs(along.x) * 0.25;
      C.addBox(x - hw, x + hw, z - hd, z + hd);
      [-0.6, 0.6].forEach((o, si) => {
        const sx = x + along.x * o, sz = z + along.z * o;
        if (bi === 0 && si === 0) { this.anchor('chessFan', sx, sz, rot); return; }
        const id = `chessBench${++seat}`;
        this.anchor(id, sx, sz, rot);
        this.hotspot(`village.${id}`, sx + front.x * 0.75, sz + front.z * 0.75, 0.6);
      });
    });
  }

  /** The giant chess board: 8 × 8 stone squares with a wooden edge; pieces come from ChessGame. */
  #chessBoard(mf) {
    const add = (m) => this.add(m);
    const s = CHESS.size, w = s * 8;
    add(mf.at(mf.box(w + 0.6, 0.08, w + 0.6, WOOD), CHESS.cx, 0.04, CHESS.cz));
    const light = mf.mat(0xEDE3CF), dark = mf.mat(0x6B4F3A);
    for (let f = 0; f < 8; f++) for (let r = 0; r < 8; r++) {
      const { x, z } = chessSquare(`${String.fromCharCode(97 + f)}${r + 1}`);
      const tile = new THREE.Mesh(new THREE.BoxGeometry(s, 0.04, s), (f + r) % 2 ? light : dark);
      tile.position.set(x, 0.1, z); tile.receiveShadow = true;
      add(tile);
    }
    this.chessPieces = new THREE.Group();
    add(this.chessPieces);
  }
}
