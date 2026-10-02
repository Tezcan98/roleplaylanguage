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
  const a = await tts.handle('fahrettin', '  Merhaba   çocuklar! ', '1.1.1.1');
  assert.equal(a.status, 200);
  assert.equal(a.body.toString(), 'RIFFMerhaba çocuklar!\n');
  const [b, c] = await Promise.all([tts.handle('fahrettin', 'Merhaba çocuklar!', '1.1.1.2'), tts.handle('fahrettin', 'Merhaba çocuklar!', '1.1.1.3')]);
  assert.equal(b.status, 200); assert.equal(c.status, 200);
  assert.equal(readdirSync(dir).includes('runs.log') && (await import('node:fs')).readFileSync(join(dir, 'runs.log'), 'utf8').trim().split('\n').length, 1, 'piper ran once');
});

test('refuses unknown voices, empty and too long text; limits per IP', async () => {
  const dir = fakePiper();
  const tts = new Tts({ piperDir: dir, cacheDir: join(dir, 'cache'), perMinute: 2, log: () => {} });
  assert.equal((await tts.handle('english', 'hi', 'a')).status, 400);
  assert.equal((await tts.handle('fahrettin', '', 'a')).status, 400);
  assert.equal((await tts.handle('fahrettin', 'x'.repeat(301), 'a')).status, 400);
  assert.deepEqual([(await tts.handle('fahrettin', 'bir', 'b')).status, (await tts.handle('fahrettin', 'iki', 'b')).status, (await tts.handle('fahrettin', 'üç', 'b')).status], [200, 200, 429]);
  assert.equal((await tts.handle('fahrettin', 'bir', 'b')).status, 200, 'cached lines are not limited');
});

test('off without a Piper folder', async () => {
  assert.equal((await new Tts({ piperDir: '', cacheDir: '/tmp/x' }).handle('dfki', 'a', 'z')).status, 503);
});

test('women and girls: Gemini voices, cached, capped per day; never a man’s voice', async () => {
  const dir = fakePiper();
  const calls = [];
  const fetch = async (url, { body }) => {
    calls.push({ model: url.match(/models\/([^:]+)/)[1], voice: JSON.parse(body).generationConfig.speechConfig.voiceConfig.prebuiltVoiceConfig.voiceName });
    if (calls.length === 1) return { ok: false, status: 404 }; // the first model is not there: the next one is tried
    return { ok: true, json: async () => ({ candidates: [{ content: { parts: [{ inlineData: { mimeType: 'audio/L16;codec=pcm;rate=24000', data: Buffer.from([1, 0, 2, 0]).toString('base64') } }] } }] }) };
  };
  const tts = new Tts({ piperDir: dir, cacheDir: join(dir, 'cache'), gemini: { key: 'k', models: ['a', 'b'], perDay: 2, fetch }, log: () => {} });
  const a = await tts.handle('kadin', 'Günaydın Ahmet!', 'x');
  assert.equal(a.status, 200);
  assert.equal(a.body.subarray(0, 4).toString(), 'RIFF', 'PCM wrapped as WAV');
  assert.equal(a.body.length, 44 + 4);
  assert.deepEqual(calls.map((c) => c.model), ['a', 'b']);
  assert.equal(calls[1].voice, 'Kore');
  assert.equal((await tts.handle('kadin', 'Günaydın Ahmet!', 'x')).status, 200);
  assert.equal(calls.length, 2, 'the second time it comes from the cache');
  assert.equal((await tts.handle('dfki', 'Merhaba', 'x')).status, 200, 'older pages asking for "dfki" get a woman too');
  assert.equal(calls.at(-1).voice, 'Kore');
  assert.equal((await tts.handle('kiz', 'Merhaba', 'x')).status, 503, 'daily limit reached');
  assert.equal(readdirSync(dir).includes('runs.log'), false, 'Piper (a man’s voice) never ran for her');
  const off = new Tts({ piperDir: dir, cacheDir: join(dir, 'cache2'), log: () => {} });
  assert.equal((await off.handle('nine', 'Gel kuzum', 'x')).status, 503, 'without Gemini: no voice (the page uses the browser’s woman’s voice)');
});
