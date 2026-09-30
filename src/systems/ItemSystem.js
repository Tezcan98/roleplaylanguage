import { EV } from '../core/events.js';

/**
 * World pickups. Content defines each item (where, what it looks like, which quest makes it
 * pickable); this system spawns, animates and hands them to the inventory.
 */
export class ItemSystem {
  constructor({ defs, world, kit, state, inventory, vocab, bus, story }) {
    Object.assign(this, { world, state, inventory, vocab, bus, story });
    this.items = defs.map((d) => {
      const mesh = kit.props.create(`item.${d.kind}`, () => d.build(kit.mf));
      mesh.position.set(...d.pos);
      world.get(d.location).group.add(mesh);
      return { ...d, mesh, baseY: d.pos[1] };
    });
    bus.on(EV.CHAPTER, () => this.refresh());
    this.refresh();
  }

  isTaken(item) { return this.state.taken.includes(item.id); }
  exists(item) { return !this.isTaken(item) && (!item.chapters || item.chapters.includes(this.story.chapter?.id)); }
  isActive(item) { return this.exists(item) && item.activeIn.includes(this.story.quest?.id); }
  get(id) { return this.items.find((i) => i.id === id); }
  ofKind(kind) { return this.items.filter((i) => i.kind === kind); }
  /** Display info for a kind (first matching def). */
  info(kind) {
    const i = this.items.find((d) => d.kind === kind);
    return i ? { tr: i.bagTr ?? i.tr, en: i.bagEn ?? i.en } : { tr: kind, en: '' };
  }

  refresh() { this.items.forEach((i) => { i.mesh.visible = this.exists(i); }); }

  pickable(pos, range = 1.7) {
    const here = this.world.current.id;
    return this.items.find((i) => i.location === here && this.isActive(i)
      && Math.hypot(i.mesh.position.x - pos.x, i.mesh.position.z - pos.z) < range) ?? null;
  }

  pick(item) {
    this.state.taken.push(item.id);
    item.mesh.visible = false;
    const isNew = this.vocab.learn(item.tr, item.en);
    if (!item.wearable) this.inventory.add(item.kind);
    this.bus.emit(EV.ITEM_PICKED, { item, isNew });
  }

  update(dt, t) {
    for (const i of this.items) {
      if (!i.mesh.visible) continue;
      const on = this.isActive(i);
      i.mesh.position.y = i.baseY + (on ? Math.sin(t * 3) * 0.06 : 0);
      if (on && i.spin !== false) i.mesh.rotation.y += dt;
    }
  }
}
