import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { GTAOPass } from 'three/addons/postprocessing/GTAOPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

/**
 * Post-processing chain for the "high"/"medium" quality settings: ambient occlusion (GTAO),
 * a soft bloom for lamps, sun and fireflies, and tone mapping in the output pass.
 * MSAA comes from the multisampled render target.
 */
export class PostFX {
  /** @param {{ ao?: boolean }} opts — ambient occlusion is the expensive part */
  constructor(ctx, { ao = true } = {}) {
    const { renderer, scene, camera } = ctx;
    const size = renderer.getDrawingBufferSize(new THREE.Vector2());
    const target = new THREE.WebGLRenderTarget(size.x, size.y, { type: THREE.HalfFloatType, samples: 4 });
    this.composer = new EffectComposer(renderer, target);
    this.composer.addPass(new RenderPass(scene, camera));
    if (ao) {
      this.ao = new GTAOPass(scene, camera, size.x, size.y);
      this.ao.blendIntensity = 0.75;
      this.ao.updateGtaoMaterial({ radius: 0.6, distanceExponent: 1.5, thickness: 1.5, scale: 1.2, samples: 8 });
      this.composer.addPass(this.ao);
    }
    this.bloom = new UnrealBloomPass(new THREE.Vector2(size.x / 2, size.y / 2), 0.28, 0.5, 0.92);
    this.composer.addPass(this.bloom);
    this.composer.addPass(new OutputPass());
    addEventListener('resize', () => this.resize(ctx));
  }

  resize({ renderer }) {
    const s = renderer.getDrawingBufferSize(new THREE.Vector2());
    this.composer.setSize(s.x / renderer.getPixelRatio(), s.y / renderer.getPixelRatio());
  }

  render() { this.composer.render(); }
}
