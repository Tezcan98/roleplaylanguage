import { sitPose } from '../entities/Behaviors.js';

const HIP = 0.8, SIT = 0.38; // the rig's hip height and how far the sitting pose lowers it (× the body's scale)
const CLIMB = 1.1, SLIDE = 1.3; // s up the ladder, s down the chute

/**
 * The player on the park's toys (world/locations/VillageSquare.js PARK): swing on the free swing,
 * go down the slide, rock on the seesaw. Walking off (the stick) ends the swing and the seesaw;
 * the slide plays through by itself. Each teaches its words the first time.
 */
export class ParkPlay {
  #on = null;   // 'swing' | 'seesaw' | 'slide'
  #t0 = 0;    // when it started (wall clock: the same speed on a slow phone)
  #t = 0;

  constructor({ world, player, vocab, toasts, labels }) {
    Object.assign(this, { world, player, vocab, toasts, labels });
  }

  get #park() { return this.world.get('village'); }
  get busy() { return !!this.#on; }
  #hips() { return (HIP - SIT) * (this.player.group.scale.y || 1); }

  swing() {
    const sw = this.#park.swings?.[1];
    if (!sw || this.#on) return;
    this.player.place({ x: sw.x, z: sw.z, rot: 0 });
    this.player.sit(true);
    this.#on = 'swing'; this.#t0 = performance.now();
    this.#learn([['salıncak', 'swing'], ['sallanmak', 'to swing']]);
    this.toasts.show('Salıncakta sallanıyorsun! İnmek için yürü.', 'You are swinging! Walk to get off.');
  }

  seesaw() {
    const s = this.#park.seesaw;
    if (!s || this.#on) return;
    this.player.place({ x: s.x - s.arm, z: s.z, rot: Math.PI / 2 });
    this.player.sit(true);
    this.#on = 'seesaw'; this.#t0 = performance.now();
    this.#learn([['tahterevalli', 'seesaw'], ['yukarı', 'up'], ['aşağı', 'down']]);
    this.toasts.show('Tahterevallidesin: bir yukarı, bir aşağı! İnmek için yürü.', 'On the seesaw: up and down! Walk to get off.');
  }

  slide() {
    const s = this.#park.slide;
    if (!s || this.#on) return;
    this.player.sit(false);
    this.player.setPosed(true);
    this.player.place({ x: s.x, z: s.ladderZ, rot: 0 });
    this.#on = 'slide'; this.#t0 = performance.now();
    this.#learn([['kaydırak', 'slide'], ['kaymak', 'to slide']]);
  }

  #learn(words) { words.forEach(([tr, en]) => this.vocab?.learn(tr, en)); }

  update() {
    if (!this.#on) return;
    const p = this.player, P = p.position, park = this.#park;
    if (this.world.current !== park) { this.#stop(); return; }
    this.#t = (performance.now() - this.#t0) / 1000;
    if (this.#on === 'swing' || this.#on === 'seesaw') {
      if (!p.seated) { this.#stop(); return; } // walked off (PlayerController stands the player up)
      if (this.#on === 'swing') {
        const sw = park.swings[1];
        sw.seen = performance.now() / 1000; sw.stop = false; // the park swings it while it is taken
        P.set(sw.x, sw.y - Math.cos(sw.angle) * sw.len - this.#hips() + 0.05, sw.z - Math.sin(sw.angle) * sw.len);
        p.rig.legL.rotation.x = p.rig.legR.rotation.x = -Math.PI / 2 - sw.angle * 0.9; // legs out on the way up
      } else {
        const s = park.seesaw, a = s.rest * Math.cos(this.#t * 2.2); // starts down, goes up, comes down…
        s.plank.rotation.z = a;
        P.set(s.x - s.arm * Math.cos(a), s.y + 0.06 + s.arm * -Math.sin(a) - this.#hips(), s.z);
      }
      return;
    }
    // the slide: up the ladder, then sitting down the chute, then off at the bottom
    const s = park.slide, r = p.rig;
    if (this.#t < CLIMB) {
      const k = this.#t / CLIMB;
      P.set(s.x, s.h * k, s.ladderZ + (s.topZ - s.ladderZ) * k);
      r.legL.rotation.x = Math.sin(this.#t * 12) * 0.6; r.legR.rotation.x = -r.legL.rotation.x;
      r.armL.rotation.x = r.armR.rotation.x = -2.4;
    } else if (this.#t < CLIMB + SLIDE) {
      const k = (this.#t - CLIMB) / SLIDE, e = k * k * (3 - 2 * k); // slow at the top, fast in the middle, easing off
      sitPose(SIT)(r); r.armL.rotation.x = r.armR.rotation.x = -2.6;
      P.set(s.x, s.h * (1 - e) + (1 - e) * 0.05 - this.#hips() * 0.2, s.topZ + (s.bottomZ - s.topZ) * e);
    } else {
      p.setPosed(false);
      P.set(s.x, 0, s.bottomZ + 0.6);
      this.#on = null;
      this.toasts.show('Vııın! Kaydıraktan kaydın!', 'Whee! You went down the slide!');
    }
  }

  #stop() {
    const park = this.#park;
    if (this.#on === 'seesaw' && park.seesaw) park.seesaw.plank.rotation.z = park.seesaw.rest;
    if (this.#on === 'slide') this.player.setPosed(false);
    if (this.player.seated) this.player.sit(false);
    this.player.position.y = 0;
    this.#on = null;
  }
}
