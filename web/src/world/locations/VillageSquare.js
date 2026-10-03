import * as THREE from 'three';
import { Location } from '../Location.js';
import { buildPitch } from '../Pitch.js';

const WOOD = { tex: 'darkWood' };
const LIGHT_WOOD = { tex: 'lightWood' };
const STONE = { tex: 'stone' };
const HALF = 34; // the fence runs at ±34 m

/** Open-air coffeehouse (north-east) and open library (north-west): walls, no roof. */
export const KAHVEHANE = { x: 22, z: -24, w: 12, d: 9 };
export const LIBRARY = { x: -22, z: -24, w: 12, d: 9 };

/** Chess board in the square: square size, centre and which way the ranks run. */
export const CHESS = { cx: -15, cz: 15, size: 1.1 };
/** "e4" → world x/z on the giant board (white at +z, the side facing the fountain). */
export function chessSquare(sq) {
  const file = sq.charCodeAt(0) - 97, rank = Number(sq[1]) - 1;
  return { x: CHESS.cx + (file - 3.5) * CHESS.size, z: CHESS.cz - (rank - 3.5) * CHESS.size };
}

/** Football pitch in the south of the square, fenced with wire (doors on the north side). */
export const SQUARE_PITCH = {
  x0: 4.5, x1: 26.5, z0: 15, z1: 27, goalHalf: 1.5, cz: 21,
  fence: { x0: 3.2, x1: 27.8, z0: 14, z1: 28, gaps: [[7.4, 9.2], [21.8, 23.6]] },
};

/** Tea garden tables (3 columns × 4 rows) and how many free chairs they have (the regulars keep two). */
const TEA_TABLES = [9.2, 12, 14.8].flatMap((x) => [1.5, 4.5, 7.5, 10.5].map((z) => [x, z]));
const REGULARS_TABLE = 5; // (12, 4.5): Hüseyin and Kemal play tavla here
export const TEA_SEATS = TEA_TABLES.length * 2 - 2;

/** Benches to watch the chess from: [x, z, facing], two seats each (north: Dede's score board, east: his own bench). */
const CHESS_BENCHES = [[-17.5, 21.4, Math.PI], [-12.5, 21.4, Math.PI], [-21.4, 13, Math.PI / 2], [-21.4, 17, Math.PI / 2]];
export const CHESS_SEATS = CHESS_BENCHES.length * 2;

/** Benches round the square: [x, z, facing, seat kept for a story character]. */
const SQUARE_BENCHES = [
  [-5.8, 5, Math.PI, 'benchWest'], [5.8, 5, Math.PI, 'benchEast'], // facing the fountain
  [-25.5, -16.6, Math.PI], [-18.5, -16.6, Math.PI], // in front of the library
  [-18, -4, Math.PI / 2], [-18, 4, Math.PI / 2], // west side, facing the fountain
];
export const BENCH_SEATS = 10;

/** Places where people sit and talk; sitting in one lets you listen in (TalkAreas). */
export const TALK_SPOTS = {
  cay: { x: 12, z: 6, r: 7.5 },
  chess: { x: CHESS.cx, z: CHESS.cz, r: 8 },
};

/**
 * Village square east of the yard: a working fountain in the middle, the grocer, the
 * muhtar's office, the greengrocer's stall, a tea garden (çay ocağı) with tables, a giant
 * chess board with İsmail Dede's bench, his score board and benches to watch from, a fenced
 * football pitch, an open-air coffeehouse (kahvehane) where the uncles chat, an open library
 * with Aslan Bey, the well, benches and trees in stone rings. Nothing that people sit under
 * has a roof, so the camera (from above) always sees who is inside.
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

    // benches to sit on (two seats each): by the fountain (Elif and Can keep one seat each in the
    // story), in front of the library (read a borrowed book there) and on the west side
    let seat = 0;
    SQUARE_BENCHES.forEach(([x, z, rot, keep]) => this.#bench(mf, C, x, z, rot, keep ? [keep, `bench${++seat}`] : [`bench${++seat}`, `bench${++seat}`], 'bench'));
    this.anchor('zehra', 2.8, 3.6, -0.6); // friends hang out by the fountain

    // well
    this.prop(kit, 'prop.well', -1, 0, 9, 0, () => mf.group(
      mf.at(mf.cyl(1.15, 1.3, 0.8, STONE, 18), 0, 0.4, 0),
      mf.at(mf.box(2.5, 0.12, 0.12, WOOD), 0, 2, 0),
      mf.at(mf.cyl(0.06, 0.06, 1.8, WOOD, 8), 0, 1.1, 0)));
    C.addCircle(-1, 9, 1.5);
    this.hotspot('village.well', -1, 7.2, 1.8);

    this.#teaGarden(kit, mf, C);
    this.#chessBoard(mf, C);
    this.anchor('chessWatch', CHESS.cx + 5.6, CHESS.cz, -Math.PI / 2);
    this.#chessBenches(mf, C);
    this.#kahvehane(mf, C);
    this.#library(mf, C);

    this.writeScore = buildPitch(this, mf, { ...SQUARE_PITCH, board: { x: (SQUARE_PITCH.x0 + SQUARE_PITCH.x1) / 2, z: 13.3, rot: Math.PI } });
    add(mf.ground(SQUARE_PITCH.fence.x1 - SQUARE_PITCH.fence.x0, SQUARE_PITCH.fence.z1 - SQUARE_PITCH.fence.z0, { tex: 'grass', repeat: [6, 3] }, 0.035))
      .position.set((SQUARE_PITCH.fence.x0 + SQUARE_PITCH.fence.x1) / 2, 0.035, (SQUARE_PITCH.fence.z0 + SQUARE_PITCH.fence.z1) / 2);
    this.anchor('kickoff', (SQUARE_PITCH.x0 + SQUARE_PITCH.x1) / 2, SQUARE_PITCH.cz - 2.5, 0);
    this.hotspot('village.scoreReset', (SQUARE_PITCH.x0 + SQUARE_PITCH.x1) / 2, 12.7, 1.3); // under the score board

    // trees, each in a ring of stones with soil inside (none on the pitch)
    [[-5, 12], [6, 12], [14, -14], [-4, -14], [-21, -6], [-21, 6], [30, -12], [-30, -12], [-6, 22], [-3.5, 25], [-22, 25], [22, -6],
      [-30, 30], [30, 30], [12, 31], [-10, 29], [31, 12], [-30, 2], [8, -30], [-8, -30], [31, -31], [-31, -31]].forEach(([x, z]) => {
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

    // twelve tables with two chairs each, under the open sky; the regulars' table has a tavla board
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
    // open sky over the tables: no pergola at all
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
    CHESS_BENCHES.forEach(([x, z, rot]) => this.#bench(mf, C, x, z, rot, [`chessBench${++seat}`, `chessBench${++seat}`]));
  }

  /** A low wooden bench facing `rot`, two seats: each seat id gets an anchor; player seats (`seatPrefix…`) also a hotspot in front. */
  #bench(mf, C, x, z, rot, seats) {
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
    [-0.6, 0.6].forEach((o, i) => {
      const sx = x + along.x * o, sz = z + along.z * o, id = seats[i];
      this.anchor(id, sx, sz, rot);
      if (/^(chessBench|bench)\d/.test(id)) this.hotspot(`village.${id}`, sx + front.x * 0.75, sz + front.z * 0.75, 0.6);
    });
  }

  /** İsmail Dede's score board behind the chess board: who has played the most games. */
  writeChessScores(rows) {
    const c = this.scoreCanvas;
    if (!c) return;
    const g = c.getContext('2d');
    g.fillStyle = '#23402C'; g.fillRect(0, 0, c.width, c.height);
    g.strokeStyle = '#C8A15B'; g.lineWidth = 10; g.strokeRect(5, 5, c.width - 10, c.height - 10);
    g.fillStyle = '#F4EFE6'; g.textBaseline = 'middle';
    g.font = 'bold 34px Fredoka, sans-serif'; g.textAlign = 'center';
    g.fillText('♟ SATRANÇ · SKOR TABLOSU', c.width / 2, 40);
    g.font = 'bold 22px Fredoka, sans-serif'; g.fillStyle = '#D9C7A3';
    g.fillText('İsmail Dede tutar · maç / galibiyet', c.width / 2, 74);
    g.font = 'bold 28px Fredoka, sans-serif';
    (rows.length ? rows.slice(0, 6) : [{ name: 'Henüz maç yok', games: '', wins: '' }]).forEach((r, i) => {
      const y = 116 + i * 38;
      g.textAlign = 'left'; g.fillStyle = '#F4EFE6';
      g.fillText(`${r.games === '' ? '' : `${i + 1}. `}${r.name}`, 34, y);
      g.textAlign = 'right'; g.fillStyle = '#E0B04A';
      if (r.games !== '') g.fillText(`${r.games} / ${r.wins}`, c.width - 34, y);
    });
    this.scoreTex.needsUpdate = true;
  }

  /** The giant chess board: 8 × 8 stone squares with a wooden edge; pieces come from ChessGame. */
  #chessBoard(mf, C) {
    const add = (m) => this.add(m);
    // İsmail Dede's bench on the east side, facing the board
    add(mf.at(mf.box(0.8, 0.25, 3.2, LIGHT_WOOD), CHESS.cx + 6.4, 0.5, CHESS.cz + 2.6));
    [-1.3, 1.3].forEach((dz) => add(mf.at(mf.box(0.12, 0.45, 0.12, WOOD), CHESS.cx + 6.4, 0.23, CHESS.cz + 2.6 + dz)));
    C.addBox(CHESS.cx + 6.0, CHESS.cx + 6.8, CHESS.cz + 1.0, CHESS.cz + 4.2);
    this.anchor('chessDede', CHESS.cx + 6.4, CHESS.cz + 2.2, -Math.PI / 2);
    // score board on two posts behind (north of) the board, facing the square
    this.scoreCanvas = document.createElement('canvas'); this.scoreCanvas.width = 512; this.scoreCanvas.height = 340;
    this.scoreTex = new THREE.CanvasTexture(this.scoreCanvas); this.scoreTex.colorSpace = THREE.SRGBColorSpace;
    const board = new THREE.Mesh(new THREE.PlaneGeometry(3.6, 2.4), new THREE.MeshBasicMaterial({ map: this.scoreTex }));
    board.position.set(CHESS.cx, 2.5, CHESS.cz - 5.4); add(board);
    add(mf.at(mf.box(3.8, 2.6, 0.08, WOOD), CHESS.cx, 2.5, CHESS.cz - 5.47));
    [-1.7, 1.7].forEach((dx) => add(mf.at(mf.box(0.14, 2.6, 0.14, WOOD), CHESS.cx + dx, 1.3, CHESS.cz - 5.5)));
    C.addBox(CHESS.cx - 1.9, CHESS.cx + 1.9, CHESS.cz - 5.7, CHESS.cz - 5.3);
    this.writeChessScores([]);
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
  /** Walls on three sides and a low wall in front with a doorway — no roof. */
  #openRoom(mf, C, { x, z, w, d }, wall) {
    const add = (m) => this.add(m), H = 2.6, T = 0.25;
    const x0 = x - w / 2, x1 = x + w / 2, z0 = z - d / 2, z1 = z + d / 2;
    add(mf.at(mf.box(w, H, T, wall), x, H / 2, z0)); C.addBox(x0, x1, z0 - T / 2, z0 + T / 2);
    [x0, x1].forEach((wx) => { add(mf.at(mf.box(T, H, d, wall), wx, H / 2, z)); C.addBox(wx - T / 2, wx + T / 2, z0, z1); });
    // front: knee-high wall either side of a 3 m doorway
    const side = (w - 3) / 2;
    [x0 + side / 2, x1 - side / 2].forEach((fx) => { add(mf.at(mf.box(side, 0.9, T, wall), fx, 0.45, z1)); C.addBox(fx - side / 2, fx + side / 2, z1 - T / 2, z1 + T / 2); });
    // a beam over the doorway for the sign (high up, nothing to bump into)
    [x - 1.6, x + 1.6].forEach((px) => { add(mf.at(mf.box(0.16, 3.1, 0.16, WOOD), px, 1.55, z1)); C.addCircle(px, z1, 0.15); });
    add(mf.at(mf.box(3.6, 0.18, 0.2, WOOD), x, 3.1, z1));
    const floor = add(mf.ground(w - 0.3, d - 0.3, { tex: 'floorWood', repeat: [3, 2] }, 0.03));
    floor.position.x = x; floor.position.z = z;
  }

  /** A sign with big letters (canvas). */
  #sign(text, x, y, z, w = 3.2) {
    const c = document.createElement('canvas'); c.width = 512; c.height = 96;
    const g = c.getContext('2d');
    g.fillStyle = '#5B3A29'; g.fillRect(0, 0, c.width, c.height);
    g.fillStyle = '#F4D58D'; g.font = 'bold 60px Fredoka, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText(text, c.width / 2, c.height / 2 + 3);
    const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace;
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, w * 96 / 512), new THREE.MeshBasicMaterial({ map: tex }));
    m.position.set(x, y, z);
    return this.add(m);
  }

  /** Stool (+ anchor and hotspot when someone may sit there). */
  #stool(mf, id, x, z, rot, hotspot = true) {
    this.add(mf.at(mf.cyl(0.2, 0.18, 0.42, LIGHT_WOOD, 10), x, 0.21, z));
    this.anchor(id, x, z, rot);
    if (hotspot) this.hotspot(`village.${id}`, x + Math.sin(rot + Math.PI) * 0.55, z + Math.cos(rot + Math.PI) * 0.55, 0.8);
  }

  /**
   * Kahvehane: open to the sky, a counter with the tea stove, tables with a tavla board.
   * The three uncles (Hüsnü, Kemal, Rıfat) sit at the middle table and talk among
   * themselves (systems/AmbientTalk.js); the player can sit at the other tables and listen.
   */
  #kahvehane(mf, C) {
    const K = KAHVEHANE, add = (m) => this.add(m);
    this.#openRoom(mf, C, K, { tex: 'plaster', repeat: [3, 1] });
    this.#sign('KAHVEHANE', K.x, 3.55, K.z + K.d / 2 + 0.02);
    // counter and stove against the back wall
    add(mf.at(mf.box(4, 1.0, 0.8, WOOD), K.x - 2.5, 0.5, K.z - K.d / 2 + 0.7));
    add(mf.at(mf.cyl(0.25, 0.3, 0.55, 0xB87333, 12), K.x - 3.6, 1.28, K.z - K.d / 2 + 0.7)); // çaydanlık on the stove
    [-2.6, -2.2, -1.8].forEach((dx) => add(mf.at(mf.cyl(0.04, 0.03, 0.1, 0xC8451F, 8), K.x + dx, 1.06, K.z - K.d / 2 + 0.6)));
    C.addBox(K.x - 4.5, K.x - 0.5, K.z - K.d / 2 + 0.2, K.z - K.d / 2 + 1.2);
    // the uncles' table (tavla on it) and two tables for guests
    const table = (x, z) => {
      add(mf.at(mf.box(1.1, 0.06, 1.1, LIGHT_WOOD), x, 0.74, z));
      add(mf.at(mf.cyl(0.06, 0.08, 0.72, WOOD, 8), x, 0.36, z));
      C.addCircle(x, z, 0.55);
    };
    const tx = K.x - 1.5, tz = K.z + 0.5;
    table(tx, tz);
    add(mf.at(mf.box(0.6, 0.05, 0.42, 0x8B5A2B), tx, 0.8, tz)); // tavla
    add(mf.at(mf.cyl(0.04, 0.03, 0.1, 0xC8451F, 8), tx + 0.4, 0.82, tz + 0.35));
    this.#stool(mf, 'amca1', tx - 0.9, tz, Math.PI / 2, false);
    this.#stool(mf, 'amca2', tx + 0.9, tz, -Math.PI / 2, false);
    this.#stool(mf, 'amca3', tx, tz - 0.9, 0, false);
    [[K.x + 3, K.z - 1.6, 1], [K.x + 3, K.z + 2, 3]].forEach(([x, z, n]) => {
      table(x, z);
      add(mf.at(mf.cyl(0.04, 0.03, 0.1, 0xC8451F, 8), x + 0.2, 0.82, z));
      this.#stool(mf, `kahve${n}`, x - 0.9, z, Math.PI / 2);
      this.#stool(mf, `kahve${n + 1}`, x + 0.9, z, -Math.PI / 2);
    });
    this.anchor('kahveci', K.x - 2.5, K.z - K.d / 2 + 1.6, 0);
  }

  /** Açık kütüphane: shelves full of books along the walls, Aslan Bey's desk, reading tables. */
  #library(mf, C) {
    const L = LIBRARY, add = (m) => this.add(m);
    this.#openRoom(mf, C, L, { tex: 'whiteWall', repeat: [3, 1] });
    this.#sign('KÜTÜPHANE', L.x, 3.55, L.z + L.d / 2 + 0.02);
    const colors = [0x8E2B1E, 0x2F6FDB, 0x3E8E4A, 0xE0B04A, 0x6B4F3A, 0x7A3552, 0x16A085];
    // a shelf is one box with rows of books painted on (hundreds of book meshes would cost phones their frame rate)
    const shelf = (x, z, w, rot) => {
      const g = new THREE.Group();
      g.add(mf.at(mf.box(w, 2.2, 0.45, WOOD), 0, 1.1, 0));
      g.add(mf.at(mf.box(w - 0.16, 2.0, 0.02, { tex: 'bookshelf', repeat: [Math.max(1, Math.round(w / 1.2)), 1] }), 0, 1.1, 0.23));
      g.position.set(x, 0, z); g.rotation.y = rot;
      return add(g);
    };
    shelf(L.x - 3, L.z - L.d / 2 + 0.4, 4.6, 0); shelf(L.x + 3, L.z - L.d / 2 + 0.4, 4.6, 0);
    C.addBox(L.x - 5.4, L.x + 5.4, L.z - L.d / 2, L.z - L.d / 2 + 0.7);
    shelf(L.x - L.w / 2 + 0.4, L.z + 0.2, 5, Math.PI / 2); C.addBox(L.x - L.w / 2, L.x - L.w / 2 + 0.7, L.z - 2.4, L.z + 2.8);
    shelf(L.x + L.w / 2 - 0.4, L.z + 0.2, 5, -Math.PI / 2); C.addBox(L.x + L.w / 2 - 0.7, L.x + L.w / 2, L.z - 2.4, L.z + 2.8);
    // a book from any shelf (wide spots: easy to hit on a phone)
    this.hotspot('village.libShelf', L.x + 3, L.z - L.d / 2 + 1.6, 2.2);
    this.hotspot('village.libShelf2', L.x - 3, L.z - L.d / 2 + 1.6, 2.2);
    this.hotspot('village.libShelf3', L.x - L.w / 2 + 1.6, L.z + 0.6, 2);
    this.hotspot('village.libShelf4', L.x + L.w / 2 - 1.6, L.z + 0.6, 2);
    // Aslan Bey's desk with an old lamp and a pile of books
    add(mf.at(mf.box(2.2, 0.85, 0.9, WOOD), L.x, 0.43, L.z - 1.6));
    add(mf.at(mf.cyl(0.12, 0.16, 0.45, 0xC8A15B, 10), L.x - 0.7, 1.08, L.z - 1.6));
    add(mf.at(mf.sphere(0.13, 0xFFE08A, 10), L.x - 0.7, 1.36, L.z - 1.6));
    [0, 1, 2].forEach((i) => add(mf.at(mf.box(0.42, 0.09, 0.3, colors[i * 2]), L.x + 0.5, 0.9 + i * 0.09, L.z - 1.6)).rotation.y = i * 0.3);
    C.addBox(L.x - 1.1, L.x + 1.1, L.z - 2.05, L.z - 1.15);
    this.anchor('aslanBey', L.x, L.z - 2.5, 0);
    // two reading tables
    [[L.x - 3, L.z + 1.8, 1], [L.x + 3, L.z + 1.8, 3]].forEach(([x, z, n]) => {
      add(mf.at(mf.box(1.6, 0.06, 0.9, LIGHT_WOOD), x, 0.74, z));
      add(mf.at(mf.box(0.1, 0.72, 0.1, WOOD), x, 0.36, z));
      add(mf.at(mf.box(0.4, 0.05, 0.3, colors[n]), x - 0.2, 0.79, z)).rotation.y = 0.4; // an open book
      C.addBox(x - 0.8, x + 0.8, z - 0.45, z + 0.45);
      this.#stool(mf, `kitap${n}`, x - 0.4, z - 0.85, 0);
      this.#stool(mf, `kitap${n + 1}`, x + 0.4, z - 0.85, 0);
    });
  }
}
