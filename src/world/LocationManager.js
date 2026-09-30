import { EV } from '../core/events.js';

/** Holds all locations and switches the active one. */
export class LocationManager {
  #locations = new Map();
  current = null;

  constructor({ scene, bus, lighting, kit }) { Object.assign(this, { scene, bus, lighting, kit }); }

  register(location) {
    location.build(this.kit);
    this.scene.add(location.group);
    this.#locations.set(location.id, location);
    return this;
  }

  get(id) { return this.#locations.get(id); }
  all() { return [...this.#locations.values()]; }

  /** Location graph edges, taken from hotspots that travel somewhere (filled by content). */
  setLinks(links) { this.links = links; }

  enter(id, { silent = false } = {}) {
    const loc = this.#locations.get(id);
    if (!loc) throw new Error(`Unknown location ${id}`);
    this.current?.setActive(false);
    this.current = loc;
    loc.setActive(true);
    this.lighting.bind(loc);
    if (!silent) this.bus.emit(EV.LOCATION, { id });
    return loc;
  }

  /** First hotspot in the current location on the shortest path towards `targetLoc`. */
  exitTowards(targetLoc) {
    const from = this.current.id;
    if (from === targetLoc || !this.links) return null;
    const queue = [[from, null]], seen = new Set([from]);
    while (queue.length) {
      const [loc, firstHop] = queue.shift();
      for (const l of this.links.filter((e) => e.from === loc)) {
        if (seen.has(l.to)) continue;
        const hop = firstHop ?? l.hotspot;
        if (l.to === targetLoc) return this.current.hotspots.get(hop) ?? null;
        seen.add(l.to);
        queue.push([l.to, hop]);
      }
    }
    return null;
  }
}
