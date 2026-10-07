import * as THREE from 'three';
import { EV } from '../core/events.js';
import { gloss } from '../i18n/Gloss.js';
import { looseGoods, goodLook, TABLE_WORDS, BIN_WORDS } from '../content/goods.js';

const SINI = { x: -0.8, y: 0.33, z: -0.4, r: 0.47 }; // the low round table at home (HouseInterior)
// places in a ring on it, leaving the tea tray (breakfast) and the bread alone
const PLACES = Array.from({ length: 10 }, (_, i) => 0.35 + (i / 10) * Math.PI * 2).filter((a) => Math.abs(a - 2.5) > 0.4 && Math.abs(a - 5.9) > 0.35);
const SLOTS = PLACES.length;

/**
 * What you bought goes in the bag; at home it can go on the sini ("Masaya koy") and back in the
 * bag ("Masadan al"), and anywhere with a rubbish bin it can be thrown away ("Çöpe at"). Both
 * open a small list of the bag's bought things to tap. What lies on the table is saved
 * (state.table) and shown on the sini.
 */
export class TableAndBins {
  constructor({ state, inventory, items, world, mf, list, toasts, vocab, bus }) {
    Object.assign(this, { state, inventory, items, world, mf, list, toasts, vocab, bus });
    this.group = new THREE.Group();
    this.group.position.set(SINI.x, SINI.y, SINI.z);
    world.get('house')?.add(this.group);
    this.render();
    bus.on(EV.LOCATION, () => this.render()); // a loaded game
  }

  /** The bought things in the bag: [kind, n]. */
  loose() { return looseGoods(this.state); }

  bought(kind, n = 1) { this.state.bought[kind] = (this.state.bought[kind] ?? 0) + n; }

  #name(kind) { return this.items.info(kind); }

  /** At the sini: put things on it, take them back. */
  atTable() {
    TABLE_WORDS.forEach(([tr, en]) => this.vocab?.learn(tr, en));
    const rows = [
      ...this.loose().map(([kind]) => { const n = this.#name(kind); return [`⬇ Masaya koy: ${n.tr}`, gloss(n.en), () => this.#put(kind)]; }),
      ...this.state.table.map((kind, i) => { const n = this.#name(kind); return [`⬆ Masadan al: ${n.tr}`, gloss(n.en), () => this.#take(i)]; }),
    ];
    this.list.open('Masa', rows, 'Çantanda masaya koyacak bir şey yok. Bakkaldan ya da manavdan bir şey al!');
  }

  /** At a rubbish bin: throw bought things away. */
  atBin() {
    BIN_WORDS.forEach(([tr, en]) => this.vocab?.learn(tr, en));
    const rows = this.loose().map(([kind, n]) => { const i = this.#name(kind); return [`🗑 Çöpe at: ${n > 1 ? `${n} ` : ''}${i.tr}`, gloss(i.en), () => this.#throw(kind)]; });
    this.list.open('Çöp kutusu', rows, 'Çöpe atacak bir şeyin yok.');
  }

  #put(kind) {
    if (this.state.table.length >= SLOTS) { this.toasts.show('Masada yer kalmadı.', gloss('There is no room left on the table.')); return; }
    this.#spend(kind);
    this.state.table.push(kind);
    this.toasts.show(`${this.#name(kind).tr} masada.`, gloss('You put it on the table.'));
    this.#changed(() => this.atTable());
  }

  #take(i) {
    const [kind] = this.state.table.splice(i, 1);
    if (!kind) return;
    this.inventory.add(kind, 1);
    this.bought(kind);
    this.toasts.show(`${this.#name(kind).tr} çantada.`, gloss('Back in your bag.'));
    this.#changed(() => this.atTable());
  }

  #throw(kind) {
    this.#spend(kind);
    this.toasts.show(`${this.#name(kind).tr} çöpe gitti.`, gloss('You threw it in the bin.'));
    this.#changed(() => this.atBin());
  }

  #spend(kind) {
    this.inventory.remove(kind, 1);
    this.state.bought[kind] = Math.max(0, (this.state.bought[kind] ?? 0) - 1);
  }

  #changed(reopen) { this.render(); reopen(); }

  /** The things on the sini, in a ring round its middle (the bread goes there). */
  render() {
    this.group.clear();
    this.state.table.forEach((kind, i) => {
      const a = PLACES[i];
      const m = goodLook(kind)(this.mf);
      m.position.set(Math.cos(a) * SINI.r, 0, Math.sin(a) * SINI.r);
      m.rotation.y = -a;
      this.group.add(m);
    });
  }
}
