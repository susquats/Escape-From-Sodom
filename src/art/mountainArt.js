// Act III art, painted in code at 2x density. Lot climbs a cliff seen a little from the side: its craggy mass
// fills the right of the screen and juts out behind every ledge, so each ledge is an outcrop of the cliff.
// Past its edge the view opens onto the night: stars, a moon, a far cliff on the left, and far out on the
// plain Sodom burning under a plume of smoke with meteors falling on it. A summit plateau waits on top, where the
// mountain rises on with a glowing cave cut into its foot.
// Style reference: the mountain panel of art/reference/style-sheet.webp.
import { Pix, hash, noise1, noise2, dith, pixTexture } from './pix.js';
import { distantCity } from './ancientCity.js';

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

export const MTN = {
  face: ['#080a22', '#10163a', '#1a2252', '#26306a', '#343f84', '#48569e', '#6474bc'],   // cliff, lit side
  side: ['#05060f', '#0a0c1e', '#11142e', '#1a1e42', '#242a56', '#343c72', '#4c5690'],   // cliff, shadow side
  stone: ['#080a1e', '#161c40', '#24305e', '#34447e', '#485a9a', '#6478b6', '#96a6d6'],  // ledges, summit: the cliff's rock, lit
  crumble: ['#161214', '#3a3034', '#5a4e4e', '#7c706a', '#a09488', '#c2b8aa', '#e6ded2'],
  warm: ['#240c16', '#502228', '#7e3c36', '#a85a44', '#c87a56', '#e2a070', '#f6cc98'],
  rim: ['#7a2a24', '#c85a34', '#f08a44'],                                                  // firelight on edges
  cloud: ['#2e365e', '#4a5484', '#6c78a8', '#98a4c8', '#c4cce4'],
  moss: ['#1c3424', '#2e5234', '#4a7440'],
  plant: ['#081410', '#10261e', '#1a3a2a', '#285234', '#3a6c40', '#56884e'],             // moonlit leaves
  flower: ['#c890c0', '#f0dcf0', '#e8c060'],
  glow: ['#2a0c10', '#6a1c14', '#b8401a', '#f07a24', '#ffb848', '#ffe8a0'],
};

// Cellular rock: pixels belong to the nearest jittered point (a rock mass); each mass is shaded like a bulge
// lit from the upper left. Cracks run along only some of the borders, so masses merge into craggy rock
// instead of paving. `stretch` > 1 makes tall columnar masses. Grain and vertical strata break up flat
// areas. Wraps vertically (h must be a multiple of `cell`). Returns a tone ~0..6 per pixel.
export function rock(w, h, cell, seed, stretch = 1) {
  const cols = Math.ceil(w / cell) + 1, rows = h / cell;
  const wrapJ = (j) => ((j % rows) + rows) % rows;
  const pt = (i, j) => {
    const jj = wrapJ(j);
    return [(i + 0.1 + 0.8 * hash(i, jj, seed)) * cell, (j + 0.1 + 0.8 * hash(i, jj, seed + 1)) * cell, hash(i, jj, seed + 2), i * 1000 + jj];
  };
  const tone = new Float32Array(w * h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const ci = Math.floor(x / cell), cj = Math.floor(y / cell);
    let d1 = 1e9, d2 = 1e9, best = null, second = null;
    for (let j = cj - 1; j <= cj + 1; j++) for (let i = Math.max(0, ci - 1); i <= Math.min(cols, ci + 1); i++) {
      const q = pt(i, j);
      const d = Math.hypot(x - q[0], (y - q[1]) / stretch);
      if (d < d1) { d2 = d1; second = best; d1 = d; best = q; } else if (d < d2) { d2 = d; second = q; }
    }
    const [px, py, b, id] = best;
    const edge = d2 - d1;
    // big bulge shading, plus a gentle dome falloff toward the mass's edge
    const s = (-(x - px) * 0.5 - ((y - py) / stretch) * 0.85) / cell;
    let t = 3.1 + (b - 0.5) * 1.2 + s * 2.6 - Math.min(1, edge < 6 ? (6 - edge) / 6 : 0) * 0.5;
    // cracks only on some borders (pair-hashed), broken up along their length
    const pair = hash(Math.min(id, second[3]), Math.max(id, second[3]), seed + 3);
    if (edge < 1.2 && pair < 0.6 && hash(x >> 2, y >> 2, seed + 4) < 0.85) t = 0.5;
    else if (edge < 3 && pair < 0.6 && s < 0) t -= 0.9;
    // grain and vertical strata
    t += (hash(x, y, seed + 5) - 0.5) * 0.7 + (noise1(x / 3 + seed, seed + 6) - 0.5) * 0.5;
    tone[y * w + x] = t;
  }
  return (x, y) => tone[y * w + x];
}

// Night sky, 640x360, screen-fixed: navy overhead warming to a fire-lit red at the horizon, stars, a moon.
export const HORIZON = 250; // px
function sky() {
  const p = new Pix(640, 360), S = ['#05071a', '#0a0e28', '#121636', '#1e1a44', '#321c46', '#521e3c', '#7a2632', '#a8382a'];
  for (let y = 0; y < 360; y++) for (let x = 0; x < 640; x++) {
    const t = Math.pow(clamp(y / HORIZON, 0, 1), 1.8) * 7;
    p.set(x, y, S[clamp(dith(t, x, y), 0, 7)]);
  }
  for (let i = 0; i < 140; i++) {
    const x = Math.floor(hash(i, 1, 61) * 640), y = Math.floor(hash(i, 2, 61) * 190);
    p.set(x, y, hash(i, 3, 61) < 0.2 ? '#f0f2ff' : hash(i, 4, 61) < 0.5 ? '#8a90c0' : '#4a5080');
  }
  const mx = 130, my = 58, r = 20;
  for (let y = my - r - 8; y <= my + r + 8; y++) for (let x = mx - r - 8; x <= mx + r + 8; x++) {
    const d = Math.hypot(x - mx, y - my);
    if (d <= r) {
      const sh = (-(x - mx) * 0.5 - (y - my) * 0.5) / r, crater = hash(x >> 2, y >> 2, 62) < 0.12;
      p.set(x, y, ['#8a92b8', '#b4bcd8', '#dce0f0', '#f8f8ff'][clamp(dith(2 + sh * 1.6 - (crater ? 1 : 0), x, y), 0, 3)]);
    } else if (d <= r + 8 && dith((1 - (d - r) / 8) * 0.9, x, y) > 0) p.set(x, y, '#262c5a');
  }
  return p;
}

// Far below and away: the plain, Sodom burning on the horizon under a leaning plume of smoke, its glow on
// the sky (meteors are sprites, see MountainScene). 640x360, screen-fixed, transparent above the glow.
export const CITY_X = 210;
function farCity() {
  const p = new Pix(640, 360), G = ['#6a1c26', '#9a2a24', '#c8481e', '#f07a24', '#ffb848'];
  // glow dome over the city
  for (let y = HORIZON - 90; y < HORIZON; y++) for (let x = CITY_X - 200; x < CITY_X + 200; x++) {
    const d = Math.hypot((x - CITY_X) / 200, (HORIZON - y) / 90);
    if (d < 1 && dith((1 - d) * 3.2, x, y) > 0) p.set(x, y, G[clamp(dith((1 - d) * 3.4 - 0.6, x, y), 0, 3)]);
  }
  // smoke plume: a broad billowing column that leans right and spreads into a sheet high up, lit red below
  for (let y = 60; y < HORIZON - 2; y++) {
    const v = (HORIZON - y) / (HORIZON - 60);               // 0 at the city, 1 high up
    const cx = CITY_X + 20 + v * v * 150, half = 18 + v * 60 + Math.pow(v, 3) * 120;
    for (let x = Math.floor(cx - half * 1.4); x < cx + half * 1.4; x++) {
      const n = noise2(x / 22, y / 16, 63) * 0.55 + noise2(x / 9, y / 8, 64) * 0.3 + noise2(x / 4, y / 4, 69) * 0.15;
      const d = Math.abs(x - cx) / half;
      if (d > 0.45 + n * 0.75) continue;
      if (v > 0.6 && n < 0.3 + (v - 0.6) * 1.9) continue;   // frays into wisps, gone before the top
      const lit = clamp(1.1 - v * 1.8 + (n - 0.5) * 0.8 - d * 0.3, 0, 1);
      // high up the smoke thins toward the sky's color instead of darkening
      p.set(x, y, ['#140a18', '#221020', '#3a1624', '#62202a', '#8e3028'][clamp(dith(lit * 4, x, y), v > 0.55 ? 1 : 0, 4)]);
    }
  }
  // the plain
  for (let y = HORIZON; y < 360; y++) for (let x = 0; x < 640; x++) {
    const warm = clamp(1 - Math.hypot((x - CITY_X) / 180, (y - HORIZON) / 30), 0, 1);
    p.set(x, y, ['#0a0610', '#140a16', '#2a0e16', '#4a1414'][clamp(dith(1 + warm * 2.4 - (y - HORIZON) / 80, x, y), 0, 3)]);
  }
    // the city: a huddle of flat roofs around its ziggurat, with fires on top and a few lit windows
  const top = new Int16Array(p.w).fill(p.h);
  distantCity((x, y) => {
    if (x < 0 || x >= p.w || y > HORIZON) return;
    p.set(x, y, hash(x, y, 66) < 0.06 ? '#ffb040' : '#16080e');
    top[x] = Math.min(top[x], y);
  }, CITY_X, HORIZON, 44, 65);
  for (let x = CITY_X - 44; x < CITY_X + 44; x++) {
    if (top[x] < p.h && hash(x >> 2, 2, 65) < 0.35) for (let k = 1; k < 3 + (x & 3); k++) p.set(x, top[x] - k, G[clamp(4 - k, 1, 4)]);
  }
  return p;
}

// Distant ridges in front of the plain, low near the city so it stays in view. 640x360, screen-fixed.
function ridges() {
  const p = new Pix(640, 360);
  for (let x = 0; x < 640; x++) {
    const nearCity = clamp(1 - Math.abs(x - CITY_X) / 110, 0, 1);
    const h = Math.round((noise1(x / 40, 67) * 20 + noise1(x / 9, 68) * 5) * (1 - nearCity) + 2);
    for (let y = HORIZON + 6 - h; y < 360; y++) {
      const top = y === HORIZON + 6 - h;
      if (y > HORIZON + 10) break; // the plain shows below
      p.set(x, y, top ? '#343a6a' : y < HORIZON + 8 - h ? '#1e2244' : '#0e0e22');
    }
  }
  return p;
}

// Plants, painted straight into a Pix. Vines hang down from (x, y); tufts and shrubs stand on (x, y).
export function vine(p, x0, y0, len, seed) {
  const P = MTN.plant;
  let x = x0;
  for (let k = 0; k < len; k++) {
    x = x0 + Math.round(Math.sin(k * 0.16 + seed * 6) * 1.6 + Math.sin(k * 0.05 + seed * 3) * 2.5 * (k / len));
    p.set(x, y0 + k, P[1]);
    if (k % 3 === 1 && k > 1) {
      const side = (k / 3) % 2 < 1 ? -1 : 1, lit = side < 0;
      p.set(x + side, y0 + k, P[lit ? 4 : 3]);
      p.set(x + side * 2, y0 + k - 1, P[lit ? 5 : 2]);
      if (hash(k, 0, seed * 997) < 0.3) p.set(x + side, y0 + k + 1, P[2]);
    }
    if (k === len - 1) { p.set(x, y0 + k + 1, P[3]); p.set(x - 1, y0 + k, P[4]); }
  }
}
export function tuft(p, x, y, seed) {
  const P = MTN.plant, n = 3 + Math.floor(hash(x, y, seed) * 3);
  for (let i = 0; i < n; i++) {
    const bx = x + i - (n >> 1), h = 2 + Math.floor(hash(i, x, seed + 1) * 4), lean = hash(i, y, seed + 2) < 0.5 ? -1 : 1;
    for (let k = 0; k < h; k++) p.set(bx + (k > h - 2 ? lean : 0), y - k, P[k === h - 1 ? 5 : k > 0 ? 4 : 2]);
  }
}
export function shrub(p, x, y, seed) {
  const P = MTN.plant, r = 3 + Math.floor(hash(x, y, seed) * 3);
  for (let dy = -r; dy <= 0; dy++) for (let dx = -r - 1; dx <= r + 1; dx++) {
    const d = Math.hypot(dx / (r + 1), dy / r);
    if (d > 1 || hash(x + dx, y + dy, seed + 3) < 0.12 * d) continue;
    p.set(x + dx, y + dy, P[d > 0.85 ? 1 : dx < 0 && dy < -r / 2 ? 5 : dx > r / 2 ? 2 : 3 + (hash(dx, dy, seed) < 0.3 ? 1 : 0)]);
  }
  if (hash(x, y, seed + 4) < 0.4) {
    const c = MTN.flower[Math.floor(hash(x, y, seed + 5) * 3)];
    for (let i = 0; i < 3; i++) p.set(x - r + Math.floor(hash(i, x, seed + 6) * 2 * r), y - Math.floor(hash(i, y, seed + 7) * r), c);
  }
}

// The cliff, painted in 512 px (256 unit) tall chunks across the whole screen. edgeAt(worldY) gives the x of
// the cliff's left silhouette; the shadowed near side starts at sideAt(worldY). To keep it from reading as a
// flat cutout: fine facets inside larger masses, broad rounded shading, a lit band where the rock turns away
// at the silhouette, moonlit tops with thickness on outcrops, dark undersides, darker notches between
// outcrops, small boulders along the edge. Then cracks, pebbles, grass, shrubs and vines. Anything placed
// by world position (vines, ledge vines) is repeated in every chunk it reaches, so nothing is cut at seams.
const CLIFF_CHUNK = 512;
function cliffChunk(tone, y0, edgeAt, sideAt, ledges) {
  const p = new Pix(640, CLIFF_CHUNK), R = MTN.face, S = MTN.side, PAD = 48;
  const gy0 = Math.round(y0 * 2);
  // silhouette per row (px), with small boulders; rows PAD above and below for the look-ups
  const E = new Int16Array(CLIFF_CHUNK + 2 * PAD), SD = new Int16Array(CLIFF_CHUNK + 2 * PAD);
  for (let i = 0; i < E.length; i++) {
    const gy = gy0 + i - PAD;
    const jag = Math.round((hash(gy >> 1, 0, 7) - 0.5) * 2 + (noise1(gy / 5, 8) - 0.5) * 5);
    E[i] = Math.round(edgeAt(gy / 2) * 2) + (edgeAt(gy / 2) > 0 ? jag : 0);
    SD[i] = Math.round(sideAt(gy / 2) * 2);
  }
  const ex = (py) => E[clamp(py + PAD, 0, E.length - 1)];
  const tops = [];
  for (let py = 0; py < CLIFF_CHUNK; py++) {
    const e = ex(py), side = SD[py + PAD], gy = gy0 + py, ty = ((gy % 512) + 512) % 512;
    let near = e; // how far the silhouette juts out nearby: notches between outcrops get occluded
    for (let k = -40; k <= 40; k += 8) near = Math.min(near, ex(py + k));
    const recess = e - near;
    for (let x = Math.max(0, e); x < 640; x++) {
      const t = tone(x, ty) - 3;
      if (x >= side) {
        const d = x - side;
        const v = d === 0 ? 5.5 : d < 3 ? 4 : 2 + t * 0.7 - clamp(d / 60, 0, 1) * 1.2;
        p.set(x, py, S[clamp(dith(v, x, py), 0, 6)]);
        continue;
      }
      const d = x - e;
      let up = 0, dn = 0;
      for (let k = 1; k <= 8 && !up; k++) if (x < ex(py - k)) up = k;
      for (let k = 1; k <= 5 && !dn; k++) if (x < ex(py + k)) dn = k;
      let c;
      if (up === 1) { c = R[6]; tops.push([x, py]); }                       // moonlit top edge of an outcrop
      else if (up) c = R[clamp(dith(5.2 - up * 0.3 + t * 0.3, x, py), 0, 6)]; // its top surface, with thickness
      else if (dn === 1 || d === 0) c = R[0];                              // underside / silhouette
      else if (dn) c = R[clamp(dith(0.9 + dn * 0.25, x, py), 0, 6)];       // shadow under an overhang
      else if (d < 2) c = MTN.rim[d === 0 ? 0 : 1];                        // firelight on the edge facing the city
      else {
        const turn = d < 12 ? (1 - (d - 2) / 10) * 1.3 : 0;                  // the rock rounding away at the edge
        const bulge = (noise2(x / 70, gy / 90, 13) - 0.5) * 1.8;             // broad rounded masses
        const strata = Math.sin((x * 0.5 - gy) / 8) * 0.2;
        const v = 3.1 + t * 0.9 + turn + bulge + strata
          - clamp(d / 260, 0, 1) * 1.2                                       // falls off away from the edge
          - clamp(recess / 40, 0, 1) * clamp(1 - d / 70, 0, 1) * 1.6        // occlusion in notches
          - clamp((14 - (side - x)) / 14, 0, 1) * 1.5;                      // into the corner
        c = R[clamp(dith(v, x, py), 0, 6)];
      }
      p.set(x, py, c);
    }
  }
  const onFace = (x, py) => py >= 0 && py < CLIFF_CHUNK && x > ex(py) + 3 && x < SD[py + PAD] - 3;
  // small cracks and pebbles on the face
  for (let i = 0; i < 90; i++) {
    let x = Math.floor(hash(i, gy0, 101) * 640), y = Math.floor(hash(i, gy0, 102) * CLIFF_CHUNK);
    const len = 3 + Math.floor(hash(i, gy0, 103) * 8);
    for (let k = 0; k < len && onFace(x, y); k++) {
      p.set(x, y, R[0]); if (onFace(x + 1, y)) p.set(x + 1, y, R[4]);
      y += 1; x += hash(k, i, gy0 + 104) < 0.35 ? (hash(k, i, gy0 + 105) < 0.5 ? -1 : 1) : 0;
    }
  }
  for (let i = 0; i < 70; i++) {
    const x = Math.floor(hash(i, gy0, 106) * 640), y = Math.floor(hash(i, gy0, 107) * CLIFF_CHUNK);
    if (onFace(x, y) && onFace(x + 1, y + 1)) { p.set(x, y, R[5]); p.set(x + 1, y, R[4]); p.set(x, y + 1, R[1]); p.set(x + 1, y + 1, R[1]); }
  }
  // grass and shrubs on outcrop tops
  for (const [x, py] of tops) {
    const h = hash(x, gy0 + py, 108);
    if (h < 0.05) shrub(p, x, py, 109);
    else if (h < 0.2) tuft(p, x, py, 110);
  }
  // shrubs in cracks on the face, vines hanging down it and off overhangs (placed by world row, see above)
  for (let wy = Math.floor(y0) - 80; wy < y0 + CLIFF_CHUNK / 2; wy += 2) {
    const py = wy * 2 - gy0, h = hash(wy, 0, 111);
    if (h < 0.05) {
      const x = Math.round(edgeAt(wy) * 2) + 16 + Math.floor(hash(wy, 1, 111) * 150);
      if (x < sideAt(wy) * 2 - 20) vine(p, x, py, 30 + Math.floor(hash(wy, 2, 111) * 70), hash(wy, 3, 111));
    } else if (h < 0.09 && onFace(Math.round(edgeAt(wy) * 2) + 20, py)) {
      shrub(p, Math.round(edgeAt(wy) * 2) + 12 + Math.floor(hash(wy, 4, 111) * 120), py, 112);
    }
    const over = edgeAt(wy + 2) - edgeAt(wy);
    if (over > 2 && hash(wy, 5, 111) < 0.5) {
      const x = Math.round((edgeAt(wy) + 1 + hash(wy, 6, 111) * (over - 1)) * 2);
      vine(p, x, py + 2, 16 + Math.floor(hash(wy, 7, 111) * 50), hash(wy, 8, 111));
    }
  }
  // vines under ledges (behind the ledge art, which hides where they start)
  for (const l of ledges) {
    if (l.y < y0 - 60 || l.y > y0 + CLIFF_CHUNK / 2) continue;
    const n = 1 + Math.floor(hash(l.left, l.y, 113) * 3);
    for (let i = 0; i < n; i++) {
      const x = Math.round((l.left + 3 + hash(i, l.y, 114) * (l.w - 6)) * 2);
      vine(p, x, Math.round((l.y + 4) * 2) - gy0, 20 + Math.floor(hash(i, l.y, 115) * 60), hash(i, l.y, 116));
    }
  }
  return p;
}

// A far cliff on the left, 640x512 px, tiles vertically, screen-fixed with its own slow scroll: hazy
// moonlit rock, lower contrast than the one Lot climbs.
function distantCliff() {
  const p = new Pix(640, 512), t = rock(640, 512, 32, 121, 1.8);
  const H = ['#110f28', '#161430', '#1c1a3a', '#242246', '#2e2c56'];
  for (let y = 0; y < 512; y++) {
    const k = Math.floor(y / 64), f = (y % 64) / 64, sf = f * f * (3 - 2 * f), per = 8;
    const edge = 22 + Math.round((hash(k % per, 0, 122) * (1 - sf) + hash((k + 1) % per, 0, 122) * sf) * 44 + (noise1(y / 6, 123) - 0.5) * 8);
    for (let x = 0; x < edge; x++) {
      const d = edge - x;
      p.set(x, y, d <= 1 ? H[4] : H[clamp(dith(1.8 + (t(x, y) - 3) * 0.35 + (d < 6 ? 0.8 : 0), x, y), 0, 4)]);
    }
  }
  return p;
}

// Meteor streak, 24x24 px, pointing down-right (rotate the sprite): white-hot head, tail fading up-left.
function meteor() {
  const p = new Pix(24, 24), F = ['#6a1c14', '#c8401e', '#f07a24', '#ffb848', '#fff0b0'];
  for (let k = 0; k < 20; k++) {
    const x = 2 + k * 0.9, y = 2 + k * 0.9, v = k / 19;
    if (dith(v * 1.5, Math.round(x), Math.round(y)) === 0 && v < 0.5) continue;
    p.set(x, y, F[clamp(Math.floor(v * 4.2), 0, 4)]);
    if (v > 0.6) { p.set(x + 1, y, F[clamp(Math.floor(v * 3.6), 0, 3)]); p.set(x, y + 1, F[clamp(Math.floor(v * 3.6), 0, 3)]); }
  }
  p.set(20, 20, F[4]); p.set(21, 21, F[4]); p.set(21, 20, F[3]); p.set(20, 21, F[3]);
  return p;
}

// Ledge: a chunky outcrop of the cliff's rock, (2w)x36 px. Blocks of stone side by side, each with a
// moonlit top, a front face and a stepped underside; firelight catches the end facing the city.
export function ledge(wPx, kind) {
  const TOP = 6, H = 36 + TOP, p = new Pix(wPx, H), R = kind === 'crumble' ? MTN.crumble : MTN.stone, K = R[0];
  const D = Math.min(16, 4 + wPx * 0.2);
  const cuts = [0];
  while (cuts[cuts.length - 1] < wPx) cuts.push(cuts[cuts.length - 1] + 10 + Math.floor(hash(cuts.length, wPx, 94) * 8));
  cuts[cuts.length - 1] = wPx;
  for (let i = 0; i + 1 < cuts.length; i++) {
    const a = cuts[i], b = cuts[i + 1], u = ((a + b) / 2 / wPx) * 2 - 1;
    const dMax = Math.min(H - TOP - 1, 12 + Math.round((1 - Math.pow(Math.abs(u), 1.5)) * D + hash(i, wPx, 95) * 4));
    const tip = a + (b - a) * (0.3 + hash(i, wPx, 96) * 0.4);       // each block hangs to a rough point
    for (let x = a; x < b; x++) {
      const d = Math.max(9, Math.round(dMax - Math.abs(x + 0.5 - tip) * 0.45));
      for (let y = 0; y <= d; y++) {
        const endCap = (x < 2 || x > wPx - 3) && y < 2;
        if (endCap) continue;
        let c;
        if (y === 0 || y === d || x === 0 || x === wPx - 1) c = K;
        else if (x === a && y > 2 && y < 9) c = R[1];                     // fissure between blocks
        else if (y === 1) c = R[6];
        else if (y === 2) c = R[5];
        else if (y < 8) c = R[x - a < 2 ? 5 : b - 1 - x < 2 ? 3 : 4];
        else if (y === 8) c = R[2];
        else c = R[y > d - 3 ? 1 : x < tip ? 3 : 2];                      // underside in shadow, lit left of the point
        if (kind !== 'crumble' && x <= 2 && y > 1 && y < d) c = x === 1 ? MTN.rim[1] : MTN.rim[0];
        p.set(x, y + TOP, c);
      }
    }
  }
  if (kind === 'crumble') {
    // cracks right through it
    for (const f of [0.3, 0.7]) for (let y = 1; y < 14; y++) p.set(Math.round(wPx * f) + ((y * 3) >> 3) % 2, y + TOP, K);
  }
  // grass and the odd shrub on top (the TOP px of headroom above the walking surface)
  if (kind !== 'crumble') {
    for (let x = 3; x < wPx - 3; x += 5) {
      const h = hash(x, wPx, 117);
      if (h < 0.12) shrub(p, x, TOP, 118); else if (h < 0.55) tuft(p, x, TOP, 119);
    }
  }
  return p;
}

// Moving slab: a hewn block of the cliff's stone, (2w)x28 px (24 px of stone plus its shadow), that slides
// in a groove cut across the cliff.
export function slab(wPx) {
  const p = new Pix(wPx, 28), R = MTN.stone, K = R[0];
  for (let x = 0; x < wPx; x++) for (let y = 0; y < 24; y++) {
    const edge = y === 0 || y === 23 || x === 0 || x === wPx - 1;
    const joint = y > 6 && x === Math.round(wPx * 0.62) + ((y >> 2) & 1);
    let t = y === 1 ? 6 : y === 2 ? 5 : x < 3 ? 5 : x > wPx - 4 ? 3 : 4 - (y > 14 ? 1 : 0) - (y > 20 ? 1 : 0);
    if (hash(x >> 1, y >> 1, 45) < 0.12 && y > 3) t -= 1;
    let c = edge || joint ? K : R[clamp(t, 1, 6)];
    if (!edge && x <= 2 && y > 1) c = x === 1 ? MTN.rim[1] : MTN.rim[0];
    p.set(x, y, c);
  }
  for (let x = 2; x < wPx; x++) for (let y = 24; y < 28; y++) if (dith(1 - (y - 24) / 4, x, y) > 0) p.set(x, y, MTN.face[0]);
  return p;
}

// Groove cut across the face for a moving slab, 16x16 px, tiles horizontally: a rough channel, shadowed under
// its upper lip, moonlit along its lower lip.
function groove() {
  const p = new Pix(16, 16);
  for (let x = 0; x < 16; x++) {
    const top = 2 + Math.round(hash(x >> 1, 0, 46) * 2), bot = 12 + Math.round(hash(x >> 1, 1, 46) * 2);
    for (let y = top; y <= bot; y++) {
      const c = y === top ? MTN.face[4] : y === bot ? MTN.face[5] : y < top + 3 ? MTN.face[0] : MTN.face[1];
      p.set(x, y, c);
    }
  }
  return p;
}

// Soft pixel cloud (v = variant), 96x36 px.
function cloud(v) {
  const p = new Pix(96, 36), C = MTN.cloud;
  const puffs = [[22, 24, 14], [42, 18, 17], [62, 22, 15], [78, 26, 11], [34, 28, 11]]
    .map(([x, y, r], i) => [x + (hash(i, v, 51) - 0.5) * 10, y + (hash(i, v, 52) - 0.5) * 6, r * (0.8 + hash(i, v, 53) * 0.35)]);
  for (let y = 0; y < 36; y++) for (let x = 0; x < 96; x++) {
    let best = -1, lit = 0;
    for (const [cx, cy, r] of puffs) {
      const d = Math.hypot(x - cx, (y - cy) * 1.2) / r;
      if (d < 1 && 1 - d > best) { best = 1 - d; lit = (-(x - cx) * 0.4 - (y - cy) * 0.9) / r; }
    }
    if (best < 0 || y > 31) continue;
    const t = y > 29 ? 0 : best < 0.1 ? 1 : 2 + lit * 1.6 + best * 0.6;
    p.set(x, y, C[clamp(dith(t, x, y), 0, 4)]);
  }
  return p;
}

// Summit plateau, 640x80 px: a flat rocky top spanning the screen (walking surface 6 px down) over a
// ragged rock lip.
export const SUMMIT_LIP = 6;
function summit() {
  const p = new Pix(640, 80), t = rock(640, 80, 20, 71, 1);
  for (let x = 0; x < 640; x++) {
    // shallow like a big ledge (Lot's last hop passes up through it); the side walls hide the rest
    const bottom = SUMMIT_LIP + 14 + Math.round(noise1(x / 9, 72) * 10);
    for (let y = SUMMIT_LIP; y <= bottom && y < 80; y++) {
      let c;
      if (y === SUMMIT_LIP || y === bottom) c = MTN.face[0];
      else if (y === SUMMIT_LIP + 1) c = MTN.stone[6];
      else if (y < SUMMIT_LIP + 4) c = hash(x, y, 73) < 0.3 ? MTN.moss[2] : MTN.stone[5];
      else if (y < SUMMIT_LIP + 10) c = MTN.stone[y < SUMMIT_LIP + 7 ? 4 : 3];
      else c = MTN.face[clamp(dith(t(x, y) - (y - 16) / 20, x, y), 0, 6)];
      p.set(x, y, c);
    }
    // grass blades on top
    if (hash(x, 0, 74) < 0.2) p.set(x, SUMMIT_LIP - 1, MTN.moss[1 + (x & 1)]);
  }
  return p;
}

// The summit peak, 300x304 px, placed with its bottom-left on the plateau at world (PEAK.x, topY - 3): the
// mountain goes on rising at the right of the plateau, out of the top of the screen, and the cave is cut
// into its foot, glowing with firelight from deeper in. Two layers: 'mtn-peak' (all of it) behind Lot and
// 'mtn-peak-front' (the rock right of the mouth's middle, plus vines) in front of him, so he walks in
// through the mouth and on out of sight behind the rock.
export const PEAK = { x: 170, mouthL: 188, mouthR: 222 }; // world units
function peak() {
  // tall enough to fill the ending's screen too (EndingScene)
  const W = 300, H = 304, back = new Pix(W, H), front = new Pix(W, H), dark = new Pix(W, H), t = rock(W, H + 16, 20, 81, 1.4);
  const ML = (PEAK.mouthL - PEAK.x) * 2, MR = (PEAK.mouthR - PEAK.x) * 2, cx = (ML + MR) / 2, r = (MR - ML) / 2;
  const spring = H - 22, rv = 38; // the mouth's sides rise to here, then a ragged half-ellipse rv high
  const bump = (y, c, w) => Math.max(0, 1 - Math.abs(y - c) / w);
  // left silhouette per row: a face leaning back to the right, a shelf part way up, and a brow over the mouth
  const E = new Int16Array(H + 8);
  for (let i = 0; i < E.length; i++) {
    const g = H - (i - 8); // px above the plateau
    let e = g < 62 ? 32 - (62 - g) * 0.07 : Math.min(g - 34, 100 + (g - 134) * 0.5);
    e -= bump(g, 100, 8) * 12 + bump(g, 64, 10) * 6 + bump(g, 190, 10) * 16;
    E[i] = Math.round(e + (noise1(g / 9, 83) - 0.5) * 14 + (noise1(g / 3, 84) - 0.5) * 5);
  }
  const ex = (y) => E[clamp(y + 8, 0, E.length - 1)];
  // > 0 inside the mouth, roughly in px from its edge
  const mouthDist = (x, y) => {
    const jag = (noise1(y / 4, 86) - 0.5) * 5 + (noise1(x / 4, 87) - 0.5) * 4;
    if (y >= spring) return Math.min(x - ML, MR - x) + jag;
    const q = Math.hypot((x - cx) / r, (y - spring) / rv);
    return (1 - q) * r + jag;
  };
  for (let y = 0; y < H; y++) for (let x = Math.max(0, ex(y)); x < W; x++) {
    const m = mouthDist(x, y);
    if (m >= 0) {
      // the passage: its vault shows as a dark band just inside the arch; the light grows toward the right,
      // where the tunnel turns into the mountain toward the fire
      const f = clamp((x - ML) / (MR - ML), 0, 1);
      const k = m < 3 && y < H - 1 ? 0.2 : 0.3 + f * f * 3.4 + (y - spring + rv) / (H - spring + rv) * 0.8;
      back.set(x, y, MTN.glow[clamp(dith(k, x, y), 0, 5)]);
      dark.set(x, y, '#0a0608');
      continue;
    }
    const d = x - ex(y);
    let up = 0;
    for (let k = 1; k <= 5 && !up; k++) if (x < ex(y - k)) up = k;
    let c;
    if (up === 1) c = MTN.stone[6];                                                  // moonlit top of a ledge
    else if (up) c = MTN.face[clamp(dith(5.3 - up * 0.4, x, y), 0, 6)];
    else if (d === 0) c = MTN.face[0];                                               // silhouette
    else if (d < 2) c = MTN.rim[1];                                                  // the city's firelight on the edge
    else if (m > -5) c = MTN.warm[clamp(dith(5.2 + m * 0.35, x, y), 0, 6)];         // warm-lit rim of the mouth
    else {
      const turn = d < 10 ? (1 - d / 10) * 1.1 : 0;                                  // rock rounding away at the edge
      const v = t(x, y) + turn - clamp((x - 140) / 160, 0, 1) * 1.3 - clamp((y - H + 24) / 24, 0, 1) * 0.6;
      c = MTN.face[clamp(dith(v, x, y), 0, 6)];
    }
    back.set(x, y, c);
    if (x >= cx) front.set(x, y, c);
    if (up === 1 && hash(x, y, 85) < 0.35) back.set(x, y - 1, MTN.moss[1 + (x & 1)]); // grass on ledges
  }
  // a few vines hanging over the mouth from the brow
  for (const [vx, len] of [[ML + 6, 14], [ML + 19, 8], [cx + 9, 18], [MR - 5, 10]]) {
    for (let k = 0; k < len; k++) {
      const x = vx + Math.round(Math.sin(k / 3 + vx) * 0.8), y = spring - Math.round(rv * Math.sqrt(Math.max(0, 1 - ((vx - cx) / r) ** 2))) + k;
      const c = MTN.plant[k % 5 === 2 ? 5 : 3 - (k & 1)];
      front.set(x, y, c);
      if (k % 4 === 1) front.set(x + 1, y, MTN.plant[4]);
    }
  }
  return { back, front, dark };
}

let rockTone = null;
export function buildMountainArt(scene) {
  if (scene.textures.exists('mtn-sky')) return;
  pixTexture(scene, 'mtn-sky', sky());
  pixTexture(scene, 'mtn-city', farCity());
  pixTexture(scene, 'mtn-ridges', ridges());
  pixTexture(scene, 'mtn-distant', distantCliff());
  pixTexture(scene, 'mtn-meteor', meteor());
  pixTexture(scene, 'mtn-groove', groove());
  pixTexture(scene, 'mtn-summit', summit());
  const pk = peak();
  pixTexture(scene, 'mtn-peak', pk.back);
  pixTexture(scene, 'mtn-peak-front', pk.front);
  pixTexture(scene, 'mtn-peak-dark', pk.dark);
  [0, 1, 2].forEach(v => pixTexture(scene, `mtn-cloud${v}`, cloud(v)));
}

// Paint the cliff for world rows top..bottom; returns [{ key, y }] chunk textures to place at x = 0.
// The silhouette follows the ledges passed in through edgeAt.
export const LEDGE_HEADROOM = 3; // world units of grass above a ledge's surface in its texture
export function buildCliff(scene, top, bottom, edgeAt, sideAt, ledges) {
  if (!rockTone) {
    // fine facets inside larger masses
    const fine = rock(640, 512, 16, 11, 1.3), big = rock(640, 512, 64, 12, 1.8);
    rockTone = (x, y) => 3 + (fine(x, y) - 3) * 0.6 + (big(x, y) - 3) * 0.5;
  }
  const out = [];
  for (let y0 = top, i = 0; y0 < bottom; y0 += CLIFF_CHUNK / 2, i++) {
    const key = `mtn-cliff-${i}`;
    pixTexture(scene, key, cliffChunk(rockTone, y0, edgeAt, sideAt, ledges));
    out.push({ key, y: y0 });
  }
  return out;
}

// Ledge / slab textures per width (world units), painted on first use.
export function ledgeKey(scene, kind, w) {
  const key = `mtn-${kind}-${w}`;
  if (!scene.textures.exists(key)) pixTexture(scene, key, kind === 'moving' ? slab(w * 2) : ledge(w * 2, kind));
  return key;
}
