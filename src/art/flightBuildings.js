// Act II obstacles: whole ruined buildings painted in code at 2x density (2 texture px per world unit), in the
// same brick / colonnade / tower style as the city of Act I. Each is one image and one physics body, so the
// picture is the hitbox. `hang` buildings are cut off at the bottom instead of the top.
import { Pix, hash, noise1, dith, pixTexture } from './pix.js';
import { ENV } from './palette.js';

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const K = ENV.sand[0];
const MAX_DROP = 22; // how far a broken edge can dip, px

// Distance (px) of every column from the ragged edge, or -1 where nothing is painted.
function profile(w, h, hang, seed) {
  const drop = (x) => Math.floor(Math.pow(noise1(x / 6, 90 + seed), 2) * MAX_DROP / 2) * 2;
  return (x, y) => {
    const e = drop(x);
    const d = hang ? (h - 1 - e) - y : y - e;
    return d;
  };
}

function window(p, S, G, x0, y0, seed, lit) {
  // arched opening 14 wide, 22 tall, with a stone frame and a sill
  const cx = x0 + 7, r = 7;
  for (let y = y0 - 2; y < y0 + 26; y++) for (let x = x0 - 2; x < x0 + 16; x++) {
    const dx = x - cx + 0.5, dyA = y - (y0 + r);
    const d = dyA >= 0 ? Math.abs(dx) : Math.hypot(dx, dyA);
    if (y > y0 + 21) continue;
    if (d <= r) p.set(x, y, lit ? G[clamp(dith(clamp((y - y0) / 22, 0, 1) * 5.4, x, y), 0, 5)] : ENV.dark[1 + ((x + y) & 1)]);
    else if (d <= r + 2) p.set(x, y, d > r + 1.2 ? K : S[x < cx ? 5 : 4]);
  }
  for (let x = x0 - 1; x < x0 + 15; x++) { p.set(x, y0 + 22, K); p.set(x, y0 + 23, S[6]); p.set(x, y0 + 24, S[3]); p.set(x, y0 + 25, K); }
}

const SHAFT = (u) => (u < 0.1 ? 3 : u < 0.3 ? 5 : u < 0.5 ? 6 : u < 0.7 ? 5 : u < 0.88 ? 4 : 2);

export function paintBuilding({ style, w, h, hang, seed }) {
  const p = new Pix(w, h), S = ENV.sand, T = ENV.stone, G = ENV.glow;
  const dist = profile(w, h, hang, seed);
  const solid = (x, y) => dist(x, y) >= 0;
  // anchor rows measured from the broken edge side, so tiers/windows sit the same way up or down
  const rowFromEdge = (y) => (hang ? h - 1 - y : y);

  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const d = dist(x, y);
    if (d < 0) continue;
    if (x === 0 || x === w - 1) { p.set(x, y, K); continue; }
    if (d === 0) { p.set(x, y, hang ? G[3] : '#ffc850'); continue; }
    const ry = rowFromEdge(y);
    if (style === 1) {
      // colonnade: slab / columns / dark interior with fire, storeys of 64 px
      const ty = (ry - MAX_DROP + 64 * 8) % 64, cw = 10, pitch = Math.max(16, Math.floor((w - 12) / Math.max(1, Math.floor((w - 12) / 18))));
      if (ty < 8) { p.set(x, y, ty === 0 ? T[6] : ty === 7 ? T[1] : T[ty < 3 ? 5 : 3]); continue; }
      if (x < 6 || x >= w - 6) { p.set(x, y, T[x < 6 ? (x < 2 ? 5 : 4) : (x > w - 3 ? 2 : 3)]); if ((x === 5 || x === w - 7) ) p.set(x, y, K); continue; }
      const lx = (x - 6) % pitch, capital = ty < 11;
      const inCol = capital ? lx >= 0 && lx < cw + 4 : lx >= 2 && lx < cw + 2;
      if (inCol) {
        const u = (lx - (capital ? 0 : 2)) / (capital ? cw + 4 : cw);
        let t = SHAFT(u);
        if (!capital && (lx & 3) === 3) t -= 1;
        p.set(x, y, T[clamp(t + (hash(x, y, 71 + seed) < 0.05 ? -1 : 0), 1, 6)]);
      } else {
        const glow = clamp((ty - 8) / 56, 0, 1);
        p.set(x, y, glow > 0.55 ? G[clamp(dith((glow - 0.55) * 7, x, y), 0, 3)] : ENV.darkWarm[clamp(dith(glow * 4 + 1, x, y), 0, 3)]);
      }
      continue;
    }
    // brick (0) and burning tower (2)
    const course = ry >> 3, sx = x + (course & 1 ? 8 : 0), lx = sx & 15, ly = ry & 7;
    let t;
    if (lx === 15 || ly === 7) t = 1;
    else {
      t = hash(sx >> 4, course, 74 + seed) < 0.5 ? 3 : 4;
      if (ly === 0) t += 1;
      if (ly === 6) t -= 1;
      if (x < 4) t += 1; else if (x > w - 6) t -= 1;
    }
    if (d === 1 && !hang) t = 5;
    if (style === 2) {
      // stone bands every 64 px
      const ty = (ry - MAX_DROP + 64 * 8) % 64;
      if (ty < 5) { p.set(x, y, ty === 0 ? T[6] : ty === 4 ? K : T[ty < 3 ? 5 : 3]); continue; }
    }
    p.set(x, y, S[clamp(t, 1, 6)]);
  }

  if (style !== 1) {
    const n = Math.floor((w - 8) / 22), span = 22 * n, x0 = Math.round((w - span) / 2) + 4;
    const step = style === 2 ? 64 : 46, first = style === 2 ? 16 : 14;
    for (let k = 0; ; k++) {
      const y0 = hang ? h - MAX_DROP - first - 26 - k * step : MAX_DROP + first + k * step;
      if (hang ? y0 < 4 : y0 + 26 > h - 4) break;
      if (style === 2 && n > 1) {
        window(p, S, G, Math.round((w - 14) / 2), y0 + (style === 2 ? 8 : 0), seed, hash(k, seed, 85) < 0.7);
        continue;
      }
      for (let i = 0; i < n; i++) window(p, S, G, x0 + i * 22, y0, seed, hash(i + k * 5, seed, 84) < 0.65);
    }
  }
  return p;
}

const built = new Set();
// Texture key for a building, painted on first use.
export function buildingTexture(scene, spec) {
  const key = `fb_${spec.style}_${spec.w}_${spec.h}_${spec.hang ? 1 : 0}_${spec.seed}`;
  if (!built.has(key) || !scene.textures.exists(key)) {
    pixTexture(scene, key, paintBuilding(spec));
    built.add(key);
  }
  return key;
}
