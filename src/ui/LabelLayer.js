import * as THREE from 'three';
import { el } from './dom.js';

/** HTML labels pinned to 3D positions: NPC names and the player's thought bubble. */
export class LabelLayer {
  #names = new Map();
  #v = new THREE.Vector3();

  constructor(host, ctx) {
    this.ctx = ctx;
    this.root = el('div', { attrs: { id: 'labels' } });
    this.thought = el('div', { class: 'think', style: { display: 'none' } });
    this.root.append(this.thought);
    host.append(this.root);
    this.thinkUntil = 0;
  }

  think(text, seconds, now) { this.thought.textContent = text; this.thinkUntil = now + seconds; }

  #pin(node, pos, y) {
    const s = this.ctx.toScreen(this.#v.copy(pos).setY(y));
    if (s.z > 1) { node.style.display = 'none'; return; }
    node.style.display = 'block';
    node.style.left = `${s.x}px`;
    node.style.top = `${s.y}px`;
  }

  /** @param {{npcs: import('../entities/Npc.js').Npc[], target: string|null, show: boolean, player, now: number}} p */
  update({ npcs, target, show, player, now }) {
    const shown = new Set();
    if (show) for (const n of npcs) {
      let node = this.#names.get(n.id);
      if (!node) { node = el('div', { class: 'label' }); this.root.append(node); this.#names.set(n.id, node); }
      const isT = target === n.id;
      node.className = `label${isT ? ' q' : ''}`;
      node.textContent = `${isT ? '! ' : ''}${n.name}`;
      this.#pin(node, n.position, 2.55 * n.group.scale.y);
      shown.add(n.id);
    }
    this.#names.forEach((node, id) => { if (!shown.has(id)) node.style.display = 'none'; });
    if (show && now < this.thinkUntil) this.#pin(this.thought, player.position, 2.1);
    else this.thought.style.display = 'none';
  }
}
