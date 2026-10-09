import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

/**
 * Town scenery beyond the edge of a place — walls, roads with a few cars driving by, houses,
 * shops with signs, trees — so the world never ends in an empty field or a cliff. None of it can
 * be reached (the place's bounds stop the player at its wall or fence).
 *
 * Everything static is baked into one mesh per material (a handful of draw calls for a whole
 * street) with world-scale UVs, so a long wall and a small chimney show the same size of bricks.
 * Shop signs (canvas text) and the cars stay separate. Windows share one material, which the
 * place lights up at night (`glows`).
 *
 *   const town = new Townscape(mf, place);
 *   town.wall(…); town.road(…); town.house(…); town.shop(…); town.tree(…);
 *   town.done(); // bakes and adds it to the place
 */
const WALLS = [0xF2E6D0, 0xE9D3B4, 0xD9C4A8, 0xF4EDE1, 0xE8C9A6, 0xCFD8DC]; // plaster colours of the houses
const ROOFS = [0xB5532E, 0xA2472A, 0x8E3B22];
const CAR_COLOURS = [0xC0392B, 0x2F6FDB, 0xF4F1EA, 0x3E8E4A, 0xF39C12, 0x34495E];

export class Townscape {
  #parts = new THREE.Group();
  #rnd;

  constructor(mf, place, seed = 7) {
    Object.assign(this, { mf, place });
    let s = seed;
    this.#rnd = () => ((s = (s * 16807) % 2147483647) / 2147483647);
    this.glass = mf.uniqueMat(0x9FC9E8, { emissive: 0x000000 });
    place.glows.push(this.glass); // windows glow at night
  }

  #add(m) { this.#parts.add(m); return m; }
  #pick(list) { return list[Math.floor(this.#rnd() * list.length)]; }

  /** A stone wall from (x0, z0) to (x1, z1) (straight along x or z), `gaps`: [from, to] openings along it. */
  wall(x0, z0, x1, z1, { h = 1.7, t = 0.5, gaps = [], spec = { tex: 'stone' }, cap = 0xB9AE9C } = {}) {
    const alongX = z0 === z1, a0 = alongX ? Math.min(x0, x1) : Math.min(z0, z1), a1 = alongX ? Math.max(x0, x1) : Math.max(z0, z1);
    const pieces = []; let from = a0;
    for (const [g0, g1] of [...gaps].sort((p, q) => p[0] - q[0])) { if (g0 > from) pieces.push([from, g0]); from = Math.max(from, g1); }
    if (from < a1) pieces.push([from, a1]);
    for (const [p0, p1] of pieces) {
      const L = p1 - p0, c = (p0 + p1) / 2, [x, z] = alongX ? [c, z0] : [x0, c], [w, d] = alongX ? [L, t] : [t, L];
      this.#add(this.mf.at(this.mf.box(w, h, d, spec), x, h / 2, z));
      this.#add(this.mf.at(this.mf.box(w + 0.12, 0.14, d + 0.12, cap), x, h + 0.07, z));
      // pillars every few metres
      for (let k = 0; k <= Math.floor(L / 4); k++) {
        const s = Math.min(p0 + k * 4, p1), [px, pz] = alongX ? [s, z0] : [x0, s];
        this.#add(this.mf.at(this.mf.box(t + 0.2, h + 0.3, t + 0.2, cap), px, (h + 0.3) / 2, pz));
      }
    }
  }

  /** An asphalt road (axis-aligned rectangle) with a dashed centre line and pavements along both sides. */
  road(x0, z0, x1, z1) {
    const mf = this.mf, alongX = Math.abs(x1 - x0) > Math.abs(z1 - z0), cx = (x0 + x1) / 2, cz = (z0 + z1) / 2;
    const L = alongX ? Math.abs(x1 - x0) : Math.abs(z1 - z0), W = alongX ? Math.abs(z1 - z0) : Math.abs(x1 - x0);
    const plane = (w, d, spec, y, x, z) => { const m = mf.ground(w, d, spec, y); m.position.set(x, y, z); return this.#add(m); };
    plane(alongX ? L : W, alongX ? W : L, 0x4A4D52, 0.012, cx, cz);
    for (let s = -L / 2 + 1; s < L / 2 - 1; s += 4) { // dashes
      const [x, z] = alongX ? [cx + s + 1, cz] : [cx, cz + s + 1];
      plane(alongX ? 2 : 0.18, alongX ? 0.18 : 2, 0xF4F1EA, 0.016, x, z);
    }
    for (const side of [-1, 1]) { // pavements with a kerb
      const off = side * (W / 2 + 0.8), [x, z] = alongX ? [cx, cz + off] : [cx + off, cz];
      this.#add(mf.at(mf.box(alongX ? L : 1.6, 0.16, alongX ? 1.6 : L, 0xBDB6AA), x, 0.08, z));
    }
  }

  /**
   * A house: plaster walls, hip roof, windows with frames, a door and a chimney. `rot`: which way
   * its front faces (0 = +z). `floors` 1–3. `shop`: a shop on the ground floor (sign text + awning colour).
   */
  house(x, z, rot = 0, { w = 7, d = 6, floors = 1 + Math.floor(this.#rnd() * 2), wall = this.#pick(WALLS), shop = null, awning = 0xC0392B } = {}) {
    const mf = this.mf, g = new THREE.Group(), H = floors * 3;
    g.add(mf.at(mf.box(w, H, d, wall), 0, H / 2, 0));
    g.add(mf.at(mf.box(w + 0.2, 0.25, d + 0.2, 0xBFB5A5), 0, 0.12, 0)); // plinth
    g.add(mf.at(mf.hipRoof(w + 0.6, d + 0.6, Math.min(w, d) * 0.32, { tex: 'roof' }), 0, H, 0));
    g.add(mf.at(mf.box(0.6, 1.2, 0.6, 0x8C7B6B), w * 0.25, H + 0.9, -d * 0.15)); // chimney
    const frame = 0xF4F1EA, win = (wx, wy, wz, ry, ww = 1.1, wh = 1.3) => {
      const p = new THREE.Group();
      p.add(mf.at(mf.box(ww + 0.18, wh + 0.18, 0.08, frame), 0, 0, 0));
      p.add(mf.at(new THREE.Mesh(new THREE.BoxGeometry(ww, wh, 0.1), this.glass), 0, 0, 0.02));
      p.add(mf.at(mf.box(0.06, wh, 0.12, frame), 0, 0, 0.03)); // the cross
      p.add(mf.at(mf.box(ww, 0.06, 0.12, frame), 0, 0, 0.03));
      p.add(mf.at(mf.box(ww + 0.3, 0.08, 0.22, frame), 0, -wh / 2 - 0.08, 0.08)); // sill
      p.position.set(wx, wy, wz); p.rotation.y = ry;
      g.add(p);
    };
    const cols = Math.max(1, Math.floor(w / 2.4));
    for (let f = 0; f < floors; f++) {
      for (let c = 0; c < cols; c++) {
        const wx = -w / 2 + (c + 0.5) * (w / cols);
        if (f === 0 && (shop ? true : c === Math.floor(cols / 2))) continue; // the door / the shop front
        win(wx, f * 3 + 1.7, d / 2 + 0.02, 0);
        if (this.#rnd() < 0.7) win(wx, f * 3 + 1.7, -d / 2 - 0.02, Math.PI); // back
      }
      win(w / 2 + 0.02, f * 3 + 1.7, 0, Math.PI / 2); win(-w / 2 - 0.02, f * 3 + 1.7, 0, -Math.PI / 2);
    }
    if (shop) {
      g.add(mf.at(new THREE.Mesh(new THREE.BoxGeometry(w - 1.2, 2.1, 0.1), this.glass), 0, 1.25, d / 2 + 0.03)); // shop window
      g.add(mf.at(mf.box(0.9, 2.1, 0.08, 0x5B3A29), w / 2 - 1.1, 1.05, d / 2 + 0.08)); // door
      const a = mf.at(mf.box(w - 0.6, 0.06, 1.3, awning), 0, 2.55, d / 2 + 0.6); a.rotation.x = 0.3; g.add(a);
      this.#sign(shop, g, w, d);
    } else {
      g.add(mf.at(mf.box(1.0, 2.2, 0.08, 0x6B4226), 0, 1.1, d / 2 + 0.04)); // door
      g.add(mf.at(mf.box(1.5, 0.12, 0.7, 0xBFB5A5), 0, 0.06, d / 2 + 0.35)); // step
    }
    g.position.set(x, 0, z); g.rotation.y = rot;
    this.#add(g);
  }

  /** Shorthand: a shop on the ground floor. */
  shop(x, z, rot, name, opts = {}) { this.house(x, z, rot, { floors: 2, shop: name, awning: this.#pick([0xC0392B, 0x2F6FDB, 0x3E8E4A, 0xB03A48]), ...opts }); }

  /** The shop's sign over the window (its own canvas texture; not baked). */
  #sign(text, g, w, d) {
    const c = document.createElement('canvas'); c.width = 512; c.height = 96;
    const x = c.getContext('2d');
    x.fillStyle = this.#pick(['#1F4E8C', '#2E5E3A', '#5B3A29', '#8E2B1E']); x.fillRect(0, 0, 512, 96);
    x.fillStyle = '#F4D58D'; x.font = 'bold 60px Fredoka, sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle';
    x.fillText(text, 256, 51, 490);
    const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace;
    const sw = Math.min(w - 1, 4.2), sign = new THREE.Mesh(new THREE.PlaneGeometry(sw, sw * 96 / 512), new THREE.MeshBasicMaterial({ map: tex }));
    sign.position.set(0, 3.25, d / 2 + 0.05); sign.userData.keep = true;
    g.add(sign);
  }

  tree(x, z, s = 1) {
    const mf = this.mf, g = mf.group(
      mf.at(mf.cyl(0.2, 0.3, 1.8, { tex: 'bark' }), 0, 0.9, 0),
      mf.at(mf.ico(1.4, { tex: 'leaves', repeat: [2, 2] }), 0, 2.6, 0),
      mf.at(mf.ico(1, { tex: 'leaves' }), 0.5, 3.4, 0.2));
    g.position.set(x, 0, z); g.scale.setScalar(s); g.rotation.y = this.#rnd() * 6;
    this.#add(g);
  }

  /** A ground patch (grass, dirt…) lying under the rest. */
  ground(x, z, w, d, spec, y = -0.01) { const m = this.mf.ground(w, d, spec, y); m.position.set(x, y, z); this.#add(m); }

  /**
   * Cars driving up and down a road: along x (`axis` 'x') at z = `at`, or along z at x = `at`,
   * between `from` and `to`, one lane each way.
   */
  traffic(axis, at, from, to, n = 2) {
    for (let i = 0; i < n; i++) {
      const car = this.#car(this.#pick(CAR_COLOURS)), dir = i % 2 ? -1 : 1, lane = dir * 1.1, speed = 5 + this.#rnd() * 3;
      let s = from + (to - from) * (i + this.#rnd() * 0.5) / n;
      car.rotation.y = axis === 'x' ? (dir > 0 ? Math.PI / 2 : -Math.PI / 2) : (dir > 0 ? 0 : Math.PI);
      this.place.add(car);
      this.place.animated.push((dt) => {
        s += dir * speed * dt;
        if (s > to) s = from; else if (s < from) s = to;
        if (axis === 'x') car.position.set(s, 0, at + lane); else car.position.set(at - lane, 0, s);
      });
    }
  }

  #car(colour) {
    const mf = this.mf, g = new THREE.Group();
    g.add(mf.at(mf.rbox(1.7, 0.6, 3.8, colour, 0.12), 0, 0.55, 0));
    g.add(mf.at(mf.rbox(1.5, 0.5, 2, colour, 0.12), 0, 1.05, -0.2));
    g.add(mf.at(new THREE.Mesh(new THREE.BoxGeometry(1.52, 0.36, 1.7), this.glass), 0, 1.07, -0.2));
    [[-0.8, 1.2], [0.8, 1.2], [-0.8, -1.2], [0.8, -1.2]].forEach(([x, z]) => { const w = mf.cyl(0.32, 0.32, 0.22, 0x222222, 12); w.rotation.z = Math.PI / 2; g.add(mf.at(w, x, 0.32, z)); });
    [-0.55, 0.55].forEach((x) => g.add(mf.at(mf.box(0.3, 0.14, 0.05, 0xFFF6DA), x, 0.62, 1.9))); // lights
    return g;
  }

  /** Bakes everything into one mesh per material (signs stay as they are) and adds it to the place. */
  done() {
    const byMat = new Map(), keep = [];
    this.#parts.updateMatrixWorld(true);
    this.#parts.traverse((o) => {
      if (!o.isMesh) return;
      if (o.userData.keep) { keep.push(o); return; }
      let geo = o.geometry.index ? o.geometry.toNonIndexed() : o.geometry.clone();
      geo.applyMatrix4(o.matrixWorld);
      geo = only(geo);
      worldUv(geo, o.material);
      const list = byMat.get(o.material) ?? []; list.push(geo); byMat.set(o.material, list);
    });
    const out = new THREE.Group(); out.name = 'townscape';
    for (const [mat, geos] of byMat) {
      const m = new THREE.Mesh(mergeGeometries(geos), mat);
      m.castShadow = false; m.receiveShadow = true; m.matrixAutoUpdate = false;
      out.add(m);
    }
    for (const s of keep) { s.updateMatrixWorld(true); s.matrix.copy(s.matrixWorld); s.matrix.decompose(s.position, s.quaternion, s.scale); out.add(s); }
    this.place.add(out);
    return out;
  }
}

/** Only position, normal and uv (so every piece can be merged). */
function only(geo) {
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', geo.attributes.position);
  if (!geo.attributes.normal) geo.computeVertexNormals();
  g.setAttribute('normal', geo.attributes.normal);
  g.setAttribute('uv', geo.attributes.uv ?? new THREE.Float32BufferAttribute(new Float32Array(geo.attributes.position.count * 2), 2));
  return g;
}

/** Textured walls and roads: UVs from world position (box-mapped by each face's direction), so tiles keep one size. */
function worldUv(geo, mat) {
  if (!mat.map || mat.side === THREE.DoubleSide) return; // roofs keep their own downhill UVs
  const tile = 2.5, p = geo.attributes.position, n = geo.attributes.normal, uv = geo.attributes.uv;
  for (let i = 0; i < p.count; i++) {
    const ax = Math.abs(n.getX(i)), ay = Math.abs(n.getY(i)), az = Math.abs(n.getZ(i));
    const [u, v] = ay >= ax && ay >= az ? [p.getX(i), p.getZ(i)] : ax >= az ? [p.getZ(i), p.getY(i)] : [p.getX(i), p.getY(i)];
    uv.setXY(i, u / tile, v / tile);
  }
}
