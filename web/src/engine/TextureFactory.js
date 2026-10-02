import * as THREE from 'three';

/** Deterministic PRNG so procedural textures look the same on every load. */
function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const shade = (hex, k) => {
  const c = new THREE.Color(hex);
  c.offsetHSL(0, 0, k);
  return `#${c.getHexString()}`;
};

function speckle(g, s, r, n, colors, size = [1, 3]) {
  for (let i = 0; i < n; i++) {
    g.fillStyle = colors[(r() * colors.length) | 0];
    const w = size[0] + r() * (size[1] - size[0]);
    g.fillRect(r() * s, r() * s, w, w);
  }
}

function planks(base, seed) {
  return (g, s) => {
    const r = rng(seed);
    const rows = 4, h = s / rows;
    for (let i = 0; i < rows; i++) {
      g.fillStyle = shade(base, (r() - 0.5) * 0.08);
      g.fillRect(0, i * h, s, h);
      g.strokeStyle = shade(base, -0.12);
      g.globalAlpha = 0.35;
      for (let k = 0; k < 7; k++) {
        const y = i * h + r() * h, a = 1 + r() * 3, f = 0.02 + r() * 0.04;
        g.beginPath();
        for (let x = 0; x <= s; x += 8) g.lineTo(x, y + Math.sin(x * f + k) * a);
        g.stroke();
      }
      g.globalAlpha = 1;
      g.fillStyle = shade(base, -0.25);
      g.fillRect(0, i * h, s, 2);
      const cut = r() * s;
      g.fillRect(cut, i * h, 2, h);
    }
  };
}

/** Canvas painters keyed by texture name. Register more with `TextureFactory.register`. */
const GENERATORS = {
  grass(g, s) {
    const r = rng(1);
    g.fillStyle = '#7DB04A'; g.fillRect(0, 0, s, s);
    speckle(g, s, r, 900, ['#6FA23E', '#8CC158', '#79AE45', '#5E9636'], [2, 5]);
    g.lineWidth = 1.2;
    for (let i = 0; i < 700; i++) {
      const x = r() * s, y = r() * s;
      g.strokeStyle = ['#94C95E', '#5B8F33', '#A7D46C'][(r() * 3) | 0];
      g.beginPath(); g.moveTo(x, y); g.lineTo(x + (r() - 0.5) * 4, y - 3 - r() * 5); g.stroke();
    }
  },
  dirt(g, s) {
    const r = rng(2);
    g.fillStyle = '#D7B98A'; g.fillRect(0, 0, s, s);
    speckle(g, s, r, 1400, ['#C9A876', '#E3C89C', '#B99466', '#CDB080'], [1, 4]);
    speckle(g, s, r, 60, ['#A58660', '#E9D6B4'], [3, 6]);
  },
  floorWood: planks('#B9895A', 3),
  darkWood: planks('#7E4727', 4),
  lightWood: planks('#C99B63', 5),
  plaster(g, s) {
    const r = rng(6);
    g.fillStyle = '#F1E4CF'; g.fillRect(0, 0, s, s);
    for (let i = 0; i < 90; i++) {
      g.fillStyle = r() > 0.5 ? 'rgba(255,255,255,.18)' : 'rgba(160,130,90,.07)';
      g.beginPath(); g.arc(r() * s, r() * s, 6 + r() * 26, 0, Math.PI * 2); g.fill();
    }
    speckle(g, s, r, 300, ['rgba(120,100,70,.12)'], [1, 2]);
  },
  whiteWall(g, s) {
    const r = rng(7);
    g.fillStyle = '#F4EFE6'; g.fillRect(0, 0, s, s);
    for (let i = 0; i < 70; i++) {
      g.fillStyle = r() > 0.5 ? 'rgba(255,255,255,.25)' : 'rgba(150,140,120,.08)';
      g.beginPath(); g.arc(r() * s, r() * s, 8 + r() * 30, 0, Math.PI * 2); g.fill();
    }
  },
  roof(g, s) {
    const r = rng(8), rows = 8, cols = 8, h = s / rows, w = s / cols;
    g.fillStyle = '#8E3522'; g.fillRect(0, 0, s, s);
    for (let y = 0; y < rows; y++) for (let x = -1; x < cols + 1; x++) {
      const ox = (y % 2) * w / 2;
      const grd = g.createLinearGradient(0, y * h, 0, y * h + h);
      const base = ['#C2553A', '#B5482E', '#CC6343'][(r() * 3) | 0];
      grd.addColorStop(0, shade(base, 0.08)); grd.addColorStop(1, shade(base, -0.12));
      g.fillStyle = grd;
      g.beginPath();
      g.moveTo(x * w + ox + 1, y * h);
      g.lineTo(x * w + ox + w - 1, y * h);
      g.quadraticCurveTo(x * w + ox + w - 1, y * h + h, x * w + ox + w / 2, y * h + h);
      g.quadraticCurveTo(x * w + ox + 1, y * h + h, x * w + ox + 1, y * h);
      g.fill();
    }
  },
  stone(g, s) {
    const r = rng(9);
    g.fillStyle = '#8F8A80'; g.fillRect(0, 0, s, s);
    for (let i = 0; i < 70; i++) {
      g.fillStyle = shade('#B8B2A6', (r() - 0.5) * 0.18);
      g.beginPath(); g.ellipse(r() * s, r() * s, 12 + r() * 16, 9 + r() * 12, r() * 3, 0, Math.PI * 2); g.fill();
    }
  },
  brick(g, s) {
    const r = rng(10), rows = 8, h = s / rows, w = s / 4;
    g.fillStyle = '#E9DCC6'; g.fillRect(0, 0, s, s);
    for (let y = 0; y < rows; y++) for (let x = -1; x < 5; x++) {
      g.fillStyle = shade('#C0643F', (r() - 0.5) * 0.12);
      g.fillRect(x * w + (y % 2) * w / 2 + 2, y * h + 2, w - 4, h - 4);
    }
  },
  kilim(g, s) {
    g.fillStyle = '#A8322D'; g.fillRect(0, 0, s, s);
    const band = (y, c) => { g.fillStyle = c; g.fillRect(0, y, s, s * 0.04); };
    band(s * 0.06, '#E0B04A'); band(s * 0.9, '#E0B04A');
    g.fillStyle = '#1F3A6B'; g.fillRect(s * 0.14, s * 0.14, s * 0.72, s * 0.72);
    const diamond = (cx, cy, rr, c) => { g.fillStyle = c; g.beginPath(); g.moveTo(cx, cy - rr); g.lineTo(cx + rr, cy); g.lineTo(cx, cy + rr); g.lineTo(cx - rr, cy); g.fill(); };
    diamond(s / 2, s / 2, s * 0.3, '#A8322D');
    diamond(s / 2, s / 2, s * 0.2, '#F4E6C8');
    diamond(s / 2, s / 2, s * 0.1, '#E0B04A');
    for (let i = 0; i < 8; i++) {
      const x = s * 0.1 + i * s * 0.115;
      diamond(x, s * 0.035, s * 0.025, '#F4E6C8');
      diamond(x, s * 0.965, s * 0.025, '#F4E6C8');
    }
    [[0.25, 0.25], [0.75, 0.25], [0.25, 0.75], [0.75, 0.75]].forEach(([x, y]) => diamond(s * x, s * y, s * 0.05, '#E0B04A'));
  },
  sedirFabric(g, s) {
    const r = rng(11);
    g.fillStyle = '#7A3552'; g.fillRect(0, 0, s, s);
    for (let y = 0; y < s; y += 32) for (let x = 0; x < s; x += 32) {
      const ox = (y / 32) % 2 ? 16 : 0;
      g.fillStyle = '#E0B04A';
      for (let k = 0; k < 5; k++) { const a = k / 5 * Math.PI * 2; g.beginPath(); g.arc(x + ox + 16 + Math.cos(a) * 5, y + 16 + Math.sin(a) * 5, 3, 0, 7); g.fill(); }
      g.fillStyle = '#C8456A'; g.beginPath(); g.arc(x + ox + 16, y + 16, 2.5, 0, 7); g.fill();
    }
    speckle(g, s, r, 400, ['rgba(0,0,0,.08)'], [1, 2]);
  },
  quilt(g, s) {
    const r = rng(12), n = 4, w = s / n;
    const cols = ['#F7A8B8', '#8EC5FF', '#F4E6C8', '#B9E3C6', '#E0B04A'];
    for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
      g.fillStyle = cols[(r() * cols.length) | 0]; g.fillRect(x * w, y * w, w, w);
      g.strokeStyle = 'rgba(255,255,255,.7)'; g.setLineDash([4, 4]); g.lineWidth = 2;
      g.strokeRect(x * w + 5, y * w + 5, w - 10, w - 10);
    }
    g.setLineDash([]);
  },
  chalkboard(g, s) {
    const r = rng(13);
    g.fillStyle = '#24473A'; g.fillRect(0, 0, s, s);
    for (let i = 0; i < 40; i++) {
      g.fillStyle = 'rgba(255,255,255,.035)';
      g.beginPath(); g.ellipse(r() * s, r() * s, 30 + r() * 60, 8 + r() * 14, r(), 0, 7); g.fill();
    }
    g.fillStyle = 'rgba(255,255,255,.85)';
    g.font = `bold ${s * 0.11}px Fredoka, sans-serif`;
    g.fillText('Merhaba!', s * 0.08, s * 0.22);
    g.font = `${s * 0.075}px Fredoka, sans-serif`;
    g.fillText('a b c ç d e f g ğ', s * 0.08, s * 0.42);
    g.fillText('bir, iki, üç, dört, beş', s * 0.08, s * 0.58);
    g.fillText('3 + 2 = ?', s * 0.08, s * 0.76);
  },
  schoolFloor(g, s) {
    const n = 4, w = s / n;
    for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
      g.fillStyle = (x + y) % 2 ? '#D9D2C3' : '#EDE7DA'; g.fillRect(x * w, y * w, w, w);
    }
    g.strokeStyle = 'rgba(0,0,0,.08)'; g.lineWidth = 2;
    for (let i = 0; i <= n; i++) { g.beginPath(); g.moveTo(i * w, 0); g.lineTo(i * w, s); g.moveTo(0, i * w); g.lineTo(s, i * w); g.stroke(); }
  },
  leaves(g, s) {
    const r = rng(14);
    g.fillStyle = '#4E8A2F'; g.fillRect(0, 0, s, s);
    for (let i = 0; i < 260; i++) {
      g.fillStyle = ['#5E9E3A', '#3F7A2A', '#6FB04A', '#467F2A'][(r() * 4) | 0];
      g.beginPath(); g.ellipse(r() * s, r() * s, 6 + r() * 8, 3 + r() * 4, r() * 3, 0, 7); g.fill();
    }
  },
  bark(g, s) {
    const r = rng(15);
    g.fillStyle = '#6B4526'; g.fillRect(0, 0, s, s);
    for (let i = 0; i < 90; i++) {
      g.strokeStyle = r() > 0.5 ? '#553619' : '#7F5733'; g.lineWidth = 1 + r() * 3;
      const x = r() * s; g.beginPath(); g.moveTo(x, 0);
      for (let y = 0; y <= s; y += 16) g.lineTo(x + Math.sin(y * 0.05 + i) * 3, y);
      g.stroke();
    }
  },
  metal(g, s) {
    const r = rng(16);
    g.fillStyle = '#9AA3AE'; g.fillRect(0, 0, s, s);
    for (let y = 0; y < s; y += 2) { g.fillStyle = `rgba(255,255,255,${r() * 0.12})`; g.fillRect(0, y, s, 1); }
  },
  flag(g, s) {
    g.fillStyle = '#E30A17'; g.fillRect(0, 0, s, s);
    const cx = s * 0.38, cy = s / 2;
    g.fillStyle = '#fff'; g.beginPath(); g.arc(cx, cy, s * 0.25, 0, 7); g.fill();
    g.fillStyle = '#E30A17'; g.beginPath(); g.arc(cx + s * 0.0625, cy, s * 0.2, 0, 7); g.fill();
    g.fillStyle = '#fff'; g.beginPath();
    const sx = cx + s * 0.28, R = s * 0.125, rr = R * 0.4;
    for (let i = 0; i < 10; i++) {
      const a = Math.PI + i * Math.PI / 5, rad = i % 2 ? rr : R;
      g.lineTo(sx + Math.cos(a) * rad, cy + Math.sin(a) * rad);
    }
    g.fill();
  },
  curtain(g, s) {
    for (let x = 0; x < s; x += 16) { g.fillStyle = (x / 16) % 2 ? '#F4E6C8' : '#E7D3A8'; g.fillRect(x, 0, 16, s); }
  },
  schoolSign(g, s) {
    g.fillStyle = '#1F4E8C'; g.fillRect(0, 0, s, s);
    g.strokeStyle = '#F4E6C8'; g.lineWidth = s * 0.03; g.strokeRect(s * 0.04, s * 0.2, s * 0.92, s * 0.6);
    g.fillStyle = '#FFFFFF'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.font = `bold ${s * 0.13}px Fredoka, sans-serif`;
    g.fillText('KÖY', s / 2, s * 0.38);
    g.fillText('İLKOKULU', s / 2, s * 0.6);
  },
  cayOcagiSign(g, s) {
    g.fillStyle = '#8E2B1E'; g.fillRect(0, 0, s, s);
    g.fillStyle = '#F7E3B5'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.font = `bold ${s * 0.26}px Fredoka, sans-serif`;
    g.fillText('ÇAY OCAĞI', s / 2, s / 2, s * 0.95);
  },
  /** Four rows of book spines on a dark shelf (one texture for a whole bookcase). */
  bookshelf(g, s) {
    g.fillStyle = '#3B2418'; g.fillRect(0, 0, s, s);
    const colors = ['#8E2B1E', '#2F6FDB', '#3E8E4A', '#E0B04A', '#6B4F3A', '#7A3552', '#16A085', '#D35400'];
    for (let r = 0; r < 4; r++) {
      const y0 = r * s / 4 + s * 0.03, h = s / 4 - s * 0.06;
      for (let x = s * 0.01, i = 0; x < s * 0.98; i++) {
        const w = s * (0.025 + ((i * 7 + r * 3) % 4) * 0.008), bh = h * (0.72 + ((i * 5 + r) % 3) * 0.12);
        g.fillStyle = colors[(i * 3 + r) % colors.length];
        g.fillRect(x, y0 + h - bh, w - 1, bh);
        g.fillStyle = 'rgba(255,255,255,.35)'; g.fillRect(x, y0 + h - bh * 0.7, w - 1, 2);
        x += w + 1;
      }
      g.fillStyle = '#5B3A29'; g.fillRect(0, y0 + h, s, s * 0.03);
    }
  },
  myGardenSign(g, s) {
    g.fillStyle = '#C99B63'; g.fillRect(0, 0, s, s);
    g.fillStyle = '#3B2418'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.font = `bold ${s * 0.2}px Fredoka, sans-serif`;
    g.fillText('BENİM', s / 2, s * 0.33, s * 0.95);
    g.fillText('BAHÇEM', s / 2, s * 0.66, s * 0.95);
  },
  alphabet(g, s) {
    g.fillStyle = '#FFF9EC'; g.fillRect(0, 0, s, s);
    const letters = 'A B C Ç D E F G Ğ H I İ J K L M N O Ö P R S Ş T U Ü V Y Z'.split(' ');
    const cols = ['#E4574A', '#2F6FDB', '#3E8E4A', '#E0B04A', '#7A3552'];
    g.textAlign = 'center'; g.textBaseline = 'middle'; g.font = `bold ${s * 0.1}px Fredoka, sans-serif`;
    letters.forEach((l, i) => { g.fillStyle = cols[i % cols.length]; g.fillText(l, (i % 6 + 0.5) * s / 6, (Math.floor(i / 6) + 0.5) * s / 5); });
  },
  ball(g, s) {
    g.fillStyle = '#F7F7F2'; g.fillRect(0, 0, s, s);
    g.fillStyle = '#1B1B1B';
    for (let y = 0; y < 4; y++) for (let x = 0; x < 4; x++) {
      const cx = (x + (y % 2) * 0.5) * s / 4 + s / 8, cy = y * s / 4 + s / 8, r = s / 14;
      g.beginPath();
      for (let k = 0; k < 5; k++) { const a = k / 5 * Math.PI * 2 - Math.PI / 2; g.lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r); }
      g.fill();
    }
  },
  paper(g, s) {
    g.fillStyle = '#FFF9EC'; g.fillRect(0, 0, s, s);
    g.strokeStyle = '#D9C7A3';
    for (let y = 24; y < s; y += 22) { g.beginPath(); g.moveTo(10, y); g.lineTo(s - 10, y); g.stroke(); }
  },
};

/**
 * Hands out textures by name. A file texture from assets/manifest.json overrides the
 * procedural one with the same name (see ASSETS.md).
 */
export class TextureFactory {
  #generators = { ...GENERATORS };
  #base = new Map();
  #clones = new Map();
  #files = new Map();
  #normals = new Map();
  #scale = new Map();
  #tint = new Map();

  constructor(renderer) { this.maxAniso = renderer?.capabilities.getMaxAnisotropy?.() ?? 1; }

  register(name, painter) { this.#generators[name] = painter; }
  has(name) { return this.#files.has(name) || name in this.#generators; }

  /**
   * Load file overrides before the world is built. An entry is a URL or
   * `{ map, normal?, scale?, tint? }` (scale multiplies the tiling to match real-world size,
   * tint is multiplied into the material colour).
   * Missing files fall back to the procedural texture silently.
   */
  async loadOverrides(map = {}) {
    const loader = new THREE.TextureLoader();
    const load = async (url, srgb) => {
      const t = await loader.loadAsync(url);
      t.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace;
      t.anisotropy = Math.min(8, this.maxAniso);
      return t;
    };
    await Promise.all(Object.entries(map).map(async ([name, entry]) => {
      const e = typeof entry === 'string' ? { map: entry } : entry;
      if (!e?.map) return;
      try {
        this.#files.set(name, await load(e.map, true));
        if (e.normal) this.#normals.set(name, await load(e.normal, false));
        if (e.scale) this.#scale.set(name, e.scale);
        if (e.tint) this.#tint.set(name, new THREE.Color(e.tint).getHex());
      } catch { console.warn(`[textures] ${name}: ${e.map} yüklenemedi, prosedürel doku kullanılıyor`); }
    }));
  }

  /** Colour multiplier that belongs to a file texture (undefined for procedural ones). */
  tint(name) { return this.#tint.get(name); }

  /** Normal map for a file texture (null for procedural ones). */
  normal(name, repeat = [1, 1]) {
    const base = this.#normals.get(name);
    return base ? this.#tiled(`n|${name}`, base, repeat, name) : null;
  }

  #tiled(prefix, base, repeat, name) {
    const k = this.#scale.get(name) ?? 1;
    const key = `${prefix}|${repeat[0]}|${repeat[1]}`;
    if (this.#clones.has(key)) return this.#clones.get(key);
    const t = base.clone();
    t.needsUpdate = true;
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(repeat[0] * k, repeat[1] * k);
    this.#clones.set(key, t);
    return t;
  }

  get(name, repeat = [1, 1]) { return this.#tiled(`c|${name}`, this.#baseTexture(name), repeat, name); }

  #baseTexture(name) {
    if (this.#files.has(name)) return this.#files.get(name);
    if (this.#base.has(name)) return this.#base.get(name);
    const paint = this.#generators[name];
    if (!paint) throw new Error(`Unknown texture: ${name}`);
    const size = 256;
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = size;
    paint(canvas.getContext('2d'), size);
    const t = new THREE.CanvasTexture(canvas);
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = Math.min(4, this.maxAniso);
    this.#base.set(name, t);
    return t;
  }
}
