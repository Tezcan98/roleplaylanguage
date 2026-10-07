import * as THREE from 'three';
import { buildRig, RIG_PROPS } from './CharacterRig.js';
import { fitToBox } from '../engine/ModelLibrary.js';
import { sitPose } from './Behaviors.js';
import { addHeadscarf, addDress, paintOutfit } from './hdClothes.js';

const wrapAngle = (d) => { while (d > Math.PI) d -= Math.PI * 2; while (d < -Math.PI) d += Math.PI * 2; return d; };

/** Anything with a body in the world: the player and every NPC. */
export class Character {
  #hd = null;
  #aura = null;
  #hdKey = null;
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
    this.#hdPosed(on);
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
  setCovered(on) {
    if (this.covered === on) return;
    this.covered = on;
    this.rig.setCovered?.(on);
    this.#hdCover(on);
  }

  /** The HD body follows too (covered girls: scarf on outside, hair at home). */
  #hdCover(on) {
    const hd = this.#hd;
    if (!hd?.scarf) return;
    hd.scarf.forEach((m) => { m.visible = on; });
    hd.hair.forEach((m) => { m.visible = !on; });
  }

  /** Scripted poses (prayer) need the blocky body's joints: the HD body steps aside meanwhile. */
  #hdPosed(on) {
    const hd = this.#hd;
    if (!hd || hd === 'loading' || !this.#hdWanted) return;
    hd.scene.visible = !on;
    this.rig.body.visible = on;
    this.mixer = on ? null : hd.mixer;
    if (!on) { this.current = null; this.#playClip(this.seated ? 'sit' : 'idle'); }
  }

  walk(t, amount) {
    if (this.seated || this.posed) return;
    const r = this.rig, s = Math.sin(t * 10) * 0.6 * amount;
    r.legL.rotation.x = s; r.legR.rotation.x = -s; r.armL.rotation.x = -s * 0.8; r.armR.rotation.x = s * 0.8;
    this.#playClip(amount > 0.05 ? 'walk' : 'idle');
  }

  update(dt) {
    this.mixer?.update(dt);
    const skirt = this.#hd?.skirt;
    if (skirt) { skirt.skirt.visible = this.#hd.scene.visible && !this.seated; if (skirt.skirt.visible) skirt.follow(); } // seated: the legs, in the dress's colour
    if (this.#aura?.visible) { const k = 0.5 + 0.5 * Math.sin(performance.now() / 260); this.#aura.children[1].material.opacity = 0.55 + 0.4 * k; this.#aura.rotation.z += dt * 0.8; }
  }

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
  async setHd(models, key, on, { covered = false, dress = false } = {}) {
    this.#hdWanted = on;
    if (on && this.#hd && this.#hd !== 'loading' && this.#hdKey !== key) { // another outfit: drop the old one
      this.#hd.scene.removeFromParent(); this.#hd.skirt?.skirt.removeFromParent(); this.#hd = null;
    }
    if (on && !this.#hd && models?.has(key)) {
      this.#hdKey = key;
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
        const skin = this.appearance.skin ?? 0xE9B98F, hair = [];
        scene.traverse((o) => {
          if (!o.isMesh) return;
          o.castShadow = true;
          for (const m of Array.isArray(o.material) ? o.material : [o.material]) {
            m.metalness = 0; m.roughness = 0.85; // the converted files come out dark and shiny
            if (m.name === 'Skin') m.color.setHex(skin);
            if (covered && m.name === 'Hair') { o.visible = false; hair.push(o); }
          }
        });
        const [, outfit, gender] = key.split('.'); // hd.<outfit>.<boy|girl>
        const scarf = paintOutfit(scene, dress ? 'dress' : outfit, gender);
        this.group.add(scene);
        const scarfParts = covered ? addHeadscarf(scene, this.group, scarf) ?? [] : [];
        const skirt = dress ? addDress(scene, this.group) : null;
        this.#hd = { scene, mixer, clips, skirt, ...(scarfParts.length ? { scarf: scarfParts, hair } : {}) };
        if (this.covered === false) this.#hdCover(false); // already at home: hair open
      } catch (e) { console.warn('[models] hd:', e.message); this.#hd = null; return; }
    }
    const hd = this.#hd;
    if (!hd || hd === 'loading') return;
    on = this.#hdWanted;
    hd.scene.visible = on && !this.posed;
    this.rig.body.visible = !on || !!this.posed;
    this.mixer = on && !this.posed ? hd.mixer : null;
    this.clips = on ? hd.clips : {};
    this.current = null;
    if (on) this.#playClip(this.seated ? 'sit' : 'idle');
  }

  /** A pulsing golden ring of light on the ground under the character (bought in the shop). */
  setAura(on) {
    if (on && !this.#aura) {
      const ring = new THREE.Mesh(new THREE.RingGeometry(0.42, 0.62, 40), new THREE.MeshBasicMaterial({ color: 0xFFD54A, transparent: true, opacity: 0.8, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending }));
      const glow = new THREE.Mesh(new THREE.CircleGeometry(0.62, 40), new THREE.MeshBasicMaterial({ color: 0xFFE9A0, transparent: true, opacity: 0.25, depthWrite: false, blending: THREE.AdditiveBlending }));
      this.#aura = new THREE.Group(); this.#aura.add(glow, ring);
      this.#aura.rotation.x = -Math.PI / 2; this.#aura.position.y = 0.06;
      this.#aura.scale.setScalar(1 / (this.group.scale.x || 1)); // the same size for children and grown-ups
      this.group.add(this.#aura);
    }
    if (this.#aura) this.#aura.visible = on;
  }

  #playClip(name) {
    if (!this.mixer || this.current === name || !this.clips[name]) return;
    this.clips[this.current]?.fadeOut(0.2);
    this.clips[name].reset().fadeIn(0.2).play();
    this.current = name;
  }
}
