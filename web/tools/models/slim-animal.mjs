/**
 * Makes a Quaternius "Farm Animals" animal (CC0, opengameart.org/content/lowpoly-animated-farm-animal-pack)
 * ready for the game: keeps Idle / Walk / Run (renamed idle / walk / run), drops the rest (death, jump…).
 *   FBX2glTF -b -i Horse.fbx -o horse
 *   node tools/models/slim-animal.mjs horse.glb assets/models/animal_horse.glb
 */
import { NodeIO } from '@gltf-transform/core';
import { prune, dedup } from '@gltf-transform/functions';

const KEEP = { Idle: 'idle', Walk: 'walk', Run: 'run' };
const [src, out] = process.argv.slice(2);
const io = new NodeIO();
const doc = await io.read(src);
const root = doc.getRoot();
const seen = new Set();
for (const a of root.listAnimations()) {
  const k = KEEP[a.getName().replace(/^.*\|/, '')];
  if (k && !seen.has(k)) { a.setName(k); seen.add(k); continue; }
  const data = a.listSamplers().flatMap((x) => [x.getInput(), x.getOutput()]);
  a.listChannels().forEach((c) => c.dispose()); a.listSamplers().forEach((x) => x.dispose()); a.dispose();
  data.forEach((acc) => { if (acc && acc.listParents().every((x) => x === root)) acc.dispose(); });
}
await doc.transform(prune(), dedup());
await io.write(out, doc);
console.log(out, [...seen].join(' '));
