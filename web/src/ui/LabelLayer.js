import * as THREE from 'three';
import { el } from './dom.js';
import { gloss } from '../i18n/Gloss.js';

/** Name tags only for those this close (m): a crowd far away needs none. */
const NAMES_WITHIN = 30;

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

  /**
   * Speech bubble over a character for a few seconds (`mood`: 'ok' | 'bad'). `en`: what it
   * means, shown under the Turkish in the player's own language (hidden with the translations).
   */
  bubble(character, text, mood, seconds = 3.5, en = '') {
    let b = this.bubbles.get(character.id);
    if (!b) { b = { node: el('div', { class: 'bubble' }) }; this.root.append(b.node); this.bubbles.set(character.id, b); }
    Object.assign(b, { character, until: performance.now() / 1000 + seconds });
    const meaning = en && gloss(en);
    b.node.replaceChildren(text, ...(meaning ? [el('small', { class: 'bubble-en en-t', text: meaning })] : []));
    b.node.className = `bubble ${mood ?? ''}`;
  }

  /**
   * Over a point in the world. Moved with a transform (no layout) and only when it really moved;
   * shown / hidden only on a change: a crowd of name tags rewritten every frame made the page lay
   * itself out again and again (stutter).
   */
  #pin(node, pos, y) {
    const s = this.ctx.toScreen(this.#v.copy(pos).setY(y));
    if (s.z > 1) { this.#hide(node); return; }
    if (node._shown !== true) { node.style.display = 'block'; node._shown = true; }
    const x = Math.round(s.x), yy = Math.round(s.y);
    if (node._x === x && node._y === yy) return;
    node._x = x; node._y = yy;
    node.style.transform = `translate(${x}px, ${yy}px) translate(-50%, -100%)`;
  }

  #hide(node) { if (node._shown !== false) { node.style.display = 'none'; node._shown = false; } }

  /** @param {{npcs: import('../entities/Npc.js').Npc[], target: string|null, show: boolean, player, now: number}} p */
  update({ npcs, target, show, player, now }) {
    const shown = new Set();
    if (show) for (const n of npcs) {
      let node = this.#names.get(n.id);
      if (!node) { node = el('div', { class: 'label' }); this.root.append(node); this.#names.set(n.id, node); }
      const isT = target === n.id;
      if (!isT && Math.hypot(n.position.x - player.position.x, n.position.z - player.position.z) > NAMES_WITHIN) continue; // far away: no name tag
      const cls = `label${isT ? ' q' : ''}`, text = `${isT ? '! ' : ''}${n.call ? '📞 ' : ''}${n.voice ? '🎙️ ' : ''}${n.name}`;
      if (node.className !== cls) node.className = cls;
      if (node._text !== text) { node.textContent = text; node._text = text; }
      this.#pin(node, n.position, 2.55 * n.group.scale.y);
      shown.add(n.id);
    }
    this.#names.forEach((node, id) => { if (!shown.has(id)) this.#hide(node); });
    if (show && player.voice) this.#pin(this.mic, player.position, 2.15);
    else this.#hide(this.mic);
    if (show && now < this.thinkUntil) this.#pin(this.thought, player.position, 2.1);
    else this.#hide(this.thought);
    const wall = performance.now() / 1000;
    this.bubbles.forEach((b) => {
      if (wall < b.until && b.character.visible) this.#pin(b.node, b.character.position, Math.max(2.75, 3.05 * b.character.group.scale.y)); // above the name tag
      else this.#hide(b.node);
    });
  }
}
