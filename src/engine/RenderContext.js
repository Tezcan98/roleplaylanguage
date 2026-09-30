import * as THREE from 'three';

/** Owns the WebGL renderer, the scene graph root, the camera and the two global lights. */
export class RenderContext {
  constructor(host = document.body) {
    const r = new THREE.WebGLRenderer({ antialias: true });
    r.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
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
    this.sun.shadow.mapSize.set(2048, 2048);
    Object.assign(this.sun.shadow.camera, { left: -32, right: 32, top: 32, bottom: -32, near: 1, far: 90 });
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

  render() { this.renderer.render(this.scene, this.camera); }
}
