/**
 * Ömer Baba's ney, made in the browser (no recording needed): a soft sine tone with a little
 * of the second and third harmonic, a lot of breath (band-passed noise around the note),
 * vibrato that grows as a note is held, glides between notes and a room echo. He plays a slow
 * improvisation (taksim) in makam Hicaz on D. The closer you are, the louder; he stops while
 * he is telling a story, and nothing runs while nobody can hear it.
 */
const D = 293.66;
// Hicaz on D: D Eb F# G A Bb C D' (+ the lower A and the upper Eb'), as ratios to D
const SCALE = [0.75, 0.84, 1, 1.0595, 1.26, 1.3348, 1.4983, 1.5874, 1.7818, 2, 2.119];
const TONIC = 2, DOMINANT = 6;
const HEAR = 22; // metres

export class NeyMusic {
  #ctx = null;
  #out = null;
  #voice = null;
  #next = 0;     // when the next note starts (audio time)
  #degree = TONIC;
  #phrase = 0;

  constructor({ world, player, cast, dialogue, modes, who = 'omerBaba' }) {
    Object.assign(this, { world, player, cast, dialogue, modes, who });
    // browsers start sound only after a tap / key press
    const unlock = () => { this.#ensure(); this.#ctx?.resume(); };
    addEventListener('pointerdown', unlock, { passive: true });
    addEventListener('keydown', unlock);
  }

  /** 0..1: how loud it is meant to be right now (also for tests). */
  get level() { return this.#level(); }

  #level() {
    if (this.world.current?.id !== 'village' || !this.modes.is('play') && !this.modes.is('dialogue')) return 0;
    const baba = this.cast.get(this.who);
    if (!baba?.visible || baba.location !== 'village') return 0;
    if (this.dialogue.talking === this.who) return 0; // he puts the ney down to tell a story
    const d = Math.hypot(baba.position.x - this.player.position.x, baba.position.z - this.player.position.z);
    return d > HEAR ? 0 : Math.min(1, (1 - d / HEAR) ** 2 * 1.4);
  }

  #ensure() {
    if (this.#ctx) return;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    const ctx = this.#ctx = new AC();
    this.#out = ctx.createGain(); this.#out.gain.value = 0;
    // room echo: a short decaying noise as the impulse response
    const len = ctx.sampleRate * 2.2, ir = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let c = 0; c < 2; c++) { const d = ir.getChannelData(c); for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len) ** 3; }
    const verb = ctx.createConvolver(); verb.buffer = ir;
    const wet = ctx.createGain(); wet.gain.value = 0.35;
    this.#out.connect(ctx.destination); this.#out.connect(verb); verb.connect(wet); wet.connect(ctx.destination);
    this.#voice = this.#makeVoice(ctx);
    this.#next = ctx.currentTime + 0.3;
  }

  /** One continuous ney voice: oscillators + breath, steered note by note. */
  #makeVoice(ctx) {
    const amp = ctx.createGain(); amp.gain.value = 0; amp.connect(this.#out);
    const tone = ctx.createGain(); tone.gain.value = 0.5; tone.connect(amp);
    const f = ctx.createConstantSource(); f.offset.value = D; // the pitch, shared by every partial
    const vib = ctx.createOscillator(); vib.frequency.value = 5.2;
    const vibDepth = ctx.createGain(); vibDepth.gain.value = 0; vib.connect(vibDepth);
    const partials = [[1, 0.8], [2, 0.12], [3, 0.05]].map(([k, g]) => {
      const o = ctx.createOscillator(); o.type = 'sine'; o.frequency.value = 0;
      const m = ctx.createGain(); m.gain.value = k; f.connect(m); m.connect(o.frequency);
      const vm = ctx.createGain(); vm.gain.value = k; vibDepth.connect(vm); vm.connect(o.frequency);
      const gg = ctx.createGain(); gg.gain.value = g; o.connect(gg); gg.connect(tone); o.start();
      return o;
    });
    // breath: noise through a band-pass that follows the note, and a little high air
    const n = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate), nd = n.getChannelData(0);
    for (let i = 0; i < nd.length; i++) nd[i] = Math.random() * 2 - 1;
    const noise = ctx.createBufferSource(); noise.buffer = n; noise.loop = true;
    const band = ctx.createBiquadFilter(); band.type = 'bandpass'; band.Q.value = 4; band.frequency.value = 0;
    const bm = ctx.createGain(); bm.gain.value = 1; f.connect(bm); bm.connect(band.frequency);
    const breath = ctx.createGain(); breath.gain.value = 0.55; noise.connect(band); band.connect(breath); breath.connect(amp);
    const air = ctx.createBiquadFilter(); air.type = 'highpass'; air.frequency.value = 3000;
    const airG = ctx.createGain(); airG.gain.value = 0.04; noise.connect(air); air.connect(airG); airG.connect(amp);
    f.start(); vib.start(); noise.start();
    return { amp, f, vibDepth, partials };
  }

  /** Next note of the improvisation: small steps, now and then a leap, phrases that come home to D or A. */
  #nextNote() {
    this.#phrase++;
    const end = this.#phrase % 7 === 0;
    if (end) { this.#degree = Math.random() < 0.6 ? TONIC : DOMINANT; return { degree: this.#degree, dur: 3.2 + Math.random() * 1.5, rest: 1.6 + Math.random() * 1.2 }; }
    const step = Math.random() < 0.15 ? (Math.random() < 0.5 ? -3 : 3) : Math.random() < 0.55 ? -1 : 1;
    this.#degree = Math.max(0, Math.min(SCALE.length - 1, this.#degree + step));
    return { degree: this.#degree, dur: 0.5 + Math.random() * 1.6, rest: Math.random() < 0.2 ? 0.35 : 0 };
  }

  update() {
    const level = this.#level();
    const ctx = this.#ctx;
    if (!ctx) return;
    this.#out.gain.setTargetAtTime(level * 0.32, ctx.currentTime, 0.3);
    if (level === 0) { if (ctx.state === 'running' && this.#out.gain.value < 0.002) ctx.suspend(); return; }
    if (ctx.state !== 'running') { ctx.resume(); this.#next = Math.max(this.#next, ctx.currentTime + 0.1); }
    const v = this.#voice, t = ctx.currentTime;
    if (t + 0.05 < this.#next) return;
    const { degree, dur, rest } = this.#nextNote();
    const freq = D * SCALE[degree], start = Math.max(t, this.#next);
    v.f.offset.setTargetAtTime(freq, start, 0.04); // a little glide into the note
    v.amp.gain.setTargetAtTime(1, start, 0.12); // breath swells in
    v.vibDepth.gain.setValueAtTime(0, start);
    v.vibDepth.gain.linearRampToValueAtTime(freq * 0.006, start + Math.min(dur, 1.4)); // vibrato grows on long notes
    if (rest) v.amp.gain.setTargetAtTime(0, start + dur, 0.18);
    this.#next = start + dur + rest;
  }
}
