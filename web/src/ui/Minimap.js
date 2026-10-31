import { withGloss } from '../i18n/Gloss.js';
import { el } from './dom.js';

/** At most this many metres from the player to the map's edge (outdoors); a room fits in whole. */
const RANGE = 22;
const DRAW_EVERY = 1 / 15; // s

/**
 * A round map in the top right corner, turned like the view (up on the map = up the screen): the
 * place's walls and buildings, its doors, the people in it, the player as an arrow in the middle.
 * The one the task is about blinks gold (at the map's edge when further away); so does the door
 * towards them when they are somewhere else. A tap on it says where to go (`onTap`). It folds down to a
 * small map button (remembered in the settings).
 */
export class Minimap {
  #last = -Infinity;

  constructor(host, { world, cast, player, camera, marker, story, settings = null, others = () => [], onTap = null }) {
    Object.assign(this, { world, cast, player, camera, marker, story, settings, others });
    this.canvas = el('canvas', { attrs: { 'aria-hidden': 'true' } });
    this.map = el('button', { class: 'minimap', attrs: { type: 'button', title: withGloss('Harita · nereye gideceğim?', 'Map · where do I go?'), 'aria-label': 'Harita: nereye gideceğim?' }, on: { click: () => onTap?.() } }, [this.canvas]);
    this.toggle = el('button', { class: 'fold-btn', attrs: { type: 'button' }, on: { click: () => this.setCollapsed(!this.collapsed) } });
    this.root = el('div', { class: 'minimap-wrap' }, [this.map, this.toggle]);
    host.append(this.root);
    this.setCollapsed(!!settings?.get('mapCollapsed', false));
  }

  setCollapsed(on) {
    this.collapsed = on;
    this.root.classList.toggle('collapsed', on);
    this.toggle.textContent = on ? '🗺️' : '';
    this.toggle.setAttribute('aria-label', on ? 'Haritayı aç' : 'Haritayı küçült');
    document.body.classList.toggle('has-map', !on); // (the toasts come under the map)
    this.settings?.set('mapCollapsed', on);
  }

  set visible(on) { if (this.root.hidden === on) this.root.hidden = !on; }

  update(t, show) {
    this.visible = show;
    if (!show || this.collapsed || t - this.#last < DRAW_EVERY) return;
    this.#last = t;
    this.#draw(t);
  }

  #draw(t) {
    const cv = this.canvas, size = this.map.clientWidth || 110, dpr = Math.min(2, devicePixelRatio || 1);
    if (cv.width !== Math.round(size * dpr)) { cv.width = cv.height = Math.round(size * dpr); cv.style.width = cv.style.height = `${size}px`; }
    const g = cv.getContext('2d'), h = size / 2;
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.clearRect(0, 0, size, size);

    const loc = this.world.current, P = this.player.position, { x: bx, z: bz } = loc.collision.bounds;
    const range = Math.min(RANGE, Math.max(bx[1] - bx[0], bz[1] - bz[0]) / 2 * 1.08);
    const k = (h - 6) / range, yaw = this.camera.yaw, c = Math.cos(yaw), s = Math.sin(yaw);
    // world x/z → the map (turned like the screen: x to the right, z down; see systems/QuestMarker.js describe())
    const at = (x, z) => { const dx = x - P.x, dz = z - P.z; return [h + (dx * c + dz * s) * k, h + (-dx * s + dz * c) * k]; };
    const poly = (x0, x1, z0, z1) => { g.beginPath(); [[x0, z0], [x1, z0], [x1, z1], [x0, z1]].forEach(([x, z], i) => g[i ? 'lineTo' : 'moveTo'](...at(x, z))); g.closePath(); };

    g.save();
    g.beginPath(); g.arc(h, h, h - 1, 0, Math.PI * 2); g.clip();
    g.fillStyle = 'rgba(42,30,21,.72)'; g.fillRect(0, 0, size, size);
    poly(bx[0], bx[1], bz[0], bz[1]); g.fillStyle = loc.indoor ? 'rgba(214,190,150,.55)' : 'rgba(120,160,90,.55)'; g.fill();
    g.fillStyle = 'rgba(70,52,36,.9)';
    for (const [x0, x1, z0, z1] of loc.collision.boxes) { poly(x0, x1, z0, z1); g.fill(); }

    const blink = 0.5 + 0.5 * Math.sin(t * 7), target = this.story.target(), aim = this.marker.point; // (the target, or the door on the way to it)
    for (const l of (this.world.links ?? []).filter((e) => e.from === loc.id)) {
      const d = loc.hotspots.get(l.hotspot);
      if (!d) continue;
      const [x, y] = at(d.pos.x, d.pos.z), on = !!aim && Math.hypot(d.pos.x - aim.x, d.pos.z - aim.z) < 0.01;
      g.fillStyle = on ? `rgba(255,205,80,${0.45 + 0.55 * blink})` : 'rgba(240,225,190,.85)';
      g.fillRect(x - (on ? 4.5 : 3), y - (on ? 4.5 : 3), on ? 9 : 6, on ? 9 : 6);
    }
    for (const o of this.others()) this.#dot(g, at(o.position.x, o.position.z), 2.6, '#7FC8FF');
    for (const n of this.cast.present()) if (n.id !== target?.npc) this.#dot(g, at(n.position.x, n.position.z), 3, '#F4EEDF'); // (the one the task is about: below, on top)
    g.restore();

    // the target (or the door to it): blinking, kept on the edge of the map when it is further away
    if (aim) {
      let [x, y] = at(aim.x, aim.z);
      const r = Math.hypot(x - h, y - h), edge = h - 7;
      if (r > edge) { x = h + (x - h) / r * edge; y = h + (y - h) / r * edge; }
      g.beginPath(); g.arc(x, y, 4 + blink * 4, 0, Math.PI * 2); g.strokeStyle = `rgba(255,205,80,${1 - blink * 0.6})`; g.lineWidth = 2; g.stroke();
      this.#dot(g, [x, y], 4, blink > 0.35 ? '#FFC93C' : '#B07A10');
    }

    // the player: an arrow the way they face (Character: forward = sin / cos of rotation.y)
    const r = this.player.group.rotation.y, fx = Math.sin(r), fz = Math.cos(r);
    const ux = fx * c + fz * s, uy = -fx * s + fz * c;
    g.beginPath();
    g.moveTo(h + ux * 7, h + uy * 7);
    g.lineTo(h - ux * 4 - uy * 4.5, h - uy * 4 + ux * 4.5);
    g.lineTo(h - ux * 1.5, h - uy * 1.5);
    g.lineTo(h - ux * 4 + uy * 4.5, h - uy * 4 - ux * 4.5);
    g.closePath(); g.fillStyle = '#5FE0FF'; g.fill(); g.strokeStyle = '#1B3A4A'; g.lineWidth = 1.2; g.stroke();
  }

  #dot(g, [x, y], r, fill) {
    g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2);
    g.fillStyle = fill; g.fill(); g.strokeStyle = 'rgba(30,20,12,.9)'; g.lineWidth = 1.2; g.stroke();
  }
}
