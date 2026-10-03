/**
 * Makes a Quaternius "Ultimate Animated Character Pack" character (CC0) small enough for phones:
 * keeps the four animations the game uses (idle, walk, sit, cheer), drops the rest, shrinks the
 * textures. Convert the FBX first with FBX2glTF (github.com/godotengine/FBX2glTF):
 *   FBX2glTF -b -i Casual2_Male.fbx -o out
 *   node tools/models/slim-character.mjs out.glb assets/models/hd_casual_boy.glb
 */
import { NodeIO } from '@gltf-transform/core';
import { prune, dedup } from '@gltf-transform/functions';

const KEEP = { 'CharacterArmature|Idle': 'idle', 'CharacterArmature|Walk': 'walk', 'CharacterArmature|SitDown': 'sit', 'CharacterArmature|Victory': 'cheer' };
const [src, out] = process.argv.slice(2);
const io = new NodeIO();
const doc = await io.read(src);
const root = doc.getRoot();
const seen = new Set();
for (const a of root.listAnimations()) {
  const k = KEEP[a.getName()];
  if (k && !seen.has(k)) { a.setName(k); seen.add(k); continue; }
  const data = a.listSamplers().flatMap((x) => [x.getInput(), x.getOutput()]);
  a.listChannels().forEach((c) => c.dispose()); a.listSamplers().forEach((x) => x.dispose()); a.dispose();
  data.forEach((acc) => { if (acc && acc.listParents().every((x) => x === root)) acc.dispose(); });
}
await doc.transform(prune(), dedup());
await io.write(out, doc);
console.log(out, [...seen].join(' '));
