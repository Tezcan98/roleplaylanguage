/**
 * My own voice, while my mic is open in a call or a talking zone, goes to the village server in
 * short pieces (each a small file of its own, ~10 s of Opus at 8 kbit/s — enough to understand
 * speech): the server keeps it encrypted for 48 hours and, for ten minutes, for a report
 * (server/src/Reports.js). A piece with (almost) no speech in it is not sent at all: in a call
 * each side is mostly listening. The others still hear me straight over WebRTC; nothing of this
 * is relayed to them.
 */
const SEGMENT = 10000;   // ms per piece
const BITRATE = 8000;    // bit/s: ~1 KB a second of speech
const LOUD = 0.015;      // RMS of a 100 ms frame that counts as speech
const SPOKEN = 3;        // frames of speech (0.3 s) a piece needs to be sent
const MAX_BYTES = 40000; // the server takes ~45 KB of base64: a phone that ignores the bit rate gets shorter pieces
const TYPES = ['audio/ogg;codecs=opus', 'audio/webm;codecs=opus', 'audio/mp4'];

export class VoiceRecorder {
  #rec = null;
  #timer = null;
  #track = null;
  #ctx = null;
  #segment = SEGMENT;
  #meter = null; // { ctx, timer, piece: { loud } }: how much of the current piece is speech

  constructor(net) { this.net = net; }

  static get supported() { return typeof MediaRecorder === 'function'; }

  /** Record `track` ('call' | 'zone') until stop(); a running one is stopped first. */
  start(track, ctx) {
    this.stop();
    if (!track || !VoiceRecorder.supported) return;
    this.#track = track;
    this.#ctx = ctx;
    this.#listen(track);
    this.#piece();
  }

  /** Counts the frames with speech in them (no Web Audio here: every piece is sent). */
  #listen(track) {
    try {
      const ctx = new AudioContext();
      ctx.resume?.().catch(() => {});
      const an = ctx.createAnalyser();
      an.fftSize = 1024;
      ctx.createMediaStreamSource(new MediaStream([track])).connect(an);
      const buf = new Float32Array(an.fftSize);
      const m = this.#meter = { ctx, timer: null, piece: { loud: 0 } };
      m.timer = setInterval(() => {
        an.getFloatTimeDomainData(buf);
        let sum = 0;
        for (const v of buf) sum += v * v;
        if (ctx.state !== 'running' || Math.sqrt(sum / buf.length) > LOUD) m.piece.loud++; // (a meter the browser keeps suspended hears nothing: then every piece goes)
      }, 100);
    } catch { this.#meter = null; }
  }

  /** One piece: a fresh recorder (so each piece is a whole file), stopped after SEGMENT ms. */
  #piece() {
    if (!this.#track) return;
    let rec;
    try {
      const mimeType = TYPES.find((t) => MediaRecorder.isTypeSupported?.(t));
      rec = new MediaRecorder(new MediaStream([this.#track]), { ...(mimeType ? { mimeType } : {}), audioBitsPerSecond: BITRATE });
    } catch { this.#track = null; return; }
    const chunks = [], ctx = this.#ctx, began = Date.now(), count = { loud: 0 }, metered = !!this.#meter;
    if (metered) this.#meter.piece = count; // (the piece before keeps its own count: its onstop comes later)
    rec.ondataavailable = (e) => { if (e.data?.size) chunks.push(e.data); };
    rec.onstop = () => {
      const spoke = !metered || count.loud >= SPOKEN; // silence: nothing to keep
      if (chunks.length && spoke && Date.now() - began > 400) this.#send(new Blob(chunks, { type: rec.mimeType || chunks[0].type }), ctx);
    };
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
    if (this.#rec && this.#rec.state !== 'inactive') this.#rec.stop(); // (its onstop still reads the meter's count)
    this.#rec = null;
    const m = this.#meter;
    this.#meter = null;
    if (m) { clearInterval(m.timer); m.ctx.close?.().catch(() => {}); }
  }
}
