// Act I backdrop, painted in code at 2x density: a night sky, a band of fire-lit smoke, a far skyline of
// silhouettes with lit windows and roof fires, and nearer ruined brick buildings. The layers wrap
// horizontally so they can be repeated for parallax. Style reference: art/reference/style-sheet.webp.
// Each layer also has a calm variant ('sodom-night-*'): the same city the night before, under the moon, with
// lamplit windows, whole rooftops and no fire or smoke. Act I opens on it and cross-fades to the burning one.
import { Pix, hash, noise1, noise2, dith, pixTexture } from './pix.js';
import { ENV, ENV_NIGHT } from './palette.js';

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
// Far skyline: flat silhouettes (towers, domes, stepped temples), lit windows, fires on some roofs.
export const FAR_W = 1024, FAR_H = 240;
const FAR = { body: '#2a0a22', rim: '#5a1628', win: ['#f08a30', '#ffc860', '#c85020'], dark: '#1c0616', lit: '#3a0c22' };
const FAR_NIGHT = { body: '#0e1024', rim: '#2e3458', win: ['#c8802c', '#f0b454', '#8a5420'], dark: '#080a1a', lit: '#12152c' };

function farSkyline(calm) {
  const C = calm ? FAR_NIGHT : FAR;
  const p = new Pix(FAR_W, FAR_H);
  const shape = new Uint8Array(FAR_W * FAR_H); // 1 = building
  const put = (x, y) => { x = ((x % FAR_W) + FAR_W) % FAR_W; if (y >= 0 && y < FAR_H) shape[y * FAR_W + x] = 1; };
  const rect = (x0, y0, w, h) => { for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) put(x, y); };
  const windows = [], fires = [];
  rect(0, FAR_H - 40, FAR_W, 40); // continuous city mass
  let x = 0, i = 0;
  while (x < FAR_W) {
    const r = (k) => hash(i, k, 71);
    const w = 26 + Math.floor(r(1) * 50), h = 50 + Math.floor(r(2) * 80), top = FAR_H - h;
    const kind = r(3);
    rect(x, top, w, h);
    if (kind < 0.25) {
      // tower with spire
      const tw = Math.max(8, Math.floor(w * 0.35)), tx = x + Math.floor((w - tw) / 2), th = 20 + Math.floor(r(4) * 34);
      rect(tx, top - th, tw, th);
      for (let k = 0; k < 16; k++) rect(tx + Math.floor(tw / 2) - Math.floor((16 - k) / 6), top - th - 16 + k, (Math.floor((16 - k) / 6)) * 2 + 1, 1);
    } else if (kind < 0.45) {
      // dome
      const rr = Math.floor(w * 0.42), cx = x + w / 2;
      for (let yy = -rr; yy <= 0; yy++) { const hw = Math.floor(Math.sqrt(rr * rr - yy * yy)); rect(Math.round(cx - hw), top + yy, hw * 2, 1); }
      rect(Math.round(cx) - 1, top - rr - 6, 2, 6);
    } else if (kind < 0.62) {
      // stepped ziggurat
      for (let s = 1; s <= 3; s++) rect(x + s * 5, top - s * 9, w - s * 10, 9);
    } else if (kind < 0.8) {
      // broken top (still whole the night before: a flat roof with a parapet)
      if (calm) { rect(x, top - 4, w, 4); rect(x + 2, top - 7, 3, 3); rect(x + w - 5, top - 7, 3, 3); }
      else for (let xx = 0; xx < w; xx++) rect(x + xx, top - Math.floor(noise1((x + xx) / 5, 72) * 18), 1, 18);
    } else {
      // crenellated wall
      for (let xx = 0; xx < w; xx += 6) rect(x + xx, top - 5, 3, 5);
    }
    // windows grid
    for (let wy = top + 8; wy < FAR_H - 6; wy += 11) for (let wx = x + 4; wx < x + w - 5; wx += 8) {
      const q = hash(wx, wy, 73);
      if (q < (calm ? 0.16 : 0.3)) windows.push([wx, wy, q < 0.08 ? 1 : q < 0.22 ? 0 : 2]);
    }
    if (!calm && r(7) < 0.4) fires.push([x + w * (0.3 + r(8) * 0.4), 14 + r(9) * 22, 16 + r(10) * 26, r(11)]);
    x += w - Math.floor(r(5) * w * 0.4);
    i++;
  }
  for (let y = 0; y < FAR_H; y++) for (let x = 0; x < FAR_W; x++) {
    if (!shape[y * FAR_W + x]) continue;
    const up = y > 0 && shape[(y - 1) * FAR_W + x];
    // backlit: a thin warm rim along the tops, a dithered glow rising from the bottom
    const glow = clamp((y - FAR_H * 0.55) / (FAR_H * 0.45), 0, 1);
    p.set(x, y, !up ? C.rim : dith(glow * (calm ? 0.5 : 1.2), x, y) > 0 ? C.lit : C.body);
  }
  for (const [wx, wy, k] of windows) {
    if (!shape[wy * FAR_W + (wx % FAR_W)] || !shape[(wy + 4) * FAR_W + ((wx + 2) % FAR_W)]) continue;
    for (let yy = 0; yy < 4; yy++) for (let xx = 0; xx < 3; xx++) wrapSet(p, wx + xx, wy + yy, yy === 0 && k === 1 && !calm ? '#fff0b0' : C.win[k]);
  }
  const roof = roofline(FAR_W, FAR_H, (x, y) => shape[y * FAR_W + x]);
  for (const [fx, w, h, sd] of fires) flames(p, fx, w, h, sd, roof);
  return p;
}

// ---------------------------------------------------------------------------------------------------------
// Mid ruins: nearer brick buildings, lit on their left sides by fire, arched glowing windows, ragged tops.
export const MID_W = 768, MID_H = 280;
const MID = ['#12040c', '#200816', '#2e0c1e', '#3e1226', '#521a2c', '#6e2430', '#943630', '#c05232'];
const MID_NIGHT = ['#06081a', '#0c1024', '#12162e', '#181e38', '#202844', '#2a3452', '#3a4666', '#52607e'];

function midRuins(calm) {
  const M = calm ? MID_NIGHT : MID;
  const p = new Pix(MID_W, MID_H);
  const id = new Int16Array(MID_W * MID_H).fill(-1);
  const b = [];
  let x = 0, i = 0;
  while (x < MID_W - 20) {
    const r = (k) => hash(i, k, 81);
    const w = 70 + Math.floor(r(1) * 80), h = 130 + Math.floor(r(2) * 120);
    b.push({ x, w, h, top: MID_H - h, i });
    x += w + Math.floor(r(3) * 26) - 6;
    i++;
  }
  // ragged tops, stored per building
  for (const B of b) {
    for (let xx = 0; xx < B.w; xx++) {
      const X = (B.x + xx) % MID_W;
      const drop = calm ? 0 : Math.floor(Math.pow(noise1((B.x + xx) / 9, 82 + B.i), 2) * 44 / 8) * 8;
      for (let y = B.top + drop; y < MID_H; y++) id[y * MID_W + X] = B.i;
    }
  }
  for (let y = 0; y < MID_H; y++) for (let X = 0; X < MID_W; X++) {
    const k = id[y * MID_W + X];
    if (k < 0) continue;
    const B = b[k], lx = (X - B.x + MID_W) % MID_W;
    const up = y > 0 && id[(y - 1) * MID_W + X] === k;
    const left = id[y * MID_W + (X + MID_W - 1) % MID_W] === k, right = id[y * MID_W + (X + 1) % MID_W] === k;
    // bricks 12x6
    const course = Math.floor(y / 6), sx = lx + (course & 1 ? 6 : 0), ly = y % 6;
    const mortar = ly === 5 || sx % 12 === 11;
    // fire light from the lower left (moonlight from the upper right on the calm night)
    const light = calm ? clamp(lx / B.w, 0, 1) * 0.9 + clamp(1 - y / MID_H, 0, 1) * 0.6
      : clamp(1 - lx / B.w, 0, 1) * 0.9 + clamp((y - MID_H * 0.45) / MID_H, 0, 1) * 1.6;
    let t = 2 + dith(light * 1.6, X, y) + (ly === 0 ? 1 : 0) - (hash(sx >> 3, course, 83) < 0.2 ? 1 : 0);
    if (mortar) t = 1;
    if (!up) t = 6;
    else if (!left) t = calm ? 1 : 5;
    else if (!right) t = calm ? 5 : 0;
    p.set(X, y, M[clamp(t, 0, M.length - 1)]);
  }
  // arched windows with fire inside
  for (const B of b) {
    for (let wy = B.top + 40; wy < MID_H - 30; wy += 46) for (let wx = B.x + 12; wx < B.x + B.w - 22; wx += 30) {
      if (id[(wy - 8) * MID_W + (wx + 5) % MID_W] !== B.i || hash(wx, wy, 84) < 0.25) continue;
      const hot = hash(wx, wy, 85) < 0.55, lamp = calm && hash(wx, wy, 87) < 0.5;
      for (let yy = -6; yy < 22; yy++) for (let xx = 0; xx < 12; xx++) {
        const dx = xx - 5.5, inside = yy >= 0 ? true : dx * dx + yy * yy <= 36;
        const frame = yy >= -1 ? (xx === 0 || xx === 11) : dx * dx + yy * yy > 25 && inside;
        if (!inside) continue;
        const v = calm ? (lamp ? 2.4 + clamp((yy + 6) / 28, 0, 1) * 1.6 : 0.3) : hot ? clamp((yy + 6) / 28, 0, 1) * 5 : 0.4;
        const c = frame ? M[6] : (calm ? ENV_NIGHT : ENV).glow[clamp(dith(v, xx, yy), 0, 5)];
        wrapSet(p, wx + xx, wy + yy, c);
      }
      for (let xx = -1; xx < 13; xx++) { wrapSet(p, wx + xx, wy + 22, M[7]); wrapSet(p, wx + xx, wy + 23, M[1]); }
    }
  }
  if (calm) return p;
  // fires on some ragged tops
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
