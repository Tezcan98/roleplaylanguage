import * as THREE from 'three';
import { buildRig, RIG_PROPS } from './CharacterRig.js';
import { fitToBox } from '../engine/ModelLibrary.js';
import { sitPose } from './Behaviors.js';

const wrapAngle = (d) => { while (d > Math.PI) d -= Math.PI * 2; while (d < -Math.PI) d += Math.PI * 2; return d; };

/** Anything with a body in the world: the player and every NPC. */
export class Character {
  #hd = null;
  #hdWanted = false;
  constructor(id, appearance, { mf, models }) {
    this.id = id;
    this.appearance = appearance;
    this.rig = buildRig(mf, appearance);
    this.group = this.rig.g;
    (appearance.props || []).forEach((p) => { this.rig.props[p] = RIG_PROPS[p](mf, this.rig); this.rig.props[p].visible = false; });
    this.mixer = null;
    this.clips = {};
    this.#hd = null;
    this.#hdWanted = false;
    if (models?.has(`char.${id}`)) this.#swapModel(models);
  }

  get position() { return this.group.position; }
  get visible() { return this.group.visible; }
  set visible(v) { this.group.visible = v; }

  place({ x, z, rot = 0 }) { this.group.position.set(x, 0, z); this.group.rotation.y = rot; }
  showProp(name, on) { if (this.rig.props[name]) this.rig.props[name].visible = on; }

  turnTo(angle, k) { this.group.rotation.y += wrapAngle(angle - this.group.rotation.y) * k; }
  faceTowards(p, k = 0.15) { this.turnTo(Math.atan2(p.x - this.position.x, p.z - this.position.z), k); }

  /** Sit down on a chair at the current spot (or stand up). */
  sit(on) {
    this.seated = on;
    const r = this.rig;
    if (on) { sitPose(0.38)(r); r.armL.rotation.x = r.armR.rotation.x = -0.5; } else { r.body.position.y = 0; r.legL.rotation.x = r.legR.rotation.x = 0; }
    if (this.mixer) { this.current = null; this.#playClip(on ? 'sit' : 'idle'); }
  }

  /** Hand the body over to a scripted pose (e.g. prayer); walking animation pauses meanwhile. */
  setPosed(on) {
    this.posed = on;
    if (!on) {
      const r = this.rig;
      r.body.position.set(0, 0, 0);
      r.body.rotation.x = 0;
      r.head.rotation.y = 0;
      r.legL.rotation.x = r.legR.rotation.x = 0;
      r.armL.rotation.z = r.armR.rotation.z = 0;
    }
  }

  /** Headscarf on or off (only characters that wear one at home and outside differently). */
  setCovered(on) { if (this.covered === on) return; this.covered = on; this.rig.setCovered?.(on); }

  walk(t, amount) {
    if (this.seated || this.posed) return;
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

  /**
   * The HD character from the shop (assets/models/hd_*.glb, Quaternius CC0) instead of the blocky
   * body while `on`. Loaded once; `covered`: the hair goes, a headscarf goes on (Sare).
   */
  async setHd(models, key, on, { covered = false } = {}) {
    this.#hdWanted = on;
    if (on && !this.#hd && models?.has(key)) {
      this.#hd = 'loading';
      try {
        const { scene, animations } = await models.load(key);
        // the animation first: it moves the bones (and the model's size) into their real place
        const mixer = new THREE.AnimationMixer(scene), clips = {};
        animations.forEach((a) => { clips[a.name] = mixer.clipAction(a); });
        if (clips.sit) { clips.sit.setLoop(THREE.LoopOnce); clips.sit.clampWhenFinished = true; } // sits down and stays
        clips.idle?.play(); mixer.update(0);
        scene.updateMatrixWorld(true);
        const b = new THREE.Box3().setFromObject(scene, true);
        scene.scale.multiplyScalar(2.15 / (b.max.y - b.min.y)); // the blocky body's height (the group's scale makes a child of it)
        const skin = this.appearance.skin ?? 0xE9B98F;
        scene.traverse((o) => {
          if (!o.isMesh) return;
          o.castShadow = true;
          for (const m of Array.isArray(o.material) ? o.material : [o.material]) {
            m.metalness = 0; m.roughness = 0.85; // the converted files come out dark and shiny
            if (m.name === 'Skin') m.color.setHex(skin);
            if (covered && m.name === 'Hair') o.visible = false;
          }
        });
        this.group.add(scene);
        if (covered) {
          // sized and placed in world units round the head, then fixed to the head bone (keeps that place)
          const head = scene.getObjectByName('Head');
          this.group.updateMatrixWorld(true);
          const hb = new THREE.Box3();
          scene.traverse((o) => { if (o.isMesh && o.material?.name === 'Skin') hb.expandByObject(o, true); });
          const hp = head.getWorldPosition(new THREE.Vector3());
          const h = hb.max.y - hp.y; // head bone (at the neck) → top of the head: the whole (big, child-like) head
          const scarf = new THREE.Mesh(new THREE.SphereGeometry(1, 24, 16, 0, Math.PI * 2, 0, Math.PI * 0.64), new THREE.MeshStandardMaterial({ color: this.appearance.headscarf ?? 0x9B59B6, roughness: 0.9, side: THREE.DoubleSide }));
          const gs = this.group.getWorldScale(new THREE.Vector3()).x; // world → the group's units
          scarf.scale.set(h * 0.6 / gs, h * 0.6 / gs, h * 0.62 / gs);
          scarf.position.copy(this.group.worldToLocal(new THREE.Vector3(hp.x, hp.y + h * 0.48, hp.z - h * 0.04)));
          scarf.rotation.x = -0.45; // the face stays open, the back of the head and the neck are covered
          this.group.add(scarf);
          head.attach(scarf);
        }
        this.#hd = { scene, mixer, clips };
      } catch (e) { console.warn('[models] hd:', e.message); this.#hd = null; return; }
    }
    const hd = this.#hd;
    if (!hd || hd === 'loading') return;
    on = this.#hdWanted;
    hd.scene.visible = on;
    this.rig.body.visible = !on;
    this.mixer = on ? hd.mixer : null;
    this.clips = on ? hd.clips : {};
    this.current = null;
    if (on) this.#playClip(this.seated ? 'sit' : 'idle');
  }

  #playClip(name) {
    if (!this.mixer || this.current === name || !this.clips[name]) return;
    this.clips[this.current]?.fadeOut(0.2);
    this.clips[name].reset().fadeIn(0.2).play();
    this.current = name;
  }
}
