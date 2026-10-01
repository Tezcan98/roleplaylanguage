import * as THREE from 'three';
import { Location } from '../Location.js';

const WOOD = { tex: 'darkWood' };
const LIGHT_WOOD = { tex: 'lightWood' };
const STONE = { tex: 'stone' };
const HALF = 26; // the fence runs at ±26 m

/** Chess board in the square: square size, centre and which way the ranks run. */
export const CHESS = { cx: -15, cz: 15, size: 1.1 };
/** "e4" → world x/z on the giant board (white at +z, the side facing the fountain). */
export function chessSquare(sq) {
  const file = sq.charCodeAt(0) - 97, rank = Number(sq[1]) - 1;
  return { x: CHESS.cx + (file - 3.5) * CHESS.size, z: CHESS.cz - (rank - 3.5) * CHESS.size };
}

/**
 * Village square east of the yard: a working fountain in the middle, the grocer, the
 * muhtar's office, the greengrocer's stall, a tea garden (çay ocağı) with tables, a giant
 * chess board, the well, benches and trees in stone rings.
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

    this.#teaGarden(kit, mf, C);
    this.#chessBoard(mf);
    this.hotspot('village.chess', CHESS.cx + 5.2, CHESS.cz, 1.8);
    this.anchor('chessWatch', CHESS.cx + 5.6, CHESS.cz, -Math.PI / 2);

    // trees, each in a ring of stones with soil inside
    [[-5, 12], [6, 12], [14, -14], [-4, -14], [-21, -6], [-21, 6], [21, -20], [-20, -20], [-6, 22], [6, 22], [21, 22], [-22, 23], [22, -6]].forEach(([x, z]) => {
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
      post(HALF, i); post(i, -HALF); post(i, HALF);
    }
    const rail = (x, z, w, d) => [0.75, 0.4].forEach((y) => add(mf.at(mf.box(w, 0.08, d, WOOD), x, y, z)));
    rail(0, -HALF, HALF * 2, 0.08); rail(0, HALF, HALF * 2, 0.08); rail(HALF, 0, 0.08, HALF * 2);
    rail(-HALF, -(HALF + 2) / 2, 0.08, HALF - 2); rail(-HALF, (HALF + 2) / 2, 0.08, HALF - 2);

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

    // four tables with two stools each, under a vine pergola
    const tables = [[13, 2], [16, 2], [13, 11], [16, 11]];
    tables.forEach(([x, z], ti) => {
      add(mf.at(mf.cyl(0.45, 0.45, 0.05, LIGHT_WOOD, 16), x, 0.72, z));
      add(mf.at(mf.cyl(0.05, 0.08, 0.7, WOOD, 8), x, 0.36, z));
      add(mf.at(mf.cyl(0.04, 0.03, 0.1, 0xC8451F, 8), x + 0.15, 0.8, z)); // a glass of tea
      C.addCircle(x, z, 0.5);
      [-1, 1].forEach((side, si) => {
        const sx = x + side * 0.85;
        add(mf.at(mf.cyl(0.2, 0.18, 0.42, { tex: 'lightWood' }, 10), sx, 0.21, z));
        const id = `cay${ti * 2 + si + 1}`;
        this.anchor(id, sx, z, side > 0 ? -Math.PI / 2 : Math.PI / 2);
        this.hotspot(`village.${id}`, sx + side * 0.5, z, 0.8);
      });
    });
    // pergola over the tables
    [[11.5, 0.5], [17.5, 0.5], [11.5, 12.5], [17.5, 12.5]].forEach(([x, z]) => add(mf.at(mf.box(0.15, 2.6, 0.15, WOOD), x, 1.3, z)));
    for (let z = 0.5; z <= 12.5; z += 1.5) add(mf.at(mf.box(6.3, 0.08, 0.1, WOOD), 14.5, 2.62, z));
    for (let i = 0; i < 18; i++) add(mf.at(mf.box(1.1, 0.06, 1.1, { tex: 'leaves' }), 12 + (i % 3) * 2.3, 2.7, 1 + Math.floor(i / 3) * 2.1)).rotation.y = i;
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
