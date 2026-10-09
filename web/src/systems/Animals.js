import * as THREE from 'three';
import { gloss } from '../i18n/Gloss.js';

/**
 * Farm animals (Quaternius "Farm Animals", CC0 — assets/models/animal_*.glb): a cow and sheep
 * grazing in the yard, and horses tied up on the village square that you can
 * ride (others see you on horseback). Animals wander a little round their spot; going near one
 * offers to pet it (its name: "inek · cow"), near a free horse "Ata bin", on one "Attan in".
 */
export const HERD = [
  { kind: 'cow', where: 'yard', x: 14, z: -10, rot: -2.2, roam: 4 },
  { kind: 'sheep', where: 'yard', x: -13.5, z: 14.5, rot: 0.6, roam: 0 },
  { kind: 'sheep', where: 'yard', x: -11.6, z: 15.8, rot: 2.4, roam: 0 },
  { kind: 'sheep', where: 'yard', x: -12.2, z: 13.2, rot: -1.2, roam: 0 },
  // the hitching post on the square, by the north fence between the library and the coffeehouse
  { kind: 'horse', where: 'village', x: -1, z: -25.5, rot: 0, ride: true },
  { kind: 'horse', where: 'village', x: 2.2, z: -25.5, rot: 0, ride: true },
  { kind: 'horse', where: 'village', x: 5.4, z: -25.5, rot: 0, ride: true },
];

/**
 * Height (m) and words of each kind; `seat`: the height of the back, where a rider sits (horses);
 * `pace`: the speed (m/s) each clip was made for — played faster or slower to match the real speed.
 */
const KINDS = {
  horse: { height: 1.8, tr: 'at', en: 'horse', pet: 'Atı sev', seat: 1.28, pace: { walk: 1.0, run: 4.2 } },
  cow: { height: 1.5, tr: 'inek', en: 'cow', pet: 'İneği sev' },
  sheep: { height: 0.95, tr: 'koyun', en: 'sheep', pet: 'Koyunu sev' },
  dog: { height: 0.65, tr: 'köpek', en: 'dog', pet: 'Köpeği sev' },
};
const RIDE_SPEED = 1.9; // × walking speed on horseback
/** Credits for a ride (paid when you get on; you ride as long as you like). */
export const RIDE_PRICE = 3;

const dist = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);

export class Animals {
  #list = [];

  constructor({ world, models, player, labels, toasts, vocab, clock, wallet, onShop }) {
    Object.assign(this, { world, models, player, labels, toasts, vocab, clock, wallet, onShop });
  }

  /** Loads and places every animal (the game runs on while they load). */
  async build() {
    await Promise.all(HERD.map(async (def) => {
      const loc = this.world.get(def.where);
      if (!loc) return;
      const a = await this.#make(def.kind);
      if (!a) return;
      Object.assign(a, { def, home: { x: def.x, z: def.z }, target: null, wait: 2 + Math.random() * 4, rider: null });
      a.group.position.set(def.x, 0, def.z); a.group.rotation.y = def.rot;
      loc.group.add(a.group);
      loc.animated.push((dt) => this.#tick(a, dt));
      this.#list.push(a);
    }));
  }

  /** A posed, animated animal of this kind: { group, play(name), update(dt), seat } (null if the model is missing). */
  async #make(kind) {
    const key = `animal.${kind}`;
    if (!this.models?.has(key)) return null;
    let gltf;
    try { gltf = await this.models.load(key); } catch { return null; }
    const { scene, animations } = gltf;
    const mixer = new THREE.AnimationMixer(scene), clips = {};
    animations.forEach((c) => { clips[c.name] = mixer.clipAction(c); });
    clips.idle?.play(); mixer.update(0); scene.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(scene, true), size = box.getSize(new THREE.Vector3());
    scene.scale.multiplyScalar(KINDS[kind].height / size.y);
    if (size.x > size.z) scene.rotation.y = Math.PI / 2; // the models face along x: turn them to face +z like everyone else
    scene.traverse((o) => { if (o.isMesh) { o.castShadow = true; for (const m of [o.material].flat()) { m.metalness = 0; m.roughness = 0.85; } } });
    const group = new THREE.Group(); group.add(scene);
    let current = 'idle';
    const pace = KINDS[kind].pace ?? {};
    const play = (name, speed) => { // `speed` (m/s): the legs keep up with it
      if (clips[name] && pace[name] && speed != null) clips[name].timeScale = Math.min(2.6, Math.max(0.6, speed / pace[name]));
      if (!clips[name] || name === current) return;
      clips[current]?.fadeOut(0.25); clips[name].reset().fadeIn(0.25).play(); current = name;
    };
    return { kind, group, play, update: (dt) => mixer.update(dt), seat: KINDS[kind].seat ?? 0 };
  }

  /** A horse for another player who rides in the square (RemotePlayers). */
  mount() { return this.#make('horse'); }

  /** Grazing: stand a while, walk a few steps somewhere near home, stand again. A horse left somewhere walks back to its post. */
  #tick(a, dt) {
    if (a.rider) return; // the rider's character moves and animates it
    const g = a.group.position, home = a.home;
    const away = dist(g, home);
    if (!a.target && (a.def.roam || away > 0.3)) {
      a.wait -= dt;
      if (a.wait <= 0 || away > 0.3) {
        const r = a.def.roam || 0;
        a.target = away > Math.max(0.3, r) ? { ...home } : { x: home.x + (Math.random() * 2 - 1) * r, z: home.z + (Math.random() * 2 - 1) * r };
      }
    }
    if (a.target) {
      const dx = a.target.x - g.x, dz = a.target.z - g.z, d = Math.hypot(dx, dz);
      if (d < 0.15) { a.target = null; a.wait = 4 + Math.random() * 6; a.play('idle'); if (dist(g, home) < 0.2 && a.def.ride) a.group.rotation.y = a.def.rot; }
      else {
        const step = Math.min(d, 1.0 * dt);
        g.x += dx / d * step; g.z += dz / d * step;
        a.group.rotation.y += wrap(Math.atan2(dx, dz) - a.group.rotation.y) * Math.min(1, dt * 4);
        a.play('walk', 1.0);
      }
    }
    a.update(dt);
  }

  /** Interaction provider: get off, get on a free horse, or pet an animal. */
  find(pos) {
    const p = this.player;
    if (p.mount) return p.mount.kind === 'horse' ? { label: 'Attan in', dist: 0, priority: 3, run: () => this.dismount() } : null;
    const here = this.world.current?.id;
    let best = null;
    for (const a of this.#list) {
      if (a.def.where !== here || a.rider) continue;
      const d = dist(a.group.position, pos);
      if (d < (a.kind === 'horse' ? 2.4 : 2) && (!best || d < best.d)) best = { a, d };
    }
    if (!best) return null;
    const { a, d } = best, k = KINDS[a.kind];
    if (a.def.ride) return { label: `Ata bin · 🪙 ${RIDE_PRICE}`, dist: d, priority: 1, run: () => this.ride(a) };
    return { label: k.pet, dist: d, priority: 0, run: () => this.pet(a) };
  }

  pet(a) {
    const k = KINDS[a.kind];
    this.vocab.learn(k.tr, k.en);
    this.toasts.show(`${k.tr} = ${gloss(k.en)}`, gloss(k.en));
    this.labels.think(`${capital(k.tr)} ne kadar sevimli!`, 2.5, this.clock());
  }

  ride(a) {
    const p = this.player;
    if (this.wallet && !this.wallet.trySpend(RIDE_PRICE)) { // not enough credits: the shop
      this.toasts.show(`Ata binmek ${RIDE_PRICE} kredi. Kredin yetmiyor.`, gloss('A ride costs credits. Get some in the shop.'));
      this.onShop?.();
      return;
    }
    if (p.seated) p.sit(false);
    a.rider = p;
    a.play('idle');
    p.setMount(a);
    this.vocab.learn('at', 'horse'); this.vocab.learn('ata binmek', 'to ride a horse');
    this.toasts.show('Ata bindin! Gezmek için yürü.', gloss('You are on horseback! Walk to ride around.'));
  }

  dismount() {
    const p = this.player, a = this.#list.find((x) => x.rider === p);
    p.setMount(null);
    if (!a) return;
    a.rider = null; a.target = null; a.wait = 6; // stands a moment, then walks back to its post
    // the rider steps down beside the horse
    const r = a.group.rotation.y;
    p.position.x = a.group.position.x + Math.cos(r) * 1.0; p.position.z = a.group.position.z - Math.sin(r) * 1.0;
    this.vocab.learn('attan inmek', 'to get off a horse');
  }

  /** Leaving the place on horseback: the horse stays (back at its post). */
  leftPlace() {
    const a = this.#list.find((x) => x.rider === this.player);
    if (!a) return;
    this.player.setMount(null);
    a.rider = null; a.group.position.set(a.home.x, 0, a.home.z); a.group.rotation.y = a.def.rot; a.play('idle');
  }

  static get rideSpeed() { return RIDE_SPEED; }
}

const wrap = (x) => Math.atan2(Math.sin(x), Math.cos(x));
const capital = (s) => s.charAt(0).toLocaleUpperCase('tr-TR') + s.slice(1);
