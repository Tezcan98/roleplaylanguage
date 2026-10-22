import * as THREE from 'three';

/** Owns the WebGL renderer, the scene graph root, the camera and the two global lights. */
export class RenderContext {
  #frame = 0;
  /** @param {{ quality?: 'high' | 'medium' | 'low' }} opts — low: lower resolution and shadow map, no post FX */
  constructor(host = document.body, { quality = 'high' } = {}) {
    this.quality = quality;
    const r = new THREE.WebGLRenderer({ antialias: quality === 'low', powerPreference: 'high-performance' });
    r.setPixelRatio(Math.min(window.devicePixelRatio || 1, quality === 'high' ? 2 : 1.25));
    r.toneMapping = THREE.ACESFilmicToneMapping;
    r.toneMappingExposure = 1.05;
    r.setSize(innerWidth, innerHeight);
    r.shadowMap.enabled = true;
    r.shadowMap.type = quality === 'low' ? THREE.PCFShadowMap : THREE.PCFSoftShadowMap; // (soft edges cost several lookups a pixel)
    r.shadowMap.autoUpdate = quality !== 'low';
    host.prepend(r.domElement);
    this.renderer = r;

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x9ED2F5);
    this.scene.fog = new THREE.Fog(0x9ED2F5, 35, 75);
    this.camera = new THREE.PerspectiveCamera(55, innerWidth / innerHeight, 0.3, 200); // near 0.3: enough depth precision on phones (no flicker of lines on grass)

    this.hemi = new THREE.HemisphereLight(0xffffff, 0x6b8e3a, 2.3);
    this.sun = new THREE.DirectionalLight(0xfff4dc, 3);
    this.sun.position.set(18, 30, 12);
    this.sun.castShadow = true;
    const sm = quality === 'low' ? 1024 : 2048;
    this.sun.shadow.mapSize.set(sm, sm);
    this.sun.shadow.bias = -0.0004;
    this.sun.shadow.normalBias = 0.02;
    Object.assign(this.sun.shadow.camera, { left: -22, right: 22, top: 22, bottom: -22, near: 1, far: 90 });
    this.scene.add(this.hemi, this.sun, this.sun.target);

    addEventListener('resize', () => this.resize());
    // phones: the address bar showing / hiding changes the visible height without a window resize
    visualViewport?.addEventListener('resize', () => this.resize());
  }

  resize() {
    this.camera.aspect = innerWidth / innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(innerWidth, innerHeight);
  }

  get portrait() { return innerWidth / innerHeight < 0.8; }

  /** World position → CSS pixels; z > 1 means behind the camera. */
  toScreen(v) {
    const p = v.clone().project(this.camera);
    return { x: (p.x + 1) / 2 * innerWidth, y: (1 - p.y) / 2 * innerHeight, z: p.z };
  }

  /** Optional post-processing (set by main for the high quality setting). */
  setPostFX(fx) { this.postfx = fx; }

  /**
   * A horse is being ridden in view (set every frame by core/Game.js): on low quality its shadow is drawn as on medium —
   * every frame and at the medium size (drawn every fourth frame it lagged behind a gallop and jumped after it: the horse looked like it shook)
   */
  riding = false;
  #riding = false;

  render() {
    // low quality: the sun's shadows are drawn every fourth frame (the trees and houses don't move;
    // characters have a spot under their feet instead) — a whole second pass saved on three frames out of four
    if (this.quality === 'low') {
      if (this.riding !== this.#riding) {
        this.#riding = this.riding;
        const sm = this.riding ? 2048 : 1024, shadow = this.sun.shadow;
        shadow.mapSize.set(sm, sm); shadow.map?.dispose(); shadow.map = null; // (made again at the new size)
      }
      this.renderer.shadowMap.needsUpdate = this.#riding || (this.#frame = (this.#frame + 1) % 4) === 0;
    }
    if (this.postfx) this.postfx.render();
    else this.renderer.render(this.scene, this.camera);
  }
}
