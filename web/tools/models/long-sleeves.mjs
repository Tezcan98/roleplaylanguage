/**
 * Long sleeves (and long trousers) for an HD character: the skin triangles of the shoulders,
 * upper arms and forearms become shirt fabric (the hands stay skin); with --legs the thighs and
 * shins become trouser fabric (shorts → long trousers). Run on a slimmed model:
 *   node tools/models/long-sleeves.mjs assets/models/hd_casual_girl.glb [--legs] [--no-arms]
 */
import { NodeIO } from '@gltf-transform/core';
import { prune, compactPrimitive } from '@gltf-transform/functions';

const file = process.argv[2];
const PARTS = [
  ...(process.argv.includes('--no-arms') ? [] : [{ bones: /^(Shoulder|UpperArm|LowerArm)\./, cloth: 'Shirt', what: 'sleeves' }]),
  ...(process.argv.includes('--legs') ? [{ bones: /^(UpperLeg|LowerLeg)\./, cloth: 'Pants', what: 'trouser legs' }] : []),
];
const io = new NodeIO();
const doc = await io.read(file);
const root = doc.getRoot();
const joints = root.listSkins()[0].listJoints().map((j) => j.getName());
for (const { bones, cloth, what } of PARTS) {
  const fabric = root.listMaterials().find((m) => m.getName() === cloth);
  let moved = 0;
  for (const mesh of root.listMeshes()) {
    for (const prim of [...mesh.listPrimitives()]) {
      if (prim.getMaterial()?.getName() !== 'Skin') continue;
      const J = prim.getAttribute('JOINTS_0'), W = prim.getAttribute('WEIGHTS_0'), idx = prim.getIndices();
      const on = (v) => { const j = J.getElement(v, []), w = W.getElement(v, []); let best = 0; for (let k = 1; k < 4; k++) if (w[k] > w[best]) best = k; return bones.test(joints[j[best]]); };
      const keep = [], part = [];
      for (let t = 0; t < idx.getCount(); t += 3) {
        const tri = [idx.getScalar(t), idx.getScalar(t + 1), idx.getScalar(t + 2)];
        (tri.every(on) ? part : keep).push(...tri);
      }
      if (!part.length) continue;
      const Arr = idx.getArray().constructor;
      idx.setArray(new Arr(keep));
      const p = prim.clone().setMaterial(fabric);
      p.setIndices(doc.createAccessor().setType('SCALAR').setArray(new Arr(part)).setBuffer(idx.getBuffer()));
      mesh.addPrimitive(p);
      moved += part.length / 3;
    }
  }
  console.log(file, `${moved} triangles became ${what}`);
}
// each piece keeps only its own vertices (a split piece would otherwise carry the whole body's,
// and the game measures pieces: the dress hangs from the trousers, the apron from the shirt)
for (const mesh of root.listMeshes()) for (const prim of mesh.listPrimitives()) compactPrimitive(prim);
await doc.transform(prune());
await io.write(file, doc);
