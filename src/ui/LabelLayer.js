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
    this.bubbles = new Map();
    this.mic = el('div', { class: 'label q', text: '🎙️ konuşuyorsun', style: { display: 'none' } });
    this.root.append(this.mic);
  }

  think(text, seconds, now) { this.thought.textContent = text; this.thinkUntil = now + seconds; }

  /** Speech bubble over a character for a few seconds (`mood`: 'ok' | 'bad'). */
  bubble(character, text, mood, seconds = 3.5) {
    let b = this.bubbles.get(character.id);
    if (!b) { b = { node: el('div', { class: 'bubble' }) }; this.root.append(b.node); this.bubbles.set(character.id, b); }
    Object.assign(b, { character, until: performance.now() / 1000 + seconds });
    b.node.textContent = text;
    b.node.className = `bubble ${mood ?? ''}`;
  }

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
      node.textContent = `${isT ? '! ' : ''}${n.voice ? '🎙️ ' : ''}${n.name}`;
      this.#pin(node, n.position, 2.55 * n.group.scale.y);
      shown.add(n.id);
    }
    this.#names.forEach((node, id) => { if (!shown.has(id)) node.style.display = 'none'; });
    if (show && player.voice) this.#pin(this.mic, player.position, 2.15);
    else this.mic.style.display = 'none';
    if (show && now < this.thinkUntil) this.#pin(this.thought, player.position, 2.1);
    else this.thought.style.display = 'none';
    const wall = performance.now() / 1000;
    this.bubbles.forEach((b) => {
      if (wall < b.until && b.character.visible) this.#pin(b.node, b.character.position, Math.max(2.75, 3.05 * b.character.group.scale.y)); // above the name tag
      else b.node.style.display = 'none';
    });
  }
}
