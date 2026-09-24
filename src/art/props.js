// Environment props painted in code at 2x density: animated fire, the fire vent, its grate, street rubble and
// the checkpoint banner. Frames come out as { px } arrays like rig.js, so buildTextures.js paints them.
import { Pix, hash, noise1, noise2, dith } from './pix.js';
import { ENV } from './palette.js';

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
// dark red rim -> white-hot core
const FIRE = ['#6e1008', '#b02210', '#e44a14', '#fa8a24', '#ffc444', '#fff2b0'];

function frame(p) {
  const px = new Array(p.w * p.h);
  for (let i = 0; i < px.length; i++) {
    const v = p.data[i];
    px[i] = v ? '#' + (((v & 255) << 16) | (v & 0xff00) | ((v >> 16) & 255)).toString(16).padStart(6, '0') : null;
  }
  return { px };
}

// Dark rim around everything painted with `inner` colors (1px, 4-neighborhood).
function rim(p, color) {
  const out = [];
  for (let y = 0; y < p.h; y++) for (let x = 0; x < p.w; x++) {
    if (p.has(x, y)) continue;
    if (p.has(x - 1, y) || p.has(x + 1, y) || p.has(x, y - 1) || p.has(x, y + 1)) out.push([x, y]);
  }
  out.forEach(([x, y]) => p.set(x, y, color));
}

// A fire of a few tongues standing on the bottom edge. f = animation phase 0..3, `lean` bends the tips.
function fire(w, h, f, { tongues = 4, seed = 1, lean = 0.15, spread = 0.9 } = {}) {
  const p = new Pix(w, h), cx = w / 2 - 0.5, base = h - 1, ph = (f / 4) * Math.PI * 2;
  const T = Array.from({ length: tongues }, (_, k) => {
    const u = (-spread + (2 * spread * (k + 0.5)) / tongues) + Math.sin(ph + k * 2.1) * 0.06;
    const tall = (0.45 + 0.55 * hash(k, 1, seed)) * (1 - Math.abs(u) * 0.45) * (0.8 + 0.2 * Math.sin(ph * (k % 2 ? 1 : -1) + k * 1.7));
    return [u, tall, 0.26 + 0.12 * hash(k, 2, seed)];
  });
  for (let y = 1; y <= base; y++) for (let x = 0; x < w; x++) {
    const u = (x - cx) / (w / 2 - 1), v = (base - y) / (h - 2);
    // body: a rounded mound at the base
    let reach = 0.3 * Math.max(0, 1 - u * u);
    for (const [tu, th, tw] of T) {
      const sway = Math.sin(ph + v * 5 + tu * 3) * 0.08 * v;
      const d = (u - tu - v * lean - sway) / (tw * (1 - v * 0.5));
      if (Math.abs(d) < 1) reach = Math.max(reach, th * (1 - d * d));
    }
    if (v > reach) continue;
    const heat = clamp((1 - v / Math.max(0.02, reach)) * 0.75 + (1 - Math.abs(u)) * 0.5 - v * 0.35, 0, 1);
    p.set(x, y, FIRE[clamp(1 + dith(heat * 4.4, x, y), 1, 5)]);
  }
  // a loose flicker above the tallest tongue on alternating frames
  if (f % 2) {
    const [tu, th] = T.reduce((a, b) => (b[1] > a[1] ? b : a));
    const x = Math.round(cx + tu * (w / 2 - 1) + 1), y = Math.round(base - th * (h - 2)) - 3;
    p.set(x, y, FIRE[3]); p.set(x, y - 1, FIRE[2]);
  }
  rim(p, FIRE[0]);
  return p;
}

// Fire vent column: a roaring jet as wide as its hitbox (the whole frame), widest at the base.
function ventJet(f) {
  const w = 24, h = 64, p = new Pix(w, h), ph = (f / 3) * Math.PI * 2;
  for (let y = 1; y < h; y++) {
    const v = (h - 1 - y) / (h - 2);
    const half = 7 + (1 - v) * 4.5 + Math.sin(v * 14 + ph) * 1.4 + (noise1(v * 9 + f * 3.3, 5) - 0.5) * 2.5; // fills the hitbox
    const cx = 11.5 + Math.sin(v * 6 + ph) * 1.2 * v;
    for (let x = 0; x < w; x++) {
      const d = Math.abs(x - cx) / Math.max(1, half);
      if (d > 1) continue;
      const heat = clamp((1 - d) * 1.1 + (1 - v) * 0.35 - (v > 0.85 ? (v - 0.85) * 3 : 0), 0, 1);
      p.set(x, y, FIRE[clamp(1 + dith(heat * 4.5, x, y), 1, 5)]);
    }
  }
  // detached tongues near the top
  for (let k = 0; k < 3; k++) {
    const x = Math.round(8 + hash(k, f, 9) * 8), y = Math.round(2 + hash(k, f, 10) * 10);
    p.set(x, y, FIRE[2]); p.set(x, y + 1, FIRE[3]); p.set(x + 1, y + 1, FIRE[2]);
  }
  rim(p, FIRE[0]);
  return p;
}

// Iron grate set into the street over the vent, 28x8.
function grate() {
  const p = new Pix(28, 8), K = '#140a0c';
  for (let x = 0; x < 28; x++) {
    p.set(x, 0, K); p.set(x, 7, K);
    p.set(x, 1, x < 2 || x > 25 ? K : '#6a5a5e');
  }
  for (let y = 1; y < 7; y++) { p.set(0, y, K); p.set(27, y, K); }
  for (let x = 2; x < 26; x++) for (let y = 2; y < 7; y++) {
    const bar = x % 4 === 1;
    p.set(x, y, bar ? (y === 2 ? '#8a7a7e' : '#4a3c42') : y > 4 ? '#c83214' : '#3a0a0a'); // embers glow below
  }
  return p;
}

// Rubble 32x16 (v = variant): heaps of tumbled sandstone blocks, or a fallen column drum.
function rubble(v) {
  const p = new Pix(32, 16), S = ENV.sand, T = ENV.stone;
  if (v === 2) {
    // drum lying on its side: lit top, fluting as horizontal lines, dark end face on the right
    for (let y = 4; y < 16; y++) for (let x = 3; x < 27; x++) {
      const edge = y === 4 || y === 15 || x === 3;
      const t = y < 6 ? 6 : y < 8 ? 5 : y > 12 ? 2 : (y % 3 === 0 ? 3 : 4);
      p.set(x, y, edge ? T[0] : T[t]);
    }
    for (let y = 4; y < 16; y++) for (let x = 26; x < 31; x++) {
      const d = Math.hypot((x - 26) / 4, (y - 9.5) / 5.8);
      if (d <= 1) p.set(x, y, d > 0.8 ? T[0] : d > 0.5 ? T[2] : T[3]);
    }
    for (const [x, y] of [[9, 7], [10, 8], [18, 11], [19, 12]]) p.set(x, y, T[1]); // cracks
    return p;
  }
  const stones = [];
  for (let k = 0; k < 8; k++) {
    const w = 4 + Math.floor(hash(k, v, 21) * 7), h = 3 + Math.floor(hash(k, v, 22) * 4);
    const x = Math.floor(1 + hash(k, v, 23) * (30 - w)), cx = Math.abs(x + w / 2 - 16) / 16;
    const y = 16 - h - Math.floor((1 - cx) * hash(k, v, 24) * 7);
    stones.push([x, y, w, h]);
  }
  stones.sort((a, b) => a[1] - b[1]);
  for (const [x0, y0, w, h] of stones) for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) {
    const edge = x === x0 || x === x0 + w - 1 || y === y0 || y === y0 + h - 1;
    const t = y === y0 + 1 ? 5 : x === x0 + 1 ? 4 : y === y0 + h - 2 ? 2 : 3;
    p.set(x, y, edge ? S[0] : S[t]);
  }
  return p;
}

// Checkpoint: a wooden pole with a cloth banner, 20x44. lit = gold banner and a flame on top.
function banner(lit) {
  const p = new Pix(20, 44), W = ENV.wood, K = '#1a0a08';
  for (let y = 8; y < 44; y++) { p.set(3, y, K); p.set(4, y, W[3]); p.set(5, y, W[2]); p.set(6, y, K); }
  // finial cup
  for (let x = 1; x <= 8; x++) { p.set(x, 7, K); p.set(x, 8, x < 3 || x > 6 ? K : '#8a7a7e'); }
  // cloth hanging from a cross bar, swallow-tailed
  const C = lit ? ['#6a380a', '#a8660c', '#dc9e1e', '#f6cc46', '#fff29a'] : ['#1a1e3a', '#2c3460', '#465088', '#6878a8', '#98a4c8'];
  for (let x = 5; x < 19; x++) p.set(x, 10, K);
  for (let y = 11; y < 30; y++) for (let x = 7; x < 18; x++) {
    const tail = y > 24 && Math.abs(x - 12) < y - 24;
    if (tail) continue;
    const edge = x === 7 || x === 17 || y === 29 || (y > 24 && Math.abs(x - 12) === y - 24);
    const t = x < 9 ? 3 : x > 15 ? 1 : 2 + (y < 13 ? 1 : 0);
    p.set(x, y, edge ? K : C[t]);
  }
  // diamond emblem
  for (const [x, y] of [[12, 15], [11, 16], [13, 16], [10, 17], [14, 17], [11, 18], [13, 18], [12, 19]]) p.set(x, y, C[4]);
  if (lit) {
    const f = fire(8, 9, 0, { tongues: 2, seed: 3 });
    p.blit(f, 1, 0);
  }
  return p;
}

// Fire light rising out of a pit, 8x64 (tiles horizontally): clear at the top, deep red, orange at the bottom.
function pitGlow() {
  const p = new Pix(8, 64), G = ENV.glow;
  for (let y = 0; y < 64; y++) for (let x = 0; x < 8; x++) {
    const v = Math.pow(y / 63, 1.4) * 5.2 - 0.6;
    const i = dith(v, x, y);
    if (i >= 1) p.set(x, y, G[Math.min(i, 5)]);
  }
  return p;
}

// The front of the chasing wall of fire, 64x128, tiles vertically (scroll it upward): churning red on the
// left (matches fireInner), hottest just behind the ragged tongues reaching right, dark red rim.
function fireWall() {
  const w = 64, h = 128, p = new Pix(w, h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const n = noise2(y / 16, x / 10, 31, h / 16) * 0.65 + noise2(y / 8, x / 5, 32, h / 8) * 0.35; // wraps along y
    const v = x / w - n * 0.55;                    // 0 at the solid side
    if (v > 0.55) continue;
    const heat = clamp(1 - Math.abs(v - 0.28) / 0.3, 0, 1); // hottest just behind the front
    if (v < 0.28 && heat < 0.2) continue;                     // let the interior show through
    p.set(x, y, FIRE[clamp(dith(heat * 4.6, x, y), 1, 5)]);
  }
  rim(p, FIRE[0]);
  return p;
}

// Inside the wall of fire, 64x64, tiles both ways: churning dark reds and orange.
function fireInner() {
  const p = new Pix(64, 64);
  for (let y = 0; y < 64; y++) for (let x = 0; x < 64; x++) {
    const n = noise2(x / 16, y / 16, 33, 4, 4) * 0.6 + noise2(x / 8, y / 8, 34, 8, 8) * 0.4;
    p.set(x, y, FIRE[clamp(dith(n * 3.6 - 0.4, x, y), 0, 3)]);
  }
  return p;
}

export const PROP_SPRITES = {
  flame: { w: 24, h: 28, frames: [0, 1, 2, 3].map(f => frame(fire(24, 28, f))) },
  flame_small: { w: 14, h: 16, frames: [0, 1, 2, 3].map(f => frame(fire(14, 16, f, { tongues: 2, seed: 4 }))) },
  vent: { w: 24, h: 64, frames: [0, 1, 2].map(f => frame(ventJet(f))) },
  grate: { w: 28, h: 8, frames: [frame(grate())] },
  rubble: { w: 32, h: 16, frames: [0, 1, 2].map(v => frame(rubble(v))) },
  checkpoint: { w: 20, h: 44, frames: [frame(banner(false)), frame(banner(true))] },
  pitglow: { w: 8, h: 64, frames: [frame(pitGlow())] },
  firewall: { w: 64, h: 128, frames: [frame(fireWall())] },
  fireinner: { w: 64, h: 64, frames: [frame(fireInner())] },
};

export const PROP_ANIMS = [
  ['flame-flicker', 'flame', [0, 1, 2, 3], 10, -1],
  ['flame-small', 'flame_small', [0, 1, 2, 3], 9, -1],
  ['vent-roar', 'vent', [0, 1, 2], 14, -1],
];
