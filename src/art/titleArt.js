// Title screen art, painted in code at 2x density: a night sky, a band of rising flames (looping frames),
// the black silhouette of the ancient city in front, the "ESCAPE FROM SODOM" logo, and a small 5x7 pixel font for menu text.
import { LANGS, tIn as t } from '../i18n.js';
import { Pix, hash, noise1, noise2, dith, pixTexture } from './pix.js';
import { house, ziggurat, palm, cityWall } from './ancientCity.js';

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
// City: an ancient city in silhouette. A dark red back row of flat-roofed houses climbing to a great stepped
// ziggurat, a black front row of houses, palms and a stretch of wall with stepped merlons, black ground.
export const CITY_H = 200;
const GROUND = 150;

function city() {
  const p = new Pix(W, CITY_H);
  const layer = (seed, build, body, rim, win, winRate) => {
    const mask = new Uint8Array(W * CITY_H);
    const put = (x, y) => { if (x >= 0 && x < W && y >= 0 && y < CITY_H) mask[y * W + x] = 1; };
    const has = (x, y) => x >= 0 && x < W && y >= 0 && y < CITY_H && mask[y * W + x] === 1;
    for (let x = 0; x < W; x++) for (let y = GROUND; y < CITY_H; y++) put(x, y);
    const walls = build(put, seed);
    for (let y = 0; y < CITY_H; y++) for (let x = 0; x < W; x++) {
      if (!has(x, y)) continue;
      p.set(x, y, !has(x, y - 1) && y < GROUND ? rim : body);
    }
    // a few small windows high on the house walls
    for (const B of walls) for (let wx = B.x + 3; wx < B.x + B.w - 4; wx += 7) {
      const wy = B.y + 4;
      if (hash(wx, wy, seed + 1) > winRate || !has(wx, wy - 3) || !has(wx + 1, wy + 3)) continue;
      const hot = hash(wx, wy, seed + 2);
      for (let yy = 0; yy < 3; yy++) for (let xx = 0; xx < 2; xx++) p.set(wx + xx, wy + yy, yy === 0 && hot < 0.3 ? win[1] : win[0]);
    }
  };
  const houses = (put, seed, x0, x1, minH, varH, walls, skip = () => false) => {
    let x = x0, i = 0;
    while (x < x1) {
      const r = (k) => hash(i, k, seed);
      const w = 14 + Math.floor(r(1) * 22), h = minH + Math.floor(r(2) * varH);
      if (!skip(x + w / 2)) walls.push(...house(put, x, GROUND + 2, w, h, i + seed * 100, { upper: 0.5, shelter: 0.25 }));
      x += w + Math.floor(r(3) * 3) - 1;
      i++;
    }
  };
  // back row: houses rising toward the ziggurat, a second smaller temple terrace on the left
  layer(95, (put, seed) => {
    const walls = [];
    const hill = (x) => Math.round(18 * Math.exp(-(((x - 470) / 170) ** 2)));
    houses(put, seed, -10, W, 30, 22, walls, (cx) => Math.abs(cx - 470) < 60);
    // the tell under the houses nearest the temple
    for (let x = 0; x < W; x++) for (let y = GROUND - 30 - hill(x); y < GROUND; y++) if (hill(x) > 2) put(x, y);
    ziggurat(put, 470, GROUND - 20, 150, 20, 5);
    ziggurat(put, 120, GROUND - 40, 60, 14, 2);
    for (const [x, s] of [[40, 1.2], [260, 1.4], [600, 1.1]]) palm(put, x, GROUND - 20, s, x);
    return walls;
  }, '#1c0612', '#4a0e1e', ['#6a1418', '#9a2418'], 0.35);
  // front row: low houses, palms, and a stretch of the city wall with a tower
  layer(96, (put, seed) => {
    const walls = [];
    houses(put, seed, -10, W, 10, 34, walls, (cx) => cx > 300 && cx < 420);
    cityWall(put, 300, 420, GROUND - 26, GROUND + 2, 70, 22, 14, 2);
    for (const [x, s] of [[90, 1.5], [230, 1.8], [450, 1.3], [560, 1.7]]) palm(put, x, GROUND + 2, s, x + 1);
    return walls;
  }, '#040103', '#2a0810', ['#c8341a', '#ffa032'], 0.2);
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
