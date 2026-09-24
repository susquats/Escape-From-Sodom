// Act II obstacle art, painted in code at 2x density (48 px = the 24-unit obstacle width). Obstacles are
// built from pieces: a cap or ragged end (image) plus a shaft/body that tiles vertically (TileSprite). Every
// piece doubles as the physics body, so the picture is the hitbox.
import { Pix, hash, dith } from './pix.js';
import { ENV } from './palette.js';

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const W = 48;
const K = ENV.sand[0];

function frame(p) {
  const px = new Array(p.w * p.h);
  for (let i = 0; i < px.length; i++) {
    const v = p.data[i];
    px[i] = v ? '#' + (((v & 255) << 16) | (v & 0xff00) | ((v >> 16) & 255)).toString(16).padStart(6, '0') : null;
  }
  return { px };
}

// Fluted column shaft, 48x32, tiles vertically. Lit from the left like a cylinder, a drum joint per tile.
const SHAFT = (u) => (u < 0.08 ? 3 : u < 0.22 ? 5 : u < 0.4 ? 6 : u < 0.6 ? 5 : u < 0.75 ? 4 : u < 0.9 ? 3 : 2);
function shaft() {
  const p = new Pix(W, 32), S = ENV.stone;
  for (let y = 0; y < 32; y++) for (let x = 0; x < W; x++) {
    if (x === 0 || x === W - 1) { p.set(x, y, K); continue; }
    const u = (x - 1) / (W - 3);
    let t = SHAFT(u);
    if ((x - 3) % 7 === 6) t -= 1;                     // flutes
    if (y === 31) t = 1;                               // drum joint
    if (hash(x, y, 71) < 0.04) t -= 1;
    p.set(x, y, S[clamp(t, 1, 6)]);
  }
  return p;
}

// Capital, 56x24: abacus slab (2 units wider than the shaft each side), rounded echinus, necking band.
function capital() {
  const p = new Pix(56, 24), S = ENV.stone;
  for (let x = 0; x < 56; x++) {
    p.set(x, 0, K);
    for (let y = 1; y < 8; y++) p.set(x, y, x === 0 || x === 55 ? K : S[y === 1 ? 6 : y < 4 ? 5 : y < 7 ? 4 : 3]);
    p.set(x, 8, K);
  }
  // echinus: narrows from 52 to 48 px
  for (let y = 9; y < 20; y++) {
    const inset = 2 + Math.round(((y - 9) / 10) * 2);
    for (let x = inset; x < 56 - inset; x++) {
      const edge = x === inset || x === 55 - inset;
      const u = (x - inset) / (56 - 2 * inset);
      p.set(x, y, edge ? K : S[clamp(SHAFT(u) + (y < 12 ? 1 : 0) - (y > 17 ? 1 : 0), 1, 6)]);
    }
  }
  for (let x = 4; x < 52; x++) { p.set(x, 20, K); p.set(x, 21, S[x < 16 ? 4 : 2]); p.set(x, 22, S[x < 16 ? 3 : 2]); p.set(x, 23, K); }
  return p;
}

// Snapped-off shaft end, 48x20 (hangs below a shaft): jagged break, shaded broken face, a crack.
function columnBreak() {
  const src = shaft(), p = new Pix(W, 20), S = ENV.stone;
  const edge = (x) => 8 + Math.round(Math.abs(Math.sin(x * 0.37 + 1)) * 6 + hash(x >> 2, 0, 72) * 5);
  for (let x = 0; x < W; x++) {
    const e = edge(x);
    for (let y = 0; y <= e && y < 20; y++) {
      if (y === e) p.set(x, y, K);
      else if (y >= e - 2 && x > 0 && x < W - 1) p.set(x, y, S[2]);
      else p.data[y * W + x] = src.data[y * W + x];
    }
  }
  for (let y = 2; y < 12; y++) p.set(20 + ((y * 5) >> 3) % 3, y, K);
  return p;
}

// Burning brick tower body, 48x64, tiles vertically: warm brick, dark outline, one arched window per tile
// with fire inside.
function towerBody() {
  const p = new Pix(W, 64), S = ENV.sand, G = ENV.glow;
  for (let y = 0; y < 64; y++) for (let x = 0; x < W; x++) {
    if (x === 0 || x === W - 1) { p.set(x, y, K); continue; }
    const course = y >> 3, sx = x + (course & 1 ? 8 : 0), lx = sx & 15, ly = y & 7;
    if (lx === 15 || ly === 7) { p.set(x, y, S[1]); continue; }
    let t = hash(sx >> 4, course, 74) < 0.5 ? 3 : 4;
    if (ly === 0) t += 1;
    if (ly === 6) t -= 1;
    if (x < 4) t += 1; else if (x > W - 6) t -= 1;       // rounded: lit left side
    p.set(x, y, S[clamp(t, 1, 6)]);
  }
  // window: arch 14x22 with a stone frame
  const cx = 23.5, top = 22, r = 7;
  for (let y = 12; y < 48; y++) for (let x = 12; x < 36; x++) {
    const dx = x - cx, d = y >= top ? Math.abs(dx) : Math.hypot(dx, y - top);
    if (y > 44) continue;
    if (d <= r) p.set(x, y, G[clamp(dith(clamp((y - 20) / 24, 0, 1) * 5.4, x, y), 0, 5)]);
    else if (d <= r + 2) p.set(x, y, d > r + 1.2 ? K : S[x < cx ? 5 : 4]);
  }
  for (let x = 14; x < 34; x++) { p.set(x, 44, K); p.set(x, 45, S[6]); p.set(x, 46, S[3]); p.set(x, 47, K); }
  return p;
}

// Ragged top of a burning tower, 48x16 (sits on towerBody): whole bricks missing from the top course,
// fire-lit rim.
function towerTop() {
  const p = new Pix(W, 16), S = ENV.sand, gone = [false, true, false, true];
  for (let y = 0; y < 16; y++) for (let x = 0; x < W; x++) {
    if (y < 8 && gone[x >> 4]) continue;
    if (x === 0 || x === W - 1) { p.set(x, y, K); continue; }
    const ly = y & 7, lx = (x + (y >= 8 ? 8 : 0)) & 15;
    p.set(x, y, lx === 15 || ly === 7 ? S[1] : S[ly === 0 ? 5 : x < 4 ? 4 : 3]);
  }
  for (let x = 1; x < W - 1; x++) for (let y = 0; y < 16; y++) if (p.has(x, y)) { p.set(x, y, '#ffc850'); break; }
  return p;
}

// Ragged underside of hanging burning masonry, 48x28 (hangs below towerBody): broken bricks, glowing
// cracks, lava drips.
function towerBottom() {
  const body = towerBody(), p = new Pix(W, 28), G = ENV.glow;
  const edge = (x) => 10 + ((hash(x >> 3, 0, 75) * 3) | 0) * 4;
  for (let x = 0; x < W; x++) for (let y = 0; y < 28; y++) {
    const e = edge(x);
    if (y > e) break;
    p.data[y * W + x] = body.data[(y + 48) % 64 * W + x];
    if (y >= e - 1 && x > 0 && x < W - 1) p.set(x, y, y === e ? K : G[3]);
  }
  // drips
  for (const [x, len] of [[9, 9], [22, 14], [33, 7], [41, 11]]) {
    const e = edge(x);
    for (let y = e; y < Math.min(28, e + len); y++) {
      p.set(x, y, y > e + len - 3 ? G[5] : G[4]);
      if (y < e + len - 4) p.set(x + 1, y, G[3]);
    }
  }
  return p;
}

// Desert ground they land on outside the city, 64x60, tiles horizontally: lit sandy lip with pebbles, earth
// darkening with depth, a few shrubs on top.
function landGround() {
  const p = new Pix(64, 60);
  const D = ['#3a1a14', '#6a3420', '#9a5430', '#c47a40', '#e2a05a', '#f6c47e'];
  const top = (x) => 6 + Math.round(Math.sin((x / 64) * Math.PI * 4) * 1.5);
  for (let x = 0; x < 64; x++) {
    const t0 = top(x);
    for (let y = t0; y < 60; y++) {
      const depth = (y - t0) / 50;
      let t = y === t0 ? 0 : y < t0 + 3 ? 5 : clamp(dith(4.2 - depth * 3.6, x, y), 1, 4);
      if (y > t0 + 3 && hash(x >> 1, y >> 1, 76) < 0.05) t = Math.max(1, t - 1);   // pebbles
      if (y > t0 + 3 && hash(x, y, 77) < 0.03) t = Math.min(5, t + 1);
      p.set(x, y, D[t]);
    }
  }
  // shrubs
  const G = ['#1e3a1a', '#2e5a24', '#4a8034', '#74a848'];
  for (const [cx, r] of [[14, 5], [44, 4]]) {
    for (let y = -r; y <= 0; y++) for (let x = -r - 1; x <= r + 1; x++) {
      const d = Math.hypot(x / (r + 1), y / r);
      if (d > 1) continue;
      const X = cx + x, Y = top(cx) + y;
      p.set(X, Y, d > 0.85 ? G[0] : G[x < 0 && y < -r / 2 ? 3 : x > r / 2 ? 1 : 2]);
    }
  }
  return p;
}

export const FLIGHT_SPRITES = {
  fcol_shaft: { w: W, h: 32, frames: [frame(shaft())] },
  fcol_cap: { w: 56, h: 24, frames: [frame(capital())] },
  fcol_break: { w: W, h: 20, frames: [frame(columnBreak())] },
  ftower_body: { w: W, h: 64, frames: [frame(towerBody())] },
  ftower_top: { w: W, h: 16, frames: [frame(towerTop())] },
  ftower_bottom: { w: W, h: 28, frames: [frame(towerBottom())] },
  fland: { w: 64, h: 60, frames: [frame(landGround())] },
};
