import * as THREE from 'three';
import { YAKAR } from '../world/locations/SchoolYard.js';

const THROWS = 8;     // balls thrown in a game
const LIVES = 3;      // hits you can take
const READY = 1.6;    // s before the first ball
const GAP = [2.1, 1.5]; // s between throws: first game's pace → the last throw's
const FLIGHT = [1.15, 0.85]; // s in the air, likewise
const HAND = 1.3, HIT = 0.9;  // the throwers' hand height; how near the marker you must stay to be hit
const NAMES = ['yakarElif', 'yakarCan', 'yakarZehra'];

/**
 * Dodgeball (yakar top) in the schoolyard's chalk circle (world/locations/SchoolYard.js #yakarCircle):
 * you stand in the middle, Elif, Can and Zehra throw eight balls at you one after another. A red
 * marker shows where each lands; step out of it in time. Three hits and you are out (try again);
 * leaving the circle ends the game. Surviving sets the flag `yakartop-done` (the story's quest).
 */
export class YakarTop {
  #on = false;
  #t = 0;       // s since the start
  #n = 0;       // balls thrown so far
  #next = 0;    // when the next one flies
  #lives = LIVES;
  #shot = null; // the ball in the air: { from, to, t, T }
  #ball = null;
  #mark = null;
  #tick = 0;    // wall clock of the last frame (a slow phone doesn't stretch the game)
  #last = new THREE.Vector3();
  #vel = new THREE.Vector3();

  constructor({ world, player, vocab, toasts, effects }) {
    Object.assign(this, { world, player, vocab, toasts, effects });
  }

  get #yard() { return this.world.get('schoolyard'); }
  get active() { return this.#on; }

  start() {
    if (this.#on || this.world.current !== this.#yard || this.player.seated) return;
    const { x, z } = YAKAR;
    this.#build();
    this.player.place({ x, z, rot: Math.PI });
    this.#on = true; this.#t = 0; this.#n = 0; this.#next = READY; this.#lives = LIVES; this.#shot = null;
    this.#last.copy(this.player.position); this.#vel.set(0, 0, 0); this.#tick = performance.now();
    [['yakar top', 'dodgeball'], ['kaçmak', 'to dodge'], ['yanmak', 'to be out (in the game)'], ['top', 'ball']].forEach(([tr, en]) => this.vocab?.learn(tr, en));
    this.toasts.show('Yakar top! Ortadasın: kırmızı işaretten kaç!', 'Dodgeball! You are in the middle: dodge the red mark!');
  }

  update() {
    if (!this.#on) return;
    const now = performance.now(), dt = Math.min((now - this.#tick) / 1000, 0.5);
    this.#tick = now;
    if (dt <= 0) return;
    const p = this.player.position, { x, z, r } = YAKAR;
    if (this.world.current !== this.#yard) { this.#end(); return; }
    this.#t += dt;
    // where you are heading (the throwers aim a little ahead)
    const k = Math.min(1, dt * 8);
    this.#vel.x += ((p.x - this.#last.x) / dt - this.#vel.x) * k;
    this.#vel.z += ((p.z - this.#last.z) / dt - this.#vel.z) * k;
    this.#last.copy(p);
    if (Math.hypot(p.x - x, p.z - z) > r + 0.6) {
      this.toasts.show('Daireden çıktın, oyun bitti. Tekrar dene!', 'You left the circle, game over. Try again!');
      this.#end(); return;
    }
    if (!this.#shot && this.#n < THROWS && this.#t >= this.#next) this.#throw();
    if (this.#shot) this.#fly(dt);
  }

  #throw() {
    const a = this.#yard.anchors.get(NAMES[this.#n % NAMES.length]);
    const f = this.#n / (THROWS - 1), lerp = (v) => v[0] + (v[1] - v[0]) * f;
    const T = lerp(FLIGHT), p = this.player.position, c = YAKAR;
    // aim at where you will be, kept inside the circle
    let tx = p.x + this.#vel.x * T * 0.6, tz = p.z + this.#vel.z * T * 0.6;
    const d = Math.hypot(tx - c.x, tz - c.z);
    if (d > c.r) { tx = c.x + (tx - c.x) * c.r / d; tz = c.z + (tz - c.z) * c.r / d; }
    this.#shot = { from: new THREE.Vector3(a.x, HAND, a.z), to: new THREE.Vector3(tx, 0.25, tz), t: 0, T };
    this.#next = this.#t + lerp(GAP);
    this.#n++;
    this.#mark.position.set(tx, 0.045, tz); this.#mark.visible = true;
    this.#ball.visible = true;
  }

  #fly(dt) {
    const s = this.#shot;
    s.t += dt;
    const k = Math.min(1, s.t / s.T);
    this.#ball.position.lerpVectors(s.from, s.to, k);
    this.#ball.position.y += Math.sin(Math.PI * k) * 0.9; // a lob
    this.#mark.scale.setScalar(1.15 - k * 0.3);
    if (k < 1) return;
    this.#ball.visible = false; this.#mark.visible = false;
    const p = this.player.position;
    const hit = Math.hypot(p.x - s.to.x, p.z - s.to.z) < HIT;
    this.#shot = null;
    if (hit) this.#lives--;
    const hearts = '❤️'.repeat(this.#lives) + '🖤'.repeat(LIVES - this.#lives);
    if (this.#lives <= 0) {
      this.toasts.show(`Yandın! ${hearts} Oyun bitti, tekrar dene.`, 'You are out! Game over, try again.');
      this.#end(); return;
    }
    if (this.#n >= THROWS) { this.#win(); return; }
    this.toasts.show(hit ? `Yandın! ${hearts}` : `Kaçtın! ${hearts}`, hit ? 'Hit!' : 'You dodged it!');
  }

  #win() {
    this.toasts.show('Aferin! Oyunu kazandın, çok iyi kaçtın!', 'Well done! You dodged them all!');
    this.#end();
    this.effects.run(['flag:yakartop-done']);
  }

  #end() {
    this.#on = false; this.#shot = null;
    if (this.#ball) this.#ball.visible = false;
    if (this.#mark) this.#mark.visible = false;
  }

  /** The ball and the red landing mark (made once, in the schoolyard). */
  #build() {
    if (this.#ball) return;
    this.#ball = new THREE.Mesh(new THREE.SphereGeometry(0.22, 14, 10), new THREE.MeshBasicMaterial({ color: 0xE53935 }));
    this.#mark = new THREE.Mesh(new THREE.CircleGeometry(HIT, 28).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0xE53935, transparent: true, opacity: 0.4, depthWrite: false }));
    this.#ball.visible = this.#mark.visible = false;
    this.#yard.add(this.#ball); this.#yard.add(this.#mark);
  }
}
