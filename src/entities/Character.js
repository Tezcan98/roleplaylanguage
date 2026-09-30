import * as THREE from 'three';
import { buildRig, RIG_PROPS } from './CharacterRig.js';
import { fitToBox } from '../engine/ModelLibrary.js';

const wrapAngle = (d) => { while (d > Math.PI) d -= Math.PI * 2; while (d < -Math.PI) d += Math.PI * 2; return d; };

/** Anything with a body in the world: the player and every NPC. */
export class Character {
  constructor(id, appearance, { mf, models }) {
    this.id = id;
    this.appearance = appearance;
    this.rig = buildRig(mf, appearance);
    this.group = this.rig.g;
    (appearance.props || []).forEach((p) => { this.rig.props[p] = RIG_PROPS[p](mf, this.rig); this.rig.props[p].visible = false; });
    this.mixer = null;
    this.clips = {};
    if (models?.has(`char.${id}`)) this.#swapModel(models);
  }

  get position() { return this.group.position; }
  get visible() { return this.group.visible; }
  set visible(v) { this.group.visible = v; }

  place({ x, z, rot = 0 }) { this.group.position.set(x, 0, z); this.group.rotation.y = rot; }
  showProp(name, on) { if (this.rig.props[name]) this.rig.props[name].visible = on; }

  turnTo(angle, k) { this.group.rotation.y += wrapAngle(angle - this.group.rotation.y) * k; }
  faceTowards(p, k = 0.15) { this.turnTo(Math.atan2(p.x - this.position.x, p.z - this.position.z), k); }

  walk(t, amount) {
    const r = this.rig, s = Math.sin(t * 10) * 0.6 * amount;
    r.legL.rotation.x = s; r.legR.rotation.x = -s; r.armL.rotation.x = -s * 0.8; r.armR.rotation.x = s * 0.8;
    this.#playClip(amount > 0.05 ? 'walk' : 'idle');
  }

  update(dt) { this.mixer?.update(dt); }

  /** A GLB from Meshy (assets/manifest.json → "char.<id>") replaces the blocky body. */
  #swapModel(models) {
    const box = new THREE.Box3(new THREE.Vector3(-0.4, 0, -0.3), new THREE.Vector3(0.4, 2.15, 0.3));
    models.load(`char.${this.id}`).then(({ scene, animations }) => {
      this.rig.body.visible = false;
      this.group.add(fitToBox(scene, box, 'height'));
      if (animations.length) {
        this.mixer = new THREE.AnimationMixer(scene);
        animations.forEach((a) => { this.clips[/walk|run/i.test(a.name) ? 'walk' : 'idle'] ??= this.mixer.clipAction(a); });
        this.#playClip('idle');
      }
    }).catch((e) => console.warn(`[models] char.${this.id}:`, e.message));
  }

  #playClip(name) {
    if (!this.mixer || this.current === name || !this.clips[name]) return;
    this.clips[this.current]?.fadeOut(0.2);
    this.clips[name].reset().fadeIn(0.2).play();
    this.current = name;
  }
}
