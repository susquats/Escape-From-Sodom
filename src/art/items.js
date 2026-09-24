// Shaded item sprites (see rig.js): salt shaker, halo, fireball, XXX jug.
import { Canvas } from './rig.js';

const P = (x, y) => ({ x, y });
const NAVY = '#1c2a6a', SPARK = '#ffffff', INK = '#2a1206';

// Salt shaker 16x24: blue domed cap with holes, speckled glass body full of salt, white label with a bold S.
const speck = (x, y) => { const h = ((x * 73856093) ^ (y * 19349663)) >>> 0; return h % 7 === 0 ? -0.22 : h % 11 === 0 ? 0.2 : 0; };
function salt() {
  const c = new Canvas(16, 24);
  const body = c.newPart();
  c.poly([P(3, 8), P(13, 8), P(15, 10), P(15, 21), P(13, 23), P(3, 23), P(1, 21), P(1, 10)], 'glass', { part: body, bend: 0.25, tex: speck });
  for (let y = 10; y < 21; y++) c.ink(2, y, '#ffffff'); // glass highlight
  // label: white rounded square with a thick black S
  for (let y = 12; y < 21; y++) for (let x = 5; x < 12; x++) {
    if ((x === 5 || x === 11) && (y === 12 || y === 20)) continue;
    c.ink(x, y, x === 11 || y === 20 ? '#c8d6ec' : '#ffffff');
  }
  const S = ['.###.', '##.##', '##...', '.###.', '...##', '##.##', '.###.'];
  S.forEach((row, y) => [...row].forEach((ch, x) => ch === '#' && c.ink(6 + x, 13 + y, '#101018')));
  const cap = c.newPart();
  c.ellipse(8, 5.6, 5.8, 4.3, 'capBlue', { part: cap, clip: (x, y) => y < 6 });
  c.poly([P(2, 5), P(14, 5), P(14, 8.5), P(2, 8.5)], 'capBlue', { part: cap, bend: 0 });
  for (let x = 2; x < 14; x++) c.setTone(x, 6, 1); // rim line
  for (const [x, y] of [[5, 3], [8, 2], [11, 3], [7, 4], [10, 4]]) c.ink(x, y, '#16245e');
  c.ink(4, 3, '#ffffff'); c.ink(5, 2, '#ffffff');
  return c.finish();
}

// Halo 20x10: glowing gold ring; frames swap the sparkles.
function halo(f) {
  const c = new Canvas(20, 10);
  c.ring(10, 5, 8.5, 3.8, 1.4, 'gold', { lift: 0.08 });
  const sparks = f ? [[2, 1], [17, 7], [15, 0]] : [[4, 0], [18, 3], [1, 8]];
  for (const [x, y] of sparks) c.ink(x, y, SPARK);
  return c.finish();
}

// Fireball / comet 32x32, flying toward the bottom right: white-hot head at HEAD, flame streaks and
// embers trailing up-left. Rotate the sprite (origin at the head) to fly in other directions.
export const COMET_HEAD = { x: 23, y: 23, r: 4.8 };
function fireball(f) {
  const c = new Canvas(32, 32);
  const part = c.newPart(false);
  const H = P(COMET_HEAD.x, COMET_HEAD.y), back = (d, side) => P(H.x - d * 0.707 + side * 0.707, H.y - d * 0.707 - side * 0.707);
  // streaks: [side offset, length, radius], outer ones red and thin, the middle one long and hot
  const streaks = [[-6, 14, 1], [6, 12, 1], [-3.5, 20, 1.6], [3.5, 17, 1.6], [0, 24, 2.6]];
  streaks.forEach(([side, len, r], i) => {
    const l = len + ((i + f) % 2 ? 2.5 : -1.5);
    c.capsule(back(0, side * 0.3), back(l, side), r + 1, 0.4, 'fire', { part, tone: 1 });
    c.capsule(back(0, side * 0.3), back(l * 0.75, side * 0.9), r * 0.8, 0.4, 'fire', { part, tone: 2 });
    c.capsule(back(0, 0), back(l * 0.45, side * 0.6), r * 0.6, 0.3, 'fire', { part, tone: 3 });
  });
  for (const [r, tone] of [[COMET_HEAD.r + 0.8, 1], [COMET_HEAD.r, 2], [3.8, 3], [2.6, 4]]) {
    c.ellipse(H.x + (4 - tone) * 0.2, H.y + (4 - tone) * 0.2, r, r, 'fire', { part, tone });
  }
  // loose embers along the trail
  const embers = f ? [[9, 6], [13, 3], [5, 10], [17, 12], [3, 3]] : [[11, 4], [7, 8], [15, 11], [4, 6], [2, 1]];
  embers.forEach(([d, side], i) => { const q = back(d + 8, side - 6); c.ink(q.x, q.y, i % 2 ? '#f47418' : '#c8300c'); });
  return c.finish({ outline: false });
}

// Jug 40x38: clay jug with cork, neck, handle and a cream label with a bold XXX.
function jug() {
  const c = new Canvas(40, 38);
  const X = ['#...#', '.#.#.', '..#..', '.#.#.', '#...#'];
  c.ring(31, 13, 5.5, 7, 2, 'clay', { lift: -0.1 }); // handle (behind)
  const body = c.newPart();
  c.ellipse(19.5, 24, 16.5, 13, 'clay', { part: body });
  c.capsule(P(19.5, 12), P(19.5, 5), 5.2, 4.6, 'clay', { part: body });
  c.ellipse(19.5, 4.5, 6.4, 2.2, 'clay', { lift: 0.1 }); // rim
  c.poly([P(16.5, 0), P(22.5, 0), P(22, 3.8), P(17, 3.8)], 'leather'); // cork
  c.poly([P(5, 17), P(34, 17), P(34, 30), P(5, 30)], 'label', { bend: 0.1 });
  for (let i = 0; i < 3; i++) X.forEach((row, y) => [...row].forEach((ch, x) => {
    if (ch !== '#') return;
    const lx = 8 + i * 9 + x * 1.4, ly = 20 + y * 1.4;
    for (const [ox, oy] of [[0, 0], [1, 0], [0, 1], [1, 1]]) c.ink(lx + ox, ly + oy, INK);
  }));
  return c.finish();
}

export const ITEM_SPRITES = {
  salt: { w: 16, h: 24, frames: [salt()] },
  halo: { w: 20, h: 10, frames: [halo(0), halo(1)] },
  fireball: { w: 32, h: 32, frames: [fireball(0), fireball(1)] },
  jug: { w: 40, h: 38, frames: [jug()] },
};
