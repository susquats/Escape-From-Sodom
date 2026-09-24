// Act I terrain art: an autotiled tileset painted in code at 2x density (32 texture px per 16-unit tile).
// Every level cell is described by the few facts its look depends on (type, exposed edges, position in a
// 8x8-tile pattern period, depth below the street); each distinct description is painted once into the
// tileset. Two visual layers come out: `back` (dark ruined walls and windows behind everything) and `front`
// (sandstone solids, columns, awnings, the city wall). Collision still uses the plain 16px layer.
// Style reference: the Sodom panel of art/reference/style-sheet.webp.
import { Pix, hash, noise1, noise2, dith, pixTexture } from './pix.js';
import { ENV } from './palette.js';
import { TILE_CHARS } from '../levels/parseLevel.js';

const TS = 32;             // texture px per tile
const PERIOD = 8;          // patterns repeat every 8 tiles (256 px) so tiles can be shared
const STREET_ROW = 17;     // ground below this row darkens with depth
const EMPTY = -128, OUTLINE = -2, MORTAR = -1;
const CHAR = Object.fromEntries(Object.entries(TILE_CHARS).map(([ch, i]) => [i, ch]));
const SOLID = new Set(['#', 'B', 'T', 'W']);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

// ---------------------------------------------------------------------------------------------------------
// Tone grid: ramp indices per pixel (EMPTY / OUTLINE / MORTAR are special), colorized at the end.
class Tones {
  constructor() { this.t = new Int8Array(TS * TS).fill(EMPTY); }
  get(x, y) { return x < 0 || y < 0 || x >= TS || y >= TS ? EMPTY : this.t[y * TS + x]; }
  set(x, y, v) { if (x >= 0 && y >= 0 && x < TS && y < TS) this.t[y * TS + x] = v; }
  // add to a real tone (not outline / mortar / empty)
  add(x, y, d) { const v = this.get(x, y); if (v >= 0) this.set(x, y, v + d); }
}

// Running-bond brick: returns a tone (3..5ish) or MORTAR. wx/wy are pattern coords (wrap at PERIOD tiles).
function brick(wx, wy, bw, bh, seed) {
  const course = Math.floor(wy / bh), off = course & 1 ? bw >> 1 : 0;
  const sx = wx + off, bx = Math.floor(sx / bw), lx = sx - bx * bw, ly = wy - course * bh;
  if (lx === bw - 1 || ly === bh - 1) return MORTAR;
  const id = bx % ((PERIOD * TS) / bw), h = hash(id, course, seed);
  let t = h < 0.45 ? 3 : h < 0.93 ? 4 : 2;
  if (ly === 0) t += 2; else if (ly === 1) t += 1;
  else if (ly >= bh - 2) t -= 1;
  if (lx === 0 && ly < bh - 2) t += 1;
  else if (lx >= bw - 2) t -= 1;
  const s = hash(wx, wy, seed + 7);
  if (s < 0.05) t -= 1; else if (s < 0.065) t += 1;
  // chipped corner on some bricks
  if (hash(id, course, seed + 3) < 0.14 && ly === 0 && lx >= bw - 4) return MORTAR;
  return t;
}

// Big ashlar block with a soft bevel (ground, city wall).
function block(wx, wy, bw, bh, seed) {
  const course = Math.floor(wy / bh), off = course & 1 ? bw >> 1 : 0;
  const sx = wx + off, bx = Math.floor(sx / bw), lx = sx - bx * bw, ly = wy - course * bh;
  if (lx === bw - 1 || ly === bh - 1) return MORTAR;
  const id = bx % ((PERIOD * TS) / bw), h = hash(id, course, seed);
  let t = h < 0.5 ? 3 : h < 0.92 ? 4 : 2;
  if (ly === 0) t += 2; else if (ly === 1) t += 1;
  else if (ly >= bh - 2) t -= 1;
  if (lx <= 1 && ly > 0) t += 1;
  else if (lx >= bw - 3) t -= 1;
  const s = hash(wx, wy, seed + 5);
  if (s < 0.06) t -= 1; else if (s < 0.075) t += 1;
  // pits: small dark dents
  if (hash(wx >> 1, wy >> 1, seed + 9) < 0.025 && ly > 1) t -= 2;
  return t;
}

// Soot and sun-bleached patches a few bricks across, dithered at the edges (wraps with the pattern period).
function grime(wx, wy, x, y) {
  const n = noise2(wx / 64, wy / 40, 17, (PERIOD * TS) / 64) - 0.5;
  return clamp(dith(n * 2.2, x, y), -1, 1);
}

// Cut rounded corners where two exposed edges meet.
function roundCorners(g, p) {
  const cut = (xs, ys) => { for (const [x, y] of xs.map((x, i) => [x, ys[i]])) g.set(x, y, EMPTY); };
  if (p.U && p.L) { cut([0, 1, 0], [0, 0, 1]); g.set(1, 1, OUTLINE); }
  if (p.U && p.R) { cut([31, 30, 31], [0, 0, 1]); g.set(30, 1, OUTLINE); }
  if (p.D && p.L) { cut([0, 1, 0], [31, 31, 30]); g.set(1, 30, OUTLINE); }
  if (p.D && p.R) { cut([31, 30, 31], [31, 31, 30]); g.set(30, 30, OUTLINE); }
}

// Outline + edge light on exposed sides (light comes from the upper left).
function edges(g, p, fromY = 0) {
  for (let y = fromY; y < TS; y++) {
    if (p.L) { g.set(0, y, OUTLINE); g.add(1, y, 1); }
    if (p.R) { g.set(31, y, OUTLINE); g.add(30, y, -1); }
  }
  if (p.D) for (let x = 0; x < TS; x++) { g.set(x, 31, OUTLINE); g.add(x, 30, -1); }
}

// ---------------------------------------------------------------------------------------------------------
// Sandstone solids: '#' street/ground, 'B' building brick, 'T' roof cornice.
function paintSand(g, p) {
  const wx0 = p.cx * TS, wy0 = p.cy * TS;
  let y0 = 0;
  if (p.U && p.t === 'T') {
    // cornice slab, dentil band, shadow, then brick
    for (let x = 0; x < TS; x++) {
      const wx = wx0 + x, joint = (wx + (p.cy & 1) * 16) % 32 === 0;
      g.set(x, 0, OUTLINE);
      g.set(x, 1, 6); g.set(x, 2, 5);
      for (let y = 3; y <= 8; y++) {
        let t = y <= 6 ? 4 : 3;
        const s = hash(wx, y, 21);
        if (s < 0.07) t -= 1; else if (s < 0.1) t += 1;
        g.set(x, y, joint && y > 2 ? 2 : t);
      }
      g.set(x, 9, 2);
      g.set(x, 10, OUTLINE);
      const d = (wx >> 2) & 1; // dentils
      for (let y = 11; y <= 13; y++) g.set(x, y, d ? (y === 11 ? 4 : 3) : 1);
      g.set(x, 14, MORTAR);
    }
    y0 = 15;
  } else if (p.U && p.t === 'B') {
    // coping stones on a bare wall top
    for (let x = 0; x < TS; x++) {
      const wx = wx0 + x, joint = (wx + 8) % 24 === 0;
      g.set(x, 0, OUTLINE); g.set(x, 1, 6);
      for (let y = 2; y <= 5; y++) g.set(x, y, joint ? 2 : y < 4 ? 5 : 4);
      g.set(x, 6, 2); g.set(x, 7, OUTLINE);
    }
    y0 = 8;
  } else if (p.U && p.t === '#') {
    // street paving: bright lip, slab course, then blocks
    for (let x = 0; x < TS; x++) {
      const wx = wx0 + x;
      g.set(x, 0, OUTLINE);
      for (let y = 1; y <= 15; y++) {
        if (y === 15 || (wx + 7) % 32 === 0) { g.set(x, y, MORTAR); continue; }
        let t = y === 1 ? 6 : y <= 3 ? 5 : y >= 13 ? 3 : 4;
        const s = hash(wx, y, 31);
        if (s < 0.06) t -= 1; else if (s < 0.08) t += 1;
        if ((wx + 8) % 32 === 0 && y > 1) t += 1;       // lit left edge of each slab
        if ((wx + 9) % 32 === 0 && y > 1) t -= 1;       // right edge shade
        g.set(x, y, t);
      }
    }
    y0 = 16;
  }
  for (let y = y0; y < TS; y++) for (let x = 0; x < TS; x++) {
    const wx = wx0 + x, wy = wy0 + y;
    let t = p.t === '#' ? block(wx, wy, 32, 16, 1) : brick(wx, wy, 16, 8, 2);
    // soot and sun-bleached patches, a few bricks across (wraps with the pattern period)
    if (t >= 0) t += grime(wx, wy, x, y);
    g.set(x, y, t);
  }
  if (p.niche) paintNiche(g);
  if (p.t === 'T' && p.U) {
    // the slab overhangs: pull the wall below in from open sides
    for (let y = 11; y < TS; y++) {
      if (p.L) { g.set(0, y, EMPTY); g.set(1, y, EMPTY); }
      if (p.R) { g.set(31, y, EMPTY); g.set(30, y, EMPTY); }
    }
    edges(g, { L: false, R: false, D: p.D });
    for (let y = 11; y < TS; y++) {
      if (p.L) { g.set(2, y, OUTLINE); g.add(3, y, 1); }
      if (p.R) { g.set(29, y, OUTLINE); g.add(28, y, -1); }
    }
    for (let y = 0; y <= 10; y++) { if (p.L) g.set(0, y, OUTLINE); if (p.R) g.set(31, y, OUTLINE); }
    // shadow cast by the slab
    for (let x = 0; x < TS; x++) g.add(x, 15, -1);
  } else {
    edges(g, p);
  }
  roundCorners(g, p);
}

// Arched niche set into a solid mass: stone voussoirs, dark inside, embers at the bottom.
function paintNiche(g) {
  const cx = 15.5, top = 13, r = 7.5;
  for (let y = 2; y < 31; y++) for (let x = 4; x < 28; x++) {
    const dx = x - cx, d = y >= top ? Math.abs(dx) : Math.hypot(dx, y - top);
    if (d <= r) {
      g.set(x, y, 20 + clamp(dith(clamp((y - 18) / 12, 0, 1) * 3.5, x, y), 0, 3) - 1);
      if (y < 18 && dith(0.5, x, y) > 0) g.set(x, y, OUTLINE);
    } else if (d <= r + 3.2 && y < 29) {
      const ang = Math.atan2(y - top, dx), joint = y < top ? Math.abs(Math.sin(ang * 4.5)) < 0.18 : (y - top) % 6 === 5;
      g.set(x, y, d > r + 2.2 || joint ? OUTLINE : x < cx ? 5 : 4);
    }
  }
  for (let x = 5; x < 27; x++) { g.set(x, 29, OUTLINE); g.set(x, 30, 5); }
}

// Darken ground with depth below the street (the reference fades to near-black after one course).
function depthShift(p, x, y) {
  if (p.gr < 0) return 0;
  const gd = p.gr * TS + y;
  return dith(clamp((gd - 14) / 40, 0, 1) * 3.4, x, y);
}

// ---------------------------------------------------------------------------------------------------------
// 'P' column segment: capital on top, base at the bottom, fluted shaft. Neighboring capitals join.
const SHAFT = [3, 4, 5, 6, 6, 5, 5, 5, 4, 4, 4, 4, 3, 3, 3, 3, 2, 2, 2, 2]; // cylinder shading, 20 px wide
function paintColumn(g, p) {
  const wy0 = p.cy * TS;
  for (let y = 0; y < TS; y++) {
    g.set(5, y, OUTLINE); g.set(26, y, OUTLINE);
    for (let x = 6; x <= 25; x++) {
      let t = SHAFT[x - 6];
      if ((x - 6) % 5 === 4) t -= 1;                      // flutes
      if ((wy0 + y) % 16 === 15) t = x < 9 ? 3 : 1;       // drum joints
      if (hash(x, wy0 + y, 41) < 0.03) t -= 1;
      g.set(x, y, t);
    }
  }
  if (p.cracked) for (let y = 4; y < 22; y++) g.set(14 + ((y * 3) >> 3) % 3 + (y >> 3), y, 1);
  if (p.U) {
    const x0 = p.PL ? 0 : 1, x1 = p.PR ? 31 : 30;
    for (let x = x0; x <= x1; x++) {
      const end = (!p.PL && x === x0) || (!p.PR && x === x1);
      g.set(x, 0, OUTLINE);
      g.set(x, 1, end ? OUTLINE : 6); g.set(x, 2, end ? OUTLINE : 5);
      for (let y = 3; y <= 5; y++) g.set(x, y, end ? OUTLINE : x - x0 < 3 ? 5 : 4);
      g.set(x, 6, OUTLINE);
    }
    // echinus: rounded cushion narrowing into the shaft
    const rows = [[3, 28], [3, 28], [4, 27], [5, 26]];
    rows.forEach(([a, b], i) => {
      const y = 7 + i;
      g.set(a - 1, y, OUTLINE); g.set(b + 1, y, OUTLINE);
      for (let x = a; x <= b; x++) g.set(x, y, i === 3 ? 2 : x < a + 5 ? 5 : x > b - 6 ? 3 : 4);
    });
    for (let x = 5; x <= 26; x++) g.set(x, 11, OUTLINE);
  }
  if (p.D) {
    const rows = [[5, 26, 3], [4, 27, 5], [3, 28, 4], [3, 28, 2], [2, 29, OUTLINE], [2, 29, 3], [2, 29, 2]];
    rows.forEach(([a, b, t], i) => {
      const y = 25 + i;
      g.set(a - 1, y, OUTLINE); g.set(b + 1, y, OUTLINE);
      for (let x = a; x <= b; x++) g.set(x, y, t === OUTLINE ? OUTLINE : t + (x < a + 4 ? 1 : x > b - 5 ? -1 : 0));
    });
    for (let x = 1; x <= 30; x++) g.set(x, 31, OUTLINE);
  }
  // keep the empty sides of the tile transparent
  for (let y = 0; y < TS; y++) for (let x = 0; x < TS; x++) {
    if (x < 5 || x > 26) {
      const inCap = p.U && y <= 10, inBase = p.D && y >= 24;
      if (!inCap && !inBase) g.set(x, y, EMPTY);
    }
  }
}

// ---------------------------------------------------------------------------------------------------------
// '=' market awning: wooden beam with a striped cloth drop and scalloped hem. Colors are picked per pixel,
// so this painter writes colors directly.
function paintAwning(pix, ox, oy, p) {
  const W = ENV.wood, C = ENV.cloth, L = ENV.linen, K = ENV.sand[0];
  for (let x = 0; x < TS; x++) {
    const wx = p.cx * TS + x;
    const endL = p.L && x < 2, endR = p.R && x > 29;
    pix.set(ox + x, oy, K);
    const beam = [W[4], W[3], W[3], W[2], W[1]];
    beam.forEach((c, i) => pix.set(ox + x, oy + 1 + i, endL || endR ? K : (wx % 32 === 5 && i > 0) ? W[1] : c));
    pix.set(ox + x, oy + 6, K);
    // cloth: 8px stripes, fold shading, scalloped bottom
    const stripe = (wx >> 3) & 1, lx = wx & 7;
    for (let y = 7; y < 21; y++) {
      const hem = y >= 15 ? Math.sqrt(Math.max(0, 16 - (lx - 3.5) ** 2)) : 99;
      if (y - 15 > hem) break;
      const edge = y - 15 >= hem - 1;
      const R = stripe ? C : L;
      let t = y < 9 ? 3 : y < 13 ? 2 : 1;
      if (lx === 0) t = Math.min(3, t + 1);
      if (lx === 7) t = Math.max(0, t - 1);
      pix.set(ox + x, oy + y, endL && x === 0 || endR && x === 31 || edge ? K : R[t]);
    }
  }
}

// ---------------------------------------------------------------------------------------------------------
// 'W' city wall: big pale blocks, battlements on top, voussoirs over the gate below.
function paintWall(g, p) {
  const wx0 = p.cx * TS, wy0 = p.cy * TS;
  for (let y = 0; y < TS; y++) for (let x = 0; x < TS; x++) {
    const t = block(wx0 + x, wy0 + y, 32, 16, 4);
    g.set(x, y, t >= 0 ? t - 1 + grime(wx0 + x, wy0 + y, x, y) : t);
  }
  if (p.U) {
    for (let x = 0; x < TS; x++) {
      const m = (wx0 + x) % 16, merlon = m < 10;
      for (let y = 0; y < 8; y++) g.set(x, y, merlon ? (y === 0 || m === 0 || m === 9 ? OUTLINE : y === 1 ? 6 : m === 1 ? 5 : 4) : EMPTY);
      g.set(x, 8, merlon ? 3 : OUTLINE);
      if (!merlon) g.set(x, 9, 5);
    }
  }
  if (p.D) {
    // gate lintel: a course of tall voussoir blocks with a shadow line under it
    for (let x = 0; x < TS; x++) {
      const k = (wx0 + x) % 12;
      g.set(x, 19, OUTLINE);
      for (let y = 20; y < 30; y++) g.set(x, y, k === 0 ? OUTLINE : y === 20 || k === 1 ? 6 : k > 9 || y > 27 ? 3 : 4);
      g.set(x, 30, 1);
    }
  }
  edges(g, { ...p, U: false });
}

// ---------------------------------------------------------------------------------------------------------
// Back walls ('b') and windows ('w'): dark maroon brick, ruined tops, fire glow near the street.
function paintBack(g, p) {
  const wx0 = p.cx * TS, wy0 = p.cy * TS;
  for (let y = 0; y < TS; y++) for (let x = 0; x < TS; x++) {
    const t = brick(wx0 + x, wy0 + y, 16, 8, 6);
    g.set(x, y, t === MORTAR ? MORTAR : t - 1);
    // a few bricks knocked out: dark hollow, lit lower lip
    const course = (wy0 + y) >> 3, bx = ((wx0 + x + (course & 1 ? 8 : 0)) >> 4) % 16;
    if (t !== MORTAR && hash(bx, course, 64) < 0.035) g.set(x, y, (wy0 + y) % 8 === 6 ? 3 : 0);
  }
  if (p.pil) {
    // dim sandstone pilaster dividing the wall into bays (stone tones are stored as 40 + index)
    const SH = [OUTLINE, 43, 42, 42, 42, 41, 41, 41, 41, 41, 41, 1, 1, OUTLINE];
    for (let y = 0; y < TS; y++) SH.forEach((t, i) => {
      const joint = (wy0 + y) % 8 === 7 && i > 0 && i < 13;
      g.set(9 + i, y, joint ? MORTAR : (wy0 + y) % 8 === 0 && t > 40 ? t + 1 : t);
    });
  }
  if (p.U) {
    // broken top: a ragged profile (0-3 courses deep) of whole missing bricks; p.ax = absolute px of the tile
    const depthAt = (bx) => Math.min(3, Math.floor(Math.pow(noise1(bx * 0.45, 57), 1.6) * 4 + (hash(bx, 0, 58) < 0.2 ? 1 : 0)));
    for (let y = 0; y < 32; y++) for (let x = 0; x < TS; x++) {
      const course = y >> 3, sx = p.ax + x + (course & 1 ? 8 : 0);
      if (course < depthAt(sx >> 4)) g.set(x, y, EMPTY);
    }
    // lit rim on the new silhouette
    for (let y = TS - 1; y >= 0; y--) for (let x = 0; x < TS; x++) {
      if (g.get(x, y) === EMPTY) continue;
      if (y === 0 || g.get(x, y - 1) === EMPTY) { g.set(x, y, 6); if (g.get(x, y + 1) >= 0) g.set(x, y + 1, 5); }
    }
  }
  if (p.D) {
    // ragged underside over a breach: missing bricks counted up from the bottom, dark broken edge
    const depthAt = (bx) => Math.min(2, Math.floor(noise1(bx * 0.5, 59) * 2.6));
    for (let y = 0; y < TS; y++) for (let x = 0; x < TS; x++) {
      const course = y >> 3, sx = p.ax + x + (course & 1 ? 8 : 0);
      if (3 - course < depthAt(sx >> 4)) g.set(x, y, EMPTY);
    }
    for (let y = 0; y < TS; y++) for (let x = 0; x < TS; x++) {
      if (g.get(x, y) !== EMPTY && (y === TS - 1 || g.get(x, y + 1) === EMPTY)) g.set(x, y, OUTLINE);
    }
  }
  const toothed = (y) => ((((p.cy * TS + y) >> 3) & 1) === 1);
  for (let y = 0; y < TS; y++) {
    if (p.L && toothed(y)) for (let x = 0; x < 8; x++) g.set(x, y, EMPTY);
    if (p.R && toothed(y)) for (let x = 24; x < TS; x++) g.set(x, y, EMPTY);
  }
  for (let y = 0; y < TS; y++) {
    const xl = p.L && toothed(y) ? 8 : 0, xr = p.R && toothed(y) ? 23 : 31;
    if (p.L && g.get(xl, y) !== EMPTY) { g.set(xl, y, OUTLINE); g.add(xl + 1, y, 1); }
    if (p.R && g.get(xr, y) !== EMPTY) g.set(xr, y, OUTLINE);
  }
  if (p.win) paintWindow(g);
}

// Arched window with fire inside. Glow tones are stored as 20 + glow index (see colorize).
function paintWindow(g) {
  const cx = 15.5, top = 12, r = 6.5;
  for (let y = 3; y <= 29; y++) for (let x = 6; x <= 25; x++) {
    const dx = x - cx, inArch = y >= top ? Math.abs(dx) <= r : dx * dx + (y - top) ** 2 <= r * r;
    const inFrame = y >= top ? Math.abs(dx) <= r + 2 : dx * dx + (y - top) ** 2 <= (r + 2.2) ** 2;
    if (y > 26) continue;
    if (inArch) {
      const k = clamp((y - 12) / 14, 0, 1) * 5.2; // 0 dark at the top -> bright at the sill
      g.set(x, y, 20 + clamp(dith(k, x, y), 0, 5));
    } else if (inFrame) {
      // stone voussoirs around the opening
      const ang = Math.atan2(y - top, dx);
      const joint = y < top ? Math.round(ang * 4) !== ang * 4 && Math.abs(((ang * 4) % 1 + 1) % 1 - 0.5) > 0.42 : (y - top) % 6 === 5;
      g.set(x, y, joint ? OUTLINE : x < cx ? 5 : 4);
    }
  }
  // sill
  for (let x = 6; x <= 25; x++) { g.set(x, 27, OUTLINE); g.set(x, 28, 6); g.set(x, 29, 4); g.set(x, 30, OUTLINE); }
}

// ---------------------------------------------------------------------------------------------------------
function colorize(g, pix, ox, oy, ramp, p, warmRamp, warm = () => false) {
  for (let y = 0; y < TS; y++) for (let x = 0; x < TS; x++) {
    const v = g.get(x, y);
    if (v === EMPTY) continue;
    let c;
    if (v === OUTLINE) c = ramp[0];
    else if (v >= 40) c = ENV.stone[v - 40];
    else if (v >= 19) c = ENV.glow[v - 19];
    else {
      const dark = depthShift(p, x, y);
      // warm fire light near the street for back walls
      const r = warmRamp && warm(x, y) ? warmRamp : ramp;
      c = v === MORTAR ? (dark > 1 || warmRamp ? ramp[0] : ramp[1]) : r[clamp(v - dark, 1, r.length - 1)];
    }
    pix.set(ox + x, oy + y, c);
  }
}

function paintTile(pix, ox, oy, p) {
  if (p.t === '=') return paintAwning(pix, ox, oy, p);
  const g = new Tones();
  if (p.t === 'b') {
    paintBack(g, p);
    // warm fire light: rising from the street, and spilling around a glowing window (p.sp = its offset in tiles)
    const warm = (x, y) => {
      if (p.base && dith(clamp((y - 6) / 26, 0, 1) * 1.4, x, y) > 0) return true;
      if (!p.sp) return false;
      const d = Math.hypot(x - 15.5 - p.sp[0] * TS, y - 18 - p.sp[1] * TS);
      return dith(clamp(1 - d / 50, 0, 1) * 2, x, y) > 0;
    };
    return colorize(g, pix, ox, oy, ENV.dark, p, ENV.darkWarm, warm);
  }
  if (p.t === 'P') { paintColumn(g, p); return colorize(g, pix, ox, oy, ENV.stone, p); }
  if (p.t === 'W') { paintWall(g, p); return colorize(g, pix, ox, oy, ENV.wall, p); }
  paintSand(g, p);
  colorize(g, pix, ox, oy, ENV.sand, p);
}

// ---------------------------------------------------------------------------------------------------------
// Describe each cell, paint every distinct description once, return tile index grids for both layers.
export function buildSodomTiles(scene, data, key = 'sodom-tiles') {
  const rows = data.length, cols = data[0].length;
  const ch = (c, r) => {
    if (r < 0) return '.';
    const v = data[Math.min(r, rows - 1)][clamp(c, 0, cols - 1)];
    return v >= 0 ? CHAR[v] : '.';
  };
  const rawBack = (c, r) => { const k = ch(c, r); return k === 'b' || k === 'w'; };
  const solid = (c, r) => SOLID.has(ch(c, r));

  // back-wall mask: b/w cells plus holes left by entity markers and front tiles standing in a wall
  const back = Array.from({ length: rows }, () => new Array(cols).fill(false));
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
    if (rawBack(c, r)) { back[r][c] = true; continue; }
    const above = r > 0 && back[r - 1][c];
    back[r][c] = above && (rawBack(c, r + 1) || solid(c, r + 1) || ch(c, r + 1) === 'P');
  }
  // breaches: knock holes into the interior of big walls, away from the street (the backdrop shows through)
  const interior = (c, r) => {
    for (let dr = -2; dr <= 2; dr++) for (let dc = -2; dc <= 2; dc++) if (!back[clamp(r + dr, 0, rows - 1)][clamp(c + dc, 0, cols - 1)]) return false;
    return true;
  };
  const holes = [];
  for (let r = 0; r < STREET_ROW - 4; r++) for (let c = 0; c < cols; c++) {
    if (ch(c, r) === 'b' && interior(c, r) && noise2(c * 0.22, r * 0.38, 91) > 0.63) holes.push([c, r]);
  }
  holes.forEach(([c, r]) => { back[r][c] = false; });
  const isBack = (c, r) => r >= 0 && r < rows && back[r][clamp(c, 0, cols - 1)];
  const windowNear = (c, r) => {
    for (const [dc, dr] of [[0, 0], [-1, 0], [1, 0], [0, -1], [0, 1], [-1, -1], [1, -1], [-1, 1], [1, 1]]) if (ch(c + dc, r + dr) === 'w') return [dc, dr];
    return null;
  };

  const index = new Map(), descs = [];
  const idOf = (p) => {
    const k = JSON.stringify(p);
    if (!index.has(k)) { index.set(k, descs.length); descs.push(p); }
    return index.get(k);
  };

  const front = [], backIdx = [];
  for (let r = 0; r < rows; r++) {
    front.push([]); backIdx.push([]);
    for (let c = 0; c < cols; c++) {
      const t = ch(c, r), cx = c % PERIOD, cy = r % PERIOD;
      // back layer
      if (back[r][c]) {
        const U = !isBack(c, r - 1), D = r + 1 < STREET_ROW && !isBack(c, r + 1) && !solid(c, r + 1) && ch(c, r + 1) !== 'P';
        backIdx[r].push(idOf({ t: 'b', cx, cy, ax: U || D ? c * TS : 0, win: t === 'w', U, D, L: !isBack(c - 1, r), R: !isBack(c + 1, r),
          pil: c % 6 === 3 && t !== 'w' && isBack(c - 1, r) && isBack(c + 1, r), sp: windowNear(c, r),
          base: solid(c, r + 1) || ch(c, r + 1) === 'P' || (r + 1 >= STREET_ROW && !isBack(c, r + 1)), gr: -1 }));
      } else backIdx[r].push(-1);
      // front layer
      let p = null;
      if (t === '#' || t === 'B' || t === 'T') {
        const gr = r >= STREET_ROW ? Math.min(3, r - STREET_ROW) : -1;
        p = { t, cx, cy, U: !solid(c, r - 1), D: !solid(c, r + 1), L: !solid(c - 1, r), R: !solid(c + 1, r), gr };
        // niches deep inside big building masses (never in the street, never near an edge)
        let inner = t === 'B';
        for (let dr = -1; dr <= 1 && inner; dr++) for (let dc = -2; dc <= 2; dc++) if (ch(c + dc, r + dr) !== 'B') inner = false;
        if (inner && r < STREET_ROW + 1 && c % 5 === 2 && r % 3 === 0) p.niche = true;
        if (gr >= 2) { p.U = false; p.cy = cy; } // deep ground never shows a top
      } else if (t === 'P') {
        p = { t, cx: 0, cy: cy & 1, U: ch(c, r - 1) !== 'P', D: ch(c, r + 1) !== 'P',
          PL: ch(c - 1, r) === 'P' && ch(c - 1, r - 1) !== 'P' && ch(c, r - 1) !== 'P', PR: ch(c + 1, r) === 'P' && ch(c + 1, r - 1) !== 'P' && ch(c, r - 1) !== 'P',
          backed: back[r][c], cracked: hash(c, r, 61) < 0.2, gr: -1 };
      } else if (t === '=') {
        p = { t, cx, L: ch(c - 1, r) !== '=', R: ch(c + 1, r) !== '=', gr: -1 };
      } else if (t === 'W') {
        p = { t, cx, cy, U: ch(c, r - 1) !== 'W' && r > 0, D: ch(c, r + 1) !== 'W', L: ch(c - 1, r) !== 'W', R: ch(c + 1, r) !== 'W', gr: -1 };
      }
      front[r].push(p ? idOf(p) : -1);
    }
  }

  // Tileset: 32 tiles per row, 1px margin, 2px spacing, edges extruded into the gaps (no seams).
  const PER_ROW = 32, STRIDE = TS + 2;
  const pix = new Pix(PER_ROW * STRIDE, Math.ceil(descs.length / PER_ROW) * STRIDE);
  descs.forEach((p, i) => {
    const ox = 1 + (i % PER_ROW) * STRIDE, oy = 1 + Math.floor(i / PER_ROW) * STRIDE;
    paintTile(pix, ox, oy, p);
    const d = pix.data, W = pix.w;
    for (let k = -1; k <= TS; k++) {
      const x = clamp(k, 0, TS - 1);
      d[(oy - 1) * W + ox + k] = d[oy * W + ox + x];
      d[(oy + TS) * W + ox + k] = d[(oy + TS - 1) * W + ox + x];
      d[(oy + x) * W + ox - 1] = d[(oy + x) * W + ox];
      d[(oy + x) * W + ox + TS] = d[(oy + x) * W + ox + TS - 1];
    }
  });
  pixTexture(scene, key, pix);
  return { key, front, back: backIdx, backMask: back, count: descs.length };
}
