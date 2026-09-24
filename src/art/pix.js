// Tiny RGBA pixel buffer for painting environment art (tiles, backdrops) in code. Colors are '#rrggbb'
// strings; they are converted once and cached. Pixels are packed little-endian (0xAABBGGRR) so the buffer
// can be copied straight into an ImageData.
const packed = new Map();
export function rgba(hex) {
  let v = packed.get(hex);
  if (v === undefined) {
    const n = parseInt(hex.slice(1), 16);
    v = ((255 << 24) | ((n & 255) << 16) | (n & 0xff00) | (n >> 16)) >>> 0;
    packed.set(hex, v);
  }
  return v;
}

// Mix two '#rrggbb' colors, t = 0..1.
export function mix(a, b, t) {
  const A = parseInt(a.slice(1), 16), B = parseInt(b.slice(1), 16);
  const ch = (s) => Math.round(((A >> s) & 255) * (1 - t) + ((B >> s) & 255) * t);
  return '#' + ((ch(16) << 16) | (ch(8) << 8) | ch(0)).toString(16).padStart(6, '0');
}

// Deterministic noise in 0..1 for integer coords (+ optional seed).
export function hash(x, y, s = 0) {
  let h = Math.imul((x | 0) ^ 0x9e3779b9, 0x85ebca6b) ^ Math.imul((y | 0) ^ 0x7f4a7c15, 0xc2b2ae35) ^ Math.imul((s | 0) + 0x632be5ab, 0x27d4eb2f);
  h = Math.imul(h ^ (h >>> 16), 0x85ebca6b);
  h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

// Smooth 1D value noise (for skylines, cloud edges), roughly 0..1.
export function noise1(x, s = 0) {
  const i = Math.floor(x), f = x - i, u = f * f * (3 - 2 * f);
  return hash(i, 0, s) * (1 - u) + hash(i + 1, 0, s) * u;
}

// 2D value noise, roughly 0..1. `wrap` / `wrapY` make it tile with that period (in noise cells).
export function noise2(x, y, s = 0, wrap = 0, wrapY = 0) {
  const i = Math.floor(x), j = Math.floor(y), fx = x - i, fy = y - j;
  const ux = fx * fx * (3 - 2 * fx), uy = fy * fy * (3 - 2 * fy);
  const w = (n) => (wrap ? ((n % wrap) + wrap) % wrap : n), v = (n) => (wrapY ? ((n % wrapY) + wrapY) % wrapY : n);
  const a = hash(w(i), v(j), s), b = hash(w(i + 1), v(j), s), c = hash(w(i), v(j + 1), s), d = hash(w(i + 1), v(j + 1), s);
  return (a * (1 - ux) + b * ux) * (1 - uy) + (c * (1 - ux) + d * ux) * uy;
}

// 4x4 Bayer matrix, 0..1: ordered dithering between two ramp tones.
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map(v => (v + 0.5) / 16);
export const bayer = (x, y) => BAYER[(y & 3) * 4 + (x & 3)];
// Pick a ramp index for a continuous value v (e.g. 2.4 -> mostly 2, some 3), dithered.
export const dith = (v, x, y) => Math.floor(v + bayer(x, y) - 0.5 + 0.5);

export class Pix {
  constructor(w, h) {
    this.w = w; this.h = h;
    this.data = new Uint32Array(w * h);
  }

  set(x, y, hex) {
    x |= 0; y |= 0;
    if (x < 0 || y < 0 || x >= this.w || y >= this.h) return;
    this.data[y * this.w + x] = hex ? rgba(hex) : 0;
  }

  // true if the pixel is painted
  has(x, y) {
    x |= 0; y |= 0;
    return x >= 0 && y >= 0 && x < this.w && y < this.h && this.data[y * this.w + x] !== 0;
  }

  fill(x0, y0, w, h, hex) {
    for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) this.set(x, y, hex);
  }

  // Copy `src` (a Pix) to dx, dy. Transparent source pixels are skipped.
  blit(src, dx, dy) {
    for (let y = 0; y < src.h; y++) for (let x = 0; x < src.w; x++) {
      const v = src.data[y * src.w + x];
      const X = x + dx, Y = y + dy;
      if (v && X >= 0 && Y >= 0 && X < this.w && Y < this.h) this.data[Y * this.w + X] = v;
    }
  }

  // Paint into a 2D canvas context at dx, dy.
  draw(ctx, dx = 0, dy = 0) {
    const img = ctx.createImageData(this.w, this.h);
    new Uint32Array(img.data.buffer).set(this.data);
    ctx.putImageData(img, dx, dy);
  }
}

// Register a Pix (or one built by `paint(pix)`) as a Phaser canvas texture.
export function pixTexture(scene, key, pix) {
  if (scene.textures.exists(key)) scene.textures.remove(key);
  const tex = scene.textures.createCanvas(key, pix.w, pix.h);
  pix.draw(tex.getContext());
  tex.refresh();
  return tex;
}
