import { outfitModel, isDress } from '../content/shop.js';
import { Character } from '../entities/Character.js';

/**
 * Other players in the multiplayer village square: one blocky character each, smoothly
 * following the positions the server sends.
 */
/** At most this many other players drawn at once, the nearest, within this distance (m). */
const MAX_SHOWN = 40, SHOW_DIST = 70; // (the fog hides the rest: the square is 150 m across)

export class RemotePlayers {
  #players = new Map();

  constructor({ mf, models = null, baseLook, looks = {}, horse = null, scooter = null, bike = null }) { Object.assign(this, { mf, models, baseLook, looks, horse, scooter, bike }); } // horse(), scooter(), bike(): what another player rides (systems/Animals.js, Scooter.js, Bicycle.js)

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
    // bought in the shop: the HD body — loaded only once they come into view (a crowd far away costs nothing)
    const hd = look?.outfit ? () => char.setHd(this.models, outfitModel(look.outfit, look.gender, look.style), true, { covered: look.style === 'covered', dress: isDress(look.outfit), paint: look.outfit }) : null;
    this.#players.set(id, { char, target: { x, z, rot }, moving: false, location, hd });
    if (ride) this.#ride(id, rideKind(ride));
  }

  /** Another player gets on (a horse or a scooter appears under them: `kind`) or off (null). */
  async #ride(id, kind) {
    const p = this.#players.get(id);
    if (!p) return;
    p.riding = kind;
    if (p.char.mount) { p.char.mount.group.removeFromParent(); p.char.setMount(null); }
    if (!kind) return;
    const m = kind === 'scooter' ? this.scooter?.() : kind === 'bike' ? this.bike?.() : await this.horse?.();
    if (!m || p.riding !== kind || this.#players.get(id) !== p) return;
    p.location.group.add(m.group);
    p.char.setMount(m);
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
      const kind = rideKind(ride);
      if ((p.riding ?? null) !== kind) this.#ride(id, kind); // on horseback, on a scooter
    });
  }

  setTalking(id, on) { const p = this.#players.get(id); if (p) p.char.voice = on; }

  /**
   * `near` (the player's position): only the closest MAX_SHOWN players within SHOW_DIST are drawn and
   * animated — a square of a hundred would cost a phone its frame rate; the others still move (cheaply).
   */
  update(dt, t, near = null) {
    const k = Math.min(1, dt * 10);
    let shown = null;
    if (near) {
      shown = new Set([...this.#players.values()]
        .map((p) => [p, Math.hypot(p.target.x - near.x, p.target.z - near.z)])
        .filter(([, d]) => d < SHOW_DIST).sort((a, b) => a[1] - b[1]).slice(0, MAX_SHOWN).map(([p]) => p));
    }
    this.#players.forEach((p) => {
      const { char, target, moving } = p, pos = char.position;
      pos.x += (target.x - pos.x) * k;
      pos.z += (target.z - pos.z) * k;
      const visible = !shown || shown.has(p) || (near && Math.hypot(pos.x - near.x, pos.z - near.z) < 8); // (someone right next to you always)
      char.group.visible = visible;
      if (char.mount) char.mount.group.visible = visible;
      if (!visible) return;
      if (p.hd) { p.hd(); p.hd = null; }
      char.turnTo(target.rot, 0.2);
      char.moving = moving; char.walk(t, moving ? 1 : 0);
      char.update(dt);
    });
  }

  /** The players being drawn (for their name labels). */
  visible() { return this.list().filter((c) => c.group.visible); }
}

/** What a player rides from the network: 'scooter', 'bike', 'horse' (also `true` / 1 from older games), or null. */
const rideKind = (ride) => (ride === 'scooter' || ride === 'bike' ? ride : ride ? 'horse' : null);
