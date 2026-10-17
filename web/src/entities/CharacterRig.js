import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

/**
 * Procedural blocky character built from an appearance description.
 * Returns the bones that animations and poses need.
 */
export function buildRig(mf, o) {
  const g = new THREE.Group(), body = new THREE.Group();
  g.add(body);
  const limb = (w, h, c, x, y) => {
    const p = new THREE.Group(); p.position.set(x, y, 0);
    p.add(mf.at(mf.rbox(w, h, w, c, w * 0.35), 0, -h / 2, 0));
    body.add(p); return p;
  };
  const strong = o.build === 'strong'; // broad shoulders, thicker arms and legs
  const legW = strong ? 0.28 : 0.24;
  const legL = limb(legW, 0.8, o.pants, -0.15, 0.8), legR = limb(legW, 0.8, o.pants, 0.15, 0.8);
  if (o.skirt || o.robe) body.add(mf.at(mf.cyl(0.3, 0.52, 0.85, o.skirt ?? o.robe, 12), 0, 0.58, 0)); // a long skirt, or the imam's cübbe
  const torso = mf.at(mf.rbox(strong ? 0.8 : 0.62, 0.75, strong ? 0.42 : 0.36, o.shirt, 0.1), 0, 1.18, 0);
  body.add(torso);
  if (o.apron) body.add(mf.at(mf.box(0.48, 0.95, 0.03, 0xFFFFFF), 0, 0.95, 0.2));
  if (o.vest) body.add(mf.at(mf.rbox(0.64, 0.6, 0.38, o.vest, 0.1), 0, 1.22, 0));
  const armW = strong ? 0.23 : 0.17, armX = strong ? 0.52 : 0.41;
  const armL = limb(armW, 0.68, o.shirt, -armX, 1.52), armR = limb(armW, 0.68, o.shirt, armX, 1.52);
  [armL, armR].forEach((a) => a.add(mf.at(mf.sphere(0.1, o.skin, 8), 0, -0.74, 0)));

  const head = new THREE.Group(); head.position.y = 1.84; body.add(head);
  head.add(mf.sphere(0.3, o.skin, 20));
  [-0.1, 0.1].forEach((x) => head.add(mf.at(mf.sphere(0.04, 0x1B2440, 8), x, 0.03, 0.27)));
  // the mouth: a small smile (under a moustache, a little lower)
  const girl = !!(o.skirt || o.headscarf || o.bun), my = o.mustache ? -0.14 : -0.1;
  const mouth = mf.at(mf.torus(0.055, 0.013, girl ? 0xC8505F : 0x8A3B32, 10, Math.PI), 0, my, Math.sqrt(0.3 * 0.3 - my * my) - 0.004);
  mouth.rotation.z = Math.PI; head.add(mouth); // the lower half of a ring: a smile
  const hair = new THREE.Group(); head.add(hair);
  if (o.hair) {
    const h = mf.mesh(new THREE.SphereGeometry(0.32, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2), o.hair);
    h.position.y = 0.04; h.rotation.x = -0.25; hair.add(h);
  }
  if (o.sides) [-0.27, 0.27].forEach((x) => head.add(mf.at(mf.box(0.08, 0.18, 0.25, o.sides), x, 0.02, -0.02)));
  if (o.bun) hair.add(mf.at(mf.sphere(0.15, o.hair, 10), 0, 0.16, -0.28));
  const scarf = new THREE.Group(); head.add(scarf);
  if (o.headscarf) {
    // başörtüsü: covers hair, ears and neck and leaves the face open, falls over the shoulders
    const OPEN = 1.7; // radians of the face opening (front, +z)
    const shell = mf.mesh(new THREE.SphereGeometry(0.335, 24, 16, Math.PI / 2 + OPEN / 2, Math.PI * 2 - OPEN, 0, Math.PI * 0.8), o.headscarf);
    shell.position.set(0, 0.01, -0.01);
    scarf.add(shell);
    const cap = mf.mesh(new THREE.SphereGeometry(0.338, 24, 8, 0, Math.PI * 2, 0, Math.PI * 0.3), o.headscarf); // forehead band
    cap.rotation.x = 0.22; cap.position.y = 0.01; scarf.add(cap);
    scarf.add(mf.at(mf.cyl(0.21, 0.44, 0.5, o.headscarf, 18), 0, -0.36, -0.02)); // neck and shoulders
  }
  if (o.mustache)  if (o.mustache) head.add(mf.at(mf.box(0.22, 0.05, 0.05, o.mustache), 0, -0.09, 0.28));
  if (o.cap) {
    head.add(mf.at(mf.cyl(0.33, 0.33, 0.1, o.cap, 16), 0, 0.24, 0));
    head.add(mf.at(mf.box(0.32, 0.04, 0.2, o.cap), 0, 0.2, 0.3));
  }
  if (o.beard) { // a short beard along the jaw from ear to ear, the mouth left free: the front half of a band round the lower head
    const beard = mf.mesh(new THREE.SphereGeometry(0.315, 22, 8, 0, Math.PI, Math.PI * 0.67, Math.PI * 0.28), o.beard);
    beard.position.set(0, 0, 0.005); head.add(beard);
  }
  if (o.sarik) { // the imam's sarık: white cloth wound round a cap, a dome on top
    head.add(mf.at(mf.cyl(0.37, 0.36, 0.2, o.sarik, 20), 0, 0.2, 0));
    for (const [y, tilt] of [[0.13, 0.08], [0.25, -0.08]]) { const ring = mf.at(mf.torus(0.365, 0.055, o.sarik, 20), 0, y, 0); ring.rotation.set(Math.PI / 2 + tilt, 0, 0); head.add(ring); } // the folds of the wound cloth
    const dome = mf.at(mf.mesh(new THREE.SphereGeometry(0.3, 18, 8, 0, Math.PI * 2, 0, Math.PI / 2), o.sarik), 0, 0.28, 0);
    dome.scale.y = 0.6; head.add(dome);
  }
  if (o.glasses) [-0.1, 0.1].forEach((x) => head.add(mf.at(mf.torus(0.07, 0.012, 0x1B2440), x, 0.03, 0.29)));

  g.scale.setScalar(o.scale || 1);
  // one mesh per moving part (the body, each arm and leg, the head, the hair, the scarf) instead of
  // fifteen to twenty: a crowd on the square cost ~44 draw calls a character (shadows count twice)
  const merged = [body, legL, legR, armL, armR, head, hair, scarf].map((n) => mergeParts(mf, n));
  if (mf.blobShadows) { g.traverse((o) => { if (o.isMesh) o.castShadow = false; }); g.add(mf.blob()); } // (low quality: a spot under the feet)
  /** Headscarf on (hair hidden) or off; characters without a scarf colour stay as they are. */
  const setCovered = (on) => { if (!o.headscarf) return; scarf.visible = on; hair.visible = !on || !o.hair; };
  setCovered(true);
  return { g, body, legL, legR, armL, armR, head, torso: merged[0] ?? torso, props: {}, setCovered };
}

/**
 * The plain-coloured meshes right under `node` merged into one, their colours kept as vertex colours
 * (one material for all of them). Nested groups (hair, scarf: shown and hidden on their own) and
 * textured meshes stay apart. Returns the merged mesh, or null when there was nothing to merge.
 */
function mergeParts(mf, node) {
  const parts = node.children.filter((c) => c.isMesh && !c.material.map && !Array.isArray(c.material));
  if (parts.length < 2) return parts[0] ?? null;
  const geos = parts.map((m) => {
    m.updateMatrix();
    const geo = (m.geometry.index ? m.geometry.toNonIndexed() : m.geometry.clone()).applyMatrix4(m.matrix);
    for (const k of Object.keys(geo.attributes)) if (!['position', 'normal'].includes(k)) geo.deleteAttribute(k);
    const n = geo.attributes.position.count, c = m.material.color, col = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) col.set([c.r, c.g, c.b], i * 3);
    geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
    return geo;
  });
  const mesh = mf.mesh(mergeGeometries(geos), mf.mat(0xffffff, { vertexColors: true }));
  parts.forEach((m) => { node.remove(m); m.geometry.dispose(); });
  node.add(mesh);
  return mesh;
}

/** Optional hand-held / worn props, attached by name. Hidden until a behaviour or item shows them. */
export const RIG_PROPS = {
  hoe(mf, rig) {
    const stick = mf.cyl(0.03, 0.03, 1.6, { tex: 'bark' }, 6); stick.rotation.x = Math.PI / 2; stick.position.set(-0.2, -0.72, 0.55);
    const blade = mf.at(mf.box(0.28, 0.04, 0.22, { tex: 'metal' }), -0.2, -0.84, 1.32);
    const g = mf.group(stick, blade); rig.armR.add(g); return g;
  },
  jacket(mf, rig) {
    const c = 0xB5482E;
    const g = mf.group(mf.at(mf.rbox(0.68, 0.7, 0.4, c, 0.1), 0, 1.2, 0), mf.at(mf.box(0.08, 0.6, 0.02, 0xE0B04A), 0, 1.2, 0.21));
    rig.body.add(g);
    const sleeves = [rig.armL, rig.armR].map((a) => { const s = mf.at(mf.rbox(0.2, 0.5, 0.2, c, 0.07), 0, -0.25, 0); a.add(s); return s; });
    return { set visible(v) { g.visible = v; sleeves.forEach((s) => { s.visible = v; }); }, get visible() { return g.visible; } };
  },
};
