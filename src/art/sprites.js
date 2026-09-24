// Sprite table. Characters (characters.js) and items (items.js) are rendered by the shaded renderer in
// rig.js; the environment sprites below are ASCII pixel art (h rows of w palette chars, '.' = transparent).
// Everything is drawn at 2x density and shown at ART_SCALE = 0.5 (1 texture pixel = 1 screen pixel).
// Side-view characters face RIGHT (code flips them with setFlipX). `body` = physics body size in texture
// pixels when the frame is wider than the hitbox. Style reference: art/reference/*.webp
import { CHARACTER_SPRITES, CHARACTER_ANIMS } from './characters.js';
import { ITEM_SPRITES } from './items.js';

// Build a w x h frame from a function (x, y) => palette char.
const grid = (w, h, fn) => Array.from({ length: h }, (_, y) => Array.from({ length: w }, (_, x) => fn(x, y)).join(''));
// Small deterministic noise for texture speckles.
const hash = (x, y) => (((x * 73856093) ^ (y * 19349663)) >>> 0) % 1000;

// Ground flame 20x20.
const flame = (phase) => grid(20, 20, (x, y) => {
  const cx = 9.5 + Math.sin(y * 0.6 + phase * 2.5) * (1 - y / 20) * 2;
  const half = Math.max(0, (y - 1) / 19) * 8.5;
  const dx = Math.abs(x - cx);
  if (dx > half || (y < 8 && hash(x + phase * 3, y) % 4 === 0)) return '.';
  const inner = half - dx;
  if (y > 11 && inner > 4.5) return 'Q';
  if (inner > 3) return 'F';
  if (inner > 1.2) return 'O';
  return 'o';
});

// Fire vent column 24x64: jagged flame, widest at the base.
const ventFrame = () => grid(24, 64, (x, y) => {
  const half = Math.min(12, 2 + y / 4.5) - ((y >> 1) % 4 === 1 ? 1.5 : 0);
  const d = Math.abs(x - 11.5 + Math.sin(y * 0.35) * 1.5);
  if (d > half) return '.';
  if (d > half - 1.5) return 'o';
  if (d > half - 4) return 'O';
  if (y > 28 && d < half - 6) return 'Q';
  return 'F';
});

// Cave mouth 56x52: rocky rim around a dark arch.
const caveFrame = () => grid(56, 52, (x, y) => {
  const dx = (x - 27.5) / 28, dy = (y - 52) / 52;
  const d = dx * dx + dy * dy;
  if (d > 1) return '.';
  if (d > 0.74) {
    const h = hash(x >> 1, y >> 1) % 7;
    return h === 0 ? 'x' : h === 1 ? 'K' : (y < 12 || dx < -0.5 ? 'Z' : 'X');
  }
  if (d > 0.66) return 'K';
  return 'D';
});

// Rock 28x20: lumpy boulder lit from the top-left.
const rockFrame = () => grid(28, 20, (x, y) => {
  const dx = (x - 13.5) / 13.5, dy = (y - 19) / 19;
  const d = dx * dx + dy * dy + Math.sin(x * 0.7) * 0.05;
  if (d > 1) return '.';
  if (d > 0.84) return 'K';
  if (dx < -0.2 && dy < -0.55) return 'Z';
  if (dx > 0.35 || dy > -0.2) return hash(x, y) % 9 === 0 ? 'K' : 'x';
  return hash(x, y) % 11 === 0 ? 'x' : 'X';
});

// Mountain ledge 32x12 (tileable horizontally): lit top, stony face, jagged underside.
const ledge = (light, mid, dark, cracked) => grid(32, 12, (x, y) => {
  const underside = 8 + (hash(x >> 2, 3) % 4 > 1 ? 2 : 0) + (x % 8 === 3 ? 1 : 0);
  if (y > underside) return '.';
  if (y === underside) return 'K';
  if (y <= 1) return light;
  if (cracked && ((x === 9 || x === 23) || ((x === 10 || x === 22) && y > 4))) return 'K';
  return hash(x, y) % 7 === 0 ? dark : mid;
});

export const SPRITES = {
  ...CHARACTER_SPRITES,
  ...ITEM_SPRITES,
  flame: { w: 20, h: 20, frames: [flame(0), flame(1)] },
  vent: { w: 24, h: 64, frames: [ventFrame()] },
  cave: { w: 56, h: 52, frames: [caveFrame()] },
  rock: { w: 28, h: 20, frames: [rockFrame()] },
  ledge: { w: 32, h: 12, frames: [ledge('Z', 'X', 'x', false)] },
  ledge_crumble: { w: 32, h: 12, frames: [ledge('5', '6', 'x', true)] },
};

// [animation key, texture key, frames, fps, repeat]
export const ANIMS = [
  ...CHARACTER_ANIMS,
  ['halo-shine', 'halo', [0, 0, 0, 1], 6, -1],
  ['fireball-flicker', 'fireball', [0, 1], 8, -1],
  ['flame-flicker', 'flame', [0, 1], 6, -1],
];

// Physics body of a character: `body` size, feet on the bottom of the frame, centered on the hip (cx).
export function fitBody(sprite, key) {
  const { h, cx, body: [bw, bh] } = SPRITES[key];
  sprite.body.setSize(bw, bh, false).setOffset(cx - bw / 2, h - bh);
}
