// A tiny software renderer for "32-bit" style sprites. Shapes are lit like 3D volumes (light from the upper
// left), quantized into 5-tone color ramps (RAMPS in palette.js), then outlined: near-black on the shadow side,
// the material's darkest tone on the lit side ("sel-out"), plus contour lines where a part overlaps another.
// Output frames are { px: [css color | null, ...] } and are painted by buildTextures.js.
import { RAMPS, OUTLINE } from './palette.js';

const LX = -0.62, LY = -0.58, LZ = 0.53; // light direction (normalized)
const THRESHOLDS = [0.3, 0.5, 0.74, 0.92]; // brightness -> ramp tone 0..4

export const rad = (deg) => deg * Math.PI / 180;
// Point `len` px from p along `ang` degrees: 0 = straight down, +90 = forward (+x), 180 = up, -90 = back.
export const along = (p, ang, len) => ({ x: p.x + Math.sin(rad(ang)) * len, y: p.y + Math.cos(rad(ang)) * len });
export const lerp = (a, b, t) => ({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t });

const shade = (nx, ny) => {
  const nz = Math.sqrt(Math.max(0, 1 - nx * nx - ny * ny));
  return 0.5 + 0.5 * (nx * LX + ny * LY + nz * LZ);
};
const toneIndex = (b) => { let i = 0; while (i < 4 && b >= THRESHOLDS[i]) i++; return i; };

export class Canvas {
  constructor(w, h) {
    this.w = w; this.h = h;
    const n = w * h;
    this.mat = new Array(n).fill(null);
    this.tone = new Int8Array(n);
    this.color = new Array(n).fill(null); // fixed colors (eyes, mouths, letters)
    this.part = new Int32Array(n).fill(-1);
    this.contour = []; // per part: draws contour lines on parts behind it
    this.nextPart = 0;
  }

  // New part id. Primitives sharing an id don't get contour lines between them.
  newPart(contour = true) { this.contour.push(contour); return this.nextPart++; }

  plot(x, y, mat, b, part, o) {
    if (x < 0 || y < 0 || x >= this.w || y >= this.h) return;
    if (o.clip && !o.clip(x, y)) return;
    const i = y * this.w + x;
    if (o.under && this.part[i] >= 0) return; // only fill empty pixels
    this.mat[i] = mat;
    this.tone[i] = o.tone ?? Math.max(0, Math.min(4, toneIndex(b - (o.dim || 0) + (o.lift || 0) + (o.tex ? o.tex(x, y) : 0))));
    this.color[i] = null;
    this.part[i] = part;
  }

  // Filled ellipse shaded as a sphere. o: { part, dim, lift, tex(x, y) -> brightness delta, clip, tone, under, contour }
  ellipse(cx, cy, rx, ry, mat, o = {}) {
    const part = o.part ?? this.newPart(o.contour);
    for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++) {
      for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) {
        const nx = (x + 0.5 - cx) / rx, ny = (y + 0.5 - cy) / ry;
        if (nx * nx + ny * ny > 1) continue;
        this.plot(x, y, mat, shade(nx * 0.9, ny * 0.9), part, o);
      }
    }
    return part;
  }

  // Tapered capsule a -> b (radius ra -> rb), shaded as a tube.
  capsule(a, b, ra, rb, mat, o = {}) {
    const part = o.part ?? this.newPart(o.contour);
    const dx = b.x - a.x, dy = b.y - a.y, len2 = dx * dx + dy * dy || 1e-6;
    const r = Math.max(ra, rb);
    for (let y = Math.floor(Math.min(a.y, b.y) - r); y <= Math.ceil(Math.max(a.y, b.y) + r); y++) {
      for (let x = Math.floor(Math.min(a.x, b.x) - r); x <= Math.ceil(Math.max(a.x, b.x) + r); x++) {
        const px = x + 0.5, py = y + 0.5;
        const t = Math.max(0, Math.min(1, ((px - a.x) * dx + (py - a.y) * dy) / len2));
        const rr = ra + (rb - ra) * t;
        const ex = px - (a.x + dx * t), ey = py - (a.y + dy * t);
        if (ex * ex + ey * ey > rr * rr) continue;
        this.plot(x, y, mat, shade(ex / rr * 0.95, ey / rr * 0.95), part, o);
      }
    }
    return part;
  }

  // Filled polygon shaded as a vertical cylinder (robes, torsos). o.bend tilts the shading down the shape.
  poly(pts, mat, o = {}) {
    const part = o.part ?? this.newPart(o.contour);
    const ys = pts.map(p => p.y);
    const y0 = Math.floor(Math.min(...ys)), y1 = Math.ceil(Math.max(...ys));
    for (let y = y0; y <= y1; y++) {
      const py = y + 0.5, xs = [];
      for (let i = 0; i < pts.length; i++) {
        const p = pts[i], q = pts[(i + 1) % pts.length];
        if ((p.y <= py) !== (q.y <= py)) xs.push(p.x + (py - p.y) / (q.y - p.y) * (q.x - p.x));
      }
      xs.sort((a, b) => a - b);
      for (let k = 0; k + 1 < xs.length; k += 2) {
        const l = xs[k], r = xs[k + 1];
        for (let x = Math.round(l); x < Math.round(r); x++) {
          const u = ((x + 0.5 - l) / Math.max(1, r - l)) * 2 - 1;
          const v = ((py - y0) / Math.max(1, y1 - y0)) * 2 - 1;
          this.plot(x, y, mat, shade(u * 0.92, (o.bend ?? 0.3) * v), part, o);
        }
      }
    }
    return part;
  }

  // Elliptical ring (halo).
  ring(cx, cy, rx, ry, thick, mat, o = {}) {
    const part = o.part ?? this.newPart(o.contour);
    for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++) {
      for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) {
        const nx = (x + 0.5 - cx) / rx, ny = (y + 0.5 - cy) / ry;
        const d = Math.sqrt(nx * nx + ny * ny);
        const inner = 1 - thick / Math.min(rx, ry);
        if (d > 1 || d < inner) continue;
        const across = ((d - inner) / (1 - inner)) * 2 - 1; // -1 inner edge .. 1 outer edge
        this.plot(x, y, mat, shade(across * nx / (d || 1) * 0.9, across * ny / (d || 1) * 0.9 - 0.2), part, o);
      }
    }
    return part;
  }

  // A fixed-color pixel (eyes, mouths, letters). Belongs to part `part` (or the part already there).
  ink(x, y, color, part) {
    x = Math.floor(x); y = Math.floor(y);
    if (x < 0 || y < 0 || x >= this.w || y >= this.h) return;
    const i = y * this.w + x;
    this.color[i] = color;
    if (part !== undefined) this.part[i] = part;
    else if (this.part[i] < 0) this.part[i] = this.newPart(false);
  }
  // Recolor an existing pixel to a ramp tone of its own material.
  setTone(x, y, tone) {
    x = Math.floor(x); y = Math.floor(y);
    if (x < 0 || y < 0 || x >= this.w || y >= this.h) return;
    const i = y * this.w + x;
    if (this.mat[i]) { this.tone[i] = tone; this.color[i] = null; }
  }
  partAt(x, y) { x = Math.floor(x); y = Math.floor(y); return x >= 0 && y >= 0 && x < this.w && y < this.h ? this.part[y * this.w + x] : -1; }
  filled(x, y) { return x >= 0 && y >= 0 && x < this.w && y < this.h && this.part[y * this.w + x] >= 0; }

  // Resolve colors, contour lines and outline. Returns a frame for buildTextures.
  finish({ outline = true } = {}) {
    const { w, h } = this, n = w * h;
    const col = (i) => this.color[i] ?? (this.mat[i] ? RAMPS[this.mat[i]][this.tone[i]] : null);
    const px = new Array(n);
    for (let i = 0; i < n; i++) px[i] = this.part[i] >= 0 ? col(i) : null;
    const N4 = [[1, 0], [-1, 0], [0, 1], [0, -1]];

    // contour: a pixel next to a part drawn later (in front) with contour=true gets its darkest tone
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const i = y * w + x, p = this.part[i];
      if (p < 0 || this.color[i] || !this.mat[i]) continue;
      for (const [dx, dy] of N4) {
        const X = x + dx, Y = y + dy;
        if (X < 0 || Y < 0 || X >= w || Y >= h) continue;
        const q = this.part[Y * w + X];
        if (q > p && this.contour[q]) {
          px[i] = RAMPS[this.mat[i]][0];
          break;
        }
      }
    }

    if (outline) {
      const out = px.slice();
      for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
        const i = y * w + x;
        if (this.part[i] >= 0) continue;
        let lit = null, any = false;
        for (const [dx, dy] of N4) {
          const X = x + dx, Y = y + dy;
          if (X < 0 || Y < 0 || X >= w || Y >= h) continue;
          const j = Y * w + X;
          if (this.part[j] < 0) continue;
          any = true;
          // shape is to the right/below us -> we're on its lit (upper-left) edge
          if ((dx === 1 || dy === 1) && this.mat[j] && !lit) lit = this.mat[j];
          if (dx === -1 || dy === -1) { lit = false; break; }
        }
        if (any) out[i] = lit ? RAMPS[lit][0] : OUTLINE;
      }
      return { px: out };
    }
    return { px };
  }
}
