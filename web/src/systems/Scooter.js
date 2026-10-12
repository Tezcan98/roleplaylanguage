import * as THREE from 'three';
import { gloss } from '../i18n/Gloss.js';

/**
 * Scooters at a stand on the village square: free to ride, standing on the deck, a little faster
 * than walking. Others see you on one (VillageMultiplayer sends `ride: 'scooter'`). Getting off
 * leaves it where it is; leaving the square puts it back at the stand.
 */
const STAND = { where: 'village', z: -8.2, xs: [-13, -12, -11], rot: 0 };
const COLOURS = [0xE4574A, 0x2F6FDB, 0x3E8E4A];
const WHEEL = 0.085;

/** A kick scooter facing +z (shared with RemotePlayers for the others' rides). */
export function scooterMesh(mf, colour = COLOURS[0]) {
  const group = new THREE.Group(), dark = 0x2B2B2B, metal = { tex: 'metal' };
  const wheels = [0.32, -0.32].map((z) => {
    const w = mf.cyl(WHEEL, WHEEL, 0.05, dark, 12); w.rotation.z = Math.PI / 2; w.position.set(0, WHEEL, z); group.add(w); return w;
  });
  group.add(mf.at(mf.box(0.15, 0.04, 0.72, colour), 0, WHEEL + 0.05, 0)); // the deck
  group.add(mf.at(mf.box(0.13, 0.012, 0.6, dark), 0, WHEEL + 0.075, -0.03)); // grip tape
  const stem = mf.cyl(0.02, 0.02, 0.9, metal, 8); stem.position.set(0, WHEEL + 0.47, 0.33); stem.rotation.x = -0.12; group.add(stem);
  const bar = mf.cyl(0.016, 0.016, 0.44, metal, 8); bar.rotation.z = Math.PI / 2; bar.position.set(0, 0.97, 0.39); group.add(bar);
  [-0.21, 0.21].forEach((x) => { const g = mf.cyl(0.022, 0.022, 0.09, dark, 8); g.rotation.z = Math.PI / 2; g.position.set(x, 0.97, 0.39); group.add(g); });
  return { group, wheels };
}

/** A scooter to ride (`setMount`): standing on the deck, hands on the grips, wheels turning with the speed. */
export function scooterMount(mf, colour = COLOURS[0]) {
  const { group, wheels } = scooterMesh(mf, colour);
  let spin = 0;
  return {
    kind: 'scooter', group, seat: WHEEL + 0.07, stand: true, speed: 1.6,
    hands: [new THREE.Vector3(0.21, 0.97, 0.39), new THREE.Vector3(-0.21, 0.97, 0.39)], // on the grips (left, right)
    play: (name, v = 0) => { spin = v; },
    update: (dt) => wheels.forEach((w) => { w.rotation.x += spin * dt / WHEEL; }),
  };
}

export class Scooters {
  #list = [];

  constructor({ world, mf, player, toasts, vocab }) { Object.assign(this, { world, mf, player, toasts, vocab }); }

  build() {
    const loc = this.world.get(STAND.where);
    if (!loc) return;
    // a little stand with a sign
    loc.group.add(this.mf.at(this.mf.box(3.4, 0.08, 1.0, 0x6B4F3A), -12, 0.04, STAND.z));
    STAND.xs.forEach((x, i) => {
      const mount = scooterMount(this.mf, COLOURS[i % COLOURS.length]);
      mount.home = { x, z: STAND.z };
      this.#home(mount);
      loc.group.add(mount.group);
      this.#list.push(mount);
    });
  }

  #home(m) { m.group.position.set(m.home.x, 0, m.home.z); m.group.rotation.set(0, STAND.rot, 0); }

  /** Interaction provider: get off, or get on a free scooter on the square. */
  find(pos) {
    const p = this.player;
    if (p.mount?.kind === 'scooter') return { label: 'Scooter\'dan in', dist: 0, priority: 3, run: () => this.getOff() };
    if (p.mount || this.world.current?.id !== STAND.where) return null;
    let best = null;
    for (const m of this.#list) {
      const d = Math.hypot(m.group.position.x - pos.x, m.group.position.z - pos.z);
      if (d < 1.4 && (!best || d < best.d)) best = { m, d };
    }
    return best && { label: 'Scooter\'a bin', dist: best.d, priority: 1, run: () => this.getOn(best.m) };
  }

  getOn(m) {
    const p = this.player;
    if (p.seated) p.sit(false);
    p.position.x = m.group.position.x; p.position.z = m.group.position.z; p.group.rotation.y = m.group.rotation.y;
    p.setMount(m);
    this.vocab.learn('scooter', 'kick scooter'); this.vocab.learn('binmek', 'to get on, to ride');
    this.toasts.show('Scooter\'a bindin! Gezmek için yürü.', gloss('You are on a scooter! Walk to ride around.'));
  }

  getOff() {
    const p = this.player, m = p.mount, r = m.group.rotation.y;
    p.setMount(null);
    p.position.x = m.group.position.x + Math.cos(r) * 0.6; p.position.z = m.group.position.z - Math.sin(r) * 0.6;
    this.vocab.learn('inmek', 'to get off');
  }

  /** Leaving the square: off it, and every scooter back at the stand. */
  leftPlace() {
    if (this.player.mount?.kind === 'scooter') this.player.setMount(null);
    this.#list.forEach((m) => this.#home(m));
  }
}
