// Wilderness art: the walk from where the angels set the family down to the foot of the mountain, painted
// in code at 2x density. It is the passage from Act I to Act III. At the left it still looks like Act I:
// a fire-lit maroon sky under drifting smoke, warm sand, Sodom burning on the horizon behind. Walking right,
// night falls into Act III's navy sky and moon, the sand gives way to the mountain's blue rock, the
// foothills rise, the mountain looms up in the distance and at the end its cliff, painted like Act III's,
// rises out of the ground.
// Layers scroll at their WILD factors; their widths are sized for a world `worldW` units wide.
import { Pix, hash, noise1, noise2, dith, mix, bayer, pixTexture } from './pix.js';
import { ENV } from './palette.js';
import { MTN, rock, tuft, shrub, vine } from './mountainArt.js';

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const smooth = (a, b, v) => { const t = clamp((v - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };

export const WILD = { sky: 0.4, far: 0.08, hills: 0.3, massif: 0.55 };
export const HZ = 252;            // horizon, px (126 units)
const VIEW_W = 640;               // screen width, px

// Act I's sky (sodomBackdrop.js) and Act III's (mountainArt.js), band by band
const DUSK = ['#0a0826', '#120a2e', '#1c0b32', '#2a0c32', '#3c0e30', '#52102c', '#6c1426', '#8a1a1e'];
const NIGHT = ['#05071a', '#0a0e28', '#121636', '#1e1a44', '#321c46', '#521e3c', '#7a2632', '#a8382a'];
const SMOKE = ['#2a0a26', '#420c28', '#5e1026', '#801620', '#a41e1a'];
// warm sand of the landing (flightProps.js landGround) and the mountain's rock, dark -> lit
const SAND = ['#2a1210', '#6a3420', '#9a5430', '#c47a40', '#e2a05a', '#f6c47e'];
const STONE = [MTN.stone[0], MTN.stone[2], MTN.stone[3], MTN.stone[4], MTN.stone[5], MTN.stone[6]];
const STRAW = ['#4a2e14', '#7a5424', '#a87c38', '#d4a858'];

const layerW = (worldW, f) => Math.ceil(VIEW_W + (worldW * 2 - VIEW_W) * f);

// Sky: Act I's at the left blending into Act III's at the right (in 5 dithered steps), smoke drifting over
// the left, stars coming out toward the right, and Act III's moon where it hangs when the walk ends.
function sky(worldW) {
  const W = layerW(worldW, WILD.sky), H = 360, p = new Pix(W, H);
  const ramp = [0, 1, 2, 3, 4].map(k => DUSK.map((c, i) => mix(c, NIGHT[i], k / 4)));
  for (let x = 0; x < W; x++) {
    const u = smooth(0.12, 0.8, x / W);
    for (let y = 0; y < H; y++) {
      const t = (Math.pow(y / H, 1.25) * (1 - u) + Math.pow(clamp(y / HZ, 0, 1), 1.8) * u) * 7;
      const k = clamp(dith(u * 4, x, y), 0, 4);
      p.set(x, y, ramp[k][clamp(dith(t, x, y), 0, 7)]);
      // smoke from the burning city, thinning out to the right
      if (y < 190) {
        const n = noise2(x / 70, y / 30, 21) * 0.6 + noise2(x / 24, y / 12, 22) * 0.3 + noise2(x / 8, y / 5, 23) * 0.1;
        const dens = n - 0.42 - smooth(0.05, 0.5, x / W) * 0.5 - Math.abs(y - 90) / 260;
        if (dens > 0) {
          const below = noise2(x / 70, (y + 6) / 30, 21) * 0.6 + noise2(x / 24, (y + 6) / 12, 22) * 0.3;
          p.set(x, y, SMOKE[clamp(dith(dens * 14 + clamp((n - below) * 6, 0, 1.5), x, y), 0, 4)]);
        }
      }
    }
  }
  for (let i = 0; i < 260; i++) {
    const x = Math.floor(hash(i, 1, 24) * W), y = Math.floor(hash(i, 2, 24) * 200);
    if (hash(i, 5, 24) > smooth(0.2, 0.9, x / W) || p.data[y * W + x] === 0) continue;
    p.set(x, y, hash(i, 3, 24) < 0.2 ? '#f0f2ff' : hash(i, 4, 24) < 0.5 ? '#8a90c0' : '#4a5080');
  }
  // the moon: where Act III shows it (screen x 130 px) once the walk is over
  const mx = W - VIEW_W + 130, my = 58, r = 20;
  for (let y = my - r - 8; y <= my + r + 8; y++) for (let x = mx - r - 8; x <= mx + r + 8; x++) {
    const d = Math.hypot(x - mx, y - my);
    if (d <= r) {
      const sh = (-(x - mx) * 0.5 - (y - my) * 0.5) / r, crater = hash(x >> 2, y >> 2, 62) < 0.12;
      p.set(x, y, ['#8a92b8', '#b4bcd8', '#dce0f0', '#f8f8ff'][clamp(dith(2 + sh * 1.6 - (crater ? 1 : 0), x, y), 0, 3)]);
    } else if (d <= r + 8 && dith((1 - (d - r) / 8) * 0.9, x, y) > 0) p.set(x, y, '#262c5a');
  }
  return p;
}

// Far away behind them: Sodom burning on the horizon under its leaning plume, and the dark plain.
export const CITY_X = 150; // px
function farSodom(worldW) {
  const W = layerW(worldW, WILD.far), H = 360, p = new Pix(W, H), G = ['#6a1c26', '#9a2a24', '#c8481e', '#f07a24', '#ffb848'];
  for (let y = HZ - 100; y < HZ; y++) for (let x = 0; x < CITY_X + 240; x++) {
    const d = Math.hypot((x - CITY_X) / 230, (HZ - y) / 100);
    if (d < 1 && dith((1 - d) * 3.2, x, y) > 0) p.set(x, y, G[clamp(dith((1 - d) * 3.4 - 0.6, x, y), 0, 3)]);
  }
  for (let y = 40; y < HZ - 2; y++) {
    const v = (HZ - y) / (HZ - 40);
    const cx = CITY_X + 16 + v * v * 170, half = 16 + v * 56 + Math.pow(v, 3) * 110;
    for (let x = Math.floor(cx - half * 1.4); x < cx + half * 1.4; x++) {
      const n = noise2(x / 22, y / 16, 25) * 0.55 + noise2(x / 9, y / 8, 26) * 0.3 + noise2(x / 4, y / 4, 27) * 0.15;
      if (Math.abs(x - cx) / half > 0.45 + n * 0.75) continue;
      if (v > 0.6 && n < 0.3 + (v - 0.6) * 1.9) continue;
      // lit red low down; high up it thins toward the sky's color instead of darkening
      const lit = clamp(1.1 - v * 1.8 + (n - 0.5) * 0.8 - Math.abs(x - cx) / half * 0.3, 0, 1) + smooth(0.45, 0.9, v) * 0.3;
      p.set(x, y, ['#140a18', '#221020', '#3a1624', '#62202a', '#8e3028'][clamp(dith(lit * 4, x, y), 0, 4)]);
    }
  }
  for (let y = HZ; y < H; y++) for (let x = 0; x < W; x++) {
    const warm = clamp(1 - Math.hypot((x - CITY_X) / 200, (y - HZ) / 30), 0, 1);
    p.set(x, y, ['#0a0610', '#140a16', '#2a0e16', '#4a1414'][clamp(dith(1 + warm * 2.4 - (y - HZ) / 80, x, y), 0, 3)]);
  }
  for (let x = CITY_X - 48; x < CITY_X + 48; x++) {
    const h = 4 + Math.round(hash(x >> 2, 0, 28) * 12 * (1 - Math.abs(x - CITY_X) / 54)) + (hash(x >> 1, 1, 28) < 0.08 ? 7 : 0);
    for (let y = HZ - h; y <= HZ; y++) p.set(x, y, hash(x, y, 29) < 0.06 ? '#ffb040' : '#16080e');
    if (hash(x >> 2, 2, 28) < 0.4) for (let k = 1; k < 3 + (x & 3); k++) p.set(x, HZ - h - k, G[clamp(4 - k, 1, 4)]);
  }
  return p;
}

// Foothills in front of the plain: low and fire-rimmed near the city, rising and turning moonlit navy toward
// the mountain.
function hills(worldW) {
  const W = layerW(worldW, WILD.hills), H = 360, p = new Pix(W, H);
  for (let x = 0; x < W; x++) {
    const u = smooth(0.15, 0.9, x / W);
    const h = Math.round(2 + u * 34 + (noise1(x / 46, 31) * 16 + noise1(x / 11, 32) * 5) * (0.3 + u));
    const body = mix(ENV.dark[2], MTN.side[3], u), deep = mix(ENV.dark[1], MTN.side[1], u);
    const rim = mix(ENV.darkWarm[4], MTN.face[3], u), lit = mix(ENV.darkWarm[3], MTN.side[4], u);
    for (let y = HZ + 8 - h; y < 300; y++) {
      const d = y - (HZ + 8 - h);
      p.set(x, y, d === 0 ? rim : d < 3 ? lit : dith(1.6 - d / 22 + noise2(x / 14, y / 8, 33) * 0.6, x, y) > 0 ? body : deep);
    }
  }
  return p;
}

// The mountain, looming in the distance: Act III's rock under a veil of night haze, a slope rising from the
// left out of the top of the screen, moonlit along its crest and warmed by the city's glow on its flank.
export const MASSIF_W = 800;
function massif() {
  const W = MASSIF_W, H = 360, p = new Pix(W, H), t = rock(W, H, 24, 34, 1.6);
  const haze = '#2a2650';
  const R = MTN.face.map(c => mix(c, haze, 0.58)), S = MTN.side.map(c => mix(c, haze, 0.5));
  const top = (x) => 292 - 440 * Math.pow(smooth(0.02, 0.8, x / W), 0.8) + (noise1(x / 34, 35) - 0.5) * 30 + (noise1(x / 9, 36) - 0.5) * 8
    - Math.max(0, 1 - Math.abs(x - 190) / 60) * 40;                               // a shoulder part way up
  for (let x = 0; x < W; x++) {
    const y0 = Math.max(0, Math.round(top(x)));
    const side = x > 560 + noise1(x / 20, 37) * 30;
    for (let y = y0; y < H; y++) {
      const d = y - y0;
      let c;
      if (d === 0 && y0 > 0) c = R[5];                                             // moonlit crest
      else if (d < 3 && !side) c = R[4];
      else if (side) c = S[clamp(dith(t(x, y) - 1.2, x, y), 0, 6)];
      else {
        const warm = x < 260 && d < 16 && hash(x, y, 38) < 0.5 - d / 32;        // city glow on the near flank
        c = warm ? mix(MTN.rim[0], haze, 0.4) : R[clamp(dith(t(x, y) - 0.6 - (y - y0) / 200, x, y), 0, 6)];
      }
      p.set(x, y, c);
    }
  }
  return p;
}

// The foot of the mountain at the end of the walk: Act III's cliff rising out of the ground, W px wide,
// to the top of the screen; its left silhouette leans out in outcrops. Ground level at the bottom row.
export const CLIFF_PX = { w: 200, h: 256 };
function cliff() {
  const { w: W, h: H } = CLIFF_PX, p = new Pix(W, H), t = rock(W, H, 16, 39, 1.3), R = MTN.face;
  const E = (y) => Math.round(24 + (H - y) * 0.05 - Math.max(0, 1 - Math.abs(y - 150) / 30) * 16
    - Math.max(0, 1 - Math.abs(y - 60) / 24) * 12 + (noise1(y / 9, 40) - 0.5) * 14 + (noise1(y / 3, 41) - 0.5) * 4);
  const tops = [];
  for (let y = 0; y < H; y++) for (let x = Math.max(0, E(y)); x < W; x++) {
    const d = x - E(y);
    let up = 0;
    for (let k = 1; k <= 6 && !up; k++) if (y - k >= 0 && x < E(y - k)) up = k;
    let c;
    if (up === 1) { c = R[6]; tops.push([x, y]); }                                // moonlit top of an outcrop
    else if (up) c = R[clamp(dith(5.2 - up * 0.35, x, y), 0, 6)];
    else if (d === 0) c = R[0];
    else if (d < 2) c = MTN.rim[1];                                               // the city's firelight on the edge
    else {
      const turn = d < 12 ? (1 - d / 12) * 1.2 : 0;
      const v = t(x, y) + turn - clamp((x - 90) / 110, 0, 1) * 1.2 + (noise2(x / 50, y / 60, 42) - 0.5) * 1.4;
      c = R[clamp(dith(v, x, y), 0, 6)];
    }
    p.set(x, y, c);
  }
  tops.forEach(([x, y], i) => {
    if (hash(x, y, 43) < 0.35) p.set(x, y - 1, MTN.moss[1 + (x & 1)]);
    if (hash(x, y, 44) < 0.05) vine(p, x, y + 1, 10 + Math.floor(hash(i, 0, 45) * 24), hash(x, y, 46));
  });
  for (let x = 30; x < W; x += 14 + Math.floor(hash(x, 0, 47) * 20)) tuft(p, x, H - 1, 48);
  return p;
}

// Ground for the whole walk, worldW units wide and 80 tall, drawn from y = 100 units: it follows groundTop
// (units, per world x) and runs from warm sand to the mountain's blue rock, with its own plants on top:
// dry grass, thorn bushes and a dead tree early on, moss, shrubs and flowers near the mountain.
export const GROUND_Y0 = 100;
function ground(worldW, groundTop) {
  const W = worldW * 2, H = 160, p = new Pix(W, H), t = rock(W, H, 18, 50, 1.2);
  const top = new Int16Array(W + 2);
  for (let x = -1; x <= W; x++) top[x + 1] = Math.round(groundTop((x + 0.5) / 2) * 2) - GROUND_Y0 * 2;
  const T = (x) => top[clamp(x, -1, W) + 1];
  for (let x = 0; x < W; x++) {
    const u = smooth(0.3, 0.88, x / W), t0 = T(x);
    const sand = SAND.map(c => mix(c, MTN.face[2], u * 0.35)); // sand cooling in the night light
    for (let y = t0; y < H; y++) {
      const d = y - t0;
      // near the side of a raised step: k columns from its edge
      let kL = 0, kR = 0;
      for (let k = 1; k <= 4; k++) { if (!kL && y < T(x - k)) kL = k; if (!kR && y < T(x + k)) kR = k; }
      // patches of rock break through the sand, more and more of them toward the mountain
      const patch = noise2(x / 46, y / 20, 51) * 0.7 + noise2(x / 12, y / 8, 57) * 0.3;
      const stone = patch + (bayer(x, y) - 0.5) * 0.08 < u * 1.2 - 0.12;
      let v;
      if (d === 0 || kL === 1 || kR === 1) v = 0;                                     // outline
      else if (kL) v = 4.4 - kL * 0.3;                                                // side facing the city's glow
      else if (kR) v = 1.2 + kR * 0.3;                                                // side in shadow
      else if (d < 3) v = 5;
      else if (d < 6) v = 4;
      else v = 3.6 - d / 38 * 2.4;
      if (v > 0 && d >= 3) {
        if (stone) v += (t(x, y) - 3) * 0.8;
        else v += Math.sin((y + noise1(x / 30, 52) * 8) / 2.6) * 0.25 + (hash(x >> 1, y >> 1, 53) < 0.04 ? -1 : 0);
      }
      const i = clamp(v === 0 ? 0 : dith(v, x, y), v === 0 ? 0 : 1, 5);
      p.set(x, y, stone ? STONE[i] : sand[i]);
    }
  }
  // on top: plants and pebbles, sparser near step edges
  for (let x = 4; x < W - 4; x++) {
    const y = T(x) - 1, u = smooth(0.3, 0.88, x / W);
    if (T(x - 3) !== T(x) || T(x + 3) !== T(x)) continue;
    const r = hash(x, 0, 54);
    if (r < 0.035) (hash(x, 1, 54) < u ? tuft : dryTuft)(p, x, y, 55 + x);
    else if (r < 0.042 && u > 0.35) shrub(p, x, y, 56 + x);
    else if (r < 0.048 && u < 0.5) thornBush(p, x, y, 57 + x);
    else if (r < 0.08) p.set(x, y, (hash(x, 2, 54) < u - 0.1 ? STONE : SAND)[hash(x, 3, 54) < 0.5 ? 4 : 2]);
  }
  deadTree(p, 250, T(250) - 1);
  return p;
}

function dryTuft(p, x, y, seed) {
  const n = 3 + Math.floor(hash(x, y, seed) * 4);
  for (let i = 0; i < n; i++) {
    const bx = x + i - (n >> 1), h = 2 + Math.floor(hash(i, x, seed + 1) * 5), lean = hash(i, y, seed + 2) < 0.5 ? -1 : 1;
    for (let k = 0; k < h; k++) p.set(bx + (k > h - 3 ? lean : 0), y - k, STRAW[k === h - 1 ? 3 : k > 0 ? 2 : 1]);
  }
}

// Branching dry twigs from (x, y), bare but for a few thorns.
function thornBush(p, x, y, seed) {
  const twig = (x0, y0, a, len, depth) => {
    let px = x0, py = y0;
    for (let k = 0; k < len; k++) {
      px += Math.cos(a); py -= Math.sin(a);
      p.set(Math.round(px), Math.round(py), ENV.wood[depth > 1 ? 1 : 2]);
    }
    if (depth < 3) for (const s of [-1, 1]) twig(px, py, a + s * (0.4 + hash(depth, s, seed) * 0.5), len * 0.6, depth + 1);
  };
  twig(x, y, Math.PI / 2 - 0.5, 5, 0);
  twig(x, y, Math.PI / 2 + 0.5, 5, 0);
}

// A gnarled dead acacia leaning away from the city.
function deadTree(p, x, y) {
  const W = ENV.wood;
  const limb = (x0, y0, a, len, r, depth) => {
    let px = x0, py = y0;
    for (let k = 0; k < len; k++) {
      a += (noise1(k / 4 + depth * 7, 60) - 0.5) * 0.25;
      px += Math.cos(a); py -= Math.sin(a);
      const rr = r * (1 - k / len * 0.4);
      for (let dx = -Math.ceil(rr); dx <= Math.ceil(rr); dx++) {
        const lit = dx < 0;
        p.set(Math.round(px + dx), Math.round(py), dx === -Math.ceil(rr) || dx === Math.ceil(rr) ? W[0] : W[lit ? 3 : 2]);
      }
    }
    if (depth < 3) {
      limb(px, py, a + 0.6, len * 0.62, Math.max(0.5, r * 0.6), depth + 1);
      limb(px, py, a - 0.5, len * 0.7, Math.max(0.5, r * 0.6), depth + 1);
    }
  };
  limb(x, y, Math.PI / 2 - 0.25, 34, 2.5, 0);
}

// A boulder, 30x22 px, lit from the upper left; warm sandstone early on, the mountain's rock later.
function boulder(cool) {
  const p = new Pix(30, 22), R = cool ? STONE : SAND;
  for (let y = 0; y < 22; y++) for (let x = 0; x < 30; x++) {
    const dx = (x - 14.5) / 14.5, dy = (y - 21) / 20;
    const d = dx * dx + dy * dy + (noise1(x / 3, cool ? 61 : 62) - 0.5) * 0.25;
    if (d > 1) continue;
    const v = d > 0.86 ? 0 : 3.2 - dx * 1.2 - dy * 0.3 + (hash(x >> 1, y >> 1, 63) - 0.5) * 0.8 - (dy > -0.25 ? 1 : 0);
    p.set(x, y, R[v === 0 ? 0 : clamp(dith(v, x, y), 1, 5)]);
  }
  return p;
}

// Wooden signpost, 32x32 px: a post and a board with an arrow pointing on toward the mountain.
function signpost() {
  const p = new Pix(32, 32), W = ENV.wood;
  for (let y = 10; y < 32; y++) for (let x = 14; x < 18; x++) p.set(x, y, x === 14 || x === 17 ? W[0] : W[x === 15 ? 3 : 2]);
  for (let y = 4; y < 16; y++) for (let x = 2; x < 30; x++) {
    const edge = y === 4 || y === 15 || x === 2 || x === 29;
    p.set(x, y, edge ? W[0] : W[y < 6 ? 4 : hash(x >> 2, y, 64) < 0.2 ? 2 : 3]);
  }
  // arrow
  for (let x = 7; x < 21; x++) { p.set(x, 9, W[0]); p.set(x, 10, W[0]); }
  for (let k = 0; k < 5; k++) { p.set(20 + k, 9 - (4 - k), W[0]); p.set(20 + k, 10 + (4 - k), W[0]); p.set(21 + k, 9 - (4 - k), W[0]); p.set(21 + k, 10 + (4 - k), W[0]); }
  return p;
}

export function buildWildernessArt(scene, worldW, groundTop) {
  if (scene.textures.exists('wild-sky')) return;
  pixTexture(scene, 'wild-sky', sky(worldW));
  pixTexture(scene, 'wild-far', farSodom(worldW));
  pixTexture(scene, 'wild-hills', hills(worldW));
  pixTexture(scene, 'wild-massif', massif());
  pixTexture(scene, 'wild-cliff', cliff());
  pixTexture(scene, 'wild-ground', ground(worldW, groundTop));
  pixTexture(scene, 'wild-rock0', boulder(false));
  pixTexture(scene, 'wild-rock1', boulder(true));
  pixTexture(scene, 'wild-sign', signpost());
}
