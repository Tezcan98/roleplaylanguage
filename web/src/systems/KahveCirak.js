import { Character } from '../entities/Character.js';
import { HD_VILLAGERS, villagerHd } from '../entities/Npc.js';
import { KAHVEHANE } from '../world/locations/VillageSquare.js';

/**
 * The kahvehane's apprentice (çırak): sit down at a table and a little later he comes from the
 * counter with a tray, walking between the tables, puts a glass of tea in front of you
 * ("Çayınız, buyurun!") and goes back. Once per sitting; the glass stays until you get up and go.
 */
const K = KAHVEHANE;
const HOME = { x: K.x + 0.6, z: K.z - K.d / 2 + 1.5 }; // at the end of the counter
const AISLE = K.z - K.d / 2 + 1.6; // behind the first row of tables
const SPEED = 1.6, WAIT = 3; // m/s; seconds after you sit down
const LOOK = { shirt: 0xFFFFFF, vest: 0x1F1F24, pants: 0x2A2F3A, skin: 0xE8B58C, hair: 0x2B1D14 };

export class KahveCirak {
  #path = [];
  #state = 'home'; // home → wait → to → serve → back
  #timer = 0;
  #table = null;
  #served = false;
  #glass = null;

  constructor({ world, mf, models, player, labels, vocab, speak }) {
    Object.assign(this, { world, mf, models, player, labels, vocab, speak });
  }

  build() {
    const loc = this.world.get('village');
    if (!loc) return;
    this.loc = loc;
    const c = this.char = new Character('cirak', { ...LOOK, props: [] }, { mf: this.mf });
    c.name = 'Çırak Ali';
    c.group.scale.setScalar(0.88); // a lad
    c.place({ ...HOME, rot: 0 });
    loc.group.add(c.group);
    // the tray with a glass of tea, held in front of him
    const mf = this.mf;
    this.tray = mf.group(mf.at(mf.cyl(0.2, 0.2, 0.02, { tex: 'metal' }, 16), 0, 0, 0), this.#teaGlass(0, 0.01, 0));
    this.tray.position.set(0, 1.0, 0.36);
    this.tray.visible = false;
    c.group.add(this.tray);
  }

  /** An ince belli glass of tea on its little saucer. */
  #teaGlass(x, y, z) {
    const mf = this.mf;
    return mf.at(mf.group(
      mf.at(mf.cyl(0.055, 0.055, 0.012, 0xF4F1EA, 12), 0, 0.006, 0),
      mf.at(mf.cyl(0.032, 0.024, 0.09, 0xB5401C, 10), 0, 0.055, 0),
    ), x, y, z);
  }

  /** The table the player sits at in the kahvehane (one of the guests' tables), or null. */
  #tableHere() {
    const p = this.player, t = this.loc?.kahveTables;
    if (!t || this.world.current?.id !== 'village' || !p.seated) return null;
    return t.find((tb) => Math.abs(p.position.x - tb.x) < 1.3 && Math.abs(p.position.z - tb.z) < 0.6) ?? null;
  }

  update(dt, t) {
    if (!this.char) return;
    const table = this.#tableHere();
    if (!table) {
      if (this.#served && (!this.player.seated || this.world.current?.id !== 'village')) { this.#glass?.removeFromParent(); this.#glass = null; this.#served = false; }
      if (this.#state === 'wait') this.#state = 'home';
    } else if (!this.#served && this.#state === 'home') {
      this.#state = 'wait'; this.#timer = WAIT; this.#table = table;
    }
    if (this.#state === 'wait' && (this.#timer -= dt) <= 0) this.#go(table);
    if (this.#state === 'to' || this.#state === 'back') this.#walk(dt, t);
    else {
      this.char.walk(t, 0);
      if (this.#state === 'serve' && (this.#timer -= dt) <= 0) this.#goHome();
    }
    if (this.tray.visible && !this.char.hdOn) { this.char.rig.armL.rotation.x = this.char.rig.armR.rotation.x = -1.25; } // holding the tray
    this.char.update(dt);
  }

  /** Off to the table: along the aisle behind the first row, down between two columns of tables, then up to it. */
  #go(table) {
    if (!table) { this.#state = 'home'; return; }
    const hd = HD_VILLAGERS.on;
    if ((this.char.hdOn ?? false) !== hd) { this.char.hdOn = hd; const { key, opts } = villagerHd(LOOK, 'cirak'); this.char.setHd(this.models, key, hd, opts); }
    const side = Math.sign(this.player.position.x - table.x) || 1, mid = table.x + 1.6, front = table.z + 0.8;
    this.#table = { ...table, side };
    this.#path = [{ x: HOME.x, z: AISLE }, { x: mid, z: AISLE }, { x: mid, z: front }, { x: table.x + side * 0.3, z: front }];
    this.tray.visible = true;
    this.tray.children[1].visible = true;
    this.#state = 'to';
  }

  #goHome() {
    const p = this.char.position;
    this.#path = [{ x: this.#table.x + 1.6, z: p.z }, { x: this.#table.x + 1.6, z: AISLE }, { x: HOME.x, z: AISLE }, { ...HOME }];
    this.#state = 'back';
  }

  #walk(dt, t) {
    const c = this.char, stop = this.#path[0];
    if (!stop) { this.#arrive(); return; }
    const dx = stop.x - c.position.x, dz = stop.z - c.position.z, d = Math.hypot(dx, dz);
    if (d < 0.05) { this.#path.shift(); return; }
    const step = Math.min(d, SPEED * dt);
    c.position.x += dx / d * step; c.position.z += dz / d * step;
    c.turnTo(Math.atan2(dx, dz), 0.25);
    c.walk(t, 1);
  }

  #arrive() {
    const c = this.char;
    if (this.#state === 'back') { this.#state = 'home'; this.tray.visible = false; c.turnTo(0, 1); return; }
    // at the table: the glass goes down in front of the player
    const tb = this.#table;
    c.turnTo(Math.PI, 1); // facing the table
    this.tray.children[1].visible = false;
    this.#glass?.removeFromParent();
    this.#glass = this.#teaGlass(tb.x + tb.side * 0.32, 0.77, tb.z + 0.12);
    this.loc.group.add(this.#glass);
    this.#served = true;
    this.labels.bubble(c, 'Çayınız, buyurun! Afiyet olsun.', null, 4, 'Your tea, here you are! Enjoy.');
    this.speak?.('Çayınız, buyurun! Afiyet olsun.');
    this.vocab?.learn('çırak', 'apprentice');
    this.vocab?.learn('buyurun', 'here you are (polite)');
    this.#state = 'serve';
    this.#timer = 1.6;
  }

  /** Debug/test: what he is doing. */
  get state() { return this.#state; }
  get served() { return this.#served; }
}
