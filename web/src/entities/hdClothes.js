import * as THREE from 'three';

/** Matching colours for each outfit (the pack's own purple and navy clashed). `scarf` = the headscarf with it. */
const PALETTE = {
  'casual.boy': { Shirt: 0x3E7C8C, Pants: 0xA68B5B, Belt: 0x4A3020 },             // teal shirt, khaki trousers
  'casual.girl': { Shirt: 0xC07A68, Pants: 0x5C4A42, Belt: 0x4A3020, scarf: 0xEFE3CF }, // terracotta, warm brown, cream scarf
  'dress.girl': { Shirt: 0x3F7F73, Pants: 0x3F7F73, Belt: 0xB08A4E, scarf: 0xEFE3CF }, // a teal dress with a tan belt, cream scarf
  'suit.boy': { Black: 0x2B3448 },                                                    // a navy suit
};

/** Paints the HD model in its outfit's colours; returns the headscarf colour that goes with it. */
export function paintOutfit(scene, outfit, gender) {
  const p = { Face: 0x2A1D17, ...PALETTE[`${outfit}.${gender === 'girl' ? 'girl' : 'boy'}`] }; // Face: eyes and eyebrows (the converted files made them white)
  scene.traverse((o) => { if (o.isMesh) for (const m of [o.material].flat()) if (p[m.name] != null) m.color.setHex(p[m.name]); });
  return p.scarf ?? 0xEFE3CF;
}

/**
 * A headscarf for the HD character of a covered girl: a cap over the head and a drape round the
 * neck, in a colour that goes with the outfit (not like hair). Sized and
 * placed in world units round the head, then fixed to the head bone so it follows the animation.
 * The model's hair should already be hidden.
 */
export function addHeadscarf(scene, holder, color = 0xEFE3CF) {
  const head = scene.getObjectByName('Head');
  if (!head) return;
  holder.updateMatrixWorld(true);
  const hb = new THREE.Box3();
  scene.traverse((o) => { if (o.isMesh && o.material?.name === 'Skin') hb.expandByObject(o, true); });
  const hp = head.getWorldPosition(new THREE.Vector3());
  const h = hb.max.y - hp.y; // head bone (at the neck) → top of the head
  const ws = holder.getWorldScale(new THREE.Vector3()).x;
  const mat = new THREE.MeshStandardMaterial({ color, roughness: 0.95, side: THREE.DoubleSide });
  const cap = new THREE.Mesh(new THREE.SphereGeometry(1, 28, 18, 0, Math.PI * 2, 0, Math.PI * 0.66), mat);
  cap.scale.set(h * 0.64 / ws, h * 0.64 / ws, h * 0.68 / ws);
  cap.position.copy(holder.worldToLocal(new THREE.Vector3(hp.x, hp.y + h * 0.48, hp.z - h * 0.05)));
  cap.rotation.x = -0.45; // the face stays open
  const drape = new THREE.Mesh(new THREE.CylinderGeometry(0.27, 0.42, 0.42, 28, 1, true), mat);
  drape.scale.setScalar(h / ws);
  drape.position.copy(holder.worldToLocal(new THREE.Vector3(hp.x, hp.y - h * 0.12, hp.z - h * 0.04))); // round the neck, under the chin
  for (const m of [cap, drape]) { holder.add(m); head.attach(m); }
  return [cap, drape];
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
  const box = (name) => { const b = new THREE.Box3(); scene.traverse((o) => { if (o.isMesh && o.material?.name === name) b.expandByObject(o, true); }); return b; };
  const pants = box('Pants'), all = new THREE.Box3().setFromObject(scene, true);
  let shirt = null;
  scene.traverse((o) => { if (o.isMesh && o.material?.name === 'Shirt') shirt = o.material.color; });
  if (color != null) shirt = new THREE.Color(color); // a villager's skirt colour
  scene.traverse((o) => { if (o.isMesh && o.material?.name === 'Pants' && shirt) o.material.color.copy(shirt); });
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
  const p = { Shirt: look.shirt, Pants: look.pants, Hair: look.hair, Black: look.vest ?? look.shirt, Details: look.vest ?? look.shirt };
  scene.traverse((o) => {
    if (!o.isMesh) return;
    for (const m of [o.material].flat()) if (p[m.name] != null) m.color.setHex(p[m.name]);
    if ([o.material].flat()[0]?.name === 'Hair' && !look.hair) o.visible = false; // bald
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
