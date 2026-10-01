/**
 * Turkish speech for the game, made on the server with Piper (a stand-alone binary, no
 * system packages): GET /api/tts?v=<voice>&t=<text> → audio/wav. Every line is generated
 * once and kept in a disk cache, so the story's fixed lines are instant for everyone.
 * Phones no longer download 60 MB voices or fall back to an English system voice.
 */
import { spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdir, readFile, rename, stat } from 'node:fs/promises';
import { join } from 'node:path';

export const TTS_VOICES = { dfki: 'tr_TR-dfki-medium', fahrettin: 'tr_TR-fahrettin-medium', fettah: 'tr_TR-fettah-medium' };
const MAX_TEXT = 300;

export class Tts {
  #running = 0;
  #queue = [];
  #inflight = new Map(); // cache key → Promise (two players asking the same line wait for one run)

  /** @param {{ piperDir: string, cacheDir: string, concurrency?: number, perMinute?: number }} o */
  constructor({ piperDir, cacheDir, concurrency = 2, perMinute = 90, log = console.log }) {
    Object.assign(this, { piperDir, cacheDir, concurrency, perMinute, log });
    this.hits = new Map();
    this.enabled = !!piperDir;
  }

  #allow(ip) {
    const now = Date.now(), list = (this.hits.get(ip) ?? []).filter((t) => now - t < 60_000);
    if (list.length >= this.perMinute) return false;
    list.push(now); this.hits.set(ip, list);
    return true;
  }

  /** @returns {Promise<{ status: number, body?: Buffer, error?: string }>} */
  async handle(voice, text, ip) {
    if (!this.enabled) return { status: 503, error: 'disabled' };
    const model = TTS_VOICES[voice];
    const t = typeof text === 'string' ? text.normalize('NFC').trim().replace(/\s+/g, ' ') : '';
    if (!model || !t || t.length > MAX_TEXT) return { status: 400, error: 'bad request' };
    const key = createHash('sha1').update(`${voice}|${t}`).digest('hex');
    const file = join(this.cacheDir, `${key}.wav`);
    if (await stat(file).then(() => true, () => false)) return { status: 200, body: await readFile(file) };
    if (!this.#allow(ip)) return { status: 429, error: 'slow down' };
    if (!this.#inflight.has(key)) {
      this.#inflight.set(key, this.#queued(() => this.#synth(model, t, file)).finally(() => this.#inflight.delete(key)));
    }
    try {
      await this.#inflight.get(key);
      return { status: 200, body: await readFile(file) };
    } catch (e) {
      this.log(`[tts] ${e.message}`);
      return { status: 502, error: 'synthesis failed' };
    }
  }

  #queued(job) {
    return new Promise((resolve, reject) => {
      const run = () => { this.#running++; job().then(resolve, reject).finally(() => { this.#running--; this.#queue.shift()?.(); }); };
      if (this.#running < this.concurrency) run(); else this.#queue.push(run);
    });
  }

  async #synth(model, text, file) {
    await mkdir(this.cacheDir, { recursive: true });
    const tmp = `${file}.${process.pid}.tmp`;
    await new Promise((resolve, reject) => {
      const p = spawn(join(this.piperDir, 'piper', 'piper'), ['--model', join(this.piperDir, `${model}.onnx`), '--output_file', tmp, '--quiet'], { stdio: ['pipe', 'ignore', 'pipe'] });
      let err = '';
      p.stderr.on('data', (d) => { err += d; });
      const timer = setTimeout(() => { p.kill('SIGKILL'); reject(new Error('piper timeout')); }, 20000);
      p.on('error', reject);
      p.on('close', (code) => { clearTimeout(timer); code === 0 ? resolve() : reject(new Error(`piper exit ${code}: ${err.slice(-200)}`)); });
      p.stdin.end(`${text}\n`);
    });
    await rename(tmp, file);
  }
}
