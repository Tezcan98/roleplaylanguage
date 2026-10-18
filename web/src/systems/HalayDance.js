/**
 * Saturday evening's wedding in the square (content/story.js d6-wedding): villagers dance the
 * halay in an arc in front of the fountain (entities/Behaviors.js `halay`), a drum beats while
 * you are in the square, and "Halaya katıl" puts you at the end of the line for a few rounds —
 * two steps right, one step left — then the quest is done (flag halay-done).
 */
const DANCE = 9;    // s in the line
const BEAT = 0.42;  // s between drum beats ("düm . tek tek")
const PATTERN = [1, 0, 0.6, 0.6];

export class HalayDance {
  #pop = null;
  #t = 0;
  #ac = null;
  #next = 0;
  #step = 0;
  #since = 0;

  constructor({ world, player, modes, toasts, vocab, effects, story, muted = () => false, volume = () => 1 }) {
    Object.assign(this, { world, player, modes, toasts, vocab, effects, story, muted, volume });
    this.active = false;
  }

  /** The wedding is on and you are there. */
  get wedding() { return this.story.chapter?.id === 'd6-wedding' && this.world.current?.id === 'village'; }

  join() {
    const loc = this.world.get('village'), a = loc?.anchors.get('halayJoin');
    if (!a || this.active) return;
    this.anchor = a; this.active = true; this.#t = 0; this.#since = performance.now();
    this.player.sit?.(false);
    this.player.place(a);
    this.player.dancing = true;
    this.#pop = this.modes.push('cut');
    this.toasts.show('Halay çekiyorsun! Sağa iki adım, sola bir adım…', 'You are dancing the halay! Two steps right, one step left…');
    for (const [tr, en] of [['halay', 'halay (a line dance)'], ['davul', 'drum'], ['zurna', 'zurna (a shrill folk pipe)']]) this.vocab.learn(tr, en);
  }

  update(dt, t) {
    if (this.active) {
      this.#t += dt;
      const a = this.anchor, rot = a.rot ?? 0;
      // two steps right, one left: a slow drift along the line that comes back
      const s = Math.sin(this.#t * 2.4) * 0.3 + Math.sin(this.#t * 0.8) * 0.15;
      this.player.position.x = a.x + Math.cos(rot) * s; this.player.position.z = a.z - Math.sin(rot) * s;
      this.player.turnTo(rot, 0.3);
      this.player.walk(t, 0.5);
      if (!this.player.hdOn && this.player.rig) this.player.rig.armL.rotation.x = this.player.rig.armR.rotation.x = -0.55;
      this.player.update(dt);
      if (performance.now() - this.#since >= DANCE * 1000) { // (wall-clock: slow frames don't stretch it)
        this.active = false; this.player.dancing = false;
        this.player.place(a);
        this.#pop?.(); this.#pop = null;
        this.toasts.show('Harika! Çok güzel halay çektin.', 'Great! You danced the halay beautifully.');
        this.effects.run(['flag:halay-done']);
      }
    }
    this.#drum();
  }

  /** The wedding drum: a low "düm" and lighter "tek"s, louder near the fountain. */
  #drum() {
    if (!this.wedding || this.muted() || document.hidden) return;
    const AC = window.AudioContext ?? window.webkitAudioContext;
    if (!AC) return;
    try {
      this.#ac ??= new AC();
      if (this.#ac.state === 'suspended') { this.#ac.resume().catch(() => {}); return; } // (after a tap)
      const now = this.#ac.currentTime, p = this.player.position;
      const vol = Math.max(0, 1 - Math.hypot(p.x, p.z) / 45) * 0.45 * this.volume();
      if (this.#next < now) this.#next = now + 0.05;
      while (this.#next < now + 0.15) {
        const w = PATTERN[this.#step++ % PATTERN.length];
        if (w && vol > 0.01) this.#hit(this.#next, w, vol);
        this.#next += BEAT;
      }
    } catch { /* no sound here */ }
  }

  #hit(time, weight, vol) {
    const ac = this.#ac, o = ac.createOscillator(), g = ac.createGain(), low = weight === 1;
    o.frequency.setValueAtTime(low ? 95 : 170, time);
    o.frequency.exponentialRampToValueAtTime(low ? 48 : 95, time + 0.12);
    g.gain.setValueAtTime(vol * weight, time);
    g.gain.exponentialRampToValueAtTime(0.001, time + (low ? 0.3 : 0.16));
    o.connect(g).connect(ac.destination);
    o.start(time); o.stop(time + 0.35);
  }
}
