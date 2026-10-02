import * as THREE from 'three';

/**
 * A football pitch inside a location: white lines, two goals with nets (at x0 and x1),
 * a score board, and optionally a wire fence all round so the ball stays in.
 * `p` = { x0, x1, z0, z1, goalHalf, fence?: { x0, x1, z0, z1, gaps: [[from, to] along z0] }, board: { x, z, rot } }.
 * Returns `writeScore(a, b)` for the board.
 */
export function buildPitch(loc, mf, p) {
  const add = (m) => loc.add(m), C = loc.collision;
  const { x0, x1, z0, z1, goalHalf } = p;
  const cx = (x0 + x1) / 2, cz = (z0 + z1) / 2;
  const white = 0xF4F6F7, line = (x, z, w, d) => add(mf.at(mf.box(w, 0.01, d, white), x, 0.035, z));
  line(cx, z0, x1 - x0, 0.12); line(cx, z1, x1 - x0, 0.12);
  line(x0, cz, 0.12, z1 - z0); line(x1, cz, 0.12, z1 - z0); line(cx, cz, 0.12, z1 - z0);
  const ring = mf.torus(Math.min(1.8, (z1 - z0) / 5), 0.05, white, 40); ring.rotation.x = Math.PI / 2; ring.position.set(cx, 0.035, cz); add(ring);
  add(mf.at(mf.cyl(0.15, 0.15, 0.01, white, 12), cx, 0.036, cz)); // centre spot
  [x0, x1].forEach((gx, i) => {
    const dir = i ? 1 : -1;
    line(gx - dir * 1.5, cz, 0.12, 5); line(gx - dir * 0.75, cz - 2.5, 1.5, 0.12); line(gx - dir * 0.75, cz + 2.5, 1.5, 0.12); // goal area
    const post = (z) => { add(mf.at(mf.cyl(0.06, 0.06, 1.6, white, 8), gx, 0.8, z)); C.addCircle(gx, z, 0.12); };
    post(cz - goalHalf); post(cz + goalHalf);
    add(mf.at(mf.cyl(0.06, 0.06, goalHalf * 2, white, 8), gx, 1.6, cz)).rotation.x = Math.PI / 2;
    const net = new THREE.Mesh(new THREE.BoxGeometry(0.9, 1.6, goalHalf * 2), new THREE.MeshBasicMaterial({ color: 0xFFFFFF, wireframe: true, transparent: true, opacity: 0.35 }));
    net.position.set(gx + dir * 0.45, 0.8, cz); add(net);
    C.addBox(gx + dir * 0.9 - 0.05, gx + dir * 0.9 + 0.05, cz - goalHalf, cz + goalHalf); // back of the net
  });
  if (p.fence) wireFence(loc, mf, p.fence);

  // score board on a post beside the pitch
  const canvas = document.createElement('canvas'); canvas.width = 320; canvas.height = 140;
  const tex = new THREE.CanvasTexture(canvas); tex.colorSpace = THREE.SRGBColorSpace;
  const b = p.board;
  [0, Math.PI].forEach((turn) => { // readable from both sides (a double-sided plane would read mirrored from the back)
    const board = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 1.05), new THREE.MeshBasicMaterial({ map: tex }));
    board.position.set(b.x + Math.sin(b.rot + turn) * 0.02, 2.6, b.z + Math.cos(b.rot + turn) * 0.02); board.rotation.y = b.rot + turn; add(board);
  });
  add(mf.at(mf.cyl(0.07, 0.07, 2.2, { tex: 'metal' }, 8), b.x - Math.sin(b.rot) * 0.1, 1.1, b.z - Math.cos(b.rot) * 0.1));
  C.addCircle(b.x, b.z, 0.2);
  const writeScore = (a, s) => {
    const g = canvas.getContext('2d');
    g.fillStyle = '#1B2440'; g.fillRect(0, 0, canvas.width, canvas.height);
    g.fillStyle = '#FFFFFF'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.font = 'bold 30px Fredoka, sans-serif'; g.fillText('MAVİ  –  KIRMIZI', canvas.width / 2, 34);
    g.font = 'bold 72px Fredoka, sans-serif';
    g.fillStyle = '#5DADE2'; g.fillText(String(a), canvas.width * 0.3, 100);
    g.fillStyle = '#FFFFFF'; g.fillText('-', canvas.width / 2, 100);
    g.fillStyle = '#EC7063'; g.fillText(String(s), canvas.width * 0.7, 100);
    tex.needsUpdate = true;
  };
  writeScore(0, 0);
  return writeScore;
}

/** Chain-link fence: metal posts, a see-through diamond mesh and a top rail; gaps (doors) on the z0 side. */
function wireFence(loc, mf, { x0, x1, z0, z1, gaps = [] }) {
  const add = (m) => loc.add(m), C = loc.collision, H = 2.2;
  const wire = new THREE.MeshBasicMaterial({ map: chainLink(), transparent: true, side: THREE.DoubleSide, depthWrite: false, alphaTest: 0.05 });
  const metal = { tex: 'metal' };
  const panel = (ax, az, bx, bz) => {
    const len = Math.hypot(bx - ax, bz - az);
    if (len < 0.05) return;
    const m = new THREE.Mesh(new THREE.PlaneGeometry(len, H), wire.clone());
    m.material.map = wire.map.clone(); m.material.map.repeat.set(len / 1.2, H / 1.2); m.material.map.needsUpdate = true;
    m.position.set((ax + bx) / 2, H / 2, (az + bz) / 2);
    m.rotation.y = Math.atan2(-(bz - az), bx - ax);
    add(m);
    add(mf.at(mf.box(Math.abs(bx - ax) || 0.05, 0.05, Math.abs(bz - az) || 0.05, metal), (ax + bx) / 2, H, (az + bz) / 2)); // top rail
    C.addBox(Math.min(ax, bx) - 0.06, Math.max(ax, bx) + 0.06, Math.min(az, bz) - 0.06, Math.max(az, bz) + 0.06);
    for (let i = 0, n = Math.max(1, Math.round(len / 2.5)); i <= n; i++) {
      add(mf.at(mf.cyl(0.05, 0.05, H + 0.1, metal, 8), ax + (bx - ax) * i / n, (H + 0.1) / 2, az + (bz - az) * i / n));
    }
  };
  // the z0 side, broken by the doors
  let from = x0;
  for (const [a, b] of [...gaps].sort((p, q) => p[0] - q[0])) { panel(from, z0, a, z0); from = b; }
  panel(from, z0, x1, z0);
  panel(x0, z1, x1, z1); panel(x0, z0, x0, z1); panel(x1, z0, x1, z1);
}

let LINK = null;
/** Diamond wire pattern (drawn once). */
function chainLink() {
  if (LINK) return LINK;
  const c = document.createElement('canvas'); c.width = c.height = 64;
  const g = c.getContext('2d');
  g.strokeStyle = 'rgba(205,210,215,0.95)'; g.lineWidth = 3;
  g.beginPath(); g.moveTo(0, 32); g.lineTo(32, 0); g.lineTo(64, 32); g.lineTo(32, 64); g.closePath(); g.stroke();
  LINK = new THREE.CanvasTexture(c);
  LINK.wrapS = LINK.wrapT = THREE.RepeatWrapping;
  LINK.colorSpace = THREE.SRGBColorSpace;
  return LINK;
}
