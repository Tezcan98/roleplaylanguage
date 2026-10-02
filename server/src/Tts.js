/**
 * Turkish speech for the game: GET /api/tts?v=<voice>&t=<text> → audio/wav. Men and boys
 * speak with Piper (a stand-alone binary, no system packages); Piper has no Turkish woman's
 * voice (its "dfki" is a man), so women and girls speak with Gemini's text-to-speech
 * (woman / girl / grandmother voices; capped per day). Every line is generated once and kept
 * in a disk cache, so the story's fixed lines are instant for everyone.
 */
import { spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdir, readFile, rename, stat, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

export const TTS_VOICES = { fahrettin: 'tr_TR-fahrettin-medium', fettah: 'tr_TR-fettah-medium' };
/** Women's voices (Gemini prebuilt voices). `dfki`: what older pages ask for their women — now a woman too. */
export const GEMINI_VOICES = { kadin: 'Kore', kiz: 'Leda', nine: 'Sulafat', dfki: 'Kore' };
const GEMINI_MODELS = ['gemini-3.8-flash-tts', 'gemini-2.5-flash-preview-tts'];
const MAX_TEXT = 300;

/** 16-bit mono PCM → a WAV file. */
function wav(pcm, rate = 24000) {
  const h = Buffer.alloc(44);
  h.write('RIFF', 0); h.writeUInt32LE(36 + pcm.length, 4); h.write('WAVE', 8); h.write('fmt ', 12);
  h.writeUInt32LE(16, 16); h.writeUInt16LE(1, 20); h.writeUInt16LE(1, 22); h.writeUInt32LE(rate, 24);
  h.writeUInt32LE(rate * 2, 28); h.writeUInt16LE(2, 32); h.writeUInt16LE(16, 34); h.write('data', 36); h.writeUInt32LE(pcm.length, 40);
  return Buffer.concat([h, pcm]);
}

export class Tts {
  #running = 0;
  #queue = [];
  #inflight = new Map(); // cache key → Promise (two players asking the same line wait for one run)

  /**
   * @param {{ piperDir: string, cacheDir: string, concurrency?: number, perMinute?: number,
   *   gemini?: { key: string, models?: string[], perDay?: number, fetch?: Function } }} o
   */
  constructor({ piperDir, cacheDir, concurrency = 2, perMinute = 90, gemini = null, log = console.log }) {
    Object.assign(this, { piperDir, cacheDir, concurrency, perMinute, log });
    this.gemini = gemini?.key ? { models: GEMINI_MODELS, perDay: 1500, fetch: globalThis.fetch, ...gemini } : null;
    this.geminiDay = { day: '', count: 0 };
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
    const female = GEMINI_VOICES[voice], model = TTS_VOICES[voice];
    const t = typeof text === 'string' ? text.normalize('NFC').trim().replace(/\s+/g, ' ') : '';
    if ((!model && !female) || !t || t.length > MAX_TEXT) return { status: 400, error: 'bad request' };
    if (female && !this.gemini) return { status: 503, error: 'no women\'s voice' }; // the page uses the browser's woman's voice
    const key = createHash('sha1').update(female ? `gemini:${female}|${t}` : `${voice}|${t}`).digest('hex');
    const file = join(this.cacheDir, `${key}.wav`);
    if (await stat(file).then(() => true, () => false)) return { status: 200, body: await readFile(file) };
    if (!this.#allow(ip)) return { status: 429, error: 'slow down' };
    if (female && !this.#inflight.has(key) && !this.#geminiBudget()) return { status: 503, error: 'women\'s voice: daily limit' };
    if (!this.#inflight.has(key)) {
      const job = female ? () => this.#gemini(female, t, file) : () => this.#synth(model, t, file);
      this.#inflight.set(key, this.#queued(job).finally(() => this.#inflight.delete(key)));
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

  /** One more Gemini line today? (resets at midnight UTC) */
  #geminiBudget() {
    const day = new Date().toISOString().slice(0, 10);
    if (this.geminiDay.day !== day) this.geminiDay = { day, count: 0 };
    if (this.geminiDay.count >= this.gemini.perDay) return false;
    this.geminiDay.count++;
    return true;
  }

  /** A woman's line from Gemini text-to-speech (tries the models in turn). */
  async #gemini(voiceName, text, file) {
    const { key, models, fetch } = this.gemini;
    const body = JSON.stringify({
      contents: [{ parts: [{ text }] }],
      generationConfig: { responseModalities: ['AUDIO'], speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName } } } },
    });
    let last = null;
    for (const m of [...models, ...models]) { // each model gets a second try: now and then one answers without audio
      try {
        const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${m}:generateContent`, {
          method: 'POST', headers: { 'content-type': 'application/json', 'x-goog-api-key': key }, body, signal: AbortSignal.timeout(25000),
        });
        if (!r.ok) { last = new Error(`gemini tts ${m}: HTTP ${r.status}`); continue; }
        const part = (await r.json())?.candidates?.[0]?.content?.parts?.find((p) => p.inlineData?.data)?.inlineData;
        if (!part) { last = new Error(`gemini tts ${m}: no audio`); continue; }
        const raw = Buffer.from(part.data, 'base64');
        const rate = Number(/rate=(\d+)/.exec(part.mimeType ?? '')?.[1] ?? 24000);
        await mkdir(this.cacheDir, { recursive: true });
        const tmp = `${file}.${process.pid}.tmp`;
        await writeFile(tmp, raw.subarray(0, 4).toString() === 'RIFF' ? raw : wav(raw, rate));
        await rename(tmp, file);
        return;
      } catch (e) { last = e; }
    }
    throw last ?? new Error('gemini tts failed');
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
