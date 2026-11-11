import * as THREE from 'three';
import { EV } from '../core/events.js';

/**
 * A big task is a thing done (finished by a flag: a lesson, homework, a tale, a goal, a ride, a game
 * of chess…) or the one that ends a chapter; `big: true / false` on a quest decides it by hand.
 * "Say good morning to mom" or sweeping the room are not.
 */
export const isBigQuest = (q) => q?.big ?? (!!q?.complete?.flag || !!q?.after?.includes('chapter'));

const NOTES = [784, 1047, 1319, 1568]; // G5 C6 E6 G6: a short rising chime

/**
 * When a big task is done: a chime (synthesised, no file; the master sound level) and a flash of
 * gold light on the player — a ring spreading on the ground, a column of light and sparks rising.
 */
export class QuestCelebration {
  #audio = null;

  /** `level()`: the master sound level 0…1 (⚙️ Ses). */
  constructor({ bus, player, level = () => 1 }) {
    Object.assign(this, { player, level });
    bus.on(EV.QUEST_DONE, ({ quest }) => { if (isBigQuest(quest)) this.celebrate(); });
  }

  celebrate() {
    this.chime();
    this.flash();
  }

  chime() {
    const vol = this.level();
    if (vol <= 0) return;
    try {
      const ctx = (this.#audio ??= new (window.AudioContext || window.webkitAudioContext)());
      if (ctx.state === 'suspended') ctx.resume();
      const out = ctx.createGain();
      out.gain.value = 0.16 * vol;
      out.connect(ctx.destination);
      NOTES.forEach((f, i) => {
        const t = ctx.currentTime + i * 0.075, len = i === NOTES.length - 1 ? 1.1 : 0.45;
        for (const [type, mul, amp] of [['sine', 1, 1], ['triangle', 2, 0.18]]) { // a bell: the note and a little of its octave
          const o = ctx.createOscillator(), g = ctx.createGain();
          o.type = type; o.frequency.value = f * mul;
          g.gain.setValueAtTime(0.0001, t);
          g.gain.exponentialRampToValueAtTime(amp, t + 0.012);
          g.gain.exponentialRampToValueAtTime(0.0001, t + len);
          o.connect(g).connect(out);
          o.start(t); o.stop(t + len + 0.05);
        }
      });
    } catch { /* no Web Audio: just the light */ }
  }

  /** The light, for a second: added to the player, gone by itself. */
  flash() {
    const g = new THREE.Group(), add = (m) => { g.add(m); return m; };
    const mat = (color, opacity) => new THREE.MeshBasicMaterial({ color, transparent: true, opacity, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide });
    const ring = add(new THREE.Mesh(new THREE.RingGeometry(0.42, 0.6, 48), mat(0xFFC83D, 0.95)));
    ring.rotation.x = -Math.PI / 2; ring.position.y = 0.06;
    const column = add(new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.55, 2.4, 24, 1, true), mat(0xFFC94D, 0.28)));
    column.position.y = 1.2;
    const N = 18, pos = new Float32Array(N * 3), sparks = [];
    for (let i = 0; i < N; i++) sparks.push({ a: (i / N) * Math.PI * 2 + Math.random() * 0.3, v: 1.2 + Math.random() * 1.4, r: 0.25 + Math.random() * 0.2 });
    const pg = new THREE.BufferGeometry(); pg.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const points = add(new THREE.Points(pg, new THREE.PointsMaterial({ color: 0xFFF1A8, size: 0.09, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending })));
    g.scale.setScalar(1 / (this.player.group.scale.x || 1)); // the same size on a child
    this.player.group.add(g);
    const T = 1.1, t0 = performance.now();
    let gone = false;
    const done = () => { if (gone) return; gone = true; g.removeFromParent(); g.traverse((o) => { o.geometry?.dispose(); o.material?.dispose(); }); };
    setTimeout(done, (T + 0.6) * 1000); // (no frames in the background: it goes anyway)
    const step = (now) => {
      if (gone) return;
      const t = Math.min(1, (now - t0) / 1000 / T), fade = 1 - t;
      ring.scale.setScalar(1 + t * 2.2); ring.material.opacity = 0.95 * fade;
      column.scale.set(1 - t * 0.5, 0.6 + t * 0.6, 1 - t * 0.5); column.material.opacity = 0.28 * fade * fade; // (light: the player stays seen through it)
      sparks.forEach((s, i) => pos.set([Math.cos(s.a) * (s.r + t * 0.6), 0.2 + s.v * t * 1.4, Math.sin(s.a) * (s.r + t * 0.6)], i * 3));
      pg.attributes.position.needsUpdate = true; points.material.opacity = fade;
      if (t < 1) requestAnimationFrame(step); else done();
    };
    requestAnimationFrame(step);
  }
}
