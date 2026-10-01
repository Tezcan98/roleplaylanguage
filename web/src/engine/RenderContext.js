import * as THREE from 'three';

/** Owns the WebGL renderer, the scene graph root, the camera and the two global lights. */
export class RenderContext {
  /** @param {{ quality?: 'high' | 'medium' | 'low' }} opts — low: lower resolution and shadow map, no post FX */
  constructor(host = document.body, { quality = 'high' } = {}) {
    this.quality = quality;
    const r = new THREE.WebGLRenderer({ antialias: quality === 'low', powerPreference: 'high-performance' });
    r.setPixelRatio(Math.min(window.devicePixelRatio || 1, quality === 'high' ? 2 : 1.25));
    r.toneMapping = THREE.ACESFilmicToneMapping;
    r.toneMappingExposure = 1.05;
    r.setSize(innerWidth, innerHeight);
    r.shadowMap.enabled = true;
    r.shadowMap.type = THREE.PCFSoftShadowMap;
    host.prepend(r.domElement);
    this.renderer = r;

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x9ED2F5);
    this.scene.fog = new THREE.Fog(0x9ED2F5, 35, 75);
    this.camera = new THREE.PerspectiveCamera(55, innerWidth / innerHeight, 0.1, 200);

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

  render() {
    if (this.postfx) this.postfx.render();
    else this.renderer.render(this.scene, this.camera);
  }
}
