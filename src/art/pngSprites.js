// Hand-drawn PNG sprites (public/sprites/<key>/<frame>.png) that replace a generated sprite of the same key.
// Each PNG is a tightly cropped, high-res pose of any size. At boot they are scaled down so the `ref` frame is
// `height` texture pixels tall, lined up on the hip (feet on the bottom edge; `top` frames hang from the top
// edge instead) and packed into one texture with the same frame order as the generated sprite.
// To read as pixel art (not a blurry photo), the shrunk frames are snapped to a small shared palette
// (`colors`) and get a 1px OUTLINE around the silhouette, like the generated characters.
// Side views face RIGHT, like every other character.
// A frame given as a number instead of a name reuses that frame of the generated sprite (for poses that have
// no PNG yet); it is copied pixel for pixel, lined up on the generated sprite's hip (cx).
// `anchor: 'right'` lines frames up on their right edge instead of the hip (the angels: only the wings move,
// and the pointing hand is always the rightmost point).
// `scale` fixes frames drawn at a different size than the rest ({ frame name: factor }).
// `files` borrows another character's PNG folder; `recolor` (from RECOLORS) is then applied to every pixel of
// every frame, PNG or generated, so a recolored twin stays consistent as new poses are added.
import { SPRITES } from './sprites.js';
import { OUTLINE } from './palette.js';
import { paintFrame } from './rig.js';

const RUN4 = [1, 2, 3, 4].map(i => `run${i}`);
// Run frames cut from a sprite sheet drawn at another size than the single PNGs. The sheet has each character's
// idle too, so scale = (idle PNG height) / (sheet idle height). The hanging poses come from a screenshot of the
// same sheet style at 0.767x, the jumps and falls from sheets drawn at 2x (heads twice the size). The previous
// frames are kept as prev-run1..4 / prev-hang1..2 / prev-jump / prev-fall.
const sheetScale = (k) => ({ ...Object.fromEntries(RUN4.map(n => [n, k])), hang: k / 0.767, jump: k / 2, fall: k / 2 });

function toHsl(r, g, b) {
  r /= 255; g /= 255; b /= 255;
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2;
  if (mx === mn) return [0, 0, l];
  const d = mx - mn, s = l > 0.5 ? d / (2 - mx - mn) : d / (mx + mn);
  const h = mx === r ? (g - b) / d + (g < b ? 6 : 0) : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return [h * 60, s, l];
}
function fromHsl(h, s, l) {
  const k = (n) => (n + h / 30) % 12, a = s * Math.min(l, 1 - l);
  const f = (n) => l - a * Math.max(-1, Math.min(k(n) - 3, 9 - k(n), 1));
  return [f(0), f(8), f(4)].map(v => Math.round(v * 255));
}

// Per-pixel color swaps, (r, g, b) -> [r, g, b].
export const RECOLORS = {
  // Daughter 2 = daughter 1's art with the orchid/pink dress (hue ~285) turned purple, and the browns (hair,
  // sandals: hue < 30, not light) darker. Skin sits at hue ~30+, so it is untouched.
  daughter2: (r, g, b) => {
    const [h, s, l] = toHsl(r, g, b);
    if (s > 0.2 && h >= 275 && h < 350) return fromHsl(265, s, l * 0.85);
    if (s > 0.15 && (h < 28 || h >= 350) && l < 0.55) return fromHsl(h, s, l * 0.7);
    return [r, g, b];
  },
};

function recolorCanvas(canvas, fn) {
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  const data = ctx.getImageData(0, 0, canvas.width, canvas.height), d = data.data;
  for (let i = 0; i < d.length; i += 4) if (d[i + 3]) d.set(fn(d[i], d[i + 1], d[i + 2]), i);
  ctx.putImageData(data, 0, 0);
}

export const PNG_SPRITES = {
  // Frame order must match the lot layout in characters.js (idle, blink, run x4, jump, fall, dead, hang).
  lot: {
    height: 46, ref: 'idle', colors: 16, top: ['hang'], scale: sheetScale(246 / 363),
    frames: ['idle', 'blink', ...RUN4, 'jump', 'fall', 'dead', 'hang'],
  },
  // Frame order must match the wife layout in characters.js. No look-back PNG yet: that is the generated
  // frame.
  wife: {
    height: 43, ref: 'idle', colors: 16, top: ['hang'], scale: sheetScale(230 / 385),
    frames: ['idle', 'blink', ...RUN4, 6, 'jump', 'fall', 'hang'],
  },
  // Daughter layout in characters.js.
  daughter1: {
    height: 38, ref: 'idle', colors: 16, top: ['hang'], scale: sheetScale(202 / 406),
    frames: ['idle', 'blink', ...RUN4, 'jump', 'fall', 'hang'],
  },
  // Sodomite layout in characters.js: idle, 4-frame run. No blink (they never stand still).
  sodomite: {
    height: 45, ref: 'idle', colors: 16,
    frames: ['idle', ...RUN4],
  },
  // Angel layout in characters.js: 4-frame flap (wings up, back, down, half up), cut from a sprite sheet.
  angel: { height: 41, ref: 'fly2', colors: 16, anchor: 'right', frames: ['fly1', 'fly2', 'fly3', 'fly4'] },
  // Items: one frame each, kept at the generated sprites' heights (salt is also the salted family member's
  // HUD icon and pickup; the jug sits in the Act III ending).
  salt: { height: 24, ref: 'idle', colors: 16, frames: ['idle'] },
  jug: { height: 38, ref: 'idle', colors: 16, frames: ['idle'] },
  // Same art as daughter 1 (run cycle included), recolored.
  daughter2: {
    files: 'daughter1', recolor: 'daughter2',
    height: 38, ref: 'idle', colors: 16, top: ['hang'], scale: sheetScale(202 / 406),
    frames: ['idle', 'blink', ...RUN4, 'jump', 'fall', 'hang'],
  },
};

const srcKey = (key, name) => `png:${key}:${name}`;

export function preloadPngSprites(scene) {
  for (const [key, { files = key, frames }] of Object.entries(PNG_SPRITES)) {
    new Set(frames.filter(f => typeof f === 'string')).forEach(name => scene.load.image(srcKey(key, name), `sprites/${files}/${name}.png`));
  }
}

// The PNGs keep a thin light-grey halo from background removal: peel greyish, light pixels off the outer
// edge (a few passes) so the dark outline is the silhouette.
function removeHalo(img, recolor) {
  const c = document.createElement('canvas');
  c.width = img.width; c.height = img.height;
  const ctx = c.getContext('2d', { willReadFrequently: true });
  ctx.drawImage(img, 0, 0);
  const data = ctx.getImageData(0, 0, c.width, c.height), d = data.data, w = c.width, h = c.height;
  const clear = (x, y) => x < 0 || y < 0 || x >= w || y >= h || d[(y * w + x) * 4 + 3] === 0;
  for (let pass = 0; pass < 3; pass++) {
    const peel = [];
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      if (!d[i + 3] || !(clear(x - 1, y) || clear(x + 1, y) || clear(x, y - 1) || clear(x, y + 1))) continue;
      const hi = Math.max(d[i], d[i + 1], d[i + 2]), lo = Math.min(d[i], d[i + 1], d[i + 2]);
      if (hi > 105 && hi - lo < 40) peel.push(i);
    }
    if (!peel.length) break;
    peel.forEach(i => { d[i + 3] = 0; });
  }
  ctx.putImageData(data, 0, 0);
  if (recolor) recolorCanvas(c, recolor);
  return c;
}

// Smooth downscale in halving steps (a single big drawImage step drops detail), then hard alpha edges.
function shrink(img, w, h, recolor) {
  let src = removeHalo(img, recolor), sw = img.width, sh = img.height;
  while (sw / 2 > w && sh / 2 > h) {
    const c = document.createElement('canvas');
    c.width = Math.round(sw / 2); c.height = Math.round(sh / 2);
    const cx = c.getContext('2d');
    cx.imageSmoothingQuality = 'high';
    cx.drawImage(src, 0, 0, sw, sh, 0, 0, c.width, c.height);
    src = c; sw = c.width; sh = c.height;
  }
  const out = document.createElement('canvas');
  out.width = w; out.height = h;
  const ctx = out.getContext('2d', { willReadFrequently: true });
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(src, 0, 0, sw, sh, 0, 0, w, h);
  const data = ctx.getImageData(0, 0, w, h);
  const d = data.data;
  for (let i = 3; i < d.length; i += 4) d[i] = d[i] < 128 ? 0 : 255;
  ctx.putImageData(data, 0, 0);
  return { canvas: out, data };
}

// k-means palette over the opaque pixels of every frame (deterministic start: spread over brightness).
function buildPalette(frames, k) {
  const px = [];
  frames.forEach(({ data: { data: d } }) => {
    for (let i = 0; i < d.length; i += 4) if (d[i + 3]) px.push([d[i], d[i + 1], d[i + 2]]);
  });
  const lum = ([r, g, b]) => r * 0.3 + g * 0.59 + b * 0.11;
  const sorted = [...px].sort((a, b) => lum(a) - lum(b));
  let pal = Array.from({ length: k }, (_, i) => [...sorted[Math.floor((i + 0.5) * sorted.length / k)]]);
  const nearest = (p) => {
    let best = 0, bd = Infinity;
    pal.forEach((c, j) => {
      const dr = p[0] - c[0], dg = p[1] - c[1], db = p[2] - c[2], dist = dr * dr * 3 + dg * dg * 4 + db * db * 2;
      if (dist < bd) { bd = dist; best = j; }
    });
    return best;
  };
  for (let iter = 0; iter < 8; iter++) {
    const sum = pal.map(() => [0, 0, 0, 0]);
    px.forEach(p => { const s = sum[nearest(p)]; s[0] += p[0]; s[1] += p[1]; s[2] += p[2]; s[3]++; });
    pal = pal.map((c, j) => sum[j][3] ? sum[j].slice(0, 3).map(v => v / sum[j][3]) : c);
  }
  pal = pal.map(c => c.map(Math.round));
  return (p) => pal[nearest(p)];
}

// Snap every pixel to the palette, then paint the silhouette's edge pixels with OUTLINE.
function pixelize({ canvas, data }, snap) {
  const d = data.data, w = data.width, h = data.height;
  for (let i = 0; i < d.length; i += 4) if (d[i + 3]) d.set(snap([d[i], d[i + 1], d[i + 2]]), i);
  const n = parseInt(OUTLINE.slice(1), 16), line = [n >> 16, (n >> 8) & 255, n & 255];
  const clear = (x, y) => x < 0 || y < 0 || x >= w || y >= h || !d[(y * w + x) * 4 + 3];
  const edge = [];
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    if (!clear(x, y) && (clear(x - 1, y) || clear(x + 1, y) || clear(x, y - 1) || clear(x, y + 1))) edge.push((y * w + x) * 4);
  }
  edge.forEach(i => d.set(line, i));
  canvas.getContext('2d').putImageData(data, 0, 0);
}

// Hip x: average x of the opaque pixels in the waist band (40-55% down the frame).
function hipX({ data: { data, width, height } }) {
  let sum = 0, n = 0;
  for (let y = Math.floor(height * 0.4); y < Math.ceil(height * 0.55); y++) {
    for (let x = 0; x < width; x++) if (data[(y * width + x) * 4 + 3]) { sum += x; n++; }
  }
  return n ? Math.round(sum / n) : Math.round(width / 2);
}

// PNG sprites are built at RES x the density of the generated art (one texture pixel = one canvas pixel, see
// view.js), but their frames report the generated-art size, so every sprite, hitbox and origin in the game code
// works unchanged: the frame's cut size is RES x smaller than the area its UVs sample. (WebGL renderer only.)
export const RES = 2;
const even = (n) => Math.ceil(n / 2) * 2;

// Turn a frame cut at hi-res size into one that reports 1/res of it while still showing all of it.
export function hiResFrame(frame, res = RES) {
  const { cutX: x, cutY: y, cutWidth: w, cutHeight: h } = frame, tw = frame.source.width, th = frame.source.height;
  frame.setSize(w / res, h / res, x, y);
  frame.setUVs(w, h, x / tw, y / th, (x + w) / tw, (y + h) / th);
  frame.customData.hires = { x, y, w, h, res };
  return frame;
}

// Replaces the generated textures (and the sprite's w / h / cx, which fitBody and the art review read).
export function buildPngSprites(scene) {
  for (const [key, { height, ref, colors = 16, top = [], scale = {}, anchor, frames, recolor: rc }] of Object.entries(PNG_SPRITES)) {
    const recolor = rc && RECOLORS[rc];
    const s = height * RES / scene.textures.get(srcKey(key, ref)).getSourceImage().height;
    const gen = SPRITES[key]; // the generated sprite (its w / h / cx are replaced below)
    const shrunk = frames.map(name => {
      if (typeof name === 'number') { // generated frame, blown up RES x with hard pixels
        const small = document.createElement('canvas');
        small.width = gen.w; small.height = gen.h;
        paintFrame(small.getContext('2d'), gen.frames[name], 0, gen.w, gen.h);
        if (recolor) recolorCanvas(small, recolor);
        const canvas = document.createElement('canvas');
        canvas.width = gen.w * RES; canvas.height = gen.h * RES;
        const ctx = canvas.getContext('2d');
        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(small, 0, 0, canvas.width, canvas.height);
        return { canvas, name, hip: gen.cx * RES };
      }
      const img = scene.textures.get(srcKey(key, name)).getSourceImage();
      const k = s * (scale[name] ?? 1);
      const f = shrink(img, Math.max(1, Math.round(img.width * k)), Math.max(1, Math.round(img.height * k)), recolor);
      return { ...f, name, hip: anchor === 'right' ? f.canvas.width : hipX(f) };
    });
    const drawn = shrunk.filter(f => typeof f.name === 'string');
    const snap = buildPalette(drawn, colors);
    drawn.forEach(f => pixelize(f, snap));
    // even sizes, so the reported (1/RES) sizes stay whole pixels
    const cx = even(Math.max(...shrunk.map(f => f.hip)));
    const W = even(cx + Math.max(...shrunk.map(f => f.canvas.width - f.hip)));
    const H = even(Math.max(...shrunk.map(f => f.canvas.height)));

    if (scene.textures.exists(key)) scene.textures.remove(key);
    const tex = scene.textures.createCanvas(key, W * frames.length, H);
    const ctx = tex.getContext();
    shrunk.forEach((f, i) => {
      const y = top.includes(f.name) ? 0 : H - f.canvas.height;
      ctx.drawImage(f.canvas, i * W + cx - f.hip, y);
      hiResFrame(tex.add(i, 0, i * W, 0, W, H));
    });
    tex.refresh();
    Object.assign(SPRITES[key], { w: W / RES, h: H / RES, cx: cx / RES });
  }
}
