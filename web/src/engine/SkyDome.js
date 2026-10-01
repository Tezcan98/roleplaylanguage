import * as THREE from 'three';

/**
 * Gradient sky sphere with a sun glow, drifting clouds, stars and a moon.
 * DayNightLighting feeds it colours and the sun direction every frame.
 */
export class SkyDome {
  constructor(scene, mf) {
    this.uniforms = {
      top: { value: new THREE.Color(0x5AA8E6) },
      horizon: { value: new THREE.Color(0xCFE8F7) },
      sunDir: { value: new THREE.Vector3(0, 1, 0) },
      sunColor: { value: new THREE.Color(0xFFF1C8) },
      sunStrength: { value: 1 },
    };
    const mat = new THREE.ShaderMaterial({
      uniforms: this.uniforms, side: THREE.BackSide, depthWrite: false, fog: false,
      vertexShader: `varying vec3 vDir; void main(){ vDir = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.); }`,
      fragmentShader: `uniform vec3 top, horizon, sunColor, sunDir; uniform float sunStrength; varying vec3 vDir;
        void main(){
          float h = clamp(vDir.y, -0.2, 1.0);
          vec3 c = mix(horizon, top, pow(max(h, 0.0), 0.55));
          float s = max(dot(normalize(vDir), normalize(sunDir)), 0.0);
          c += sunColor * (pow(s, 600.0) * 3.0 + pow(s, 12.0) * 0.35) * sunStrength;
          gl_FragColor = vec4(c, 1.0);
          #include <tonemapping_fragment>
          #include <colorspace_fragment>
        }`,
    });
    this.dome = new THREE.Mesh(new THREE.SphereGeometry(95, 32, 16), mat);
    this.dome.renderOrder = -1;

    this.clouds = new THREE.Group();
    const cloudMat = new THREE.MeshLambertMaterial({ color: 0xffffff, emissive: 0x9aa4b0, emissiveIntensity: 0.35, fog: false });
    this.cloudMat = cloudMat;
    for (let i = 0; i < 14; i++) {
      const c = new THREE.Group();
      const n = 3 + ((Math.random() * 4) | 0);
      for (let k = 0; k < n; k++) {
        const puff = new THREE.Mesh(new THREE.IcosahedronGeometry(2 + Math.random() * 2.2, 1), cloudMat);
        puff.position.set(k * 2.4 - n, Math.random() * 1.2, (Math.random() - 0.5) * 2.5);
        puff.scale.y = 0.6;
        c.add(puff);
      }
      const a = Math.random() * Math.PI * 2, r = 45 + Math.random() * 30;
      c.position.set(Math.cos(a) * r, 26 + Math.random() * 14, Math.sin(a) * r);
      c.userData.speed = 0.4 + Math.random() * 0.6;
      this.clouds.add(c);
    }

    const n = 600, pos = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2, e = 0.12 + Math.random() * 1.35, r = 90;
      pos.set([Math.cos(a) * Math.cos(e) * r, Math.sin(e) * r, Math.sin(a) * Math.cos(e) * r], i * 3);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    this.stars = new THREE.Points(g, new THREE.PointsMaterial({ color: 0xffffff, size: 0.7, fog: false, transparent: true }));
    this.moon = new THREE.Mesh(new THREE.SphereGeometry(2.4, 20, 14), new THREE.MeshBasicMaterial({ color: 0xFFF6DA, fog: false }));
    this.moon.position.set(-40, 45, -60);

    this.root = new THREE.Group();
    this.root.add(this.dome, this.clouds, this.stars, this.moon);
    scene.add(this.root);
  }

  /** @param {{ top, horizon, sunDir, day, night, visible, center }} s */
  update(dt, s) {
    this.root.visible = s.visible;
    if (!s.visible) return;
    this.root.position.set(s.center.x, 0, s.center.z);
    this.uniforms.top.value.copy(s.top);
    this.uniforms.horizon.value.copy(s.horizon);
    this.uniforms.sunDir.value.copy(s.sunDir);
    this.uniforms.sunStrength.value = s.day;
    this.cloudMat.color.setScalar(0.35 + 0.65 * s.day).lerp(s.horizon, 0.15);
    this.cloudMat.emissiveIntensity = 0.1 + 0.3 * s.day;
    this.clouds.children.forEach((c) => {
      c.position.x += c.userData.speed * dt;
      if (c.position.x > 80) c.position.x = -80;
    });
    this.stars.visible = s.night > 0.05;
    this.stars.material.opacity = s.night;
    this.moon.visible = s.night > 0.3;
  }
}
