// Title screen art, painted in code at 2x density: a night sky, a band of rising flames (looping frames),
// the black city in front, the "ESCAPE FROM SODOM" logo, and a small 5x7 pixel font for menu text.
import { LANGS, tIn as t } from '../i18n.js';
import { Pix, hash, noise1, noise2, dith, pixTexture } from './pix.js';

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const W = 640, H = 360;

// ---------------------------------------------------------------------------------------------------------
// 5x7 pixel font. Each glyph is 7 rows of 5 columns, '#' = ink.
const FONT = {
  A: '.###. #...# #...# ##### #...# #...# #...#', B: '####. #...# #...# ####. #...# #...# ####.',
  C: '.###. #...# #.... #.... #.... #...# .###.', D: '####. #...# #...# #...# #...# #...# ####.',
  E: '##### #.... #.... ####. #.... #.... #####', F: '##### #.... #.... ####. #.... #.... #....',
  G: '.###. #...# #.... #.### #...# #...# .####', H: '#...# #...# #...# ##### #...# #...# #...#',
  I: '.###. ..#.. ..#.. ..#.. ..#.. ..#.. .###.', J: '..### ...#. ...#. ...#. #..#. #..#. .##..',
  K: '#...# #..#. #.#.. ##... #.#.. #..#. #...#', L: '#.... #.... #.... #.... #.... #.... #####',
  M: '#...# ##.## #.#.# #.#.# #...# #...# #...#', N: '#...# ##..# #.#.# #..## #...# #...# #...#',
  O: '.###. #...# #...# #...# #...# #...# .###.', P: '####. #...# #...# ####. #.... #.... #....',
  Q: '.###. #...# #...# #...# #.#.# #..#. .##.#', R: '####. #...# #...# ####. #.#.. #..#. #...#',
  S: '.#### #.... #.... .###. ....# ....# ####.', T: '##### ..#.. ..#.. ..#.. ..#.. ..#.. ..#..',
  U: '#...# #...# #...# #...# #...# #...# .###.', V: '#...# #...# #...# #...# #...# .#.#. ..#..',
  W: '#...# #...# #...# #.#.# #.#.# ##.## #...#', X: '#...# #...# .#.#. ..#.. .#.#. #...# #...#',
  Y: '#...# #...# .#.#. ..#.. ..#.. ..#.. ..#..', Z: '##### ....# ...#. ..#.. .#... #.... #####',
  0: '.###. #...# #..## #.#.# ##..# #...# .###.', 1: '..#.. .##.. ..#.. ..#.. ..#.. ..#.. .###.',
  2: '.###. #...# ....# ...#. ..#.. .#... #####', 3: '####. ....# ....# .###. ....# ....# ####.',
  4: '...#. ..##. .#.#. #..#. ##### ...#. ...#.', 5: '##### #.... ####. ....# ....# #...# .###.',
  6: '.###. #.... #.... ####. #...# #...# .###.', 7: '##### ....# ...#. ..#.. .#... .#... .#...',
  8: '.###. #...# #...# .###. #...# #...# .###.', 9: '.###. #...# #...# .#### ....# ....# .###.',
  '-': '..... ..... ..... ##### ..... ..... .....', '>': '#.... ##... ###.. ####. ###.. ##... #....',
};
const GLYPHS = Object.fromEntries(Object.entries(FONT).map(([k, v]) => [k, v.split(' ')]));

// Big chunky glyphs for SODOM, 3-cell strokes.
const BIG = {
  S: ['.#######.', '#########', '###...###', '###......', '####.....', '.#######.', '..#######', '.....####', '......###',
    '###...###', '#########', '.#######.'],
  O: ['.#######.', '#########', '###...###', '###...###', '###...###', '###...###', '###...###', '###...###', '###...###',
    '###...###', '#########', '.#######.'],
  D: ['#######..', '########.', '###..####', '###...###', '###...###', '###...###', '###...###', '###...###', '###...###',
    '###..####', '########.', '#######..'],
  M: ['####...####', '#####.#####', '###########', '###.###.###', '###..#..###', '###.....###', '###.....###', '###.....###',
    '###.....###', '###.....###', '###.....###', '###.....###'],
  A: ['..#####..', '.#######.', '###...###', '###...###', '###...###', '#########', '#########', '###...###', '###...###',
    '###...###', '###...###', '###...###'],
};

// A 1-bit mask { w, h, m } of a string. cell = texture px per font pixel, bold = extra px added to the right
// of each ink pixel, gap = font pixels between glyphs.
function mask(str, glyphs, cell, bold = 0, gap = 1) {
  const chars = [...str], widths = chars.map(c => (glyphs[c] ? glyphs[c][0].length : 3));
  const w = (widths.reduce((a, b) => a + b, 0) + gap * (chars.length - 1)) * cell + bold, h = (glyphs === BIG ? 12 : 7) * cell;
  const m = new Uint8Array(w * h);
  let ox = 0;
  chars.forEach((c, i) => {
    const g = glyphs[c];
    if (g) g.forEach((row, gy) => [...row].forEach((ch, gx) => {
      if (ch !== '#') return;
      for (let y = gy * cell; y < (gy + 1) * cell; y++) for (let x = ox + gx * cell; x < ox + (gx + 1) * cell + bold; x++) m[y * w + x] = 1;
    }));
    ox += (widths[i] + gap) * cell;
  });
  return { w, h, m };
}

// ---------------------------------------------------------------------------------------------------------
// Logo lettering: a hot gradient fill with a light band across the middle, a dark red extrusion down and to
// the right, and a thick near-black outline around both.
const LOGO = ['#fff4b0', '#ffd858', '#ffbe40', '#ffa030', '#ff8424', '#f4641e', '#e0441a', '#c03018'];
const EXTRUDE = ['#8a1c14', '#6a1210', '#4a0a0c'];
const OUTLINE = '#12040a';

function logo({ w: mw, h: mh, m }, { depth, outline, band = true }) {
  const pad = outline + depth + 1, w = mw + pad * 2, h = mh + pad * 2;
  const fill = (x, y) => { x -= pad; y -= pad; return x >= 0 && y >= 0 && x < mw && y < mh && m[y * mw + x] === 1; };
  const kind = new Uint8Array(w * h); // 1 fill, 2 extrusion, 3 outline
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    if (fill(x, y)) kind[y * w + x] = 1;
    else for (let k = 1; k <= depth; k++) if (fill(x - Math.round(k * 0.35), y - k)) { kind[y * w + x] = 2; break; }
  }
  const r2 = outline * outline + outline;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    if (kind[y * w + x]) continue;
    search: for (let dy = -outline; dy <= outline; dy++) for (let dx = -outline; dx <= outline; dx++) {
      const X = x + dx, Y = y + dy;
      if (dx * dx + dy * dy > r2 || X < 0 || Y < 0 || X >= w || Y >= h) continue;
      const k = kind[Y * w + X];
      if (k === 1 || k === 2) { kind[y * w + x] = 3; break search; }
    }
  }
  const p = new Pix(w, h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const k = kind[y * w + x];
    if (k === 3) p.set(x, y, OUTLINE);
    else if (k === 2) {
      // darker the further from the letter face
      let d = 1;
      while (d < depth && !fill(x - Math.round(d * 0.35), y - d)) d++;
      p.set(x, y, EXTRUDE[clamp(dith((d / depth) * 2.4, x, y), 0, 2)]);
    } else if (k === 1) {
      const t = (y - pad) / mh;
      let v = 0.6 + t * 6.6;
      if (band && Math.abs(t - 0.5) < 0.022) v = 1.2;                   // the light line across the middle
      else if (band && t > 0.5 && t < 0.56) v += 0.9;                    // shadowed just under it
      if (hash(x >> 1, y >> 1, 41) < 0.08) v += 1;                        // fiery speckles
      let c = LOGO[clamp(dith(v, x, y), 1, LOGO.length - 1)];
      if (!fill(x, y - 2)) c = LOGO[0];                                  // hot top edge
      else if (!fill(x, y + 2)) c = LOGO[LOGO.length - 1];               // shaded bottom edge
      p.set(x, y, c);
    }
  }
  return p;
}

// ---------------------------------------------------------------------------------------------------------
// Sky: deep blue at the top warming to purple toward the fire.
const SKY = ['#0a0c2c', '#0e1238', '#141844', '#1a1a4e', '#241c54', '#321c56', '#441a52', '#5a1a4a'];

function sky() {
  const p = new Pix(W, H);
  for (let y = 0; y < H; y++) {
    const t = clamp(Math.pow(y / 250, 1.3), 0, 1) * (SKY.length - 1);
    for (let x = 0; x < W; x++) p.set(x, y, SKY[clamp(dith(t, x, y), 0, SKY.length - 1)]);
  }
  for (let i = 0; i < 60; i++) {
    const x = Math.floor(hash(i, 1, 91) * W), y = Math.floor(hash(i, 2, 91) * 150);
    p.set(x, y, hash(i, 3, 91) < 0.3 ? '#9a9ad0' : '#3e3e7a');
  }
  return p;
}

// ---------------------------------------------------------------------------------------------------------
// Flames: noise scrolling upward through a heat mask that grows toward the bottom, tongues leaning right.
// The noise wraps in y over exactly one loop, so the frames cycle seamlessly.
export const FLAME_H = 300, FLAME_FRAMES = 16, FLAME_COLS = 4;
const FIRE = ['#3a0c30', '#5e1030', '#8a1424', '#b41e1c', '#d8341a', '#ee561c', '#fa7c22', '#ffa232', '#ffc850', '#ffe890'];

function flameFrame(f) {
  const p = new Pix(W, FLAME_H), ph = f / FLAME_FRAMES;
  for (let y = 0; y < FLAME_H; y++) {
    const fy = Math.min(1.2, y / 230); // the rows past 230 sit behind the city and just burn hot
    for (let x = 0; x < W; x++) {
      const sx = x - (230 - y) * 0.55; // lean
      const n = noise2(sx / 22, y / 46 + ph * 5, 21, 0, 5) * 0.55
        + noise2(sx / 10, y / 20 + ph * 12, 22, 0, 12) * 0.3
        + noise2(sx / 5, y / 8 + ph * 30, 23, 0, 30) * 0.15;
      const ridge = (noise1(x / 46, 24) - 0.5) * 0.6;   // taller fire in some places
      const heat = n * 1.8 + fy * 2.3 + ridge - 2.1;
      if (heat < 0) continue;
      p.set(x, y, FIRE[clamp(dith(Math.pow(heat, 0.85) * 7.5, x, y), 0, FIRE.length - 1)]);
    }
  }
  return p;
}

// ---------------------------------------------------------------------------------------------------------
// City: a dark red back row with tall spires, a black front row with a few burning windows, black ground.
export const CITY_H = 200;
const GROUND = 150;

function city() {
  const p = new Pix(W, CITY_H);
  const layer = (seed, minH, maxH, body, rim, win, winRate) => {
    const top = new Int16Array(W).fill(CITY_H);
    const rect = (x0, y0, w, h) => { for (let x = Math.max(0, x0); x < Math.min(W, x0 + w); x++) top[x] = Math.min(top[x], y0); void h; };
    const windows = [];
    let x = -10, i = 0;
    while (x < W) {
      const r = (k) => hash(i, k, seed);
      const w = 16 + Math.floor(r(1) * 30), h = minH + Math.floor(r(2) * (maxH - minH)), t = GROUND - h;
      rect(x, t, w, h);
      const kind = r(3);
      if (kind < 0.3) {
        // tower with a needle spire
        const tw = 6 + Math.floor(r(4) * 6), tx = x + Math.floor((w - tw) / 2), th = 14 + Math.floor(r(5) * 30);
        rect(tx, t - th, tw, th);
        for (let k = 0; k < 18; k++) rect(tx + (tw >> 1) - (k < 6 ? 0 : 1), t - th - 18 + k, k < 6 ? 1 : 2, 1);
      } else if (kind < 0.45) {
        // dome
        const rr = Math.floor(w * 0.4), cx = x + w / 2;
        for (let yy = -rr; yy <= 0; yy++) { const hw = Math.floor(Math.sqrt(rr * rr - yy * yy)); rect(Math.round(cx - hw), t + yy, hw * 2, 1); }
        rect(Math.round(cx), t - rr - 5, 1, 5);
      } else if (kind < 0.65) {
        // pitched roof with small corner turrets
        for (let k = 0; k < w / 2; k++) rect(x + k, t - Math.floor(k * 0.7), w - k * 2, 1);
        rect(x, t - 8, 3, 8); rect(x + w - 3, t - 8, 3, 8);
      } else if (kind < 0.8) {
        // crenellations
        for (let xx = 0; xx < w; xx += 5) rect(x + xx, t - 4, 3, 4);
      }
      for (let wy = t + 5; wy < GROUND - 4; wy += 9) for (let wx = x + 3; wx < x + w - 3; wx += 6) {
        if (hash(wx, wy, seed + 1) < winRate) windows.push([wx, wy]);
      }
      x += w - Math.floor(r(6) * 6);
      i++;
    }
    for (let x = 0; x < W; x++) for (let y = top[x]; y < CITY_H; y++) {
      const edge = y === top[x] || (x > 0 && y < top[x - 1]);
      p.set(x, y, edge && y < GROUND ? rim : body);
    }
    for (const [wx, wy] of windows) {
      if (top[wx] > wy - 2 || top[wx + 1] > wy - 2) continue;
      const hot = hash(wx, wy, seed + 2);
      for (let yy = 0; yy < 3; yy++) for (let xx = 0; xx < 2; xx++) p.set(wx + xx, wy + yy, yy === 0 && hot < 0.3 ? win[1] : win[0]);
    }
  };
  layer(95, 50, 110, '#1c0612', '#4a0e1e', ['#6a1418', '#9a2418'], 0.12);
  layer(96, 16, 64, '#040103', '#2a0810', ['#c8341a', '#ffa032'], 0.07);
  return p;
}

// ---------------------------------------------------------------------------------------------------------
export function buildTitleArt(scene) {
  if (scene.textures.exists('title-sky')) return;
  pixTexture(scene, 'title-sky', sky());
  pixTexture(scene, 'title-city', city());
  for (const lang of LANGS) {
    pixTexture(scene, `title-logo-top-${lang}`, logo(mask(t('title.logoTop', lang), GLYPHS, 4, 2), { depth: 4, outline: 3, band: false }));
    pixTexture(scene, `title-logo-${lang}`, logo(mask(t('title.logo', lang), BIG, 8, 0, 1), { depth: 10, outline: 4 }));
  }

  // flame frames in a grid (one strip would be wider than some GPUs allow)
  const rows = Math.ceil(FLAME_FRAMES / FLAME_COLS);
  const tex = scene.textures.createCanvas('title-flames', W * FLAME_COLS, FLAME_H * rows);
  const ctx = tex.getContext();
  for (let f = 0; f < FLAME_FRAMES; f++) {
    const fx = (f % FLAME_COLS) * W, fy = Math.floor(f / FLAME_COLS) * FLAME_H;
    flameFrame(f).draw(ctx, fx, fy);
    tex.add(f, 0, fx, fy, W, FLAME_H);
  }
  tex.refresh();
  scene.anims.create({ key: 'title-flames', frames: scene.anims.generateFrameNumbers('title-flames', { start: 0, end: FLAME_FRAMES - 1 }), frameRate: 10, repeat: -1 });
}

// Menu text in the pixel font: segments [[str, color], ...], with a dark drop shadow. Returns the key.
export function textTexture(scene, key, segments, shadow = '#1a0610') {
  if (scene.textures.exists(key)) return key;
  const str = segments.map(s => s[0]).join('');
  const { w, h, m } = mask(str, GLYPHS, 2, 1);
  const colorAt = [];
  let ox = 0;
  for (const [s, c] of segments) { for (let i = 0; i < s.length * 12; i++) colorAt[ox + i] = c; ox += s.length * 12; }
  const p = new Pix(w + 2, h + 2);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (m[y * w + x]) p.set(x + 2, y + 2, shadow);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (m[y * w + x]) p.set(x, y, colorAt[x] || segments[segments.length - 1][1]);
  pixTexture(scene, key, p);
  return key;
}
