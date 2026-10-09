/**
 * A ney taksim playing softly in the background of Aslan Bey's open library: a real recording
 * (assets/audio/ney.mp3, looped), louder the closer you are, silent elsewhere. Without the file
 * nothing plays.
 */
const HEAR = 14;     // metres from the library's middle
const VOLUME = 0.55; // at the very middle

export class NeyMusic {
  #audio = null;
  #missing = false;

  /** @param {{ place: { location: string, x: number, z: number }, src?: string }} o */
  constructor({ world, player, place, src = 'assets/audio/ney.mp3', muted = () => false }) {
    Object.assign(this, { world, player, place, src, muted });
    // browsers start sound only after a tap / key press
    const unlock = () => { if (this.level > 0 && !this.muted()) this.#play(); };
    addEventListener('pointerdown', unlock, { passive: true });
    addEventListener('keydown', unlock);
  }

  /** 0..1: how loud it is meant to be right now (also for tests). */
  get level() {
    const { place } = this, p = this.player.position;
    if (this.world.current?.id !== place.location || document.hidden) return 0;
    const d = Math.hypot(place.x - p.x, place.z - p.z);
    return d > HEAR ? 0 : Math.min(1, (1 - d / HEAR) ** 2 * 1.6);
  }

  #play() {
    if (this.#missing) return;
    if (!this.#audio) {
      const a = this.#audio = new Audio(this.src);
      a.loop = true; a.volume = 0; a.preload = 'auto';
      a.addEventListener('error', () => { this.#missing = true; this.#audio = null; });
    }
    if (this.#audio.paused) this.#audio.play().catch(() => {}); // needs a tap first; the next one will do
  }

  update(dt) {
    const level = this.muted() ? 0 : this.level; // music off in the settings: it fades out
    if (level > 0) this.#play();
    const a = this.#audio;
    if (!a) return;
    const target = level * VOLUME;
    a.volume = Math.max(0, Math.min(1, a.volume + (target - a.volume) * Math.min(1, dt * 2))); // fade in / out
    if (level === 0 && a.volume < 0.01 && !a.paused) a.pause();
  }
}
