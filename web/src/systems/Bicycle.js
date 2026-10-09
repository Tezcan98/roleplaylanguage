import * as THREE from 'three';
import { gloss } from '../i18n/Gloss.js';

/**
 * The bicycle in the yard, leaning by the house. The first time Ahmet doesn't know how to ride
 * one: learning is a skill bought with credits (kept in the wallet like the shop's things, so a
 * new game keeps it). Then "Bisiklete bin": he rides round the yard, pedalling, the wheels turning
 * with the speed; "Bisikletten in" (or leaving the yard) leaves it where it is / back at the wall.
 */
export const BIKE_PRICE = 10;
export const BIKE_SKILL = 'skill.bike';
const HOME = { where: 'yard', x: -11.2, z: -10.3, rot: Math.PI / 2 };
const WHEEL = 0.33;

export class Bicycle {
  constructor({ world, mf, player, wallet, toasts, vocab, choice, onShop }) {
    Object.assign(this, { world, mf, player, wallet, toasts, vocab, choice, onShop });
  }

  build() {
    const loc = this.world.get(HOME.where);
    if (!loc) return;
    this.bike = this.#make();
    this.#home();
    loc.group.add(this.bike.group);
  }

  #home() { const g = this.bike.group; g.position.set(HOME.x, 0, HOME.z); g.rotation.set(0, HOME.rot, 0.12); } // leaning a little

  /** A child's bicycle facing +z: two wheels with spokes, a red frame, saddle, handlebars and pedals. */
  #make() {
    const mf = this.mf, group = new THREE.Group(), frame = 0xC0392B, dark = 0x2B2B2B, metal = { tex: 'metal' };
    const wheel = (z) => {
      const w = new THREE.Group();
      const tyre = mf.torus(WHEEL, 0.035, dark, 20); tyre.rotation.y = Math.PI / 2; w.add(tyre);
      for (let k = 0; k < 6; k++) { const s = mf.box(0.012, WHEEL * 2, 0.012, 0xC8CDD2); s.rotation.x = k * Math.PI / 6; w.add(s); }
      w.add(mf.at(mf.cyl(0.04, 0.04, 0.08, metal, 8), 0, 0, 0)).rotation.z = Math.PI / 2;
      w.position.set(0, WHEEL + 0.035, z); group.add(w);
      return w;
    };
    const front = wheel(0.5), back = wheel(-0.5);
    const bar = (a, b, r = 0.025, spec = frame) => { // a tube from point a to point b
      const A = new THREE.Vector3(...a), B = new THREE.Vector3(...b), m = mf.cyl(r, r, A.distanceTo(B), spec, 6);
      m.position.copy(A).add(B).multiplyScalar(0.5); m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), B.sub(A).normalize());
      return group.add(m);
    };
    const hub = WHEEL + 0.035, crank = [0, hub - 0.02, -0.05], seat = [0, 0.78, -0.22], head = [0, 0.82, 0.38];
    bar(crank, seat); bar(crank, head); bar(seat, head); bar([0, hub, -0.5], crank); bar([0, hub, -0.5], seat);
    bar(head, [0, hub, 0.5], 0.022, metal); bar(head, [0, 0.98, 0.34], 0.02, metal);
    bar([-0.28, 0.98, 0.32], [0.28, 0.98, 0.32], 0.018, metal); // handlebars
    [-0.28, 0.28].forEach((x) => group.add(mf.at(mf.cyl(0.03, 0.03, 0.1, dark, 8), x, 0.98, 0.32)).rotation.z = Math.PI / 2);
    group.add(mf.at(mf.box(0.16, 0.05, 0.26, dark), 0, 0.81, -0.24)); // saddle
    group.add(mf.at(mf.box(0.14, 0.12, 0.02, 0xF4F1EA), 0, 0.88, 0.42)); // a little basket plate
    const pedals = new THREE.Group(); pedals.position.set(...crank); group.add(pedals);
    [-1, 1].forEach((side) => {
      const arm = mf.box(0.02, 0.17, 0.03, metal); arm.position.set(side * 0.08, side * 0.08, 0); pedals.add(arm);
      pedals.add(mf.at(mf.box(0.09, 0.025, 0.06, dark), side * 0.12, side * 0.16, 0));
    });
    let spin = 0;
    return {
      kind: 'bike', group, seat: 0.84, saddle: -0.24, speed: 1.5, legs: 'pedal',
      play: (name, v = 0) => { spin = v; },
      update: (dt) => { const a = spin * dt / WHEEL; front.rotation.x += a; back.rotation.x += a; pedals.rotation.x += a * 0.5; },
      get pedal() { return pedals.rotation.x; },
    };
  }

  /** Interaction provider: get off, or get on (learn first). */
  find(pos) {
    const p = this.player, b = this.bike;
    if (!b) return null;
    if (p.mount === b) return { label: 'Bisikletten in', dist: 0, priority: 3, run: () => this.getOff() };
    if (p.mount || this.world.current?.id !== HOME.where) return null;
    const d = Math.hypot(b.group.position.x - pos.x, b.group.position.z - pos.z);
    if (d > 1.8) return null;
    const label = this.wallet.owns(BIKE_SKILL) ? 'Bisiklete bin' : `Bisiklete bin · 🪙 ${BIKE_PRICE}`;
    return { label, dist: d, priority: 1, run: () => this.getOn() };
  }

  async getOn() {
    if (!this.wallet.owns(BIKE_SKILL)) {
      this.vocab.learn('bisiklet', 'bicycle');
      const learn = await this.choice.ask({
        title: 'Bisiklet sürmeyi bilmiyorsun',
        text: `Babanla bir tur öğrenmeye ne dersin? Bisiklet sürmeyi öğrenmek ${BIKE_PRICE} kredi.`,
        en: "You don't know how to ride a bicycle. Learning it costs credits.",
        yes: `Öğren · 🪙 ${BIKE_PRICE}`, no: 'Şimdi değil',
      });
      if (!learn) return;
      if (!this.wallet.buy({ id: BIKE_SKILL, price: BIKE_PRICE })) {
        this.toasts.show('Kredin yetmiyor.', gloss('Not enough credits. Get some in the shop.'));
        this.onShop?.();
        return;
      }
      this.vocab.learn('bisiklet sürmek', 'to ride a bicycle');
      this.toasts.show('Artık bisiklet sürebilirsin!', gloss('Now you can ride a bicycle!'));
    }
    const p = this.player, g = this.bike.group;
    if (p.seated) p.sit(false);
    g.rotation.set(0, g.rotation.y, 0);
    p.position.x = g.position.x; p.position.z = g.position.z; p.group.rotation.y = g.rotation.y;
    p.setMount(this.bike);
    this.vocab.learn('pedal', 'pedal'); this.vocab.learn('tekerlek', 'wheel');
  }

  getOff() {
    const p = this.player, g = this.bike.group, r = g.rotation.y;
    p.setMount(null);
    g.rotation.z = 0.12; // stands on its kickstand
    p.position.x = g.position.x + Math.cos(r) * 0.8; p.position.z = g.position.z - Math.sin(r) * 0.8;
  }

  /** Leaving the yard on the bike: it goes back to the wall. */
  leftPlace() {
    if (this.player.mount === this.bike) this.player.setMount(null);
    if (this.bike) this.#home();
  }
}
