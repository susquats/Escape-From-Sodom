// Act I backdrop, painted in code at 2x density: a night sky, a band of fire-lit smoke, a far skyline of
// an ancient mudbrick city on its tell (ziggurat, walls, palms), and nearer burning mudbrick houses. The layers wrap
// horizontally so they can be repeated for parallax. Style reference: art/reference/style-sheet.webp.
// Each layer also has a calm variant ('sodom-night-*'): the same city the night before, under the moon, with
// lamplit windows, whole rooftops and no fire or smoke. Act I opens on it and cross-fades to the burning one.
import { Pix, hash, noise1, noise2, dith, pixTexture } from './pix.js';
import { ENV, ENV_NIGHT } from './palette.js';
import { house, ziggurat, palm, cityWall } from './ancientCity.js';

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const wrapSet = (p, x, y, c) => p.set(((x % p.w) + p.w) % p.w, y, c);

// top of the sky down to the fire glow at the horizon
const SKY = ['#0a0826', '#120a2e', '#1c0b32', '#2a0c32', '#3c0e30', '#52102c', '#6c1426', '#8a1a1e'];
// smoke lit by the fire below, dark -> bright
const SMOKE = ['#2a0a26', '#420c28', '#5e1026', '#801620', '#a41e1a', '#c83418', '#e8561c', '#f8862a', '#ffb848', '#ffe08a'];

export const SKY_W = 640, SKY_H = 360;

function fbm(x, y, s, wrap) {
  let v = 0, a = 0.55, f = 1;
  for (let o = 0; o < 4; o++) { v += noise2(x * f, y * f, s + o, wrap ? wrap * f : 0) * a; a *= 0.5; f *= 2; }
  return v / 0.97;
}

// a calm night: deep blue down to a faint violet haze over the horizon
const NIGHT_SKY = ['#04061a', '#080c26', '#0c1230', '#121a3a', '#1a2244', '#242a4c', '#302f52', '#3c3456'];
const NIGHT_CLOUD = ['#0e1430', '#161e3e', '#20294c', '#2c3558', '#3a4468', '#56608a'];

// Screen-fixed sky gradient (dithered bands).
function sky(calm) {
  const p = new Pix(SKY_W, SKY_H), ramp = calm ? NIGHT_SKY : SKY;
  for (let y = 0; y < SKY_H; y++) {
    const t = Math.pow(y / SKY_H, 1.25) * (ramp.length - 1);
    for (let x = 0; x < SKY_W; x++) p.set(x, y, ramp[clamp(dith(t, x, y), 0, ramp.length - 1)]);
  }
  // stars: a few faint ones in the top band, many more on a clear night
  for (let i = 0; i < (calm ? 150 : 40); i++) {
    const x = Math.floor(hash(i, 1, 3) * SKY_W), y = Math.floor(hash(i, 2, 3) * (calm ? 170 : 70));
    const q = hash(i, 3, 3);
    p.set(x, y, calm ? (q < 0.15 ? '#fff6d8' : q < 0.5 ? '#9aa4d0' : '#4a5488') : q < 0.3 ? '#8a7ab0' : '#3a2e62');
    if (calm && q < 0.04) [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(([dx, dy]) => p.set(x + dx, y + dy, '#6a74a8'));
  }
  if (calm) {
    // the moon, with a soft halo
    const mx = 470, my = 62, r = 15;
    for (let y = my - 44; y <= my + 44; y++) for (let x = mx - 44; x <= mx + 44; x++) {
      const d = Math.hypot(x - mx, y - my);
      if (d <= r) {
        const lit = clamp(1 - Math.hypot(x - mx + 5, y - my + 5) / (r * 1.7), 0, 1);
        const crater = noise2(x / 4, y / 4, 5) > 0.68;
        p.set(x, y, ['#b8b4a4', '#d8d2bc', '#eee8d0', '#fffbe8'][clamp(dith(lit * 3.4 - (crater ? 1 : 0), x, y), 0, 3)]);
      } else if (d <= r + 1) p.set(x, y, '#8a8ca8');
      else if (dith(clamp(1 - (d - r) / 30, 0, 1) * 0.9, x, y) > 0) p.set(x, y, '#3a4270');
    }
  }
  return p;
}

// Thin moonlit cloud wisps for the calm night. Wraps horizontally every CLOUD_W px.
function nightClouds() {
  const p = new Pix(CLOUD_W, CLOUD_H), wrap = 16, sx = CLOUD_W / wrap;
  for (let y = 0; y < CLOUD_H; y++) for (let x = 0; x < CLOUD_W; x++) {
    const band = Math.exp(-(((y - 70) / 26) ** 2)) + 0.6 * Math.exp(-(((y - 150) / 18) ** 2));
    const dens = fbm(x / sx, y / 20, 13, wrap) * band - 0.42;
    if (dens < 0) continue;
    const above = fbm(x / sx, (y - 5) / 20, 13, wrap) * band - 0.42;
    const v = clamp(dens * 9 + (dens > above ? 1.4 : 0), 0, NIGHT_CLOUD.length - 1);
    p.set(x, y, NIGHT_CLOUD[clamp(dith(v, x, y), 0, NIGHT_CLOUD.length - 1)]);
  }
  return p;
}

// Billowing smoke clouds lit from below. Wraps horizontally every W px.
export const CLOUD_W = 1024, CLOUD_H = 300;
function clouds() {
  const p = new Pix(CLOUD_W, CLOUD_H), wrap = 16, sx = CLOUD_W / wrap;
  for (let y = 0; y < CLOUD_H; y++) for (let x = 0; x < CLOUD_W; x++) {
    const n = fbm(x / sx, y / 46, 11, wrap);
    const fy = y / CLOUD_H;
    const dens = n + fy * 1.4 - 0.98 - clamp((0.4 - fy) / 0.4, 0, 1) * 0.2;
    if (dens < 0) {
      // thin dark smoke fringe instead of clear sky low down
      if (fy > 0.3 && dens > -0.1) p.set(x, y, SMOKE[dith(0.5, x, y) > 0 ? 0 : 1]);
      continue;
    }
    // underside light: denser above than here -> this pixel faces down toward the fire
    const below = fbm(x / sx, (y + 7) / 46, 11, wrap);
    const lit = clamp((n - below) * 5 + 0.5, 0, 1);
    const v = clamp(dens * 4 + fy * 5 + lit * 2 - 1.4, 0, SMOKE.length - 1);
    p.set(x, y, SMOKE[clamp(dith(v, x, y), 0, SMOKE.length - 1)]);
  }
  return p;
}

const FIRE = ['#8a1a14', '#c8321a', '#f06a1e', '#ffa838', '#ffe28a'];

// Fire burning on a roofline. roof(x) = y of the building silhouette at column x (-1 = no building). Each
// column's flame rises from its own roof pixel and is never painted over the building, so the fire follows
// the ragged roof instead of sitting on a flat base; the roof edge under it glows.
function flames(p, cx, w, h, seed, roof) {
  // a handful of tongues: [center -1..1, height 0..1, half width]
  const n = 3 + Math.floor(w / 9);
  const tongues = Array.from({ length: n }, (_, k) => {
    const u = -0.8 + (1.6 * (k + 0.5)) / n + (hash(k, 1, seed * 1000) - 0.5) * 0.3;
    return [u, (0.35 + 0.65 * hash(k, 2, seed * 1000)) * (1 - Math.abs(u) * 0.55), 0.18 + hash(k, 3, seed * 1000) * 0.2];
  });
  for (let x = Math.floor(cx - w / 2); x <= cx + w / 2; x++) {
    const base = roof(((x % p.w) + p.w) % p.w);
    if (base < 0) continue;
    const u = (x - cx) / (w / 2);
    // low flames licking along the roof everywhere, fading out toward the ends of the fire
    const bed = 0.1 + 0.1 * noise1(x / 3, seed * 100);
    for (let y = base - h; y < base; y++) {
      const v = (base - y) / h;
      let reach = bed * (1 - u * u);
      for (const [tu, th, tw] of tongues) {
        const d = (u - tu) / tw - v * 0.6; // tips lean a little right, like the wind in the reference
        if (Math.abs(d) < 1) reach = Math.max(reach, th * (1 - Math.abs(d)));
      }
      if (v > reach) continue;
      const heat = clamp((1 - v / Math.max(0.01, reach)) * 0.8 + (1 - Math.abs(u)) * 0.45 - v * 0.3, 0, 1);
      wrapSet(p, x, y, FIRE[clamp(dith(heat * 4.4, x, y), 0, 4)]);
    }
    // fire light on the roof edge below
    const glow = 1 - Math.abs(u);
    for (let k = 0; k < 4; k++) if (dith(glow * (2.4 - k * 0.7), x, base + k) > 0) wrapSet(p, x, base + k, FIRE[k < 1 ? 1 : 0]);
  }
}

// y of the topmost painted pixel per column (-1 if none), from a mask test.
function roofline(w, h, filled) {
  const top = new Int16Array(w).fill(-1);
  for (let x = 0; x < w; x++) for (let y = 0; y < h; y++) if (filled(x, y)) { top[x] = y; break; }
  return (x) => top[x];
}

// ---------------------------------------------------------------------------------------------------------
// Far skyline: an ancient city on its tell. Flat-roofed mudbrick houses stacked up the mound, a great
// stepped ziggurat and a smaller temple terrace, date palms, and the city wall with square towers and
// stepped merlons in front. Few, small windows; fires on some roofs.
export const FAR_W = 1024, FAR_H = 240;
const FAR = { body: '#2a0a22', rim: '#5a1628', win: ['#f08a30', '#ffc860', '#c85020'], dark: '#1c0616', lit: '#3a0c22' };
const FAR_NIGHT = { body: '#0e1024', rim: '#2e3458', win: ['#c8802c', '#f0b454', '#8a5420'], dark: '#080a1a', lit: '#12152c' };

function farSkyline(calm) {
  const C = calm ? FAR_NIGHT : FAR;
  const p = new Pix(FAR_W, FAR_H);
  const shape = new Uint8Array(FAR_W * FAR_H); // 0 = sky, 1..4 = depth rows (4 = nearest)
  const at = (x, y) => (y < 0 || y >= FAR_H ? 0 : shape[y * FAR_W + (((x % FAR_W) + FAR_W) % FAR_W)]);
  const layer = (L) => (x, y) => {
    x = ((x % FAR_W) + FAR_W) % FAR_W;
    if (y >= 0 && y < FAR_H && shape[y * FAR_W + x] < L) shape[y * FAR_W + x] = L;
  };
  const windows = [], fires = [], beams = [], niches = [];
  // the tell: a broad mound, highest around the ziggurat (wraps every FAR_W)
  const TAU = Math.PI * 2;
  const tell = (x) => {
    const u = x / FAR_W;
    return Math.round(FAR_H - 84 - 30 * (0.5 + 0.5 * Math.cos(TAU * (u - 0.3))) - 8 * Math.sin(TAU * 3 * u + 1) * 0.5);
  };
  for (let x = 0; x < FAR_W; x++) for (let y = tell(x); y < FAR_H; y++) layer(1)(x, y);

  // the great ziggurat, and a smaller stepped temple terrace across town
  const zig = ziggurat(layer(2), 308, tell(308) + 30, 230, 22, 5);
  const shrine = ziggurat(layer(2), 800, tell(800) + 20, 110, 18, 3);
  for (const z of [zig, shrine]) for (const t of z.tiers) niches.push(t);
  const stair = { cx: 308, top: zig.shrine.y + zig.shrine.h, bottom: tell(308) + 30 };
  if (!calm) fires.push([308, 30, 44, 0.37], [800, 18, 30, 0.61]);

  // houses: three rows stepping down the mound; back rows sit higher up the tell
  const rows = [[2, -2, 12, 24], [3, 20, 16, 30], [3, 44, 18, 32], [3, 70, 18, 30]];
  rows.forEach(([L, sink, minH, varH], row) => {
    let x = row * 9, i = 0;
    while (x < FAR_W) {
      const r = (k) => hash(i + row * 500, k, 71);
      const w = 14 + Math.floor(r(1) * 24), h = minH + Math.floor(r(2) * varH);
      const base = tell(x + (w >> 1)) + sink;
      // leave the ziggurat's stairway and face clear of the back row
      if (!(row === 0 && Math.abs(x + w / 2 - 308) < 90) && !(row === 0 && Math.abs(x + w / 2 - 800) < 40)) {
        // a broken house loses its roof line (and anything on it); only its own pixels are skipped, so the
        // houses and mound behind it still show through instead of sky holes with roofs floating above them
        const broken = !calm && r(3) < 0.18;
        const put = broken
          ? (X, y) => { if (y >= base - h - 2 + Math.floor(noise1(X / 4, 72 + row) * 10)) layer(L)(X, y); }
          : layer(L);
        const boxes = house(put, x, base, w, h, i + row * 500, { upper: 0.45, shelter: calm ? 0.35 : 0.12 });
        for (const B of boxes) {
          if (r(4) < 0.6) beams.push([B.x, B.y + 2, B.w, L]);
          // one or two small windows high on the wall
          const nw = B.w > 20 ? 2 : 1;
          for (let k = 0; k < nw; k++) {
            const q = hash(B.x + k, B.y, 73);
            const wx = B.x + 3 + Math.floor(((k + 0.5) / nw) * (B.w - 8)), wy = B.y + 5;
            windows.push([wx, wy, L, q < (calm ? 0.35 : 0.5) ? (q < 0.12 ? 1 : q < 0.3 ? 0 : 2) : -1]);
          }
        }
        if (!calm && r(7) < 0.28) fires.push([x + w * (0.3 + r(8) * 0.4), 10 + r(9) * 16, 12 + r(10) * 20, r(11)]);
      }
      x += w + Math.floor(r(5) * 3) - 1;
      i++;
    }
  });

  // date palms among the houses
  for (let k = 0; k < 11; k++) {
    const px = Math.floor(hash(k, 1, 74) * FAR_W);
    if (Math.abs(px - 308) < 70) continue;
    palm(layer(3), px, tell(px) + 24, 1.1 + hash(k, 2, 74) * 0.5, k + 7);
  }

  // the city wall along the front, with a gate
  const towers = cityWall(layer(4), 0, FAR_W, FAR_H - 30, FAR_H, 128, 20, 16);

  for (let y = 0; y < FAR_H; y++) for (let x = 0; x < FAR_W; x++) {
    const L = shape[y * FAR_W + x];
    if (!L) continue;
    const up = at(x, y - 1), left = at(x - 1, y);
    // backlit: a thin warm rim along the tops (and where a nearer roof crosses a farther wall), a dithered
    // glow rising from the bottom, a dark seam down the side of each nearer block
    const glow = clamp((y - FAR_H * 0.55) / (FAR_H * 0.45), 0, 1);
    const right = at(x + 1, y);
    p.set(x, y, up < L ? C.rim : left < L || right < L ? C.dark : dith(glow * (calm ? 0.5 : 1.2), x, y) > 0 ? C.lit : C.body);
  }
  // ziggurat: recessed niches down each terrace face, and the great central stairway
  for (const t of niches) for (let x = t.x + 3; x < t.x + t.w - 3; x += 5) for (let y = t.y + 3; y < t.y + t.h - 1; y++) {
    if (at(x, y) === 2) wrapSet(p, x, y, C.dark);
  }
  for (let y = stair.top; y < stair.bottom; y++) {
    const hw = 5 + Math.floor((y - stair.top) / 10);
    for (let x = stair.cx - hw; x <= stair.cx + hw; x++) {
      if (at(x, y) !== 2) continue;
      const edge = Math.abs(x - stair.cx) >= hw - 1;
      wrapSet(p, x, y, edge ? C.rim : (y & 1) ? C.lit : C.dark);
    }
  }
  // roof beam ends poking out under the parapets
  for (const [bx, by, bw, L] of beams) for (let x = bx + 2; x < bx + bw - 1; x += 3) if (at(x, by) === L && at(x, by - 3) === L) wrapSet(p, x, by, C.dark);
  // windows and the gate
  for (const [wx, wy, L, k] of windows) {
    if (at(wx, wy) !== L || at(wx + 1, wy + 3) !== L || at(wx, wy - 3) !== L) continue;
    for (let yy = 0; yy < 3; yy++) for (let xx = 0; xx < 2; xx++) {
      wrapSet(p, wx + xx, wy + yy, k < 0 ? C.dark : yy === 0 && k === 1 && !calm ? '#fff0b0' : C.win[k]);
    }
  }
  const gate = towers[3] || towers[0];
  const gx = gate.x + 20 + Math.floor((128 - 20) / 2) - 6;
  for (let yy = 0; yy < 16; yy++) for (let xx = 0; xx < 12; xx++) {
    const dx = xx - 5.5, inside = yy >= 5 || dx * dx + (yy - 5) * (yy - 5) <= 30;
    if (inside) wrapSet(p, gx + xx, FAR_H - 16 + yy, calm ? C.dark : C.win[yy > 9 ? 0 : 2]);
  }
  const roof = roofline(FAR_W, FAR_H, (x, y) => shape[y * FAR_W + x] > 0);
  for (const [fx, w, h, sd] of fires) flames(p, fx, w, h, sd, roof);
  return p;
}

// ---------------------------------------------------------------------------------------------------------
// Mid ruins: nearer mudbrick houses, two and three storeys, flat roofs behind parapets, upper rooms set back,
// roof beams poking through the walls, small windows under wooden lintels, plaster falling away to show the
// brick. Lit on their left sides by fire, tops broken and burning; date palms between them.
export const MID_W = 768, MID_H = 280;
const MID = ['#12040c', '#200816', '#2e0c1e', '#3e1226', '#521a2c', '#6e2430', '#943630', '#c05232'];
const MID_NIGHT = ['#06081a', '#0c1024', '#12162e', '#181e38', '#202844', '#2a3452', '#3a4666', '#52607e'];

function midRuins(calm) {
  const M = calm ? MID_NIGHT : MID;
  const p = new Pix(MID_W, MID_H);
  const id = new Int16Array(MID_W * MID_H).fill(-1);
  const idAt = (X, y) => (y < 0 || y >= MID_H ? -1 : id[y * MID_W + (((X % MID_W) + MID_W) % MID_W)]);
  const b = [];
  let x = 0, i = 0;
  while (x < MID_W - 20) {
    const r = (k) => hash(i, k, 81);
    const w = 90 + Math.floor(r(1) * 70), h = 104 + Math.floor(r(2) * 60);
    // storeys: the main block, then an upper room set back to one side, sometimes a small third one
    const blocks = [{ x0: 0, w, top: MID_H - h }];
    if (r(4) < 0.8) {
      const uw = Math.floor(w * (0.45 + r(5) * 0.25)), ux = r(6) < 0.5 ? 0 : w - uw, uh = 30 + Math.floor(r(7) * 16);
      blocks.push({ x0: ux, w: uw, top: MID_H - h - uh });
      if (r(8) < 0.35) {
        const tw = Math.floor(uw * 0.5), tx = ux + (ux === 0 ? 0 : uw - tw);
        blocks.push({ x0: tx, w: tw, top: MID_H - h - uh - 22 });
      }
    }
    b.push({ x, w, blocks, i, gap: Math.floor(r(3) * 30) + 4 });
    x += w + b[b.length - 1].gap;
    i++;
  }
  const blockAt = (B, lx) => { let t = MID_H; for (const K of B.blocks) if (lx >= K.x0 && lx < K.x0 + K.w) t = Math.min(t, K.top); return t; };

  // date palms in the gaps, behind the houses
  const palms = new Uint8Array(MID_W * MID_H);
  for (const B of b) {
    if (hash(B.i, 20, 88) < 0.35 || B.gap < 12) continue;
    const px = B.x + B.w + Math.floor(B.gap / 2) - 1;
    palm((X, y) => { if (y >= 0 && y < MID_H) palms[y * MID_W + (((X % MID_W) + MID_W) % MID_W)] = 1; }, px, MID_H, 3 + hash(B.i, 21, 88) * 0.9, B.i + 30);
  }
  for (let y = 0; y < MID_H; y++) for (let X = 0; X < MID_W; X++) {
    if (!palms[y * MID_W + X]) continue;
    const up = y > 0 && palms[(y - 1) * MID_W + X];
    p.set(X, y, !up ? M[calm ? 4 : 5] : M[calm ? 2 : dith(clamp((y - MID_H * 0.4) / MID_H, 0, 1) * 2.4, X, y) > 0 ? 3 : 2]);
  }

  // silhouettes: storeys with parapets, broken tops on the burning night
  for (const B of b) {
    for (let xx = 0; xx < B.w; xx++) {
      const X = (B.x + xx) % MID_W;
      // mudbrick slumps rather than snapping: rounded bites out of the roof, some houses still whole
      const n = noise1((B.x + xx) / 13, 82 + B.i) * 0.8 + noise1((B.x + xx) / 4, 91 + B.i) * 0.2;
      const drop = calm || hash(B.i, 14, 86) < 0.3 ? 0 : Math.floor(Math.max(0, n - 0.4) * 90 / 2) * 2;
      for (let y = blockAt(B, xx) - 4 + drop; y < MID_H; y++) id[y * MID_W + X] = B.i;
    }
  }
  for (let y = 0; y < MID_H; y++) for (let X = 0; X < MID_W; X++) {
    const k = id[y * MID_W + X];
    if (k < 0) continue;
    const B = b[k], lx = (X - B.x + MID_W) % MID_W;
    const up = idAt(X, y - 1) === k, left = idAt(X - 1, y) === k, right = idAt(X + 1, y) === k;
    // the nearest roof line above this pixel (parapet coping and its shadow)
    let roofTop = MID_H;
    for (const K of B.blocks) if (lx >= K.x0 && lx < K.x0 + K.w && y >= K.top - 4) roofTop = Math.min(roofTop, y - (K.top - 4));
    // plaster, mottled; where it has fallen away, small mudbricks 8x4
    const bare = noise2(X / 12, y / 9, 89 + k) > 0.72;
    const course = y >> 2, sx = lx + (course & 1 ? 4 : 0);
    const mortar = bare && ((y & 3) === 3 || (sx & 7) === 7);
    // fire light from the lower left (moonlight from the upper right on the calm night)
    const light = calm ? clamp(lx / B.w, 0, 1) * 0.9 + clamp(1 - y / MID_H, 0, 1) * 0.6
      : clamp(1 - lx / B.w, 0, 1) * 0.9 + clamp((y - MID_H * 0.45) / MID_H, 0, 1) * 1.6;
    let t = 2 + dith(light * 1.6 + (noise2(X / 5, y / 4, 90) - 0.5) * 0.6, X, y);
    if (mortar) t = 1;
    // a darker band where one storey steps back from the one below, like a roof terrace wall
    if (roofTop === 2 || roofTop === 3) t = 4;
    if (roofTop === 4) t = 1;
    if (!up) t = 6;
    else if (!left) t = calm ? 1 : 5;
    else if (!right) t = calm ? 5 : 0;
    p.set(X, y, M[clamp(t, 0, M.length - 1)]);
  }

  const inWall = (B, X, y) => idAt(X, y) === B.i && idAt(X, y - 4) === B.i;
  for (const B of b) {
    for (const K of B.blocks) {
      // roof beam ends under each roof line: dark end grain with a lit top
      const by = K.top + 4;
      for (let xx = K.x0 + 4; xx < K.x0 + K.w - 4; xx += 9) {
        const X = B.x + xx;
        if (!inWall(B, X, by) || !inWall(B, X + 3, by)) continue;
        for (let dx = -1; dx < 4; dx++) { wrapSet(p, X + dx, by, M[dx < 0 ? 1 : 5]); wrapSet(p, X + dx, by + 1, M[1]); wrapSet(p, X + dx, by + 2, M[0]); }
      }
      // small windows under wooden lintels, one row per storey, a few per wall
      const rows = K === B.blocks[0] ? [K.top + 16, K.top + 50] : [K.top + 14];
      for (const wy of rows) for (let wx = B.x + K.x0 + 10; wx < B.x + K.x0 + K.w - 16; wx += 24) {
        if (wy > MID_H - 24 || hash(wx, wy, 84) < 0.4) continue;
        if (!inWall(B, wx - 3, wy - 4) || !inWall(B, wx + 11, wy - 4) || blockAt(B, (wx - B.x + MID_W) % MID_W) < K.top) continue;
        const slot = hash(wx, wy, 86) < 0.35, ww = slot ? 4 : 8, wh = slot ? 12 : 9, ox = slot ? 2 : 0;
        const hot = hash(wx, wy, 85) < 0.55, lamp = calm && hash(wx, wy, 87) < 0.5;
        for (let yy = 0; yy < wh; yy++) for (let xx = 0; xx < ww; xx++) {
          const v = calm ? (lamp ? 2.4 + (yy / wh) * 1.6 : 0.3) : hot ? (yy / wh) * 5 : 0.4;
          wrapSet(p, wx + ox + xx, wy + yy, (calm ? ENV_NIGHT : ENV).glow[clamp(dith(v, xx, yy), 0, 5)]);
        }
        // lintel beam and a sill of mud
        for (let xx = -3; xx < 11; xx++) { wrapSet(p, wx + xx, wy - 3, M[5]); wrapSet(p, wx + xx, wy - 2, M[1]); }
        for (let xx = ox - 1; xx < ox + ww + 1; xx++) wrapSet(p, wx + xx, wy + wh, M[6]);
      }
    }
    // a ground-floor doorway, low and square, on some houses
    if (hash(B.i, 30, 88) < 0.6) {
      const dx = B.x + 8 + Math.floor(hash(B.i, 31, 88) * (B.w - 30)), dy = MID_H - 30;
      for (let yy = 0; yy < 30; yy++) for (let xx = 0; xx < 14; xx++) {
        const edge = xx === 0 || xx === 13;
        wrapSet(p, dx + xx, dy + yy, edge ? M[0] : calm ? M[0] : (calm ? ENV_NIGHT : ENV).glow[clamp(dith((yy / 30) * 3, xx, yy), 0, 5)]);
      }
      for (let xx = -3; xx < 17; xx++) { wrapSet(p, dx + xx, dy - 3, M[5]); wrapSet(p, dx + xx, dy - 2, M[1]); wrapSet(p, dx + xx, dy - 1, M[1]); }
    }
    // a reed shelter on the roof, on the calm night
    if (calm && hash(B.i, 40, 88) < 0.5) {
      const K = B.blocks[B.blocks.length - 1], sw = Math.max(14, Math.floor(K.w * 0.6)), sx = B.x + K.x0 + Math.floor((K.w - sw) / 2), top = K.top - 4;
      for (let y = top - 16; y < top; y++) { wrapSet(p, sx, y, M[3]); wrapSet(p, sx + sw - 1, y, M[3]); }
      for (let xx = -2; xx < sw + 2; xx++) { wrapSet(p, sx + xx, top - 17, M[5]); wrapSet(p, sx + xx, top - 16, M[2]); }
    }
  }
  if (calm) return p;
  // fires on some broken tops
  const roof = roofline(MID_W, MID_H, (x, y) => id[y * MID_W + x] >= 0);
  for (const B of b) {
    if (hash(B.i, 9, 86) > 0.5) continue;
    const fx = B.x + Math.floor(B.w * (0.2 + hash(B.i, 10, 86) * 0.6));
    flames(p, fx, 22 + hash(B.i, 11, 86) * 26, 26 + hash(B.i, 12, 86) * 30, hash(B.i, 13, 86), roof);
  }
  return p;
}

export function buildSodomBackdrop(scene) {
  if (scene.textures.exists('sodom-sky')) return;
  pixTexture(scene, 'sodom-sky', sky());
  pixTexture(scene, 'sodom-clouds', clouds());
  pixTexture(scene, 'sodom-far', farSkyline());
  pixTexture(scene, 'sodom-mid', midRuins());
}

// The calm variant, 'sodom-night-*' (same sizes as the burning layers).
export function buildSodomNightBackdrop(scene) {
  if (scene.textures.exists('sodom-night-sky')) return;
  pixTexture(scene, 'sodom-night-sky', sky(true));
  pixTexture(scene, 'sodom-night-clouds', nightClouds());
  pixTexture(scene, 'sodom-night-far', farSkyline(true));
  pixTexture(scene, 'sodom-night-mid', midRuins(true));
}
