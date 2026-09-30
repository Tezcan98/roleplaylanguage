import * as THREE from 'three';
import { Location } from '../Location.js';
const WOOD = { tex: 'darkWood' }, LIGHT_WOOD = { tex: 'lightWood' };
export class VillageSquare extends Location {
  constructor() { super({ id: 'village', name: 'Köy Meydanı', bounds: { x: [-18, 18], z: [-18, 18] } }); }
  build(kit) {
    const m = kit.mf, C = this.collision, add = (mesh) => this.add(mesh);
    add(m.ground(38, 38, { tex: 'stone', repeat: [12, 12] }, 0.01));
    add(m.ground(8, 38, { tex: 'dirt', repeat: [2, 14] }, 0.025)).position.x = -18;
    add(m.ground(7, 38, { tex: 'dirt', repeat: [2, 14] }, 0.025)).position.x = 18;
    this.prop(kit, 'prop.villageFountain', 0, 0, 0, 0, () => m.group(
      m.at(m.cyl(2.2, 2.5, 0.45, { tex: 'stone' }, 28), 0, 0.22, 0),
      m.at(m.cyl(1.55, 1.2, 0.55, { tex: 'stone' }, 28), 0, 0.58, 0),
      m.at(m.cyl(0.13, 0.16, 2.1, { tex: 'stone' }, 12), 0, 1.55, 0),
      m.at(m.sphere(0.35, 0x9ED8E8, 16), 0, 2.45, 0)));
    C.addCircle(0, 0, 2.5);
    this.prop(kit, 'prop.bakkal', 9.8, 0, -7.5, 0, () => m.group(
      m.at(m.box(7, 3.6, 5.2, { tex: 'plaster', repeat: [2, 1] }), 0, 1.8, 0),
      m.at(m.box(7.5, 0.25, 1.3, { tex: 'roof', repeat: [3, 1] }), 0, 3.75, 0),
      m.at(m.box(3.4, 1.8, 0.15, { tex: 'darkWood' }), 0, 1.3, 2.66),
      m.at(m.box(3.8, 0.35, 1.1, LIGHT_WOOD), 0, 2.75, 2.9),
      m.at(m.box(0.8, 0.9, 0.8, LIGHT_WOOD), -2.3, 0.45, 2.85),
      m.at(m.box(0.8, 0.9, 0.8, LIGHT_WOOD), 2.3, 0.45, 2.85)));
    C.addBox(6.1, 13.5, -10.2, -4.9);
    this.anchor('bakkal', 9.8, -3.7, Math.PI);
    this.prop(kit, 'prop.muhtarOffice', -10, 0, -7.5, 0, () => m.group(
      m.at(m.box(6.5, 3.5, 5.5, { tex: 'whiteWall', repeat: [2, 1] }), 0, 1.75, 0),
      m.at(m.box(7, 0.25, 1.4, { tex: 'roof', repeat: [3, 1] }), 0, 3.65, 0),
      m.at(m.box(2.6, 1.9, 0.15, { tex: 'darkWood' }), 0, 1.25, 2.78),
      m.at(m.box(0.08, 3.2, 0.08, WOOD), -2.3, 2.7, 2.95),
      m.at(m.box(0.9, 0.55, 0.05, 0xE94B35), -1.8, 3.65, 2.95)));
    C.addBox(-13.3, -6.7, -10.3, -4.7);
    this.anchor('muhtar', -10, -3.7, Math.PI);
    add(m.at(m.box(3.8, 0.25, 0.8, LIGHT_WOOD), -5.8, 0.85, 5));
    add(m.at(m.box(0.12, 0.8, 0.12, WOOD), -7.3, 0.4, 5));
    add(m.at(m.box(0.12, 0.8, 0.12, WOOD), -4.3, 0.4, 5));
    add(m.at(m.box(3.8, 0.25, 0.8, LIGHT_WOOD), 5.8, 0.85, 5));
    add(m.at(m.box(0.12, 0.8, 0.12, WOOD), 4.3, 0.4, 5));
    add(m.at(m.box(0.12, 0.8, 0.12, WOOD), 7.3, 0.4, 5));
    this.anchor('benchWest', -5.8, 4.2, 0); this.anchor('benchEast', 5.8, 4.2, Math.PI);
    this.prop(kit, 'prop.well', -1, 0, 9, 0, () => m.group(
      m.at(m.cyl(1.15, 1.3, 0.8, { tex: 'stone' }, 18), 0, 0.4, 0),
      m.at(m.box(2.5, 0.12, 0.12, WOOD), 0, 2, 0),
      m.at(m.cyl(0.06, 0.06, 1.8, WOOD, 8), 0, 1.1, 0)));
    C.addCircle(-1, 9, 1.5);
    [[-5,10],[6,10],[13,6],[-13,7],[14,-12],[-4,-12]].forEach(([x,z]) => {
      const tree = new THREE.Group();
      tree.add(m.at(m.cyl(0.22,0.3,1.8,{tex:'bark'}),0,0.9,0));
      tree.add(m.at(m.ico(1.55,{tex:'leaves',repeat:[2,2]}),0,2.7,0));
      tree.position.set(x,0,z); add(tree); C.addCircle(x,z,0.7);
    });
    const post=(x,z)=>add(m.at(m.box(0.18,1,0.18,WOOD),x,0.5,z));
    for(let z=-17;z<=17;z+=2){if(Math.abs(z)>2)post(-17,z);post(17,z);}
    for(let x=-17;x<=17;x+=2){post(x,-17);post(x,17);}
    const rail=(x,z,w,d)=>[0.75,0.4].forEach(y=>add(m.at(m.box(w,0.08,d,WOOD),x,y,z)));
    rail(0,-17,34,0.08); rail(0,17,34,0.08); rail(17,0,0.08,34); rail(-17,-8.5,0.08,17); rail(-17,8.5,0.08,17);
    this.anchor('yardRoad',-14.8,0,Math.PI/2); this.hotspot('village.yard',-16.2,0,2.2);
  }
}