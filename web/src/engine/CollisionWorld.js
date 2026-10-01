/** 2D (x/z) collision: axis-aligned boxes, circles and a rectangular boundary. */
export class CollisionWorld {
  constructor({ x, z }) { this.bounds = { x, z }; this.boxes = []; this.circles = []; }

  addBox(x0, x1, z0, z1) { this.boxes.push([x0, x1, z0, z1]); }
  addCircle(x, z, r) { this.circles.push([x, z, r]); }

  /** Push point `p` (Vector3, x/z used) out of every obstacle. */
  resolve(p, r, dynamic = []) {
    for (const b of this.boxes) {
      const cx = Math.max(b[0], Math.min(p.x, b[1])), cz = Math.max(b[2], Math.min(p.z, b[3]));
      const dx = p.x - cx, dz = p.z - cz, d2 = dx * dx + dz * dz;
      if (d2 >= r * r) continue;
      if (d2 > 1e-6) { const d = Math.sqrt(d2); p.x = cx + dx / d * r; p.z = cz + dz / d * r; continue; }
      const o = [p.x - b[0], b[1] - p.x, p.z - b[2], b[3] - p.z];
      const i = o.indexOf(Math.min(...o));
      if (i === 0) p.x = b[0] - r; else if (i === 1) p.x = b[1] + r; else if (i === 2) p.z = b[2] - r; else p.z = b[3] + r;
    }
    for (const c of this.circles.concat(dynamic)) {
      const dx = p.x - c[0], dz = p.z - c[1], rr = r + c[2], d = Math.hypot(dx, dz);
      if (d < rr && d > 1e-6) { p.x = c[0] + dx / d * rr; p.z = c[1] + dz / d * rr; }
    }
    p.x = Math.max(this.bounds.x[0], Math.min(this.bounds.x[1], p.x));
    p.z = Math.max(this.bounds.z[0], Math.min(this.bounds.z[1], p.z));
  }
}
