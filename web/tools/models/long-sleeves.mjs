/**
 * Long sleeves for an HD character: the skin triangles of the shoulders, upper arms and forearms
 * become shirt fabric (the hands stay skin). Run on a slimmed model:
 *   node tools/models/long-sleeves.mjs assets/models/hd_casual_girl.glb
 */
import { NodeIO } from '@gltf-transform/core';
import { prune } from '@gltf-transform/functions';

const ARM = /^(Shoulder|UpperArm|LowerArm)\./;
const file = process.argv[2];
const io = new NodeIO();
const doc = await io.read(file);
const root = doc.getRoot();
const joints = root.listSkins()[0].listJoints().map((j) => j.getName());
const shirt = root.listMaterials().find((m) => m.getName() === 'Shirt');
let moved = 0;
for (const mesh of root.listMeshes()) {
  for (const prim of [...mesh.listPrimitives()]) {
    if (prim.getMaterial()?.getName() !== 'Skin') continue;
    const J = prim.getAttribute('JOINTS_0'), W = prim.getAttribute('WEIGHTS_0'), idx = prim.getIndices();
    const onArm = (v) => { const j = J.getElement(v, []), w = W.getElement(v, []); let best = 0; for (let k = 1; k < 4; k++) if (w[k] > w[best]) best = k; return ARM.test(joints[j[best]]); };
    const keep = [], sleeve = [];
    for (let t = 0; t < idx.getCount(); t += 3) {
      const tri = [idx.getScalar(t), idx.getScalar(t + 1), idx.getScalar(t + 2)];
      (tri.every(onArm) ? sleeve : keep).push(...tri);
    }
    if (!sleeve.length) continue;
    const Arr = idx.getArray().constructor;
    idx.setArray(new Arr(keep));
    const sp = prim.clone().setMaterial(shirt);
    sp.setIndices(doc.createAccessor().setType('SCALAR').setArray(new Arr(sleeve)).setBuffer(idx.getBuffer()));
    mesh.addPrimitive(sp);
    moved += sleeve.length / 3;
  }
}
await doc.transform(prune());
await io.write(file, doc);
console.log(file, `${moved} triangles became sleeves`);
