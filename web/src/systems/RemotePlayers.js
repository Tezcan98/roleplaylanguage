import { outfitModel } from '../content/shop.js';
import { Character } from '../entities/Character.js';

/**
 * Other players in the multiplayer village square: one blocky character each, smoothly
 * following the positions the server sends.
 */
export class RemotePlayers {
  #players = new Map();

  constructor({ mf, models = null, baseLook, looks = {}, horse = null }) { Object.assign(this, { mf, models, baseLook, looks, horse }); } // horse(): a horse to ride (systems/Animals.js)

  list() { return [...this.#players.values()].map((p) => p.char); }
  ids() { return [...this.#players.keys()]; }
  get count() { return this.#players.size; }
  get(id) { return this.#players.get(id)?.char; }

  add(location, { id, name, look, x = -14.8, z = 0, rot = 0, talking = false, sit = false, ride = false }) {
    if (this.#players.has(id)) return;
    const char = new Character(`remote-${id}`, { ...(this.looks[`${look?.gender}-${look?.style}`] ?? this.baseLook), shirt: look?.shirt ?? this.baseLook.shirt, ...(look?.cap ? { cap: look.cap } : {}), ...(look?.headscarf ? { headscarf: look.headscarf } : {}), props: [] }, { mf: this.mf });
    char.name = name;
    char.voice = talking;
    char.place({ x, z, rot });
    location.group.add(char.group);
    if (sit) char.sit(true);
    if (look?.aura) char.setAura(true);
    if (look?.outfit) char.setHd(this.models, outfitModel(look.outfit, look.gender, look.style), true, { covered: look.style === 'covered', dress: look.outfit === 'dress' }); // bought in the shop
    this.#players.set(id, { char, target: { x, z, rot }, moving: false, location });
    if (ride) this.#ride(id, true);
  }

  /** Another player gets on (a horse appears under them) or off. */
  async #ride(id, on) {
    const p = this.#players.get(id);
    if (!p) return;
    p.riding = on;
    if (!on) { if (p.char.mount) { p.char.mount.group.removeFromParent(); p.char.setMount(null); } return; }
    const h = await this.horse?.();
    if (!h || !p.riding || this.#players.get(id) !== p) return;
    p.location.group.add(h.group);
    p.char.setMount(h);
  }

  remove(id) {
    const p = this.#players.get(id);
    if (!p) return;
    p.char.mount?.group.removeFromParent();
    p.char.group.removeFromParent();
    this.#players.delete(id);
  }

  clear() { [...this.#players.keys()].forEach((id) => this.remove(id)); }

  setStates(players) {
    players.forEach(({ id, x, z, rot, moving, sit = false, ride = false }) => {
      const p = this.#players.get(id);
      if (!p) return;
      p.target = { x, z, rot }; p.moving = moving;
      if (p.char.seated !== sit) p.char.sit(sit); // at a tea table or on a bench
      if (!!p.riding !== !!ride) this.#ride(id, !!ride); // on horseback
    });
  }

  setTalking(id, on) { const p = this.#players.get(id); if (p) p.char.voice = on; }

  update(dt, t) {
    const k = Math.min(1, dt * 10);
    this.#players.forEach(({ char, target, moving }) => {
      const pos = char.position;
      pos.x += (target.x - pos.x) * k;
      pos.z += (target.z - pos.z) * k;
      char.turnTo(target.rot, 0.2);
      char.walk(t, moving ? 1 : 0);
      char.update(dt);
    });
  }
}
