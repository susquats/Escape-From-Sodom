// Sprite table. Characters (characters.js) and items (items.js) are rendered by the shaded renderer in
// rig.js; environment props (fire, vent, rubble, checkpoint) are painted in props.js; the sprites below are
// ASCII pixel art (h rows of w palette chars, '.' = transparent).
// Everything is drawn at 2x density and shown at ART_SCALE = 0.5 (1 texture pixel = 1 screen pixel).
// Side-view characters face RIGHT (code flips them with setFlipX). `body` = physics body size in texture
// pixels when the frame is wider than the hitbox. Style reference: art/reference/*.webp
import { CHARACTER_SPRITES, CHARACTER_ANIMS } from './characters.js';
import { ITEM_SPRITES } from './items.js';
import { PROP_SPRITES, PROP_ANIMS } from './props.js';
import { FLIGHT_SPRITES } from './flightProps.js';

// Build a w x h frame from a function (x, y) => palette char.
const grid = (w, h, fn) => Array.from({ length: h }, (_, y) => Array.from({ length: w }, (_, x) => fn(x, y)).join(''));
// Small deterministic noise for texture speckles.
const hash = (x, y) => (((x * 73856093) ^ (y * 19349663)) >>> 0) % 1000;

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
  ...PROP_SPRITES,
  ...FLIGHT_SPRITES,
  rock: { w: 28, h: 20, frames: [rockFrame()] },
  ledge: { w: 32, h: 12, frames: [ledge('Z', 'X', 'x', false)] },
  ledge_crumble: { w: 32, h: 12, frames: [ledge('5', '6', 'x', true)] },
};

// [animation key, texture key, frames, fps, repeat]
export const ANIMS = [
  ...CHARACTER_ANIMS,
  ['halo-shine', 'halo', [0, 0, 0, 1], 6, -1],
  ['fireball-flicker', 'fireball', [0, 1], 8, -1],
  ...PROP_ANIMS,
];

// Physics body of a character: `body` size, feet on the bottom of the frame, centered on the hip (cx).
export function fitBody(sprite, key) {
  const { h, cx, body: [bw, bh] } = SPRITES[key];
  sprite.body.setSize(bw, bh, false).setOffset(cx - bw / 2, h - bh);
}
