// Act II foreground, painted in code at 2x density: the tops of Act I's ruined buildings (brick walls with
// arched windows, broken colonnades) poking up out of the burning city along the bottom of the screen, a wall
// of fire behind them, and a black band of rubble in front. The bands wrap horizontally for parallax.
import { Pix, hash, noise1, dith } from './pix.js';
import { ENV } from './palette.js';
import { palm } from './ancientCity.js';

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const K = ENV.sand[0];
const FIRE = ['#5a0c10', '#8a1a14', '#c8321a', '#f06a1e', '#ffa838', '#ffe28a'];
const RIM = ['#ffe28a', '#ffc850', '#ff8c28'];

// 1D noise that wraps every w px (blends the start back in toward the end).
const wrapNoise = (x, w, s, seed) => {
  const u = x / w;
  return noise1(x / s, seed) * (1 - u) + noise1((x - w) / s, seed) * u;
};

export const RUINS_W = 768, RUINS_H = 150;

// The fire behind the ruins: tall tongues, white-hot low down. Same size as ruinsBand, drawn behind it.
export function fireBand() {
  const W = RUINS_W, H = RUINS_H, p = new Pix(W, H);
  for (let x = 0; x < W; x++) {
    const fh = 40 + wrapNoise(x, W, 40, 101) * 40 + Math.pow(wrapNoise(x, W, 5, 102), 2) * 44;
    const top = H - fh;
    for (let y = Math.max(0, Math.floor(top)); y < H; y++) {
      const heat = clamp((y - top) / fh * 1.3 + 0.1, 0, 1);
      p.set(x, y, FIRE[clamp(dith(heat * 5.2, x, y), 0, 5)]);
    }
  }
  return p;
}

export function ruinsBand() {
  const W = RUINS_W, H = RUINS_H, p = new Pix(W, H), S = ENV.sand, G = ENV.glow;
  const set = (x, y, c) => p.set(((x % W) + W) % W, y, c);
  // buildings, left to right; the gaps between them stay on fire
  let x = 6, i = 0;
  while (x < W - 40) {
    const r = (k) => hash(i, k, 103);
    const style = r(1) < 0.22 ? 1 : 0;
    const w = style === 1 ? 58 + Math.floor(r(2) * 30) : 44 + Math.floor(r(2) * 60);
    const h = 44 + Math.floor(r(3) * 56), top = H - h;
    if (style === 1) colonnade(set, x, top, w, h, i);
    else brickRuin(set, x, top, w, h, i, S, G);
    x += w + 8 + Math.floor(r(4) * 26);
    i++;
  }
  return p;
}

// Broken brick wall: whole bricks gone from the top in steps, fire-lit rim along the break and the sides,
// arched windows with the fire showing through, darkening toward the ground.
function brickRuin(set, x0, top, w, h, seed, S, G) {
  const H = top + h;
  const drop = (lx) => Math.floor(Math.pow(noise1(((x0 + lx) >> 3) / 1.7, 110 + seed), 2) * 5) * 8;
  const edgeAt = (lx) => top + drop(lx);
  for (let lx = 0; lx < w; lx++) {
    const e = edgeAt(lx);
    for (let y = e; y < H; y++) {
      const X = x0 + lx, d = y - e, ry = y - top;
      const course = ry >> 3, sx = lx + (course & 1 ? 8 : 0), bx = sx & 15, by = ry & 7;
      let c;
      if (lx === 0 || lx === w - 1) c = K;
      else if (d === 0) c = RIM[0];
      else if (d === 1) c = RIM[1];
      else if (lx === 1 || lx === w - 2) c = RIM[2];
      else if (bx === 15 || by === 7) c = S[0];
      else {
        let t = hash(sx >> 4, course, 111 + seed) < 0.5 ? 2 : 3;
        if (by === 0) t += 1;
        if (by === 6) t -= 1;
        if (lx < 5) t += 1; else if (lx > w - 6) t -= 1;
        // soot and shadow deepening toward the ground
        t -= dith(clamp((y - (H - 50)) / 50, 0, 1) * 2.2, X, y);
        c = t < 1 ? ENV.dark[2 + t] : S[clamp(t, 1, 5)];
      }
      set(X, y, c);
    }
    // a step down in the break: light its upper corner too
    if (lx > 0 && edgeAt(lx - 1) > edgeAt(lx)) for (let y = edgeAt(lx); y < edgeAt(lx - 1); y++) set(x0 + lx, y, RIM[1]);
    if (lx < w - 1 && edgeAt(lx + 1) > edgeAt(lx)) for (let y = edgeAt(lx); y < edgeAt(lx + 1); y++) set(x0 + lx, y, RIM[2]);
  }
  // arched windows, one row every 40 px below the highest intact course
  const n = Math.max(1, Math.floor((w - 10) / 24)), span = n * 24, wx0 = x0 + Math.round((w - span) / 2) + 5;
  for (let wy = top + 14; wy < H - 30; wy += 40) for (let k = 0; k < n; k++) {
    const wx = wx0 + k * 24;
    if (edgeAt(wx - x0 - 2) > wy - 4 || edgeAt(wx - x0 + 16) > wy - 4) continue;
    arch(set, wx, wy, hash(k, wy, 112 + seed) < 0.75, G, S);
  }
}

// Arched opening 14 wide, 24 tall, with a stone frame and a sill; fire (or darkness) inside.
function arch(set, x0, y0, lit, G, S) {
  const cx = x0 + 7, r = 7;
  for (let y = y0 - 2; y < y0 + 24; y++) for (let x = x0 - 2; x < x0 + 16; x++) {
    const dx = x - cx + 0.5, dyA = y - (y0 + r);
    const d = dyA >= 0 ? Math.abs(dx) : Math.hypot(dx, dyA);
    if (y > y0 + 21) continue;
    if (d <= r) set(x, y, lit ? G[clamp(dith(clamp((y - y0) / 22, 0, 1) * 5.4 + 0.6, x, y), 0, 6)] : ENV.dark[1 + ((x + y) & 1)]);
    else if (d <= r + 2) set(x, y, d > r + 1.2 ? K : S[x < cx ? 4 : 3]);
  }
  for (let x = x0 - 1; x < x0 + 15; x++) { set(x, y0 + 22, K); set(x, y0 + 23, S[5]); set(x, y0 + 24, S[2]); set(x, y0 + 25, K); }
}

// Broken colonnade: column stumps of different heights on a stepped base, snapped tops glowing.
function colonnade(set, x0, top, w, h, seed) {
  const T = ENV.stone, H = top + h, baseTop = H - Math.min(30, Math.floor(h * 0.4));
  // base: two stone steps
  for (let x = x0; x < x0 + w; x++) for (let y = baseTop; y < H; y++) {
    const edge = x === x0 || x === x0 + w - 1, ly = y - baseTop;
    const t = ly === 0 ? 0 : ly === 1 ? 1 : ly === 10 ? 0 : 2 + dith(clamp(1 - (y - baseTop) / 30, 0, 1) * 2, x, y);
    set(x, y, edge ? K : ly === 1 ? RIM[1] : t === 0 ? K : T[clamp(t, 1, 4)]);
  }
  const cw = 14, n = Math.max(2, Math.floor((w - 6) / (cw + 8))), pitch = (w - 6 - cw) / (n - 1);
  for (let k = 0; k < n; k++) {
    const cx0 = Math.round(x0 + 3 + k * pitch);
    const ch = Math.floor((0.3 + hash(k, 1, 120 + seed) * 0.7) * (baseTop - top));
    for (let lx = 0; lx < cw; lx++) {
      const snap = Math.round(Math.abs(Math.sin((lx + seed) * 0.9)) * 4 + hash(lx >> 1, k, 121 + seed) * 3);
      const e = baseTop - ch + snap;
      for (let y = e; y < baseTop; y++) {
        const u = lx / (cw - 1), d = y - e;
        let c;
        if (lx === 0 || lx === cw - 1) c = K;
        else if (d === 0) c = RIM[0];
        else if (d === 1) c = RIM[1];
        else {
          let t = u < 0.15 ? 4 : u < 0.4 ? 5 : u < 0.6 ? 4 : u < 0.8 ? 3 : 2;
          if ((lx % 4) === 3) t -= 1;                            // flutes
          if ((y - baseTop) % 26 === 0) t = 1;                   // drum joints
          t -= dith(clamp((y - (baseTop - 40)) / 40, 0, 1) * 1.6, cx0 + lx, y);
          c = T[clamp(t, 1, 6)];
        }
        set(cx0 + lx, y, c);
      }
    }
  }
}

// ---------------------------------------------------------------------------------------------------------
// Rubble in front: black mounds of broken blocks and a fallen column drum or two, a thin warm rim on top,
// and a couple of tall date palms rising out of it in silhouette. The mounds fill the bottom MOUND_H px; the
// rest of the band is headroom for the palms.
const MOUND_H = 48;
export const RUBBLE_W = 640, RUBBLE_H = 170;

export function rubbleBand() {
  const W = RUBBLE_W, H = RUBBLE_H, p = new Pix(W, H);
  const mask = new Uint8Array(W * H);
  const put = (x, y) => { x = ((x % W) + W) % W; if (y >= 0 && y < H) mask[y * W + x] = 1; };
  for (let x = 0; x < W; x++) {
    const top = H - (12 + wrapNoise(x, W, 34, 130) * 16 + wrapNoise(x, W, 7, 131) * 6);
    for (let y = Math.floor(top); y < H; y++) put(x, y);
  }
  // broken blocks lying on the heap, some tilted by a step
  for (let i = 0; i < 26; i++) {
    const bx = Math.floor(hash(i, 1, 132) * W), bw = 8 + Math.floor(hash(i, 2, 132) * 16), bh = 5 + Math.floor(hash(i, 3, 132) * 8);
    const tilt = hash(i, 4, 132) < 0.5 ? 0 : hash(i, 5, 132) < 0.5 ? -1 : 1;
    const base = H - (14 + wrapNoise(bx, W, 34, 130) * 16);
    for (let x = 0; x < bw; x++) for (let y = 0; y < bh; y++) put(bx + x, Math.floor(base - bh + y + (tilt * x) / 4));
  }
  // fallen column drums
  for (let i = 0; i < 3; i++) {
    const cx = Math.floor((i + 0.3) * W / 3), r = 7 + i * 2, base = H - 10;
    for (let y = -r; y <= r; y++) for (let x = -r; x <= r; x++) if (x * x + y * y <= r * r) put(cx + x, base - r + y);
  }
  // palms, leaning every which way, their bases buried in the heap; firelight catches the tops of the fronds
  const palms = new Uint8Array(W * H);
  const putPalm = (x, y) => { x = ((x % W) + W) % W; if (y >= 0 && y < H) palms[y * W + x] = 1; };
  for (const [px, s] of [[150, 2.9], [470, 2.4], [505, 1.7]]) palm(putPalm, px, H - 12, s, px + 5);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    if (!palms[y * W + x]) continue;
    const up = y > 0 && palms[(y - 1) * W + x], left = palms[y * W + ((x + W - 1) % W)];
    p.set(x, y, !up ? ENV.darkWarm[6] : !left ? ENV.darkWarm[4] : ENV.dark[0]);
  }
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    if (!mask[y * W + x]) continue;
    const up = y > 0 && mask[(y - 1) * W + x], up2 = y > 1 && mask[(y - 2) * W + x];
    p.set(x, y, !up ? ENV.darkWarm[5] : !up2 ? ENV.darkWarm[3] : dith(0.6 - (y - (H - MOUND_H)) / MOUND_H, x, y) > 0 ? ENV.dark[1] : ENV.dark[0]);
  }
  return p;
}
