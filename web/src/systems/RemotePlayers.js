import { Character } from '../entities/Character.js';

/**
 * Other players in the multiplayer village square: one blocky character each, smoothly
 * following the positions the server sends.
 */
export class RemotePlayers {
  #players = new Map();

  constructor({ mf, baseLook, girlLook = baseLook }) { Object.assign(this, { mf, baseLook, girlLook }); }

  list() { return [...this.#players.values()].map((p) => p.char); }
  ids() { return [...this.#players.keys()]; }
  get count() { return this.#players.size; }
  get(id) { return this.#players.get(id)?.char; }

  add(location, { id, name, look, x = -14.8, z = 0, rot = 0, talking = false }) {
    if (this.#players.has(id)) return;
    const char = new Character(`remote-${id}`, { ...(look?.gender === 'girl' ? this.girlLook : this.baseLook), ...look, props: [] }, { mf: this.mf });
    char.name = name;
    char.voice = talking;
    char.place({ x, z, rot });
    location.group.add(char.group);
    this.#players.set(id, { char, target: { x, z, rot }, moving: false });
  }

  remove(id) {
    const p = this.#players.get(id);
    if (!p) return;
    p.char.group.removeFromParent();
    this.#players.delete(id);
  }

  clear() { [...this.#players.keys()].forEach((id) => this.remove(id)); }

  setStates(players) {
    players.forEach(({ id, x, z, rot, moving }) => {
      const p = this.#players.get(id);
      if (p) { p.target = { x, z, rot }; p.moving = moving; }
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
