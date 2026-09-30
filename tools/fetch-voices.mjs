/**
 * Downloads the Piper Turkish voices used by the game into assets/voices/ so the
 * TTS worker loads them locally instead of from Hugging Face.
 * Usage: node tools/fetch-voices.mjs
 */
import { mkdir, writeFile, stat } from 'node:fs/promises';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HF = 'https://huggingface.co/diffusionstudio/piper-voices/resolve/main';
const VOICES = ['tr_TR-fahrettin-medium', 'tr_TR-fettah-medium'];
const root = fileURLToPath(new URL('../assets/voices/', import.meta.url));

for (const id of VOICES) {
  const [loc, name, q] = id.split('-');
  const rel = `${loc.slice(0, 2)}/${loc}/${name}/${q}/${id}.onnx`;
  for (const file of [rel, `${rel}.json`]) {
    const out = root + file;
    if (await stat(out).then(() => true, () => false)) { console.log(`✓ ${file}`); continue; }
    process.stdout.write(`↓ ${file} … `);
    const res = await fetch(`${HF}/${file}`);
    if (!res.ok) throw new Error(`${res.status} ${file}`);
    await mkdir(dirname(out), { recursive: true });
    await writeFile(out, Buffer.from(await res.arrayBuffer()));
    console.log('ok');
  }
}
