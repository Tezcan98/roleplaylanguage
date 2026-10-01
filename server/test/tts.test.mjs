/** Tts with a fake piper (a shell script writing a small file): caching, limits, validation. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, chmodSync, readdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Tts } from '../src/Tts.js';

function fakePiper() {
  const dir = mkdtempSync(join(tmpdir(), 'piper-'));
  mkdirSync(join(dir, 'piper'));
  const bin = join(dir, 'piper', 'piper');
  // writes "RIFF" + the text it was given to --output_file, counts runs in runs.log
  writeFileSync(bin, `#!/bin/sh\nwhile [ $# -gt 0 ]; do [ "$1" = "--output_file" ] && out="$2"; shift; done\nprintf 'RIFF' > "$out"; cat >> "$out"; echo x >> "${dir}/runs.log"\n`);
  chmodSync(bin, 0o755);
  return dir;
}

test('makes a line once, then serves it from the cache', async () => {
  const dir = fakePiper();
  const tts = new Tts({ piperDir: dir, cacheDir: join(dir, 'cache'), log: () => {} });
  const a = await tts.handle('dfki', '  Merhaba   çocuklar! ', '1.1.1.1');
  assert.equal(a.status, 200);
  assert.equal(a.body.toString(), 'RIFFMerhaba çocuklar!\n');
  const [b, c] = await Promise.all([tts.handle('dfki', 'Merhaba çocuklar!', '1.1.1.2'), tts.handle('dfki', 'Merhaba çocuklar!', '1.1.1.3')]);
  assert.equal(b.status, 200); assert.equal(c.status, 200);
  assert.equal(readdirSync(dir).includes('runs.log') && (await import('node:fs')).readFileSync(join(dir, 'runs.log'), 'utf8').trim().split('\n').length, 1, 'piper ran once');
});

test('refuses unknown voices, empty and too long text; limits per IP', async () => {
  const dir = fakePiper();
  const tts = new Tts({ piperDir: dir, cacheDir: join(dir, 'cache'), perMinute: 2, log: () => {} });
  assert.equal((await tts.handle('english', 'hi', 'a')).status, 400);
  assert.equal((await tts.handle('dfki', '', 'a')).status, 400);
  assert.equal((await tts.handle('dfki', 'x'.repeat(301), 'a')).status, 400);
  assert.deepEqual([(await tts.handle('dfki', 'bir', 'b')).status, (await tts.handle('dfki', 'iki', 'b')).status, (await tts.handle('dfki', 'üç', 'b')).status], [200, 200, 429]);
  assert.equal((await tts.handle('dfki', 'bir', 'b')).status, 200, 'cached lines are not limited');
});

test('off without a Piper folder', async () => {
  assert.equal((await new Tts({ piperDir: '', cacheDir: '/tmp/x' }).handle('dfki', 'a', 'z')).status, 503);
});
