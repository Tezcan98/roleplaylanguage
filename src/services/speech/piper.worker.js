/**
 * Piper TTS engine in a module worker: keeps one ONNX session per voice and one
 * phonemizer, so after the first sentence synthesis takes ~1 s instead of reloading
 * a 60 MB model every time. Models are cached with the Cache API.
 *
 * in:  { type: 'prepare', id, voice } | { type: 'speak', id, voice, text }
 * out: { type: 'progress', voice, loaded, total } | { type: 'done', id, wav? } | { type: 'error', id, message }
 */
import * as ort from 'https://cdn.jsdelivr.net/npm/onnxruntime-web@1.18.0/dist/esm/ort.min.js';
import { createPiperPhonemize } from 'https://cdn.jsdelivr.net/npm/@diffusionstudio/vits-web@1.0.3/dist/piper-DeOu3H9E.js';

const HF = 'https://huggingface.co/diffusionstudio/piper-voices/resolve/main';
const LOCAL = new URL('../../../assets/voices', self.location.href).href; // filled by `npm run voices`
const PHONEMIZE = 'https://cdn.jsdelivr.net/npm/@diffusionstudio/piper-wasm@1.0.0/build/piper_phonemize';
const VOICE_PATH = (id) => { const [loc, name, q] = id.split('-'); return `${loc.slice(0, 2)}/${loc}/${name}/${q}/${id}.onnx`; };

ort.env.wasm.wasmPaths = 'https://cdnjs.cloudflare.com/ajax/libs/onnxruntime-web/1.18.0/';
ort.env.wasm.numThreads = self.crossOriginIsolated ? Math.min(4, navigator.hardwareConcurrency) : 1;

const voices = new Map(); // id → Promise<{ session, config }>

/** Local copy first (assets/voices), Hugging Face otherwise. */
async function voiceFile(path, onProgress) {
  const local = await fetch(`${LOCAL}/${path}`).catch(() => null);
  if (local?.ok) return local;
  return cachedFetch(`${HF}/${path}`, onProgress);
}

async function cachedFetch(url, onProgress) {
  const cache = await caches.open('piper-voices-v1');
  const hit = await cache.match(url);
  if (hit) return hit;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${res.status} ${url}`);
  const total = Number(res.headers.get('content-length')) || 0;
  const reader = res.body.getReader();
  const chunks = [];
  let loaded = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
    loaded += value.length;
    onProgress?.(loaded, total);
  }
  const blob = new Blob(chunks);
  await cache.put(url, new Response(blob));
  return new Response(blob);
}

function loadVoice(id) {
  if (!voices.has(id)) {
    voices.set(id, (async () => {
      const path = VOICE_PATH(id);
      const config = await (await voiceFile(`${path}.json`)).json();
      const model = await (await voiceFile(path, (loaded, total) => postMessage({ type: 'progress', voice: id, loaded, total }))).arrayBuffer();
      const session = await ort.InferenceSession.create(model);
      return { session, config };
    })().catch((e) => { voices.delete(id); throw e; }));
  }
  return voices.get(id);
}

/**
 * espeak-ng phonemizer → piper phoneme ids. One instance is reused (`print` is routed to
 * the current request); if the runtime refuses a second run we build a fresh one.
 */
let phonemizer = null;
let onLine = null;
const newPhonemizer = () => createPiperPhonemize({
  noInitialRun: true,
  print: (line) => onLine?.resolve(JSON.parse(line).phoneme_ids),
  printErr: (line) => onLine?.reject(new Error(line)),
  locateFile: (f) => (f.endsWith('.wasm') ? `${PHONEMIZE}.wasm` : f.endsWith('.data') ? `${PHONEMIZE}.data` : f),
});

async function phonemize(text, espeakVoice) {
  phonemizer ??= newPhonemizer();
  const m = await phonemizer;
  const args = ['-l', espeakVoice, '--input', JSON.stringify([{ text }]), '--espeak_data', '/espeak-ng-data'];
  const result = new Promise((resolve, reject) => { onLine = { resolve, reject }; });
  try {
    m.callMain(args);
  } catch (e) {
    phonemizer = null; // runtime exited — retry once with a new instance
    const fresh = await (phonemizer = newPhonemizer());
    fresh.callMain(args);
  }
  return result;
}

function wav(samples, rate) {
  const buf = new ArrayBuffer(44 + samples.length * 2), v = new DataView(buf);
  const str = (o, s) => [...s].forEach((c, i) => v.setUint8(o + i, c.charCodeAt(0)));
  str(0, 'RIFF'); v.setUint32(4, 36 + samples.length * 2, true); str(8, 'WAVE'); str(12, 'fmt ');
  v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true); v.setUint32(24, rate, true);
  v.setUint32(28, rate * 2, true); v.setUint16(32, 2, true); v.setUint16(34, 16, true); str(36, 'data');
  v.setUint32(40, samples.length * 2, true);
  for (let i = 0; i < samples.length; i++) v.setInt16(44 + i * 2, Math.max(-1, Math.min(1, samples[i])) * 32767, true);
  return buf;
}

async function speak(voiceId, text) {
  const { session, config } = await loadVoice(voiceId);
  const ids = await phonemize(text, config.espeak.voice);
  const inf = config.inference;
  const feeds = {
    input: new ort.Tensor('int64', BigInt64Array.from(ids, BigInt), [1, ids.length]),
    input_lengths: new ort.Tensor('int64', BigInt64Array.from([BigInt(ids.length)])),
    scales: new ort.Tensor('float32', Float32Array.from([inf.noise_scale, inf.length_scale, inf.noise_w])),
  };
  if (Object.keys(config.speaker_id_map ?? {}).length) feeds.sid = new ort.Tensor('int64', BigInt64Array.from([0n]));
  const { output } = await session.run(feeds);
  return wav(output.data, config.audio.sample_rate);
}

self.onmessage = async ({ data }) => {
  try {
    if (data.type === 'prepare') { await loadVoice(data.voice); postMessage({ type: 'done', id: data.id }); }
    if (data.type === 'speak') { const buf = await speak(data.voice, data.text); postMessage({ type: 'done', id: data.id, wav: buf }, [buf]); }
  } catch (e) {
    postMessage({ type: 'error', id: data.id, message: e.message ?? String(e) });
  }
};
