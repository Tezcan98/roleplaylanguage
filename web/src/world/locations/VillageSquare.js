import * as THREE from 'three';
import { Location } from '../Location.js';
import { buildPitch } from '../Pitch.js';
import { Townscape } from '../Townscape.js';
import { SQUARE_HALF, SQUARE_EAST, TEA_COLS, TEA_ROWS, KAHVE_TABLES, READ_TABLES } from '../../content/square.js';
// import { addTrashBin } from '../trashBin.js';

const WOOD = { tex: 'darkWood' };
const LIGHT_WOOD = { tex: 'lightWood' };
const STONE = { tex: 'stone' };
const HALF = SQUARE_HALF; // the fence (content/square.js: sized for a crowd)
const EAST = SQUARE_EAST; // the east fence, past the mosque

/** The mosque's courtyard (avlu) in the east: a low wall with a gate facing the square; the mosque itself at its east end. */
/** The running track inside the fence: its middle this far from the fence, this wide (m). */
export const TRACK = { inset: 1.6, width: 2.4 };
export const MOSQUE = { x0: 52, x1: 92, z0: -21, z1: 21, gate: 2.6, hall: { x: 84, z: 0, w: 12 }, sadirvan: { x: 62, z: -11 } };

/** Open-air coffeehouse (north-east) and open library (north-west): walls, no roof. */
export const KAHVEHANE = { x: 34, z: -36, w: 24, d: 14 };
export const LIBRARY = { x: -34, z: -36, w: 24, d: 14 };
/** Where the uncles sit (their talk is heard from here: systems/AmbientTalk.js). */
export const KAHVE_UNCLES = { x: KAHVEHANE.x - 8, z: KAHVEHANE.z - 1 };

/** Chess board in the square: square size, centre and which way the ranks run. */
export const CHESS = { cx: -15, cz: 15, size: 1.1 };
/** "e4" → world x/z on the giant board (white at +z, the side facing the fountain). */
export function chessSquare(sq) {
  const file = sq.charCodeAt(0) - 97, rank = Number(sq[1]) - 1;
  return { x: CHESS.cx + (file - 3.5) * CHESS.size, z: CHESS.cz - (rank - 3.5) * CHESS.size };
}

/** Football pitch in the south of the square, fenced with wire (doors on the north side). */
export const SQUARE_PITCH = {
  x0: 6, x1: 46, z0: 20, z1: 44, goalHalf: 3, cz: 32, // a full-size pitch for a crowd; wide goals: easier to score
  fence: { x0: 4.5, x1: 47.5, z0: 19, z1: 45, gaps: [[9.6, 12], [40, 42.4]] },
};

/** Tea garden tables (content/square.js: columns × rows); the regulars keep two chairs. */
const TEA_TABLES = Array.from({ length: TEA_COLS }, (_, c) => 9.2 + c * 2.8).flatMap((x) => Array.from({ length: TEA_ROWS }, (_, r) => [x, 1.5 + r * 3]));
const REGULARS_TABLE = TEA_TABLES.findIndex(([x, z]) => x === 12 && z === 4.5); // Hüseyin and Kemal play tavla here

/** Benches to watch the chess from: [x, z, facing], two seats each (north: Dede's score board, east: his own bench). */
const CHESS_BENCHES = [[-17.5, 21.4, Math.PI], [-12.5, 21.4, Math.PI], [-21.4, 13, Math.PI / 2], [-21.4, 17, Math.PI / 2]]; // (content/square.js CHESS_SEATS)

/** Benches round the square: [x, z, facing, seat kept for a story character]. */
const SQUARE_BENCHES = [ // (content/square.js BENCHES)
  [-5.8, 5, Math.PI, 'benchWest'], [5.8, 5, Math.PI, 'benchEast'], // facing the fountain
  [-38, -26, Math.PI], [-30, -26, Math.PI], // in front of the library
  [-18, -4, Math.PI / 2], [-18, 4, Math.PI / 2], // west side, facing the fountain
  [30, -26, Math.PI], [38, -26, Math.PI], // in front of the kahvehane
  [-40, 6, Math.PI / 2], [-40, -6, Math.PI / 2], // far west
  [-30, 34, Math.PI], // south-west, under the trees
  // the mosque's courtyard (MOSQUE): along its north and south walls, along the west wall facing the
  // mosque, and four round the şadırvan facing it
  ...[56, 62, 68, 74, 80, 86].flatMap((x) => [[x, -19.6, 0], [x, 19.6, Math.PI]]),
  ...[-17, -11, -5, 5, 11, 17].map((z) => [53.6, z, Math.PI / 2]),
  [62, -15.5, 0], [62, -6.5, Math.PI], [57.5, -11, Math.PI / 2], [66.5, -11, -Math.PI / 2],
];

/**
 * The children's park by the road from home, where a new game starts (anchor `park`): a low
 * fence with its gate towards the square, swings, a slide, a sandbox and a seesaw, and room to run.
 */
export const PARK = { x: -39, z: 19, w: 14, d: 12, gate: [-39.2, -36.4] };

/** Places where people sit and talk; sitting in one lets you listen in (TalkAreas). */
export const TALK_SPOTS = {
  cay: { x: 15, z: 7.5, r: 10 },
  chess: { x: CHESS.cx, z: CHESS.cz, r: 8 },
};

/**
 * Village square east of the yard: a working fountain in the middle, the grocer's shop (open
 * at the front: shelves, counter, crates), the greengrocer's stall, a tea garden (çay ocağı) with tables, a giant
 * chess board with İsmail Dede's bench, his score board and benches to watch from, a fenced
 * football pitch, an open-air coffeehouse (kahvehane) where the uncles chat, an open library
 * with Aslan Bey, benches and trees in stone rings. Nothing that people sit under
 * has a roof, so the camera (from above) always sees who is inside.
 */
export class VillageSquare extends Location {
  constructor() {
    super({ id: 'village', name: 'Köy Meydanı', spawn: 'yardRoad', bounds: { x: [-HALF + 0.4, EAST - 0.4], z: [-HALF + 0.4, HALF - 0.4] } });
    this.fog = { near: 40, far: 110 }; // 150 m across: the mosque's minaret shows from the far side (DayNightLighting)
  }

  build(kit) {
    const { mf } = kit, C = this.collision, add = (m) => this.add(m);
    const low = kit.quality === 'low';

    add(mf.ground(HALF + EAST + 2, HALF * 2 + 2, { tex: 'stone', repeat: [Math.round(17 * (HALF + EAST) / (2 * HALF)), 17] }, 0.01)).position.x = (EAST - HALF) / 2;
    add(mf.ground(10, HALF * 2, { tex: 'dirt', repeat: [2, 16] }, 0.0)).position.x = -HALF - 5;

    this.#fountain(mf, low);
    C.addCircle(0, 0, 2.8);
    this.hotspot('village.fountain', 0, 3.4, 1.8);

    this.#grocer(kit, mf, C);

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
    this.hotspot('village.manavStall', -1.8, -7.7, 1.0); // the greengrocer's shop window
    // addTrashBin(this, mf, C, 'village.trash1', 3.0, -8.6); // between the greengrocer and the grocer
    // addTrashBin(this, mf, C, 'village.trash2', 5.6, -4.4);
    // // more round the square: by the fountain benches, the library, the west benches, the tea garden
    // [[-7.6, 5.4], [7.6, 5.4], [-22, -16.6], [-18, 0], [7.4, 9.5]].forEach(([x, z], i) => addTrashBin(this, mf, C, `village.trash${i + 3}`, x, z));

    // the tailor's stall (terzi): HD outfits on a mannequin (main.js puts the model on it); opens the shop
    this.prop(kit, 'prop.terzi', -5, 0, -9.4, 0, () => mf.group(
      mf.at(mf.box(3.4, 0.08, 1.4, LIGHT_WOOD), 0, 0.85, 0.2),
      ...[[-1.6, -0.4], [1.6, -0.4], [-1.6, 0.8], [1.6, 0.8]].map(([x, z]) => mf.at(mf.box(0.1, 2.5, 0.1, WOOD), x, 1.25, z)),
      mf.at(mf.box(3.7, 0.06, 1.8, 0xB03A48), 0, 2.52, 0.2), // a red awning
      mf.at(mf.box(1.6, 0.4, 0.05, { tex: 'darkWood' }), 0, 2.15, 0.85),
      ...[0x2C3E66, 0x7FAFD6, 0x3E8E4A, 0xE0B04A].map((c, i) => mf.at(mf.box(0.5, 0.06, 0.4, c), -1.1 + i * 0.55, 0.92, 0.25)), // folded cloth
    ));
    C.addBox(-6.8, -3.2, -10.0, -8.4);
    this.anchor('mannequin', -3.1, -8.9, 0.4);
    this.hotspot('village.terzi', -5, -7.6, 1.6);

    // benches to sit on (two seats each): by the fountain (Elif and Can keep one seat each in the
    // story), in front of the library (read a borrowed book there) and on the west side
    let seat = 0;
    SQUARE_BENCHES.forEach(([x, z, rot, keep]) => this.#bench(mf, C, x, z, rot, keep ? [keep, `bench${++seat}`] : [`bench${++seat}`, `bench${++seat}`], 'bench'));
    this.anchor('zehra', 2.8, 3.6, -0.6); // friends hang out by the fountain
    // Saturday's wedding (content/story.js d6-wedding): the halay in an arc in front of the fountain, facing it,
    // the player's place at its end (systems/HalayDance.js), the family and the host watching
    for (let i = 0; i <= 7; i++) {
      const a = -0.95 + i * 0.26, r = 4.7;
      this.anchor(i < 7 ? `halay${i + 1}` : 'halayJoin', Math.sin(a) * r, Math.cos(a) * r, a + Math.PI);
    }
    this.hotspot('village.halay', Math.sin(0.87) * 4.7, Math.cos(0.87) * 4.7, 2.2);
    const facing = (x, z) => Math.atan2(-x, -z);
    for (const [name, x, z] of [['weddingAnne', -5.2, 8.6], ['weddingBaba', -3.9, 9.4], ['weddingDede', -6.4, 7.6], ['weddingHost', 3.6, 8.2]]) this.anchor(name, x, z, facing(x, z));


    this.#teaGarden(kit, mf, C);
    this.#chessBoard(mf, C);
    this.anchor('chessWatch', CHESS.cx + 5.6, CHESS.cz, -Math.PI / 2);
    this.#chessBenches(mf, C);
    this.#kahvehane(mf, C);
    this.#library(mf, C);
    this.#stable(mf, C);
    this.#simitCart(mf, C);

    this.writeScore = buildPitch(this, mf, { ...SQUARE_PITCH, board: { x: (SQUARE_PITCH.x0 + SQUARE_PITCH.x1) / 2, z: SQUARE_PITCH.fence.z0 - 0.7, rot: Math.PI } });
    add(mf.ground(SQUARE_PITCH.fence.x1 - SQUARE_PITCH.fence.x0, SQUARE_PITCH.fence.z1 - SQUARE_PITCH.fence.z0, { tex: 'grass', repeat: [6, 3] }, 0.035))
      .position.set((SQUARE_PITCH.fence.x0 + SQUARE_PITCH.fence.x1) / 2, 0.035, (SQUARE_PITCH.fence.z0 + SQUARE_PITCH.fence.z1) / 2);
    this.anchor('kickoff', (SQUARE_PITCH.x0 + SQUARE_PITCH.x1) / 2, SQUARE_PITCH.cz - 2.5, 0);
    this.hotspot('village.scoreReset', (SQUARE_PITCH.x0 + SQUARE_PITCH.x1) / 2, SQUARE_PITCH.fence.z0 - 1.3, 1.3); // under the score board

    // trees, each in a ring of stones with soil inside (none on the pitch)
    [[-5, 12], [6, 12], [14, -14], [-4, -14], [-21, -6], [-21, 6], [30, -12], [-30, -12], [-6, 22], [-3.5, 25], [-22, 25], [22, -6],
      [-30, 30], [-10, 29], [33, 12], [-30, 2], [8, -30], [-8, -30],
      // the outer ring of the bigger square
      [-48, -48], [48, -48], [-48, 48], [0, -48], [-18, -48], [18, -48], [-48, -20], [-48, 20], [50, 10], [50, -20], [-40, 42], [-20, 46], [50, 46],
      // round the mosque's courtyard
      [64, -34], [84, -34], [64, 34], [84, 34], [64, -48], [80, -48], [92, -48], [64, 48], [80, 46], [92, 46]].forEach(([x, z]) => {
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
      post(EAST, i);
    }
    for (let i = -HALF; i <= EAST; i += 2) {
      post(i, -HALF);
      if (Math.abs(i) > 2) post(i, HALF); // south gate: the road to the school
    }
    const rail = (x, z, w, d) => [0.75, 0.4].forEach((y) => add(mf.at(mf.box(w, 0.08, d, WOOD), x, y, z)));
    rail((EAST - HALF) / 2, -HALF, HALF + EAST, 0.08); rail(EAST, 0, 0.08, HALF * 2);
    rail(-(HALF + 2) / 2, HALF, HALF - 2, 0.08); rail((EAST + 2) / 2, HALF, EAST - 2, 0.08);
    rail(-HALF, -(HALF + 2) / 2, 0.08, HALF - 2); rail(-HALF, (HALF + 2) / 2, 0.08, HALF - 2);

    this.#runningTrack(mf);
    add(mf.ground(2.4, 8, { tex: 'dirt', repeat: [1, 3] }, 0.0)).position.set(0, 0, HALF + 3);
    this.hotspot('village.school', 0, HALF - 0.8, 2.0);
    this.anchor('schoolRoad', 0, HALF - 2.2, Math.PI);
    this.anchor('yardRoad', -HALF + 2.2, 0, Math.PI / 2);
    this.hotspot('village.yard', -HALF + 0.8, 0, 2.2);
    this.hotspot('village.menu', -HALF + 0.8, 0, 2.2); // same exit when playing online from the menu
    this.#mosque(mf, C, low);
    this.#town(mf);
    this.#park(mf, C);
  }

  /**
   * The children's park (PARK). Swings with a child on them swing: the child's `swing` behaviour
   * (entities/Npc.js) marks the swing taken and sits on it at the angle this sets.
   */
  #park(mf, C) {
    const P = PARK, x0 = P.x - P.w / 2, x1 = P.x + P.w / 2, z0 = P.z - P.d / 2, z1 = P.z + P.d / 2;
    const add = (m) => this.add(m), RED = 0xD9483B, YELLOW = 0xF2C230, BLUE = 0x2F6FDB, GREEN = 0x3E9E57;
    add(mf.ground(P.w, P.d, { tex: 'grass', repeat: [3, 3] }, 0.03)).position.set(P.x, 0.03, P.z);
    // a low fence, painted; the gate on the north side, towards the square
    const fence = (ax, az, bx, bz) => {
      const len = Math.hypot(bx - ax, bz - az), n = Math.max(1, Math.round(len / 1.2));
      for (let i = 0; i <= n; i++) add(mf.at(mf.box(0.1, 0.8, 0.1, i % 2 ? YELLOW : 0xFFFFFF), ax + (bx - ax) * i / n, 0.4, az + (bz - az) * i / n));
      for (const y of [0.32, 0.62]) { const r = add(mf.at(mf.box(len, 0.06, 0.06, GREEN), (ax + bx) / 2, y, (az + bz) / 2)); r.rotation.y = -Math.atan2(bz - az, bx - ax); }
      C.addBox(Math.min(ax, bx) - 0.1, Math.max(ax, bx) + 0.1, Math.min(az, bz) - 0.1, Math.max(az, bz) + 0.1);
    };
    fence(x0, z0, P.gate[0], z0); fence(P.gate[1], z0, x1, z0); fence(x0, z1, x1, z1); fence(x0, z0, x0, z1); fence(x1, z0, x1, z1);
    for (const x of P.gate) add(mf.at(mf.box(0.14, 2.3, 0.14, WOOD), x, 1.15, z0));
    this.#sign('Çocuk Parkı', (P.gate[0] + P.gate[1]) / 2, 2.05, z0 - 0.03, 2.6).rotation.y = Math.PI;

    // swings: a frame along x, three swings that swing north–south
    const SZ = z0 + 2.6, TOP = 2.4, LEN = 1.85, fx0 = x0 + 0.9, fx1 = fx0 + 5.6;
    for (const x of [fx0, fx1]) for (const dz of [-0.7, 0.7]) {
      const leg = add(mf.at(mf.cyl(0.06, 0.07, 2.5, BLUE, 8), x, 1.2, SZ + dz * 0.5)); leg.rotation.x = dz * 0.25;
    }
    add(mf.at(mf.box(fx1 - fx0 + 0.2, 0.12, 0.12, BLUE), (fx0 + fx1) / 2, TOP, SZ));
    C.addCircle(fx0, SZ, 0.35); C.addCircle(fx1, SZ, 0.35);
    this.swings = [fx0 + 1.3, fx0 + 2.8, fx0 + 4.3].map((x, i) => {
      const g = this.live(mf.group(
        ...[-0.22, 0.22].map((dx) => mf.at(mf.box(0.025, LEN, 0.025, 0x6F6F6F), dx, -LEN / 2, 0)),
        mf.at(mf.box(0.56, 0.06, 0.26, [RED, YELLOW, GREEN][i]), 0, -LEN, 0)));
      g.position.set(x, TOP, SZ); add(g);
      return { group: g, x, y: TOP, z: SZ, len: LEN, angle: 0, amp: 0, seen: -1, stop: false, phase: i * 1.7 };
    });
    // facing south: the camera (it looks north) sees the children's faces
    this.swings.forEach((sw, i) => { this.anchor(`swing${i + 1}`, sw.x, sw.z, 0); this.anchors.get(`swing${i + 1}`).swing = sw; });
    this.animated.push((dt) => {
      const now = performance.now() / 1000;
      for (const sw of this.swings) {
        const want = now - sw.seen < 0.4 && !sw.stop ? 0.55 : 0;
        sw.amp += (want - sw.amp) * Math.min(1, dt * 1.2);
        sw.angle = Math.sin(now * 2.3 + sw.phase) * sw.amp;
        sw.group.rotation.x = sw.angle;
      }
    });

    // the slide: a ladder on the north side, the platform, the chute down to the south
    const sx = x1 - 2.2, sz = z0 + 1.6, H = 1.6;
    for (const dx of [-0.45, 0.45]) for (const dz of [0, 0.9]) add(mf.at(mf.box(0.08, H, 0.08, YELLOW), sx + dx, H / 2, sz + dz));
    add(mf.at(mf.box(1, 0.08, 1, BLUE), sx, H, sz + 0.45));
    for (const dx of [-0.36, 0.36]) add(mf.at(mf.box(0.06, 1.1, 0.06, YELLOW), sx + dx, H + 0.55, sz + 0.9)); // the rail at the top of the chute
    for (let k = 1; k <= 5; k++) add(mf.at(mf.box(0.8, 0.05, 0.06, 0x8A5A3B), sx, k * H / 6, sz - 0.05)); // rungs
    const chute = add(mf.at(mf.box(0.8, 0.07, 3.3, RED), sx, H / 2 + 0.05, sz + 0.9 + 1.45)); chute.rotation.x = Math.atan2(H, 2.9);
    for (const dx of [-0.4, 0.4]) { const side = add(mf.at(mf.box(0.05, 0.18, 3.3, RED), sx + dx, H / 2 + 0.14, sz + 0.9 + 1.45)); side.rotation.x = chute.rotation.x; }
    C.addBox(sx - 0.55, sx + 0.55, sz - 0.2, sz + 3.8);

    // the sandbox, with a bucket and a spade left in it
    const bx = x0 + 3.2, bz = z1 - 2.6;
    for (const [dx, dz, w, d] of [[0, -1.5, 3.1, 0.16], [0, 1.5, 3.1, 0.16], [-1.5, 0, 0.16, 3.1], [1.5, 0, 0.16, 3.1]]) add(mf.at(mf.box(w, 0.24, d, LIGHT_WOOD), bx + dx, 0.12, bz + dz));
    add(mf.at(mf.box(2.9, 0.1, 2.9, 0xE8D39A), bx, 0.08, bz));
    add(mf.at(mf.cyl(0.13, 0.1, 0.22, BLUE, 10), bx + 0.6, 0.24, bz - 0.4));
    const spade = add(mf.at(mf.box(0.08, 0.04, 0.42, YELLOW), bx - 0.5, 0.16, bz + 0.5)); spade.rotation.y = 0.7;

    // the seesaw
    const kx = x1 - 3, kz = z1 - 1.8;
    add(mf.at(mf.box(0.3, 0.45, 0.3, BLUE), kx, 0.22, kz));
    const plank = add(mf.at(mf.box(3.4, 0.08, 0.32, RED), kx, 0.5, kz)); plank.rotation.z = 0.16;
    for (const dx of [-1.4, 1.4]) add(mf.at(mf.box(0.06, 0.35, 0.3, YELLOW), kx + dx, 0.5 - dx * 0.16 + 0.2, kz));
    C.addBox(kx - 1.7, kx + 1.7, kz - 0.25, kz + 0.25);

    // where a new game starts (inside the gate, the swings and the slide ahead), and the runners' start
    this.anchor('park', P.x + 1.5, P.z + 2.2, Math.PI);
    this.anchor('parkRun', P.x + 1, P.z, 0);
    this.anchor('parkRun2', P.x + 3, P.z + 2, 0);
  }

  /** A running track all round the square, just inside the fence (TRACK): a lap is about 490 m. */
  #runningTrack(mf) {
    const { inset, width } = TRACK, y = 0.015, spec = (len) => ({ tex: 'track', repeat: [Math.round(len / 4), 1] });
    const x0 = -HALF + inset, x1 = EAST - inset, z0 = -HALF + inset, z1 = HALF - inset; // the middle of the track
    const along = (len, x, z, turned) => {
      const m = this.add(mf.ground(len + width, width, spec(len + width), y));
      m.position.set(x, y, z);
      if (turned) m.rotation.z = Math.PI / 2; // runs north–south
      m.receiveShadow = true;
    };
    along(x1 - x0, (x0 + x1) / 2, z0, false); along(x1 - x0, (x0 + x1) / 2, z1, false);
    along(z1 - z0, x0, 0, true); along(z1 - z0, x1, 0, true);
    this.#sign('KOŞU YOLU', -HALF + 0.12, 1.1, -6, 2.4).rotation.y = Math.PI / 2; // on the fence, by the entrance
  }

  /**
   * A small Ottoman-style mosque in a walled courtyard, east of the square. Seen from outside only
   * (its door stays shut, its walls stop you); in the courtyard: the şadırvan, cypresses and
   * benches along the walls (SQUARE_BENCHES) to sit in the shade of the dome.
   * Hall with one big lead-grey dome on an octagonal drum, four little turrets at its corners,
   * a portico (son cemaat yeri) with three small domes on columns, and one minaret with a balcony
   * (şerefe) and a pointed cap (külah) with a golden finial (alem).
   */
  #mosque(mf, C, low) {
    const M = MOSQUE, add = (m) => this.add(m), WALL = 0xEDE4D0, LEAD = 0x8D97A1, GOLD = 0xD4A93A, DARK = 0x2E3A48;
    const dome = (r, spec) => mf.mesh(new THREE.SphereGeometry(r, low ? 14 : 24, low ? 7 : 12, 0, Math.PI * 2, 0, Math.PI / 2), spec);
    const alem = (x, y, z, s = 1) => {
      add(mf.at(mf.cyl(0.04 * s, 0.04 * s, 0.9 * s, GOLD, 6), x, y + 0.45 * s, z));
      [0.25, 0.5].forEach((h, i) => add(mf.at(mf.sphere((0.13 - i * 0.03) * s, GOLD, 8), x, y + h * s, z)));
      const moon = add(mf.at(mf.torus(0.17 * s, 0.035 * s, GOLD, 12, Math.PI * 1.3), x, y + 0.95 * s, z));
      moon.rotation.set(0, Math.PI / 2, Math.PI * 0.85); // the crescent
    };

    // the courtyard: stone paving, a low wall with a cap, a gate with an arch facing the square
    add(mf.ground(M.x1 - M.x0, M.z1 - M.z0, { tex: 'marble', repeat: [(M.x1 - M.x0) / 4, (M.z1 - M.z0) / 4] }, 0.02)).position.set((M.x0 + M.x1) / 2, 0.02, (M.z0 + M.z1) / 2); // light stone slabs
    const wall = (x0, z0, x1, z1) => {
      const w = Math.max(0.45, x1 - x0), d = Math.max(0.45, z1 - z0), x = (x0 + x1) / 2, z = (z0 + z1) / 2;
      add(mf.at(mf.box(w, 1.5, d, STONE), x, 0.75, z));
      add(mf.at(mf.box(w + 0.12, 0.14, d + 0.12, 0xC9BFA8), x, 1.57, z));
      C.addBox(x - w / 2, x + w / 2, z - d / 2, z + d / 2);
    };
    wall(M.x0, M.z0, M.x1, M.z0); wall(M.x0, M.z1, M.x1, M.z1); wall(M.x1, M.z0, M.x1, M.z1);
    wall(M.x0, M.z0, M.x0, -M.gate); wall(M.x0, M.gate, M.x0, M.z1);
    [-1, 1].forEach((s) => add(mf.at(mf.box(0.8, 3.2, 0.8, STONE), M.x0, 1.6, s * (M.gate + 0.2)))); // the gate's pillars
    const arch = add(mf.at(mf.torus(M.gate + 0.2, 0.3, STONE, 16, Math.PI), M.x0, 3.2, 0)); arch.rotation.y = Math.PI / 2; arch.scale.y = 0.5;

    // the hall
    const H = M.hall, hw = H.w / 2, wallH = 6.4;
    add(mf.at(mf.box(H.w, wallH, H.w, WALL), H.x, wallH / 2, H.z));
    add(mf.at(mf.box(H.w + 0.3, 0.35, H.w + 0.3, 0xD8CDB4), H.x, wallH, H.z)); // cornice
    C.addBox(H.x - hw, H.x + hw, H.z - hw, H.z + hw);
    // arched windows in two rows on every side (dark glass, a stone frame round the top)
    for (const side of [0, 1, 2, 3]) {
      const a = side * Math.PI / 2, nx = Math.sin(a), nz = Math.cos(a), tx = Math.cos(a), tz = -Math.sin(a);
      for (const [y, hgt] of [[1.9, 1.7], [4.4, 1.3]]) {
        for (const o of [-3.6, 0, 3.6]) {
          if (side === 3 && y < 3 && o === 0) continue; // the door is there (west)
          const x = H.x + nx * (hw + 0.03) + tx * o, z = H.z + nz * (hw + 0.03) + tz * o;
          const win = add(mf.at(mf.box(0.9, hgt, 0.06, DARK), x, y, z)); win.rotation.y = a;
          add(mf.at(mf.cyl(0.45, 0.45, 0.06, DARK, 12), x, y + hgt / 2, z)).rotation.set(Math.PI / 2, a, 0, 'YXZ'); // the round top
        }
      }
    }
    // drum, dome, finial; little turrets at the corners
    add(mf.at(mf.cyl(hw - 0.3, hw - 0.1, 1.3, WALL, 8), H.x, wallH + 0.65, H.z));
    const big = add(mf.at(dome(hw - 0.5, LEAD), H.x, wallH + 1.3, H.z));
    big.scale.y = 0.9;
    alem(H.x, wallH + 1.3 + (hw - 0.5) * 0.9, H.z, 1.6);
    [[-1, -1], [-1, 1], [1, -1], [1, 1]].forEach(([sx, sz]) => {
      const x = H.x + sx * (hw - 0.5), z = H.z + sz * (hw - 0.5);
      add(mf.at(mf.cyl(0.55, 0.6, 1.2, WALL, 8), x, wallH + 0.6, z));
      add(mf.at(mf.cone(0.65, 0.9, LEAD, 8), x, wallH + 1.65, z));
    });

    // the portico (son cemaat yeri) on the west side: a raised floor, five columns, three small domes
    const px0 = H.x - hw - 3.6, px1 = H.x - hw, pmid = (px0 + px1) / 2;
    add(mf.at(mf.box(px1 - px0, 0.3, H.w, 0xD8CDB4), pmid, 0.15, H.z));
    [-5.4, -2.7, 0, 2.7, 5.4].forEach((z) => {
      add(mf.at(mf.cyl(0.24, 0.26, 3.6, 0xF2EEE4, 10), px0 + 0.4, 2.1, H.z + z));
      add(mf.at(mf.box(0.6, 0.25, 0.6, 0xD8CDB4), px0 + 0.4, 4.0, H.z + z));
    });
    add(mf.at(mf.box(px1 - px0 + 0.2, 0.45, H.w, WALL), pmid, 4.35, H.z));
    [-4, 0, 4].forEach((z) => { add(mf.at(dome(1.5, LEAD), pmid, 4.55, H.z + z)); alem(pmid, 6.05, H.z + z, 0.6); });
    C.addBox(px0, px1, H.z - hw, H.z + hw);
    // the door: carved walnut in a stone frame, shut
    add(mf.at(mf.box(0.1, 3.2, 2.4, 0xC9BFA8), px1 - 0.03, 1.9, H.z));
    add(mf.at(mf.box(0.12, 2.8, 1.8, 0x5B3A29), px1 - 0.08, 1.7, H.z));
    add(mf.at(mf.box(0.14, 2.6, 0.05, 0x3E2718), px1 - 0.1, 1.7, H.z));
    this.#sign('CAMİ', px0 - 0.13, 4.35, H.z, 2.2).rotation.y = -Math.PI / 2;
    this.hotspot('village.mosque', px0 - 1.0, H.z, 2.0);
    this.anchor('imam', 56, 4, Math.PI / 2); // Yusuf Hoca walks round the courtyard from here (content/addons/imam.js)

    // the minaret at the north-west corner: a square base, a tall shaft, the balcony, the cap
    const mx = H.x - hw + 0.2, mz = H.z - hw - 1.2;
    add(mf.at(mf.box(2.0, 3.0, 2.0, WALL), mx, 1.5, mz));
    add(mf.at(mf.cyl(0.8, 0.95, 1.2, WALL, 12), mx, 3.6, mz));
    add(mf.at(mf.cyl(0.72, 0.8, 10.5, WALL, 12), mx, 9.45, mz));
    add(mf.at(mf.cyl(1.2, 0.8, 0.5, 0xD8CDB4, 12), mx, 14.9, mz)); // the balcony (şerefe)
    add(mf.at(mf.torus(1.1, 0.05, 0xF2EEE4, 16), mx, 15.55, mz)).rotation.x = Math.PI / 2; // its railing
    add(mf.at(mf.cyl(0.66, 0.7, 2.6, WALL, 12), mx, 17.05, mz));
    add(mf.at(mf.cone(0.8, 4.2, LEAD, 12), mx, 20.45, mz)); // the cap (külah)
    alem(mx, 22.5, mz, 1.0);
    C.addBox(mx - 1, mx + 1, mz - 1, mz + 1);

    // the şadırvan in the middle of the courtyard: an octagonal basin with taps under a roof on eight columns
    const { x: sx, z: sz } = M.sadirvan; // off the way from the gate to the door
    add(mf.at(mf.cyl(1.5, 1.6, 0.9, 0xF2EEE4, 8), sx, 0.45, sz));
    add(mf.at(mf.cyl(1.3, 1.3, 0.92, 0x5E7F8A, 8), sx, 0.47, sz));
    for (let i = 0; i < 8; i++) {
      const a = i * Math.PI / 4 + Math.PI / 8;
      add(mf.at(mf.cyl(0.07, 0.07, 2.6, 0xF2EEE4, 6), sx + Math.cos(a) * 2.1, 1.3, sz + Math.sin(a) * 2.1));
      add(mf.at(mf.cyl(0.03, 0.03, 0.18, { tex: 'metal' }, 6), sx + Math.cos(a) * 1.58, 0.7, sz + Math.sin(a) * 1.58)).rotation.z = Math.PI / 2;
    }
    add(mf.at(mf.cyl(2.5, 2.5, 0.25, WALL, 8), sx, 2.7, sz));
    add(mf.at(mf.cone(2.6, 1.4, LEAD, 8), sx, 3.5, sz));
    alem(sx, 4.2, sz, 0.6);
    C.addCircle(sx, sz, 1.8);

    // cypresses in the corners
    [[M.x0 + 1.6, M.z0 + 1.6], [M.x0 + 1.6, M.z1 - 1.6], [M.x1 - 1.6, M.z0 + 1.6], [M.x1 - 1.6, M.z1 - 1.6]].forEach(([x, z]) => {
      add(mf.at(mf.cyl(0.12, 0.16, 0.8, { tex: 'bark' }, 6), x, 0.4, z));
      const top = add(mf.at(mf.sphere(0.9, 0x2F5A36, 10), x, 3.1, z)); top.scale.set(1, 3.0, 1);
      C.addCircle(x, z, 0.5);
    });
  }

  /**
   * Beyond the fence: roads with cars on three sides, the country lane to the yard in the west,
   * and the village round it — shops facing the square across the roads, houses, trees. Seen,
   * never reached (the fence stops you), so the square no longer ends at the edge of the world.
   */
  #town(mf) {
    const T = new Townscape(mf, this, 5), R0 = HALF + 3.5, R1 = R0 + 6, B = R1 + 7.5, E0 = EAST + 3.5, E1 = E0 + 6, EB = E1 + 7.5;
    T.ground(20, 0, 420, 420, { tex: 'grass', repeat: [98, 98] }, -0.02);
    T.road(-110, -R1, 110, -R0); // north
    T.road(-110, R0, 110, R1); // south (the school road crosses it)
    T.road(E0, -110, E1, 110); // east (past the mosque)
    T.traffic('x', -(R0 + R1) / 2, -110, 110, 3);
    T.traffic('x', (R0 + R1) / 2, -110, 110, 2);
    T.traffic('z', (E0 + E1) / 2, -110, 110, 2);
    [['FIRIN', -30], ['KASAP', -20], ['ECZANE', -10], ['BERBER', 10], ['POSTANE', 20], ['KIRTASİYE', 30]].forEach(([name, x]) => T.shop(x, -B, 0, name, { w: 8 }));
    [-40, 0, 40, 66, 78, 90].forEach((x) => T.house(x, -B, 0));
    T.shop(56, -B, 0, 'ÇİÇEKÇİ', { w: 8 });
    [['LOKANTA', 20], ['TUHAFİYE', 30]].forEach(([name, x]) => T.shop(x, B, Math.PI, name, { w: 8 }));
    [-36, -26, -16, -7, 9, 40, 52, 64, 76, 88].forEach((x) => T.house(x, B, Math.PI));
    [['MANİFATURA', -24], ['HIRDAVAT', -12], ['KUAFÖR', 12], ['MUHTARLIK', 24]].forEach(([name, z]) => T.shop(EB, z, -Math.PI / 2, name, { w: 8 }));
    [-36, 0, 36].forEach((z) => T.house(EB, z, -Math.PI / 2));
    // west: past the lane, houses in gardens (our house is that way)
    [-28, -16, 14, 26].forEach((z) => T.house(-HALF - 16, z, Math.PI / 2, { w: 6.5 }));
    [[-HALF - 11, -6], [-HALF - 11, 7], [-HALF - 12, 20], [-HALF - 12, -21], [-HALF - 22, 0]].forEach(([x, z]) => T.tree(x, z, 1.2));
    T.done();
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

  /**
   * A Turkish double teapot (çaydanlık) on its stove ring: the kettle below, the demlik on top, each
   * with its spout, and a handle at the side (a tall copper samovar looked like a döner spit).
   * `y`: the counter's top.
   */
  #caydanlik(mf, x, y, z) {
    const STEEL = 0xC9CED6, DARK = 0x2B2B2B;
    const squash = (m, k) => { m.scale.y = k; return m; };
    const spout = (r, h, px, py) => { const m = mf.at(mf.cyl(r * 0.6, r, h, STEEL, 8), px, py, 0); m.rotation.z = -0.9; return m; };
    const handle = mf.at(mf.torus(0.1, 0.014, DARK, 10, Math.PI), -0.17, 0.22, 0);
    handle.rotation.z = Math.PI / 2;
    return mf.at(mf.group(
      mf.at(mf.cyl(0.2, 0.22, 0.05, DARK, 12), 0, 0.025, 0),
      squash(mf.at(mf.sphere(0.2, STEEL, 14), 0, 0.2, 0), 0.8),
      spout(0.035, 0.18, 0.22, 0.22),
      squash(mf.at(mf.sphere(0.12, 0xE7EBF0, 12), 0, 0.42, 0), 0.85),
      spout(0.022, 0.12, 0.14, 0.44),
      mf.at(mf.sphere(0.025, DARK, 6), 0, 0.53, 0),
      handle,
    ), x, y, z);
  }

  /** Çay ocağı: a small kiosk with a tea stove and tables with stools where people can sit. */
  #teaGarden(kit, mf, C) {
    const add = (m) => this.add(m);
    const kx = 25.5, kz = 7.5;
    this.prop(kit, 'prop.cayOcagi', kx, 0, kz, Math.PI / 2, () => mf.group( // counter faces the square (west)
      mf.at(mf.box(3.6, 2.8, 2.6, { tex: 'whiteWall' }), 0, 1.4, 0),
      mf.at(mf.box(4.4, 0.18, 3.4, { tex: 'roof', repeat: [2, 1] }), 0, 2.95, -0.2),
      mf.at(mf.box(3.0, 1.0, 0.5, LIGHT_WOOD), 0, 0.5, -1.55), // counter, facing west
      this.#caydanlik(mf, -0.8, 1.0, -1.55),
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
    add(this.live(this.chessPieces));
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

  /**
   * The horses' place by the north fence (systems/Animals.js ties three there): a hitching rail,
   * a little open stable with hay, a water trough and a fence on the sides; Hamdi the groom (seyis,
   * content/addons/seyis.js) stands at the corner.
   */
  #stable(mf, C) {
    const add = (m) => this.add(m), x0 = -3.4, x1 = 7.8, zb = -28.3, zf = -23;
    // the stable: back and side walls of planks, a sloping roof, hay inside
    add(mf.at(mf.box(x1 - x0 + 0.6, 2.6, 0.2, WOOD), (x0 + x1) / 2, 1.3, zb - 1.4));
    [x0 - 0.2, x1 + 0.2].forEach((x) => add(mf.at(mf.box(0.2, 2.6, 1.6, WOOD), x, 1.3, zb - 0.7)));
    const roof = add(mf.at(mf.box(x1 - x0 + 1.2, 0.12, 2.6, { tex: 'roof', repeat: [4, 1] }), (x0 + x1) / 2, 2.85, zb - 0.6)); roof.rotation.x = -0.18;
    C.addBox(x0 - 0.4, x1 + 0.4, zb - 1.6, zb);
    const bale = (x, y, z, ry = 0) => { const b = add(mf.at(mf.box(1.1, 0.5, 0.6, 0xD8B65A), x, y, z)); b.rotation.y = ry; add(mf.at(mf.box(1.12, 0.04, 0.62, 0xB0892E), x, y + 0.1, z)).rotation.y = ry; };
    bale(-2.2, 0.25, zb - 0.6); bale(-1.0, 0.25, zb - 0.6); bale(-1.6, 0.75, zb - 0.6, 0.2); bale(6.6, 0.25, zb - 0.5, 0.4);
    // the hitching rail behind the horses
    [-2.4, 2.2, 6.6].forEach((x) => add(mf.at(mf.box(0.16, 1.1, 0.16, WOOD), x, 0.55, -26.7)));
    add(mf.at(mf.box(9.2, 0.12, 0.12, WOOD), 2.1, 1.0, -26.7));
    C.addBox(-2.5, 6.7, -26.8, -26.6);
    // side fences
    const rail = (x, z0, z1) => {
      for (let z = z0; z <= z1 + 0.01; z += 1.8) add(mf.at(mf.box(0.14, 1.1, 0.14, WOOD), x, 0.55, z));
      [0.45, 0.9].forEach((y) => add(mf.at(mf.box(0.08, 0.08, z1 - z0, WOOD), x, y, (z0 + z1) / 2)));
      C.addBox(x - 0.1, x + 0.1, z0, z1);
    };
    rail(x0 - 0.2, zb, zf); rail(x1 + 0.2, zb, zf);
    // a stone water trough and a bucket of carrots
    add(mf.at(mf.box(2.2, 0.6, 0.7, STONE), 4.6, 0.3, zf + 0.9));
    add(mf.at(mf.box(2.0, 0.04, 0.5, 0x5FA8C8), 4.6, 0.58, zf + 0.9));
    C.addBox(3.5, 5.7, zf + 0.55, zf + 1.25);
    add(mf.at(mf.cyl(0.22, 0.18, 0.4, { tex: 'metal' }, 10), -2.5, 0.2, zf + 0.6));
    [-0.08, 0, 0.08].forEach((o, i) => { const c = add(mf.at(mf.cone(0.04, 0.22, 0xE67E22, 6), -2.5 + o, 0.46, zf + 0.6 + (i - 1) * 0.05)); c.rotation.x = Math.PI; });
    this.anchor('seyis', x0 - 1.1, zf + 0.4, 0.3);
  }

  /** Cemal's simit cart west of the fountain: a red cart on two wheels with a glass case full of simits, a sunshade. */
  #simitCart(mf, C) {
    const add = (m) => this.add(m), x = -9, z = 2.2, red = 0xC0392B;
    add(mf.at(mf.box(1.7, 0.7, 0.9, red), x, 0.75, z));
    add(mf.at(mf.box(1.75, 0.06, 0.95, 0xF4F1EA), x, 1.12, z));
    const glass = new THREE.MeshStandardMaterial({ color: 0xDDF1FF, transparent: true, opacity: 0.25, roughness: 0.1 });
    add(mf.at(new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.55, 0.75), glass), x, 1.43, z));
    for (let i = 0; i < 12; i++) { // simits stacked in the case
      const t = mf.torus(0.11, 0.035, 0xB7793A, 12); t.rotation.x = Math.PI / 2;
      add(mf.at(t, x - 0.55 + (i % 4) * 0.36, 1.2 + Math.floor(i / 8) * 0.06, z - 0.15 + (Math.floor(i / 4) % 2) * 0.3));
    }
    [-0.75, 0.75].forEach((o) => { const w = mf.cyl(0.32, 0.32, 0.08, 0x2B2B2B, 14); w.rotation.z = Math.PI / 2; add(mf.at(w, x + o * 1.15, 0.32, z)); });
    add(mf.at(mf.box(0.06, 0.06, 1.3, { tex: 'metal' }), x + 0.95, 0.9, z)); // handle
    add(mf.at(mf.cyl(0.03, 0.03, 1.5, { tex: 'metal' }, 6), x - 0.7, 1.9, z - 0.3)); // sunshade pole
    add(mf.at(mf.cone(1.1, 0.45, { tex: 'awning' }, 10), x - 0.7, 2.75, z - 0.3));
    C.addBox(x - 1.1, x + 1.1, z - 0.5, z + 0.5);
    this.anchor('simitci', x - 0.2, z - 0.95, 0);
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
    add(this.#caydanlik(mf, K.x - 3.6, 1.0, K.z - K.d / 2 + 0.7)); // on the stove
    [-2.6, -2.2, -1.8].forEach((dx) => add(mf.at(mf.cyl(0.04, 0.03, 0.1, 0xC8451F, 8), K.x + dx, 1.06, K.z - K.d / 2 + 0.6)));
    C.addBox(K.x - 4.5, K.x - 0.5, K.z - K.d / 2 + 0.2, K.z - K.d / 2 + 1.2);
    // the uncles' table (tavla on it) and two tables for guests
    const table = (x, z) => {
      add(mf.at(mf.box(1.1, 0.06, 1.1, LIGHT_WOOD), x, 0.74, z));
      add(mf.at(mf.cyl(0.06, 0.08, 0.72, WOOD, 8), x, 0.36, z));
      C.addCircle(x, z, 0.55);
    };
    const tx = KAHVE_UNCLES.x, tz = KAHVE_UNCLES.z;
    table(tx, tz);
    add(mf.at(mf.box(0.6, 0.05, 0.42, 0x8B5A2B), tx, 0.8, tz)); // tavla
    add(mf.at(mf.cyl(0.04, 0.03, 0.1, 0xC8451F, 8), tx + 0.4, 0.82, tz + 0.35));
    this.#stool(mf, 'amca1', tx - 0.9, tz, Math.PI / 2, false);
    this.#stool(mf, 'amca2', tx + 0.9, tz, -Math.PI / 2, false);
    this.#stool(mf, 'amca3', tx, tz - 0.9, 0, false);
    // guest tables in a grid (content/square.js KAHVE_TABLES), two stools each
    const cols = 4, rows = Math.ceil(KAHVE_TABLES / cols);
    this.kahveTables = []; // (systems/KahveCirak.js brings tea to them)
    for (let i = 0; i < KAHVE_TABLES; i++) {
      const x = K.x - 3 + (i % cols) * 3.2, z = K.z - 3.5 + Math.floor(i / cols) * (7 / Math.max(1, rows - 1)), n = i * 2 + 1;
      table(x, z);
      this.kahveTables.push({ x, z });
      add(mf.at(mf.cyl(0.04, 0.03, 0.1, 0xC8451F, 8), x + 0.2, 0.82, z));
      this.#stool(mf, `kahve${n}`, x - 0.9, z, Math.PI / 2);
      this.#stool(mf, `kahve${n + 1}`, x + 0.9, z, -Math.PI / 2);
    }
    this.anchor('kahveci', K.x - 2.5, K.z - K.d / 2 + 1.6, 0);
    this.#damaShelf(mf, C, K.x + 8, K.z - K.d / 2 + 0.35);
  }

  /** The kahvehane's shelf of dama boards, against the back wall: "Dama al" (systems/DamaClub.js). */
  #damaShelf(mf, C, x, z) {
    const add = (m) => this.add(m), WOOD_ = 0x6B4A32;
    add(mf.at(mf.box(1.4, 1.5, 0.4, WOOD_), x, 0.75, z));
    for (const y of [0.45, 0.9, 1.35]) {
      add(mf.at(mf.box(1.3, 0.03, 0.36, 0x8A6244), x, y - 0.18, z + 0.02));
      for (const dx of [-0.42, 0, 0.42]) { // boxes of dama, the board painted on the lid
        add(mf.at(mf.box(0.34, 0.07, 0.3, 0x5B3A29), x + dx, y - 0.13, z + 0.03));
        add(mf.at(mf.box(0.3, 0.005, 0.005, 0xF1DDB5), x + dx, y - 0.1, z + 0.185));
      }
    }
    this.#sign('DAMA', x, 1.75, z + 0.21, 0.9);
    C.addBox(x - 0.7, x + 0.7, z - 0.2, z + 0.2);
    this.hotspot('village.damaShelf', x, z + 1.0, 1.4);
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
    [-8.5, -3, 3, 8.5].forEach((dx) => shelf(L.x + dx, L.z - L.d / 2 + 0.4, 4.6, 0));
    C.addBox(L.x - 10.9, L.x + 10.9, L.z - L.d / 2, L.z - L.d / 2 + 0.7);
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
    // reading tables (content/square.js READ_TABLES): two rows in front of the desk
    Array.from({ length: READ_TABLES }, (_, i) => [L.x + (i % 3 - 1) * 6.5, L.z + 1.8 + Math.floor(i / 3) * 2.8, i * 2 + 1]).forEach(([x, z, n]) => {
      add(mf.at(mf.box(1.6, 0.06, 0.9, LIGHT_WOOD), x, 0.74, z));
      add(mf.at(mf.box(0.1, 0.72, 0.1, WOOD), x, 0.36, z));
      add(mf.at(mf.box(0.4, 0.05, 0.3, colors[n % colors.length]), x - 0.2, 0.79, z)).rotation.y = 0.4; // an open book
      C.addBox(x - 0.8, x + 0.8, z - 0.45, z + 0.45);
      this.#stool(mf, `kitap${n}`, x - 0.4, z - 0.85, 0);
      this.#stool(mf, `kitap${n + 1}`, x + 0.4, z - 0.85, 0);
    });
  }
  /**
   * Bakkal: a small shop open at the front so the camera sees in — shelves of goods along
   * the walls (under a roof at the back only), Recep behind the counter with the scales and
   * the till, bread and crates outside under a striped awning, a sign over the door.
   */
  #grocer(kit, mf, C) {
    const add = (m) => this.add(m), x = 9.8, z = -7.55, w = 7.4, d = 5.3;
    const x0 = x - w / 2, x1 = x + w / 2, z0 = z - d / 2, z1 = z + d / 2, H = 3.2, T = 0.25, wall = { tex: 'plaster', repeat: [2, 1] };
    add(mf.at(mf.box(w, H, T, wall), x, H / 2, z0)); C.addBox(x0, x1, z0 - T / 2, z0 + T / 2);
    [x0, x1].forEach((wx) => { add(mf.at(mf.box(T, H, d, wall), wx, H / 2, z)); C.addBox(wx - T / 2, wx + T / 2, z0, z1); });
    add(mf.at(mf.box(w + 0.3, 0.2, 1.8, { tex: 'roof', repeat: [3, 1] }), x, H + 0.1, z0 + 0.8)); // roof over the shelves only
    const floor = add(mf.ground(w - 0.3, d - 0.2, { tex: 'floorWood', repeat: [3, 2] }, 0.03)); floor.position.x = x; floor.position.z = z;
    // shelves with goods on three walls
    const shelf = (sx, sz, sw, rot) => {
      const g = new THREE.Group();
      g.add(mf.at(mf.box(sw, 2.3, 0.5, WOOD), 0, 1.15, 0));
      g.add(mf.at(mf.box(sw - 0.14, 2.1, 0.02, { tex: 'groceryShelf', repeat: [Math.max(1, Math.round(sw / 1.4)), 1] }), 0, 1.15, 0.26));
      g.position.set(sx, 0, sz); g.rotation.y = rot;
      return add(g);
    };
    shelf(x, z0 + 0.4, w - 0.8, 0);
    shelf(x0 + 0.4, z - 0.2, d - 1.6, Math.PI / 2);
    shelf(x1 - 0.4, z - 0.2, d - 1.6, -Math.PI / 2);
    C.addBox(x0, x1, z0, z0 + 0.7); C.addBox(x0, x0 + 0.7, z0, z1 - 0.8); C.addBox(x1 - 0.7, x1, z0, z1 - 0.8);
    // the counter across the front, with scales, till and a jar of sweets
    const cz = z1 - 1.9;
    add(mf.at(mf.box(3.2, 1.0, 0.7, LIGHT_WOOD), x, 0.5, cz));
    add(mf.at(mf.box(3.3, 0.06, 0.8, WOOD), x, 1.03, cz));
    add(mf.at(mf.box(0.45, 0.3, 0.35, 0x34495E), x + 1.1, 1.21, cz)); // till
    add(mf.at(mf.cyl(0.16, 0.16, 0.03, { tex: 'metal' }, 16), x - 1.05, 1.2, cz)); // scales: pan
    add(mf.at(mf.box(0.3, 0.12, 0.3, 0xB0B6BE), x - 1.05, 1.1, cz)); // scales: body
    add(mf.at(mf.cyl(0.13, 0.13, 0.3, 0xD6EAF8, 12), x - 0.3, 1.21, cz)); // jar of sweets
    [0xE4574A, 0xF4D03F, 0x5DADE2, 0x58D68D].forEach((c, i) => add(mf.at(mf.sphere(0.04, c, 6), x - 0.36 + (i % 2) * 0.1, 1.12 + Math.floor(i / 2) * 0.08, cz)));
    C.addBox(x - 1.6, x + 1.6, cz - 0.35, cz + 0.35);
    this.anchor('bakkal', x, cz - 0.75, 0); // behind the counter, facing the square
    this.hotspot('village.bakkalCounter', x1 - 1.0, z1 + 0.9, 1.0); // the shop window (ui/MarketView.js)
    // outside: bread basket, crates of produce and milk bottles under a striped awning
    add(mf.at(mf.box(w + 0.4, 0.06, 1.6, { tex: 'awning', repeat: [4, 1] }), x, 2.75, z1 + 0.6)).rotation.x = 0.18;
    [x0 + 0.1, x1 - 0.1].forEach((px) => add(mf.at(mf.box(0.1, 2.7, 0.1, WOOD), px, 1.35, z1 + 1.35)));
    const crate = (cx, color, n = 6) => {
      add(mf.at(mf.box(0.8, 0.45, 0.6, LIGHT_WOOD), cx, 0.23, z1 + 0.7));
      for (let k = 0; k < n; k++) add(mf.at(mf.sphere(0.09, color, 8), cx - 0.24 + (k % 3) * 0.24, 0.5, z1 + 0.58 + Math.floor(k / 3) * 0.24));
    };
    crate(x0 + 0.8, 0xC8A15B); // bread rolls
    crate(x0 + 1.75, 0xF39C12);
    [0, 1, 2, 3].forEach((k) => add(mf.at(mf.cyl(0.07, 0.07, 0.32, 0xF8F9F9, 8), x1 - 1.9 + k * 0.17, 0.16, z1 + 0.7))); // milk bottles
    C.addBox(x0 + 0.35, x0 + 2.2, z1 + 0.35, z1 + 1.05);
    // sign over the door
    const c = document.createElement('canvas'); c.width = 512; c.height = 96;
    const g = c.getContext('2d');
    g.fillStyle = '#2E5E3A'; g.fillRect(0, 0, 512, 96);
    g.fillStyle = '#F4D58D'; g.font = 'bold 58px Fredoka, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText('MEHMET BAKKAL', 256, 51);
    const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace;
    const sign = new THREE.Mesh(new THREE.PlaneGeometry(3.4, 0.64), new THREE.MeshBasicMaterial({ map: tex }));
    sign.position.set(x, H + 0.45, z1 + 0.02); add(sign);
    add(mf.at(mf.box(3.5, 0.72, 0.06, WOOD), x, H + 0.45, z1 - 0.03));
  }
}
