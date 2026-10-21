/**
 * My own voice, while my mic is open in a call or a talking zone, goes to the village server in
 * short pieces (each a small file of its own, ~10 s at 16 kbit/s): the server keeps it encrypted
 * in the safety log and, for ten minutes, for a report (server/src/Reports.js). The others still
 * hear me straight over WebRTC; nothing of this is relayed to them.
 */
const SEGMENT = 10000;   // ms per piece
const MAX_BYTES = 40000; // the server takes ~45 KB of base64: a phone that ignores the bit rate gets shorter pieces
const TYPES = ['audio/ogg;codecs=opus', 'audio/webm;codecs=opus', 'audio/mp4'];

export class VoiceRecorder {
  #rec = null;
  #timer = null;
  #track = null;
  #ctx = null;
  #segment = SEGMENT;

  constructor(net) { this.net = net; }

  static get supported() { return typeof MediaRecorder === 'function'; }

  /** Record `track` ('call' | 'zone') until stop(); a running one is stopped first. */
  start(track, ctx) {
    this.stop();
    if (!track || !VoiceRecorder.supported) return;
    this.#track = track;
    this.#ctx = ctx;
    this.#piece();
  }

  /** One piece: a fresh recorder (so each piece is a whole file), stopped after SEGMENT ms. */
  #piece() {
    if (!this.#track) return;
    let rec;
    try {
      const mimeType = TYPES.find((t) => MediaRecorder.isTypeSupported?.(t));
      rec = new MediaRecorder(new MediaStream([this.#track]), { ...(mimeType ? { mimeType } : {}), audioBitsPerSecond: 16000 });
    } catch { this.#track = null; return; }
    const chunks = [], ctx = this.#ctx, began = Date.now();
    rec.ondataavailable = (e) => { if (e.data?.size) chunks.push(e.data); };
    rec.onstop = () => { if (chunks.length && Date.now() - began > 400) this.#send(new Blob(chunks, { type: rec.mimeType || chunks[0].type }), ctx); };
    rec.start();
    this.#rec = rec;
    this.#timer = setTimeout(() => { if (rec.state !== 'inactive') rec.stop(); this.#piece(); }, this.#segment);
  }

  async #send(blob, ctx) {
    if (blob.size > MAX_BYTES) { this.#segment = Math.max(2000, Math.floor(this.#segment * (MAX_BYTES / blob.size) * 0.9)); return; } // too big for one message: shorter pieces from now on
    const data = await new Promise((resolve) => {
      const r = new FileReader();
      r.onload = () => resolve(String(r.result).split(',')[1] ?? '');
      r.onerror = () => resolve('');
      r.readAsDataURL(blob);
    });
    if (data && this.net.connected) this.net.send({ type: 'voice', ctx, mime: (blob.type || 'audio/webm').replace(/["\s]/g, ''), data });
  }

  /** Mic closed: the piece so far still goes out. */
  stop() {
    clearTimeout(this.#timer);
    this.#track = null;
    if (this.#rec && this.#rec.state !== 'inactive') this.#rec.stop();
    this.#rec = null;
  }
}
