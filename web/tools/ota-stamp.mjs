/**
 * Live updates (OTA) of the Android app's web part, run after every `vite build` (npm run build):
 * writes into dist/
 *   version.json  { version, built }            — which web build this is (shipped inside the app too)
 *   ota.json      { version, built, native, manifest } — read by the app from sehem2.com.tr/oyun/ota.json
 * `manifest`: every file with its SHA-256 and where to download it (the game itself, deployed at
 * /oyun/ by tools/deploy-sehem2.sh). The app downloads only the files it doesn't have yet
 * (platform/native.js liveUpdate, @capgo/capacitor-updater). `version` is a hash of the content:
 * the same files, the same version (no update).
 *
 * NATIVE: the oldest Android app (versionCode) that can run this web build. Raise it when the native
 * side changes in a way the web code needs (a new Capacitor plugin, a new permission…): older apps
 * then wait for the Play Store update instead of getting a web part they can't run.
 */
import { createHash } from 'node:crypto';
import { copyFileSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, relative, sep } from 'node:path';

const NATIVE = 29; // Android 1.0.28: the first app with live updates
const DIST = new URL('../dist/', import.meta.url).pathname;
const BASE = 'https://sehem2.com.tr/oyun/';
const SKIP = new Set(['ota.json', 'version.json']);
/** HTML is downloaded from a plain-text copy: Cloudflare adds its analytics script to HTML pages (a different file, a wrong hash). */
const RAW = 'ota-raw/';

const files = [];
const walk = (dir) => {
  for (const name of readdirSync(dir).sort()) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) walk(path);
    else if (!relative(DIST, path).startsWith(RAW.slice(0, -1))) files.push(relative(DIST, path).split(sep).join('/'));
  }
};
walk(DIST);

const entry = (f) => {
  const hash = createHash('sha256').update(readFileSync(join(DIST, f))).digest('hex');
  // ?h=: a new address for new content (the CDN in front of the site keeps old files for a while)
  let from = f;
  if (f.endsWith('.html')) { from = `${RAW}${f}.txt`; mkdirSync(dirname(join(DIST, from)), { recursive: true }); copyFileSync(join(DIST, f), join(DIST, from)); }
  return { file_name: f, file_hash: hash, download_url: `${BASE}${from.split('/').map(encodeURIComponent).join('/')}?h=${hash.slice(0, 16)}` };
};
const manifest = files.filter((f) => !SKIP.has(f)).map(entry);
const version = createHash('sha256').update(manifest.map((m) => `${m.file_name}:${m.file_hash}`).join('\n')).digest('hex').slice(0, 12);
const built = new Date().toISOString();
writeFileSync(join(DIST, 'version.json'), JSON.stringify({ version, built }));
manifest.push(entry('version.json')); // (in every bundle: the app reads its own version from it)
writeFileSync(join(DIST, 'ota.json'), JSON.stringify({ version, built, native: NATIVE, manifest }));
console.log(`ota: version ${version}, ${manifest.length} files`);
