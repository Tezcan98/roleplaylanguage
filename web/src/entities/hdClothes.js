import * as THREE from 'three';

/** Matching colours for each outfit (the pack's own purple and navy clashed). `scarf` = the headscarf with it. */
const PALETTE = {
  'casual.boy': { Shirt: 0x3E7C8C, Pants: 0xA68B5B, Belt: 0x4A3020 },             // teal shirt, khaki trousers
  'casual.girl': { Shirt: 0xC07A68, Pants: 0x5C4A42, Belt: 0x4A3020, scarf: 0xE7A1B0 }, // terracotta, warm brown, a pink scarf
  'dress.girl': { Shirt: 0x3F7F73, Pants: 0x3F7F73, Belt: 0xB08A4E, scarf: 0xF0CF6E }, // a teal dress with a tan belt, a soft yellow scarf
  'suit.boy': { Black: 0x2B3448 },                                                    // a navy suit
  'curly.boy': { Shirt: 0xB5523F, Pants: 0x3F4A5A, Belt: 0x2E2218 },                // Hakan: brick red, slate trousers
  'brown.girl': { Shirt: 0xD9A23E, Pants: 0x2E5E8C, Belt: 0x4A3020, scarf: 0x9C7BC0 }, // Seher: mustard, denim blue, a lilac scarf
};

/** Paints the HD model in its outfit's colours; returns the headscarf colour that goes with it. */
export function paintOutfit(scene, outfit, gender) {
  const p = { Face: 0x2A1D17, ...PALETTE[`${outfit}.${gender === 'girl' ? 'girl' : 'boy'}`] }; // Face: eyes and eyebrows (the converted files made them white)
  scene.traverse((o) => { if (o.isMesh) for (const m of [o.material].flat()) if (p[m.name] != null) m.color.setHex(p[m.name]); });
  return p.scarf ?? 0xE7A1B0;
}

/**
 * A headscarf for the HD character of a covered girl, in a colour that goes with the outfit and a
 * little flower print: a hood round the head that leaves an oval for the face (a sphere with a
 * wedge cut out at the front, tipped forward so the wedge's top is the forehead), and a drape from
 * under the chin over the shoulders. Sized from the head's skin, then fixed to the head bone so it
 * follows the animation. The model's hair should already be hidden.
 */
export function addHeadscarf(scene, holder, color = 0xE7A1B0) {
  const head = scene.getObjectByName('Head');
  if (!head) return;
  holder.updateMatrixWorld(true);
  scene.traverse((o) => { if (o.isSkinnedMesh) o.skeleton.update(); });
  const hp = head.getWorldPosition(new THREE.Vector3());
  const hb = new THREE.Box3(), v = new THREE.Vector3(); // the head: the skin above the head bone (at the neck)
  scene.traverse((o) => {
    if (!o.isMesh || [o.material].flat()[0]?.name !== 'Skin') return;
    for (let i = 0, n = o.geometry.attributes.position.count; i < n; i++) { o.getVertexPosition(i, v); o.localToWorld(v); if (v.y > hp.y) hb.expandByPoint(v); }
  });
  if (hb.isEmpty()) return;
  const h = hb.max.y - hp.y, hw = (hb.max.x - hb.min.x) / 2, hd = (hb.max.z - hb.min.z) / 2;
  const hc = hb.getCenter(new THREE.Vector3());
  const ws = holder.getWorldScale(new THREE.Vector3()).x;
  const map = scarfPrint(color), mat = new THREE.MeshStandardMaterial({ color: map ? 0xffffff : color, map, roughness: 0.95, side: THREE.DoubleSide });
  const open = 0.62; // half the face opening (radians round the head)
  const hood = new THREE.Mesh(new THREE.SphereGeometry(1, 32, 20, Math.PI / 2 + open, Math.PI * 2 - open * 2, 0, Math.PI * 0.8), mat);
  hood.scale.set(hw * 1.18 / ws, h * 0.62 / ws, hd * 1.2 / ws);
  hood.rotation.x = 0.42; // the opening's top towards the forehead
  hood.position.copy(holder.worldToLocal(new THREE.Vector3(hc.x, hp.y + h * 0.5, hc.z - hd * 0.12)));
  const top = new THREE.Mesh(new THREE.SphereGeometry(1, 32, 8, 0, Math.PI * 2, 0, Math.PI * 0.28), mat); // closes the opening's top: the forehead's edge
  top.scale.copy(hood.scale); top.rotation.copy(hood.rotation); top.position.copy(hood.position);
  const drape = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 1.3, 1, 32, 1, true), mat);
  drape.scale.set(hw * 1.05 / ws, h * 0.62 / ws, hd * 1.05 / ws);
  drape.position.copy(holder.worldToLocal(new THREE.Vector3(hc.x, hp.y - h * 0.14, hc.z - hd * 0.12))); // round the neck, under the chin, over the shoulders
  for (const m of [hood, top, drape]) { holder.add(m); head.attach(m); }
  return [hood, top, drape];
}

/** The scarf's cloth: its colour with a small flower print (one texture per colour). */
const prints = new Map();
function scarfPrint(color) {
  if (prints.has(color) || typeof document === 'undefined') return prints.get(color) ?? null;
  const cv = document.createElement('canvas'); cv.width = cv.height = 128;
  const g = cv.getContext('2d'), base = new THREE.Color(color);
  g.fillStyle = `#${base.getHexString()}`; g.fillRect(0, 0, 128, 128);
  const light = `#${base.clone().lerp(new THREE.Color(0xffffff), 0.55).getHexString()}`, dark = `#${base.clone().multiplyScalar(0.72).getHexString()}`;
  for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) { // little five-petal flowers, every other row shifted
    const x = i * 32 + (j % 2) * 16 + 8, y = j * 32 + 8;
    g.fillStyle = light;
    for (let k = 0; k < 5; k++) { const a = k * Math.PI * 0.4; g.beginPath(); g.arc(x + Math.cos(a) * 3.2, y + Math.sin(a) * 3.2, 2.4, 0, Math.PI * 2); g.fill(); }
    g.fillStyle = dark; g.beginPath(); g.arc(x, y, 1.6, 0, Math.PI * 2); g.fill();
  }
  const t = new THREE.CanvasTexture(cv);
  t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(3, 2);
  prints.set(color, t);
  return t;
}

/**
 * A long dress for the HD girl: a skirt from the waist to just above the feet, in the colour of
 * her top (so top and skirt read as one dress; the legs are painted in it too, for the moments a
 * step shows them). The skirt is not fixed to the hip bone (it swung and tilted with every step
 * and swallowed the body): it hangs straight down under the hips, which `follow()` tracks once
 * a frame. Measured in the standing pose. Returns { skirt, follow }.
 */
export function addDress(scene, holder, color = null) {
  const hips = scene.getObjectByName('Hips');
  if (!hips) return null;
  const turned = holder.rotation.y;
  holder.rotation.y = 0; holder.updateMatrixWorld(true); // measured facing +z
  const box = (name) => boxOf(scene, name);
  const pants = box('Pants'), all = new THREE.Box3().setFromObject(scene, true);
  let shirt = null;
  scene.traverse((o) => { if (o.isMesh) for (const m of [o.material].flat()) if (m.name === 'Shirt') shirt = m.color; });
  if (color != null) shirt = new THREE.Color(color); // a villager's skirt colour
  scene.traverse((o) => { if (o.isMesh && shirt) for (const m of [o.material].flat()) if (m.name === 'Pants') m.color.copy(shirt); });
  const ws = holder.getWorldScale(new THREE.Vector3()).x;
  const top = pants.max.y, bottom = all.min.y + (pants.max.y - all.min.y) * 0.1; // waist → just above the feet
  const wx = pants.max.x - pants.min.x, wz = pants.max.z - pants.min.z;
  const r = Math.max(wx, wz) * 0.5; // the hips (the legs stand a little apart: about the waist)
  const skirt = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.92, r * 1.45, top - bottom, 28, 1, true), new THREE.MeshStandardMaterial({ color: shirt ?? 0x3E5C8A, roughness: 0.9, side: THREE.DoubleSide }));
  skirt.castShadow = true;
  skirt.scale.set(1 / ws, 1 / ws, Math.max(0.75, wz / wx) / ws); // a little flatter front to back
  const drop = ((top + bottom) / 2 - hips.getWorldPosition(new THREE.Vector3()).y) / ws; // the skirt's centre under the hip bone
  holder.rotation.y = turned; holder.updateMatrixWorld(true);
  holder.add(skirt);
  const v = new THREE.Vector3();
  const follow = () => { holder.worldToLocal(hips.getWorldPosition(v)); skirt.position.set(v.x, v.y + drop, v.z); };
  follow();
  return { skirt, follow };
}

/** Measures in the holder's own frame (facing +z), whatever way it is turned now. */
export function facingZ(holder, fn) {
  const turned = holder.rotation.y;
  holder.rotation.y = 0; holder.updateMatrixWorld(true);
  try { return fn(); } finally { holder.rotation.y = turned; holder.updateMatrixWorld(true); }
}
const boxOf = (scene, name) => { const b = new THREE.Box3(); scene.traverse((o) => { if (o.isMesh && [o.material].flat().some((m) => m.name === name)) b.expandByObject(o, true); }); return b; };

/**
 * Shoes: the models are barefoot (the feet are skin) and the thin bare feet looked sunk into the
 * ground. The skin triangles that move with the foot bones get their own shoe material.
 */
export function addShoes(scene, color = 0x3B2A20) {
  scene.traverse((o) => {
    if (!o.isSkinnedMesh || [o.material].flat()[0]?.name !== 'Skin' || Array.isArray(o.material)) return;
    const g = o.geometry, idx = g.index, si = g.attributes.skinIndex, sw = g.attributes.skinWeight;
    const bones = o.skeleton.bones.map((b) => b.name);
    const get = [si.getX, si.getY, si.getZ, si.getW], wget = [sw.getX, sw.getY, sw.getZ, sw.getW];
    const onFoot = (v) => { let b = 0; for (let k = 1; k < 4; k++) if (wget[k].call(sw, v) > wget[b].call(sw, v)) b = k; return /^(Foot|LowerLeg)/.test(bones[get[b].call(si, v)]); }; // the feet and the skin of the shins: shoes and socks
    const keep = [], shoe = [];
    for (let t = 0; t < idx.count; t += 3) {
      const tri = [idx.getX(t), idx.getX(t + 1), idx.getX(t + 2)];
      (tri.some(onFoot) ? shoe : keep).push(...tri);
    }
    if (!shoe.length) return;
    g.setIndex([...keep, ...shoe]);
    g.clearGroups(); g.addGroup(0, keep.length, 0); g.addGroup(keep.length, shoe.length, 1);
    const m = o.material.clone(); m.name = 'Shoes'; m.color.setHex(color);
    o.material = [o.material, m];
  });
}

/** A villager's own colours on the HD model (the blocky look: shirt, trousers, hair, vest). */
export function paintLook(scene, look) {
  const names = new Set(); scene.traverse((o) => { if (o.isMesh) for (const m of [o.material].flat()) names.add(m.name); });
  const coat = names.has('Main'); // the elders' body: Main = the long coat, Black = the shirt under it, Brown = trousers
  const p = {
    Shirt: look.shirt, Pants: look.pants, Hair: look.hair ?? look.sides, Black: coat ? look.shirt : look.vest ?? look.shirt, Details: look.vest ?? look.shirt,
    Main: look.vest ?? look.shirt, Brown: look.pants, Clothes: look.shirt, DarkClothes: look.pants, Band: look.vest ?? look.mustache, // the tea makers' white jacket
  };
  scene.traverse((o) => {
    if (!o.isMesh) return;
    for (const m of [o.material].flat()) if (p[m.name] != null) m.color.setHex(p[m.name]);
    if ([o.material].flat()[0]?.name === 'Hair' && !look.hair && !look.sides) o.visible = false; // bald
  });
}

/**
 * A girl's face on the HD model (the models' faces are the same for boys and girls: two eyes and
 * two brows): lashes flicking out from each eye, rosy cheeks and pink lips. Placed from the eyes
 * (the "Face" material) on the skin's surface in front, fixed to the head bone.
 */
export function addGirlFace(scene, holder, { lips = 0xC8505F } = {}) {
  const head = scene.getObjectByName('Head');
  if (!head) return [];
  return facingZ(holder, () => {
    scene.traverse((o) => { if (o.isSkinnedMesh) o.skeleton.update(); });
    const face = boxOf(scene, 'Face');
    if (face.isEmpty()) return [];
    const ws = holder.getWorldScale(new THREE.Vector3()).x;
    const fw = face.max.x - face.min.x, fh = face.max.y - face.min.y, c = face.getCenter(new THREE.Vector3());
    // the head's skin, to sit things on its surface
    const neck = head.getWorldPosition(new THREE.Vector3()).y, skin = [], v = new THREE.Vector3();
    scene.traverse((o) => {
      if (!o.isMesh || [o.material].flat()[0]?.name !== 'Skin') return;
      for (let i = 0, n = o.geometry.attributes.position.count; i < n; i++) { o.getVertexPosition(i, v); o.localToWorld(v); if (v.y > neck) skin.push(v.clone()); }
    });
    const front = (x, y) => { let z = face.max.z; for (const p of skin) if (Math.abs(p.x - x) < fw * 0.12 && Math.abs(p.y - y) < fh * 0.2 && p.z > z) z = p.z; return z; };
    const out = [];
    const put = (mesh, x, y, z) => { mesh.scale.multiplyScalar(1 / ws); mesh.position.copy(holder.worldToLocal(new THREE.Vector3(x, y, z))); holder.add(mesh); head.attach(mesh); out.push(mesh); };
    const dark = new THREE.MeshStandardMaterial({ color: 0x1E1410, roughness: 0.9 });
    const facePts = []; // the eyes: the lower half of each side's dark marks (the upper half is the brow)
    scene.traverse((o) => {
      if (!o.isMesh || [o.material].flat()[0]?.name !== 'Face') return;
      for (let i = 0, n = o.geometry.attributes.position.count; i < n; i++) { o.getVertexPosition(i, v); o.localToWorld(v); facePts.push(v.clone()); }
    });
    for (const s of [-1, 1]) {
      const eye = new THREE.Box3();
      for (const p of facePts) if (Math.sign(p.x - c.x) === s && p.y < c.y) eye.expandByPoint(p);
      if (eye.isEmpty()) continue;
      const ex = s < 0 ? eye.min.x : eye.max.x, ey = eye.max.y; // the eye's outer upper corner
      for (const [k, a] of [[0, 0.35], [1, 0.9]]) { // two lashes fanning out
        const lash = new THREE.Mesh(new THREE.BoxGeometry(fw * 0.11, fh * 0.07, fh * 0.05), dark);
        lash.rotation.z = s * a;
        put(lash, ex + s * fw * 0.035, ey - fh * (0.06 - k * 0.07), Math.max(eye.max.z, front(ex, ey)) + fh * 0.01);
      }
      const cheek = new THREE.Mesh(new THREE.CircleGeometry(fw * 0.13, 20), new THREE.MeshBasicMaterial({ color: 0xF07C82, transparent: true, opacity: 0.45, depthWrite: false }));
      cheek.rotation.y = s * 0.45;
      const cx = c.x + s * fw * 0.42, cy = face.min.y - fh * 0.25;
      put(cheek, cx, cy, front(cx, cy) + fh * 0.03);
    }
    const my = face.min.y - fh * 0.75;
    const mouth = new THREE.Mesh(new THREE.SphereGeometry(1, 16, 8), new THREE.MeshStandardMaterial({ color: lips, roughness: 0.6 }));
    mouth.scale.set(fw * 0.11, fh * 0.07, fh * 0.05);
    put(mouth, c.x, my, front(c.x, my));
    return out;
  });
}

/**
 * What makes a villager recognisable, on the HD model: moustache, glasses, cap, apron. Placed from
 * the eyes (the "Face" material) and fixed to the head / hip bone so they follow the animation.
 */
export function addLookExtras(scene, holder, look) {
  const head = scene.getObjectByName('Head'), hips = scene.getObjectByName('Hips');
  if (!head) return [];
  return facingZ(holder, () => {
    const face = boxOf(scene, 'Face'), hair = boxOf(scene, 'Hair'), shirt = boxOf(scene, 'Shirt');
    if (face.isEmpty()) return [];
    const ws = holder.getWorldScale(new THREE.Vector3()).x;
    const fw = face.max.x - face.min.x, fh = face.max.y - face.min.y, c = face.getCenter(new THREE.Vector3());
    const out = [];
    const put = (mesh, x, y, z, bone = head) => { mesh.scale.multiplyScalar(1 / ws); mesh.position.copy(holder.worldToLocal(new THREE.Vector3(x, y, z))); holder.add(mesh); bone.attach(mesh); out.push(mesh); };
    const mat = (color) => new THREE.MeshStandardMaterial({ color, roughness: 0.9 });
    if (look.mustache) put(new THREE.Mesh(new THREE.BoxGeometry(fw * 0.62, fh * 0.32, fh * 0.25), mat(look.mustache)), c.x, face.min.y - fh * 0.85, face.max.z + fh * 0.02);
    if (look.glasses) {
      const rim = mat(0x1B2440);
      [-1, 1].forEach((s) => put(new THREE.Mesh(new THREE.TorusGeometry(fw * 0.2, fw * 0.035, 6, 18), rim), c.x + s * fw * 0.27, face.min.y + fh * 0.3, face.max.z + fh * 0.12));
      put(new THREE.Mesh(new THREE.BoxGeometry(fw * 0.14, fw * 0.035, fw * 0.035), rim), c.x, face.min.y + fh * 0.35, face.max.z + fh * 0.12);
    }
    // the cap: off on the HD model for now (it looked like a big pot on the head)
    /*
    if (look.cap) {
      const top = hair.isEmpty() ? face.max.y + fh * 2 : hair.max.y, r = hair.isEmpty() ? fw * 0.8 : (hair.max.x - hair.min.x) * 0.47;
      put(new THREE.Mesh(new THREE.CylinderGeometry(r, r, fh * 0.9, 18), mat(look.cap)), c.x, top - fh * 0.2, c.z - fw * 0.25);
      put(new THREE.Mesh(new THREE.BoxGeometry(r * 1.1, fh * 0.12, r * 0.8), mat(look.cap)), c.x, top - fh * 0.6, face.max.z + r * 0.15);
    }
    */
    if (look.apron && !shirt.isEmpty() && hips) {
      const w = (shirt.max.x - shirt.min.x) * 0.5, h = (shirt.max.y - shirt.min.y) * 1.25;
      put(new THREE.Mesh(new THREE.BoxGeometry(w, h, 0.02), mat(0xFFFFFF)), c.x, shirt.max.y - h * 0.62, shirt.max.z + 0.012, hips);
    }
    return out;
  });
}
