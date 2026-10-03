import * as THREE from 'three';

/** Matching colours for each outfit (the pack's own purple and navy clashed). `scarf` = the headscarf with it. */
const PALETTE = {
  'casual.boy': { Shirt: 0x3E7C8C, Pants: 0xA68B5B, Belt: 0x4A3020 },             // teal shirt, khaki trousers
  'casual.girl': { Shirt: 0xC07A68, Pants: 0x5C4A42, Belt: 0x4A3020, scarf: 0xEFE3CF }, // terracotta, warm brown, cream scarf
  'dress.girl': { Shirt: 0x3F7F73, Belt: 0xB08A4E, scarf: 0xEFE3CF },               // a teal dress with a tan belt, cream scarf
  'suit.boy': { Black: 0x2B3448 },                                                    // a navy suit
};

/** Paints the HD model in its outfit's colours; returns the headscarf colour that goes with it. */
export function paintOutfit(scene, outfit, gender) {
  const p = PALETTE[`${outfit}.${gender === 'girl' ? 'girl' : 'boy'}`] ?? {};
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
}

/**
 * A long dress for the HD girl: a skirt from the waist to the ankles, fixed to the hip bone,
 * in the colour of her top (so top and skirt read as one dress).
 */
export function addDress(scene, holder) {
  const hips = scene.getObjectByName('Hips');
  if (!hips) return;
  holder.updateMatrixWorld(true);
  const box = (name) => { const b = new THREE.Box3(); scene.traverse((o) => { if (o.isMesh && o.material?.name === name) b.expandByObject(o, true); }); return b; };
  const pants = box('Pants'), all = new THREE.Box3().setFromObject(scene, true);
  const shirt = (() => { let c = null; scene.traverse((o) => { if (o.isMesh && o.material?.name === 'Shirt') c = o.material.color; }); return c; })();
  const ws = holder.getWorldScale(new THREE.Vector3()).x;
  const top = pants.max.y, bottom = all.min.y + (pants.max.y - all.min.y) * 0.08; // waist → just above the feet
  const w = Math.max(pants.max.x - pants.min.x, pants.max.z - pants.min.z);
  const skirt = new THREE.Mesh(new THREE.CylinderGeometry(w * 0.52, w * 0.95, top - bottom, 28, 1, true), new THREE.MeshStandardMaterial({ color: shirt ?? 0x3E5C8A, roughness: 0.9, side: THREE.DoubleSide }));
  skirt.scale.setScalar(1 / ws);
  const c = pants.getCenter(new THREE.Vector3());
  skirt.position.copy(holder.worldToLocal(new THREE.Vector3(c.x, (top + bottom) / 2, c.z)));
  holder.add(skirt);
  hips.attach(skirt);
}
