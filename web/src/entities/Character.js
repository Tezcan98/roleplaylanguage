import * as THREE from 'three';
import { buildRig, RIG_PROPS } from './CharacterRig.js';
import { fitToBox } from '../engine/ModelLibrary.js';
import { sitPose } from './Behaviors.js';
import { addHeadscarf, addDress, paintOutfit, addShoes, paintLook, addLookExtras, facingZ } from './hdClothes.js';

/** The jacket's colour (the blocky one's, CharacterRig.js). */
const JACKET = 0xB5482E;
const wrapAngle = (d) => { while (d > Math.PI) d -= Math.PI * 2; while (d < -Math.PI) d += Math.PI * 2; return d; };

/** Anything with a body in the world: the player and every NPC. */
export class Character {
  #hd = null;
  #aura = null;
  #hdKey = null;
  #hdWanted = false;
  #lastPos = null;
  #kick = null; // { t, dur, power }: a kick of the ball, the right leg swings
  constructor(id, appearance, { mf, models }) {
    this.id = id;
    this.appearance = appearance;
    this.models = models;
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
  showProp(name, on) {
    if (this.rig.props[name]) this.rig.props[name].visible = on;
    if (name === 'jacket') { this.jacketOn = on; this.#hdJacket(); }
  }

  /** The jacket on the HD body too: its top (shirt and sleeves) in the jacket's colour, a gold zip down the front. */
  #hdJacket() {
    const hd = this.#hd;
    if (!hd || hd === 'loading') return;
    hd.scene.traverse((o) => {
      if (!o.isMesh) return;
      for (const m of [o.material].flat()) {
        if (!['Shirt', 'Clothes', 'Main'].includes(m.name)) continue;
        m.userData.own ??= m.color.getHex();
        m.color.setHex(this.jacketOn ? JACKET : m.userData.own);
      }
    });
    if (this.jacketOn && !hd.zip) { // a thin gold line on the chest, fixed to the upper body
      const chest = hd.scene.getObjectByName('Chest') ?? hd.scene.getObjectByName('Torso') ?? hd.scene.getObjectByName('Abdomen');
      if (chest) {
        const box = new THREE.Box3(); hd.scene.traverse((o) => { if (o.isMesh && [o.material].flat().some((m) => m.name === 'Shirt')) box.expandByObject(o, true); });
        if (!box.isEmpty()) {
          const ws = this.group.getWorldScale(new THREE.Vector3()).x, h = (box.max.y - box.min.y) * 0.55;
          const zip = new THREE.Mesh(new THREE.BoxGeometry(0.035 / ws, h / ws, 0.02 / ws), new THREE.MeshStandardMaterial({ color: 0xE0B04A, roughness: 0.5 }));
          const facing = this.group.rotation.y; this.group.rotation.y = 0; this.group.updateMatrixWorld(true);
          zip.position.copy(this.group.worldToLocal(new THREE.Vector3((box.min.x + box.max.x) / 2, box.max.y - h * 0.55, box.max.z + 0.005)));
          this.group.add(zip); chest.attach(zip);
          this.group.rotation.y = facing;
          hd.zip = zip;
        }
      }
    }
    if (hd.zip) hd.zip.visible = !!this.jacketOn;
  }

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

  /**
   * On horseback (`mount` = { group, seat, play(name), update(dt) }, see systems/Animals.js) or off
   * (null). The horse goes where the character goes; the rider sits on its back, legs astride.
   */
  setMount(mount) {
    this.mount = mount;
    const r = this.rig;
    if (mount) {
      this.seated = false;
      r.legL.rotation.set(-1.25, 0, 0.35); r.legR.rotation.set(-1.25, 0, -0.35); r.armL.rotation.x = r.armR.rotation.x = -0.8;
      if (this.mixer) { this.current = null; this.#playClip('sit'); }
    } else {
      this.group.position.y = 0;
      r.legL.rotation.set(0, 0, 0); r.legR.rotation.set(0, 0, 0); r.armL.rotation.x = r.armR.rotation.x = 0;
      if (this.mixer) { this.current = null; this.#playClip('idle'); }
    }
  }

  walk(t, amount) {
    if (this.seated || this.posed || this.mount) return;
    const r = this.rig, s = Math.sin(t * 10) * 0.6 * amount;
    r.legL.rotation.x = s; r.legR.rotation.x = -s; r.armL.rotation.x = -s * 0.8; r.armR.rotation.x = s * 0.8;
    this.#playClip(amount > 0.05 ? 'walk' : 'idle');
    this.#kickPose();
  }

  /** Kick the ball: the right leg swings back and through (`power` 0–1: a hard shot swings more). */
  kick(power = 0.6, hold = null) { // `hold` (0–1): stop at that moment of the swing (tools: pictures of the pose)
    if (!this.seated && !this.posed) this.#kick = { t: (hold ?? 0) * 0.3, dur: 0.3, power: 0.6 + 0.5 * power, hold: hold != null };
  }

  /** The kicking leg on top of the walk (blocky: the leg joint; HD: the thigh bone, after the animation). */
  #kickPose() {
    const k = this.#kick;
    if (!k) return;
    const p = Math.min(1, k.t / k.dur);
    const a = -1.5 * Math.sin(p * Math.PI) * k.power; // straight through and back (no wind-up: it would come after the ball has gone)
    this.rig.legR.rotation.x = a; // + swings the leg back, − forward
    const thigh = this.mixer && this.mixer === this.#hd?.mixer ? this.#hd.scene.getObjectByName('UpperLegR') : null;
    if (thigh) thigh.rotateX(a); // the bone's x axis turns the same way as the blocky leg's
  }

  update(dt) {
    if (this.mount) { // the horse under the rider: same place and heading; it runs while we move
      const m = this.mount, p = this.group.position;
      const speed = this.#lastPos && dt > 0 ? Math.hypot(p.x - this.#lastPos.x, p.z - this.#lastPos.z) / dt : 0;
      m.group.position.set(p.x, 0, p.z); m.group.rotation.y = this.group.rotation.y;
      p.y = m.seat;
      m.play(speed > 4 ? 'run' : speed > 0.4 ? 'walk' : 'idle');
      m.update(dt);
    }
    const hdWalk = this.#hd?.stride && this.mixer === this.#hd.mixer && this.current === 'walk' ? this.clips.walk : null;
    if (hdWalk && dt > 0) { // the steps keep up with the real speed
      const p = this.group.position, moved = this.#lastPos ? Math.hypot(p.x - this.#lastPos.x, p.z - this.#lastPos.z) / dt : 0;
      const natural = this.#hd.stride * (this.group.scale.x || 1);
      hdWalk.timeScale += (Math.min(3.5, Math.max(0.7, moved / natural || 1)) - hdWalk.timeScale) * Math.min(1, dt * 8);
    }
    this.#lastPos = { x: this.group.position.x, z: this.group.position.z };
    this.mixer?.update(dt);
    if (this.#kick) { if (!this.#kick.hold) this.#kick.t += dt; this.#kickPose(); if (this.#kick.t >= this.#kick.dur) { this.#kick = null; this.rig.legR.rotation.x = 0; } }
    const skirt = this.#hd?.skirt;
    if (skirt) { skirt.skirt.visible = this.#hd.scene.visible && !this.seated; if (skirt.skirt.visible) skirt.follow(); } // seated: the legs, in the dress's colour
    if (this.#aura?.visible) this.#aura.userData.tick(dt);
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
   * The HD character (assets/models/hd_*.glb, Quaternius CC0) instead of the blocky body while
   * `on`: the player's from the shop, and the villagers on the square. Loaded once.
   * `covered`: the hair goes, a headscarf goes on; `dress`: a long skirt; `look`: a villager's
   * own colours and moustache, glasses, cap, apron (CharacterRig's appearance).
   */
  async setHd(models, key, on, { covered = false, dress = false, look = null, scarfColor = null } = {}) {
    this.#hdWanted = on;
    if (on && this.#hd && this.#hd !== 'loading' && this.#hdKey !== key) { // another outfit: drop the old one
      this.#hd.scene.removeFromParent(); this.#hd.skirt?.skirt.removeFromParent(); this.#hd = null;
    }
    if (on && !this.#hd && models?.has(key)) {
      this.#hdKey = key;
      this.#hd = 'loading';
      try {
        const { scene, animations } = await models.load(key);
        // every character its own materials (the clones share them: one shirt colour would paint them all)
        scene.traverse((o) => { if (o.isMesh) o.material = Array.isArray(o.material) ? o.material.map((m) => m.clone()) : o.material.clone(); });
        // the animation first: it moves the bones (and the model's size) into their real place
        const mixer = new THREE.AnimationMixer(scene), clips = {};
        animations.forEach((a) => { clips[a.name] = mixer.clipAction(a); });
        if (clips.sit) { clips.sit.setLoop(THREE.LoopOnce); clips.sit.clampWhenFinished = true; } // sits down and stays
        clips.idle?.play(); mixer.update(0);
        scene.updateMatrixWorld(true);
        const b = new THREE.Box3().setFromObject(scene, true), k = 2.15 / (b.max.y - b.min.y);
        scene.scale.multiplyScalar(k); // the blocky body's height (the group's scale makes a child of it)
        scene.position.y = -b.min.y * k + 0.04 / (this.group.scale.y || 1); // the soles just on the ground (floors and paving lie a little above 0)
        const stride = this.#strideSpeed(scene, mixer, clips);
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
        if (look) paintLook(scene, look);
        addShoes(scene, look?.pants && dress ? 0x4A3A30 : 0x3B2A20);
        this.group.add(scene);
        const extras = facingZ(this.group, () => {
          const scarfParts = covered ? addHeadscarf(scene, this.group, scarfColor ?? scarf) ?? [] : [];
          const skirt = dress ? addDress(scene, this.group, look?.skirt ?? null) : null;
          if (look) addLookExtras(scene, this.group, look);
          return { scarfParts, skirt };
        });
        const { scarfParts, skirt } = extras;
        this.#hd = { scene, mixer, clips, skirt, stride, ...(scarfParts.length ? { scarf: scarfParts, hair } : {}) };
        if (this.jacketOn) this.#hdJacket(); // put on before the HD body had loaded
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

  /**
   * How fast the walk animation itself moves forward (group units a second at normal speed): how
   * far a foot travels back while on the ground, per half step. update() plays the walk that much
   * faster or slower than the character really moves, so the feet don't slide.
   */
  #strideSpeed(scene, mixer, clips) {
    const walk = clips.walk, foot = scene.getObjectByName('FootL');
    if (!walk || !foot) return 0;
    const dur = walk.getClip().duration, v = new THREE.Vector3();
    let lo = Infinity, hi = -Infinity;
    clips.idle?.stop(); walk.play();
    for (let i = 0; i <= 24; i++) { mixer.setTime((dur * i) / 24); scene.updateMatrixWorld(true); scene.worldToLocal(foot.getWorldPosition(v)); lo = Math.min(lo, v.z); hi = Math.max(hi, v.z); }
    walk.stop(); clips.idle?.play(); mixer.setTime(0); scene.updateMatrixWorld(true);
    return ((hi - lo) * scene.scale.z) / (dur / 2);
  }

  /** After a change of seat or behaviour: the HD body sits or stands again. */
  replayHd() { if (this.mixer && this.mixer === this.#hd?.mixer) { this.current = null; this.#playClip(this.seated ? 'sit' : 'idle'); } }

  /**
   * "Altın Yıldız Işığı" (bought in the shop): a gold ring on the ground with a faint glow and a few
   * small sparkles rising round the feet — seen by everyone in the square. Plain (not additive)
   * gold for the ring, so it shows on the light cobblestones in daylight too; nothing more (a
   * column of light was too much).
   */
  setAura(on) {
    if (on && !this.#aura) {
      const g = new THREE.Group();
      const flat = (mesh) => { mesh.rotation.x = -Math.PI / 2; return mesh; };
      const glow = flat(new THREE.Mesh(new THREE.CircleGeometry(0.72, 48), new THREE.MeshBasicMaterial({ color: 0xFFD54A, transparent: true, opacity: 0.2, depthWrite: false })));
      const ring = flat(new THREE.Mesh(new THREE.RingGeometry(0.5, 0.64, 48), new THREE.MeshBasicMaterial({ color: 0xFFB300, transparent: true, opacity: 0.95, depthWrite: false, side: THREE.DoubleSide })));
      const inner = flat(new THREE.Mesh(new THREE.RingGeometry(0.3, 0.36, 48), new THREE.MeshBasicMaterial({ color: 0xFFF3B0, transparent: true, opacity: 0.9, depthWrite: false, side: THREE.DoubleSide })));
      glow.position.y = 0.05; ring.position.y = 0.06; inner.position.y = 0.065;
      // sparkles drifting up round the character
      const N = 6, H = 0.9, pos = new Float32Array(N * 3), seeds = [];
      for (let k = 0; k < N; k++) { const a = Math.random() * Math.PI * 2, r = 0.4 + Math.random() * 0.25; seeds.push({ a, r, y: Math.random() * H, v: 0.2 + Math.random() * 0.2 }); }
      const pg = new THREE.BufferGeometry(); pg.setAttribute('position', new THREE.BufferAttribute(pos, 3));
      const sparks = new THREE.Points(pg, new THREE.PointsMaterial({ color: 0xFFE680, size: 0.06, transparent: true, opacity: 0.85, depthWrite: false, blending: THREE.AdditiveBlending }));
      g.add(glow, ring, inner, sparks);
      g.scale.setScalar(1 / (this.group.scale.x || 1)); // the same size for children and grown-ups
      let t = 0;
      g.userData.tick = (dt) => {
        t += dt;
        const k = 0.5 + 0.5 * Math.sin(t * 3);
        ring.material.opacity = 0.7 + 0.2 * k; glow.material.opacity = 0.15 + 0.1 * k;
        ring.rotation.z += dt * 0.8; inner.rotation.z -= dt * 1.2;
        seeds.forEach((sd, k2) => { sd.y = (sd.y + sd.v * dt) % H; sd.a += dt * 0.6; pos.set([Math.cos(sd.a) * sd.r, 0.1 + sd.y, Math.sin(sd.a) * sd.r], k2 * 3); });
        pg.attributes.position.needsUpdate = true;
      };
      g.userData.tick(0);
      this.#aura = g;
      this.group.add(g);
    }
    if (this.#aura) this.#aura.visible = on;
  }

  #playClip(name) {
    if (!this.mixer || this.current === name || !this.clips[name]) return;
    // every other clip still weighing on the body fades out — not only `current` (after a reset of
    // `current` the idle kept playing under the sit), and also a finished, held one: the sit after
    // getting up from a bench (it is paused, not "running") kept the walk crouched
    Object.entries(this.clips).forEach(([n, a]) => { if (n !== name && a.isScheduled() && a.getEffectiveWeight() > 0) a.fadeOut(0.2); });
    this.clips[name].reset().fadeIn(0.2).play();
    this.current = name;
  }
}
