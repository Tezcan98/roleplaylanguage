/**
 * Background music of each outdoor place (assets/audio, CC0 tracks: assets/audio/CREDITS.md):
 * the yard, the schoolyard, the village square. It fades from one place's tune to the next, and
 * stays low under talk — a conversation, a voice chat, a book read aloud (`duck()`: 0–1, how much
 * of it is left). Indoors (the house, the classroom) it is quiet. Off with "Müzik" in the settings.
 * The volume goes through Web Audio where there is one (iPhones ignore an audio element's volume).
 * The game in the background (another app, the screen off): silent at once — the fades run in the
 * frame loop, which the browser stops there, so they would never get to zero.
 */
const TRACKS = { yard: 'assets/audio/bahce.mp3', schoolyard: 'assets/audio/okul.mp3', village: 'assets/audio/meydan.mp3' };
const VOLUME = 0.32;

export class BackgroundMusic {
  #tracks = new Map(); // src → { audio, gain, level }
  #ctx = null;
  #away = false; // the Android app went to the background (its 'pause' event; a page has document.hidden)

  /** `volume()`: 0–1 from the settings ("Müzik" × "Ses"). */
  constructor({ world, muted = () => false, duck = () => 1, tracks = TRACKS, volume = () => 1 }) {
    Object.assign(this, { world, muted, duck, tracks, volume });
    // browsers start sound only after a tap / key press
    const unlock = () => { this.#ctx?.resume?.().catch(() => {}); this.#want(); };
    addEventListener('pointerdown', unlock, { passive: true });
    addEventListener('keydown', unlock);
    document.addEventListener('visibilitychange', () => (document.hidden ? this.#silence() : this.#back()));
    document.addEventListener('pause', () => { this.#away = true; this.#silence(); }); // (Capacitor: the app in the background)
    document.addEventListener('resume', () => { this.#away = false; this.#back(); });
  }

  /** In the background: every track stops now (back in front, `update` fades the right one in again). */
  #silence() {
    for (const t of this.#tracks.values()) {
      t.level = 0;
      if (t.gain) t.gain.gain.value = 0; else t.audio.volume = 0;
      if (!t.audio.paused) t.audio.pause();
    }
    this.#ctx?.suspend?.().catch(() => {});
  }

  #back() { if (!document.hidden && !this.#away) this.#ctx?.resume?.().catch(() => {}); }

  /** The track meant to play here now (or null). */
  get current() { return document.hidden || this.#away || this.muted() ? null : this.tracks[this.world.current?.id] ?? null; }

  /** 0..1 per track (tests). */
  levels() { return Object.fromEntries([...this.#tracks].map(([src, t]) => [src, t.level])); }

  #want() {
    const src = this.current;
    if (!src) return;
    let t = this.#tracks.get(src);
    if (!t) {
      const audio = new Audio(src);
      audio.loop = true; audio.preload = 'auto'; audio.crossOrigin = 'anonymous';
      t = { audio, gain: null, level: 0, missing: false };
      audio.addEventListener('error', () => { t.missing = true; });
      const AC = window.AudioContext ?? window.webkitAudioContext;
      try {
        if (AC) {
          this.#ctx ??= new AC();
          t.gain = this.#ctx.createGain(); t.gain.gain.value = 0;
          this.#ctx.createMediaElementSource(audio).connect(t.gain).connect(this.#ctx.destination);
        } else audio.volume = 0;
      } catch { t.gain = null; audio.volume = 0; }
      this.#tracks.set(src, t);
    }
    if (!t.missing && t.audio.paused) t.audio.play().catch(() => {}); // needs a tap first; the next one will do
  }

  update(dt) {
    const src = this.current, duck = src ? Math.max(0, Math.min(1, this.duck())) : 0;
    if (src) this.#want();
    for (const [key, t] of this.#tracks) {
      const target = key === src ? VOLUME * duck * Math.max(0, Math.min(1, this.volume())) : 0;
      t.level += (target - t.level) * Math.min(1, dt * (target > t.level ? 0.8 : 1.6)); // in slowly, out a little faster
      if (t.gain) t.gain.gain.value = t.level; else t.audio.volume = Math.max(0, Math.min(1, t.level));
      if (key !== src && t.level < 0.005 && !t.audio.paused) t.audio.pause();
    }
  }
}
