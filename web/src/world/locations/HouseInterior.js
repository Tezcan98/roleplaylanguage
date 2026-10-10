import * as THREE from 'three';
import { Location } from '../Location.js';
// import { addTrashBin } from '../trashBin.js';

const WALL = { tex: 'plaster', repeat: [3, 1] };
const DARK = { tex: 'darkWood', repeat: [1, 1] };

/**
 * The family's house, seen like a doll's house (no front wall). Left to right:
 *   entrance hall (front door, coat rack) · bathroom (lavabo, toilet, shower) and parents' bedroom behind it
 *   salon (sofra, sedir, TV, desk, bookshelf) in the middle
 *   kitchen at the back, Ahmet and Ali's room at the front.
 * Walls across the depth are full height; walls between a front and a back room are low, so
 * the camera (in front) still sees into the room behind them.
 */
export class HouseInterior extends Location {
  constructor() {
    super({ id: 'house', name: 'Ev', indoor: true, spawn: 'start', bounds: { x: [-12.8, 12.2], z: [-4.1, 4.4] } });
  }

  play(anim) { if (anim === 'tv') this.tvTime = 5; }

  setBreadOnTable(on) { if (this.bread) this.bread.visible = on; }

  /** Food is only on the sini at meal times: 'breakfast' | 'dinner' | null. */
  setMeal(kind) {
    this.meal = kind;
    Object.entries(this.meals ?? {}).forEach(([k, g]) => { g.visible = k === kind; });
    if (this.teaTray) this.teaTray.visible = kind === 'breakfast';
  }

  /** Prayer rugs are rolled out only for the family prayer. */
  setPrayerRugs(on) { if (this.rugs) this.rugs.visible = on; }

  #buildMeals(mf) {
    const at = (m, x, z, y = 0.35) => mf.at(m, -0.8 + x, y, -0.4 + z);
    const plate = (x, z) => at(mf.cyl(0.11, 0.09, 0.02, 0xFFFFFF, 14), x, z, 0.335);
    const breakfast = mf.group(
      ...[[-0.3, 0.1], [0.25, -0.2], [0.05, 0.35], [-0.1, -0.4]].map(([x, z]) => at(mf.cyl(0.04, 0.03, 0.12, 0xC8451F, 8), x, z, 0.39)), // tea glasses
      plate(0.35, 0.2), at(mf.box(0.14, 0.05, 0.1, 0xFFF6D5), 0.35, 0.2, 0.37), // beyaz peynir
      plate(-0.35, -0.15), ...[[-0.38, -0.12], [-0.32, -0.18], [-0.35, -0.1]].map(([x, z]) => at(mf.sphere(0.022, 0x2B2B1F, 6), x, z, 0.36)), // zeytin
      plate(0.15, -0.45), ...[[0.12, -0.45], [0.19, -0.42]].map(([x, z]) => at(mf.sphere(0.04, 0xE0392B, 8), x, z, 0.37)), // domates
    );
    const simit = mf.torus(0.08, 0.03, 0xC98A3E); simit.rotation.x = Math.PI / 2;
    breakfast.add(at(simit, 0.0, 0.0, 0.35));
    const dinner = mf.group(
      ...[[0, -0.55], [-0.55, 0], [0.55, 0], [0, 0.55]].flatMap(([x, z]) => [ // a bowl of lentil soup in front of everyone
        at(mf.cyl(0.13, 0.1, 0.06, 0xFFF6E0, 14), x, z, 0.35),
        at(mf.cyl(0.11, 0.11, 0.01, 0xC9772F, 14), x, z, 0.38),
      ]),
      at(mf.cyl(0.16, 0.12, 0.08, 0xB7793A, 12), 0.05, 0.05, 0.36), // bread basket
      at(mf.sphere(0.07, 0xD9A05B, 8), 0.05, 0.05, 0.42),
      at(mf.cyl(0.12, 0.1, 0.05, 0xFFFFFF, 12), -0.25, 0.3, 0.35), at(mf.sphere(0.06, 0x5E9E3A, 8), -0.25, 0.3, 0.39), // salad
    );
    this.meals = { breakfast, dinner };
    Object.values(this.meals).forEach((g) => { g.visible = false; this.add(g); });
  }

  build(kit) {
    const { mf } = kit, C = this.collision, add = (m) => this.add(m);
    const noCast = (m) => { m.castShadow = false; return add(m); };

    // floor + walls
    add(mf.at(mf.box(26.2, 0.1, 9.4, { tex: 'floorWood', repeat: [8, 3] }), -0.3, -0.05, 0));
    const tiles = (x0, x1, z0, z1) => add(mf.at(mf.box(x1 - x0, 0.02, z1 - z0, { tex: 'schoolFloor', repeat: [(x1 - x0) / 1.5, (z1 - z0) / 1.5] }), (x0 + x1) / 2, 0.01, (z0 + z1) / 2));
    tiles(6.2, 12.6, -4.6, -0.48); // kitchen
    tiles(-13.2, -9.78, -4.6, -0.68); // bathroom
    /** A wall from (x0,z0) to (x1,z1), solid; a low one gets a wooden top. */
    const wall = (x0, z0, x1, z1, h = 3.2) => {
      const w = Math.abs(x1 - x0) || 0.2, d = Math.abs(z1 - z0) || 0.2, cx = (x0 + x1) / 2, cz = (z0 + z1) / 2;
      noCast(mf.at(mf.box(w, h, d, WALL), cx, h / 2, cz));
      if (h < 2) add(mf.at(mf.box(w + 0.04, 0.06, d + 0.04, DARK), cx, h + 0.03, cz));
      C.addBox(cx - w / 2 - 0.08, cx + w / 2 + 0.08, cz - d / 2 - 0.08, cz + d / 2 + 0.08);
    };
    const lintel = (x, z0, z1) => noCast(mf.at(mf.box(0.2, 0.9, z1 - z0, WALL), x, 2.75, (z0 + z1) / 2)); // above a doorway in a wall across the depth
    noCast(mf.at(mf.box(26.2, 3.2, 0.2, WALL), -0.3, 1.6, -4.7)); // back
    add(mf.at(mf.box(26.2, 0.25, 0.22, DARK), -0.3, 0.12, -4.58)); // skirting
    noCast(mf.at(mf.box(0.2, 3.2, 9.4, WALL), 12.7, 1.6, 0)); // east
    // west: the front door to the yard
    noCast(mf.at(mf.box(0.2, 3.2, 5.8, WALL), -13.3, 1.6, -1.8));
    noCast(mf.at(mf.box(0.2, 3.2, 1.6, WALL), -13.3, 1.6, 3.9));
    lintel(-13.3, 1.1, 3.1);
    add(mf.at(mf.box(0.12, 2.3, 1.9, DARK), -13.22, 1.15, 2.1));
    add(mf.at(mf.sphere(0.06, 0xE0B04A, 8), -13.13, 1.1, 2.8));
    this.hotspot('house.door', -12.5, 2.1);
    // hall | salon, with a wide doorway
    wall(-6.1, -4.7, -6.1, 1.1); wall(-6.1, 3.1, -6.1, 4.7); lintel(-6.1, 1.1, 3.1);
    // bathroom | parents' room; both open onto the hall through low walls with doorways
    wall(-9.7, -4.7, -9.7, -0.6);
    wall(-13.3, -0.6, -12.0, -0.6, 1.2); wall(-10.8, -0.6, -8.6, -0.6, 1.2); wall(-7.4, -0.6, -6.1, -0.6, 1.2);
    // salon | kitchen and bedroom: two doorways
    wall(6.1, -4.7, 6.1, -3.6); wall(6.1, -2.0, 6.1, 1.9); wall(6.1, 3.5, 6.1, 4.7);
    lintel(6.1, -3.6, -2.0); lintel(6.1, 1.9, 3.5);
    wall(6.1, -0.4, 12.7, -0.4, 1.2); // kitchen | bedroom (low)

    // window with curtains; glass tinted by the sky colour
    const glass = mf.uniqueMat(0xBFE3FF);
    this.windows.push(glass);
    add(mf.at(new THREE.Mesh(new THREE.BoxGeometry(2.2, 1.4, 0.1), glass), 2, 1.9, -4.58));
    add(mf.at(mf.box(2.4, 0.12, 0.2, DARK), 2, 1.15, -4.55));
    add(mf.at(mf.box(0.08, 1.4, 0.12, 0xffffff), 2, 1.9, -4.55));
    [0.6, 3.4].forEach((x) => add(mf.at(mf.box(0.6, 1.9, 0.05, { tex: 'curtain' }), x, 1.95, -4.5)));

    // kilim + sini (low round table) — the family eats here
    add(mf.at(mf.box(5, 0.02, 3.4, { tex: 'kilim' }), -0.8, 0.01, -0.4));
    this.prop(kit, 'prop.sini', -0.8, 0, -0.4, 0, () => mf.group(
      mf.at(mf.cyl(0.78, 0.78, 0.05, 0xC9A24A, 28), 0, 0.3, 0), mf.at(mf.cyl(0.5, 0.55, 0.28, DARK, 16), 0, 0.14, 0)));
    this.#buildMeals(mf);
    C.addCircle(-0.8, -0.4, 0.85);
    [[-0.8, -1.55], [-0.8, 0.75], [-2.0, -0.4], [0.4, -0.4]].forEach(([x, z]) =>
      add(mf.at(mf.box(0.6, 0.12, 0.6, 0xC8456A), x, 0.06, z))); // minder cushions
    this.anchor('sofraN', -0.8, -1.55, 0);
    this.anchor('sofraW', -2.0, -0.4, Math.PI / 2);
    this.anchor('sofraE', 0.4, -0.4, -Math.PI / 2);
    this.anchor('sofraS', -0.8, 0.75, Math.PI);
    this.hotspot('house.sofra', -0.8, 0.78, 1.0);
    this.hotspot('house.breadTable', -0.45, -0.55, 1.0);
    this.hotspot('house.tableGoods', -2.0, -1.0, 1.0); // put what you bought on the sini (systems/TableAndBins.js)

    this.bread = mf.group(
      mf.at(mf.sphere(0.2, 0xD9A05B, 12), 0, 0.02, 0),
      mf.at(mf.box(0.02, 0.02, 0.2, 0xB7793A), 0, 0.14, 0),
    );
    this.bread.children[0].scale.set(1.5, 0.7, 0.9);
    this.bread.position.set(-0.45, 0.36, -0.55);
    this.bread.visible = false;
    add(this.bread);

    // sedir (divan) along the back wall
    this.prop(kit, 'prop.sedir', -1, 0, -4, 0, () => {
      const g = mf.group(mf.at(mf.box(5, 0.45, 1.1, { tex: 'sedirFabric', repeat: [3, 1] }), 0, 0.22, 0));
      for (let i = 0; i < 4; i++) g.add(mf.at(mf.box(1.1, 0.6, 0.25, i % 2 ? 0xE0B04A : 0xC8456A), -1.8 + i * 1.2, 0.75, -0.4));
      return g;
    });
    C.addBox(-3.5, 1.5, -4.6, -3.4);
    this.anchor('sedirL', -2.6, -3.75, 0);
    this.anchor('sedirR', 0.4, -3.75, 0);
    this.anchor('sedirM', -1.1, -3.75, 0); // grandma (nine)

    // TV
    this.prop(kit, 'prop.tv', 5.6, 0, -0.5, -Math.PI / 2, () => {
      const g = mf.group(mf.at(mf.box(1.8, 0.6, 0.6, DARK), 0, 0.3, 0.1), mf.at(mf.box(1.5, 0.9, 0.1, 0x1B2440), 0, 1.1, 0));
      this.tvScreen = mf.uniqueMat(0x2A3550, { emissive: 0x000000 });
      g.add(mf.at(new THREE.Mesh(new THREE.BoxGeometry(1.35, 0.75, 0.02), this.tvScreen), 0, 1.1, 0.06));
      return g;
    });
    C.addBox(5.2, 6, -1.5, 0.5);
    this.hotspot('house.tv', 4.5, -0.5, 1.6);

    // kitchen (its own room), left to right: fridge, stove, counter with the çaydanlık and the dish basin
    this.prop(kit, 'prop.fridge', 7.05, 0, -4.15, 0, () => mf.box(0.72, 1.9, 0.72, { tex: 'whiteWall' }));
    this.prop(kit, 'prop.stove', 7.9, 0, -4.15, 0, () => mf.group(
      mf.at(mf.box(0.8, 0.9, 0.72, { tex: 'metal' }), 0, 0.45, 0),
      mf.at(mf.cyl(0.12, 0.12, 0.02, 0x2A1E15, 16), -0.2, 0.91, -0.16),
      mf.at(mf.cyl(0.12, 0.12, 0.02, 0x2A1E15, 16), 0.2, 0.91, 0.16)
    ));
    this.prop(kit, 'prop.kitchen', 9.37, 0, -4.2, 0, () => {
      const g = mf.group(mf.at(mf.box(1.85, 0.9, 0.8, { tex: 'whiteWall' }), 0, 0.45, 0), mf.at(mf.box(1.9, 0.06, 0.85, { tex: 'metal' }), 0, 0.93, 0));
      [-0.46, 0.46].forEach((x) => g.add(mf.at(mf.box(0.05, 0.6, 0.02, 0x9AA3AE), x, 0.45, 0.41)));
      return g;
    });
    this.prop(kit, 'prop.caydanlik', 9.05, 0.96, -4.2, 0, () => mf.group(
      mf.at(mf.cyl(0.22, 0.22, 0.3, 0xB5482E, 14), 0, 0.15, 0),
      mf.at(mf.cyl(0.15, 0.17, 0.25, 0xB5482E, 14), 0, 0.43, 0),
      mf.at(mf.sphere(0.05, 0x2A1E15, 8), 0, 0.6, 0)));
    this.prop(kit, 'prop.dishpan', 9.85, 0.98, -4.18, 0, () => mf.cyl(0.28, 0.34, 0.09, 0x8EC5FF, 16));
    // small tea tray at the edge of the sini (the bread goes in the middle)
    this.teaTray = this.live(this.prop(kit, 'prop.teaTray', -1.2, 0, -0.1, 0, () => mf.group(
      mf.at(mf.cyl(0.24, 0.24, 0.03, 0xB5482E, 20), 0, 0.34, 0),
      mf.at(mf.cyl(0.05, 0.04, 0.12, 0xE8D6A8, 10), -0.09, 0.41, 0),
      mf.at(mf.cyl(0.05, 0.04, 0.12, 0xE8D6A8, 10), 0.09, 0.41, 0)
    )));
    C.addBox(6.65, 10.4, -4.6, -3.7);
    this.anchor('kitchen', 8.0, -3.3, Math.PI);
    this.hotspot('house.kitchen', 7.05, -3.35, 1.0); // water from the fridge
    this.hotspot('house.tea', 9.05, -3.35, 1.0);
    this.hotspot('house.dishes', 9.85, -3.35, 1.0);
    // addTrashBin(this, mf, C, 'house.trash', 11.75, -3.95, 0.95).scale.setScalar(0.8); // the kitchen's rubbish bin
    this.prop(kit, 'prop.broom', 12.35, 0, -1.2, Math.PI / 2, () => mf.group(
      mf.at(mf.cyl(0.025, 0.025, 1.35, DARK, 8), 0, 0.68, 0),
      mf.at(mf.box(0.32, 0.12, 0.08, { tex: 'lightWood' }), 0, 0.08, 0)
    ));
    // kitchen table with two chairs, and a window over it
    add(mf.at(mf.box(1.1, 0.06, 0.8, { tex: 'lightWood' }), 11.3, 0.76, -2.6));
    [[-0.48, -0.33], [0.48, -0.33], [-0.48, 0.33], [0.48, 0.33]].forEach(([x, z]) => add(mf.at(mf.box(0.06, 0.74, 0.06, DARK), 11.3 + x, 0.37, -2.6 + z)));
    [-3.3, -1.9].forEach((z) => add(mf.at(mf.box(0.45, 0.05, 0.45, DARK), 11.3, 0.45, z)));
    C.addBox(10.7, 11.9, -3.1, -1.6);
    add(mf.at(new THREE.Mesh(new THREE.BoxGeometry(1.4, 1.0, 0.1), glass), 11.3, 1.9, -4.58));
    add(mf.at(mf.box(1.6, 0.1, 0.2, DARK), 11.3, 1.35, -4.55));
    this.hotspot('house.window', 2, -3.9, 1.3);

    // bookshelf
    this.prop(kit, 'prop.bookshelf', -5.75, 0, -3, Math.PI / 2, () => {
      const g = mf.group(mf.at(mf.box(1.7, 2, 0.45, DARK), 0, 1, 0));
      for (let s = 0; s < 3; s++) for (let b = 0; b < 5; b++)
        g.add(mf.at(mf.box(0.18, 0.42, 0.3, [0x2F6FDB, 0xC8451F, 0xE0B04A, 0x4E7D5B, 0x7A3552][(s + b) % 5]), -0.6 + b * 0.28, 0.45 + s * 0.62, 0.13));
      return g;
    });
    C.addBox(-6, -5.4, -3.95, -2.05);
    this.hotspot('house.shelf', -4.9, -3.4, 1.1);

    // study desk + chair
    this.prop(kit, 'prop.desk', -5.5, 0, -0.6, Math.PI / 2, () => {
      const g = mf.group(mf.at(mf.box(1.4, 0.06, 0.7, { tex: 'lightWood' }), 0, 0.75, 0));
      [[-0.62, -0.3], [0.62, -0.3], [-0.62, 0.3], [0.62, 0.3]].forEach(([x, z]) => g.add(mf.at(mf.box(0.06, 0.75, 0.06, DARK), x, 0.37, z)));
      g.add(mf.at(mf.cyl(0.05, 0.08, 0.35, 0x2F6FDB, 8), 0.5, 0.95, -0.15));
      g.add(mf.at(mf.box(0.5, 0.03, 0.35, { tex: 'paper' }), -0.1, 0.8, 0.05));
      return g;
    });
    this.prop(kit, 'prop.chair', -4.7, 0, -0.6, -Math.PI / 2, () => mf.group(
      mf.at(mf.box(0.5, 0.05, 0.5, DARK), 0, 0.45, 0), mf.at(mf.box(0.5, 0.5, 0.05, DARK), 0, 0.7, -0.25),
      ...[[-0.22, -0.22], [0.22, -0.22], [-0.22, 0.22], [0.22, 0.22]].map(([x, z]) => mf.at(mf.box(0.05, 0.45, 0.05, DARK), x, 0.22, z))));
    C.addBox(-6, -5.1, -1.35, 0.15);
    this.hotspot('house.desk', -4.4, -0.6, 1.4);

    // Ahmet and Ali's room: Ahmet's bed by the east wall, Ali's small bed, a wardrobe, a rug
    this.prop(kit, 'prop.bed', 11.4, 0, 1.05, 0, () => mf.group(
      mf.at(mf.box(2, 0.4, 2.4, DARK), 0, 0.2, 0),
      mf.at(mf.box(1.9, 0.18, 2.3, 0xffffff), 0, 0.49, 0),
      mf.at(mf.box(1.92, 0.08, 1.7, { tex: 'quilt' }), 0, 0.6, 0.3),
      mf.at(mf.box(0.9, 0.18, 0.45, 0xF4E6C8), 0, 0.65, -0.85),
      mf.at(mf.box(2, 0.9, 0.1, DARK), 0, 0.45, -1.2)));
    C.addBox(10.4, 12.4, -0.25, 2.3);
    this.hotspot('house.bed', 9.8, 1.4, 1.5);
    add(mf.at(mf.box(1.2, 0.3, 1.9, DARK), 7.3, 0.15, 0.6)); // Ali's bed
    add(mf.at(mf.box(1.1, 0.12, 1.8, 0xffffff), 7.3, 0.36, 0.6));
    add(mf.at(mf.box(1.12, 0.06, 1.2, 0x3E8E4A), 7.3, 0.44, 0.85));
    add(mf.at(mf.box(0.6, 0.12, 0.35, 0xF4E6C8), 7.3, 0.47, -0.1));
    C.addBox(6.65, 7.95, -0.3, 1.6);
    this.prop(kit, 'prop.wardrobe', 12.3, 0, 3.6, -Math.PI / 2, () => mf.group(
      mf.at(mf.box(1.6, 2.1, 0.6, DARK), 0, 1.05, 0),
      mf.at(mf.box(0.02, 1.9, 0.02, 0x2A1E15), 0, 1.05, 0.31),
      ...[-0.12, 0.12].map((x) => mf.at(mf.sphere(0.035, 0xE0B04A, 6), x, 1.1, 0.32))));
    C.addBox(11.95, 12.6, 2.75, 4.45);
    add(mf.at(mf.box(2.2, 0.02, 1.6, { tex: 'kilim' }), 9.0, 0.012, 2.9));

    // coat rack (the jacket item hangs here)
    add(mf.at(mf.cyl(0.05, 0.05, 1.9, DARK, 8), -12.5, 0.95, 3.9));
    add(mf.at(mf.cyl(0.3, 0.3, 0.05, DARK, 12), -12.5, 0.03, 3.9));
    C.addCircle(-12.5, 3.9, 0.35);
    add(mf.at(mf.box(1.2, 0.5, 0.4, { tex: 'lightWood' }), -11.0, 0.25, 4.45)); // shoe shelf
    [[-11.3, 0x3A2A20], [-10.8, 0xC8456A]].forEach(([x, c]) => add(mf.at(mf.box(0.18, 0.1, 0.32, c), x, 0.55, 4.45)));
    C.addBox(-11.65, -10.35, 4.2, 4.7);
    add(mf.at(mf.box(4.5, 0.02, 1.1, { tex: 'kilim' }), -9.7, 0.012, 2.1)); // runner from the door to the salon

    // floor lamp — lights up at night
    const shadeMat = mf.uniqueMat(0xF4E6C8, { emissive: 0x000000 });
    this.glows.push(shadeMat);
    add(mf.at(mf.cyl(0.04, 0.04, 1.5, 0x2A1E15, 6), 1.9, 0.75, -3.9));
    add(mf.at(new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.3, 0.35, 12), shadeMat), 1.9, 1.55, -3.9));
    this.lamps.push(new THREE.Vector3(1.9, 1.9, -3.4), new THREE.Vector3(-2, 2.6, 1.5), new THREE.Vector3(9.4, 2.6, 1.6), new THREE.Vector3(-9.7, 2.6, 0.8)); // salon ×2, children's room, hall

    // plant
    add(mf.at(mf.cyl(0.2, 0.16, 0.4, 0xB5482E, 10), 5.5, 0.2, 1.1));
    add(mf.at(mf.ico(0.4, { tex: 'leaves' }), 5.5, 0.75, 1.1));
    C.addCircle(5.5, 1.1, 0.4);
    this.hotspot('house.plant', 4.95, 1.1, 1.1);
    this.hotspot('house.table', 0.55, 0.55, 1.0); // other side of the sini from 'Sofraya otur'
    this.hotspot('house.sweep', 1.6, 1.5, 1.3);

    // TV flicker while watching
    this.tvTime = 0;
    this.animated.push((dt, t) => {
      if (!this.tvScreen) return;
      this.tvTime = Math.max(0, this.tvTime - dt);
      if (this.tvTime > 0) this.tvScreen.emissive.setHSL((t * 0.4) % 1, 0.6, 0.35 + Math.sin(t * 9) * 0.08);
      else this.tvScreen.emissive.setScalar(0);
    });

    // bathroom: washbasin (lavabo, for abdest) with a mirror, toilet, shower, towel
    this.prop(kit, 'prop.lavabo', -12.2, 0, -4.35, 0, () => mf.group(
      mf.at(mf.box(0.7, 0.18, 0.45, 0xFFFFFF), 0, 0.85, 0),
      mf.at(mf.cyl(0.05, 0.08, 0.76, 0xFFFFFF, 10), 0, 0.38, -0.05),
      mf.at(mf.cyl(0.02, 0.02, 0.2, { tex: 'metal' }, 6), 0, 1.02, -0.15),
      mf.at(mf.box(0.55, 0.65, 0.03, 0xCFE8F7), 0, 1.5, -0.2))); // mirror
    C.addBox(-12.6, -11.8, -4.6, -4.1);
    this.hotspot('house.lavabo', -12.2, -3.6, 1.0);
    this.hotspot('house.sinkwash', -12.2, -3.6, 1.0);
    this.prop(kit, 'prop.toilet', -10.6, 0, -4.25, 0, () => mf.group(
      mf.at(mf.cyl(0.2, 0.16, 0.4, 0xFFFFFF, 14), 0, 0.2, 0.1),
      mf.at(mf.cyl(0.22, 0.22, 0.04, 0xF2F2F2, 14), 0, 0.42, 0.1),
      mf.at(mf.box(0.42, 0.5, 0.18, 0xFFFFFF), 0, 0.65, -0.17)));
    C.addBox(-10.9, -10.3, -4.6, -3.85);
    add(mf.at(mf.box(1.0, 0.08, 1.0, 0xE8EEF2), -12.75, 0.04, -1.6)); // shower tray, curtain, shower head
    add(mf.at(mf.box(0.04, 1.8, 1.0, { tex: 'curtain' }), -12.22, 1.2, -1.6));
    add(mf.at(mf.cyl(0.08, 0.08, 0.04, { tex: 'metal' }, 10), -13.1, 2.0, -1.6));
    C.addBox(-13.2, -12.2, -2.1, -1.1);
    add(mf.at(mf.box(0.04, 0.6, 0.35, 0x5BA3C9), -9.84, 1.25, -2.6)); // towel

    // parents' bedroom: double bed against the back wall, bedside tables, wardrobe
    this.prop(kit, 'prop.bigBed', -7.9, 0, -3.35, 0, () => mf.group(
      mf.at(mf.box(1.8, 0.4, 2.2, DARK), 0, 0.2, 0),
      mf.at(mf.box(1.7, 0.18, 2.1, 0xffffff), 0, 0.49, 0),
      mf.at(mf.box(1.72, 0.08, 1.5, 0x8E5B3A), 0, 0.6, 0.3),
      ...[-0.42, 0.42].map((x) => mf.at(mf.box(0.6, 0.16, 0.35, 0xF4E6C8), x, 0.64, -0.8)),
      mf.at(mf.box(1.8, 1.0, 0.1, DARK), 0, 0.5, -1.1)));
    C.addBox(-8.85, -6.95, -4.6, -2.2);
    [-9.2, -6.6].forEach((x) => add(mf.at(mf.box(0.4, 0.5, 0.4, { tex: 'lightWood' }), x, 0.25, -4.3)));
    this.prop(kit, 'prop.wardrobe2', -9.3, 0, -1.6, Math.PI / 2, () => mf.box(1.4, 2.1, 0.6, DARK));
    C.addBox(-9.65, -8.95, -2.35, -0.85);

    // prayer: grandpa leads in front, the family stands in rows behind him, facing the back wall
    // men's row (saf1…) and women's row (saf2…), 0.8 m apart so nobody overlaps
    const SPOTS = { imam: [-2.6, 1.35], saf1: [-3.0, 2.6], saf1b: [-2.2, 2.6], saf1c: [-3.8, 2.6], saf1d: [-1.4, 2.6], saf2: [-3.0, 3.95], saf2b: [-3.8, 3.95], saf2c: [-2.2, 3.95] };
    Object.entries(SPOTS).forEach(([name, [x, z]]) => this.anchor(name, x, z, Math.PI));
    this.rugs = mf.group(...Object.values(SPOTS).map(([x, z]) =>
      mf.at(mf.box(0.62, 0.015, 1.0, { tex: 'kilim' }), x, 0.012, z - 0.25)));
    this.rugs.visible = false;
    add(this.rugs);
    this.hotspot('house.seccade', -2.2, 2.6, 1.2);

    this.anchor('start', 0.8, -2.6, 0);
    this.anchor('sofraGuest', -0.8, 1.7, Math.PI);
    this.anchor('bedside', 9.3, 1.6, -Math.PI / 2);
    this.anchor('door', -12.1, 2.1, Math.PI / 2);
  }
}
