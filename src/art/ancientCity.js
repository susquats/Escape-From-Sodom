// Silhouette shapes for an ancient Near-Eastern city (Bronze Age Canaan / Mesopotamia): flat-roofed mudbrick
// houses stacked on a tell, stepped ziggurats, walls with square towers and stepped merlons, date palms.
// Everything is drawn into a mask through `put(x, y)`; the caller decides colors (and depth, via its own put).
import { hash } from './pix.js';

const rect = (put, x0, y0, w, h) => { for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) put(x, y); };

// A flat-roofed house with its base at `base`: a main block, sometimes an upper room set back to one side,
// a parapet, and now and then a rooftop shelter on poles. Returns the roof boxes (for windows / beam ends).
export function house(put, x, base, w, h, seed, { upper = 0.5, shelter = 0.3 } = {}) {
  const r = (k) => hash(seed, k, 401);
  const top = base - h, boxes = [{ x, y: top, w, h }];
  rect(put, x, top, w, h);
  // parapet: a low lip around the roof
  rect(put, x, top - 2, w, 2);
  if (r(3) < upper && w >= 12) {
    // upper room, set back against one side
    const uw = Math.max(6, Math.floor(w * (0.35 + r(4) * 0.3))), uh = Math.max(5, Math.floor(h * (0.35 + r(5) * 0.35)));
    const ux = r(6) < 0.5 ? x : x + w - uw;
    rect(put, ux, top - uh, uw, uh);
    rect(put, ux, top - uh - 2, uw, 2);
    boxes.push({ x: ux, y: top - uh, w: uw, h: uh });
  } else if (r(7) < shelter && w >= 10) {
    // a reed shelter: two poles and a flat awning
    const sw = Math.max(6, Math.floor(w * 0.5)), sx = x + Math.floor(r(8) * (w - sw)), sh = Math.max(4, Math.floor(h * 0.3));
    for (let y = top - sh; y < top - 2; y++) { put(sx, y); put(sx + sw - 1, y); }
    rect(put, sx - 1, top - sh - 1, sw + 2, 1);
  }
  return boxes;
}

// Stepped ziggurat centered on cx: `tiers` terraces, each narrower than the one below, a shrine on top.
// Returns the tiers (for niches and the stairway) and the shrine box.
export function ziggurat(put, cx, base, baseW, tierH, tiers) {
  const out = [];
  let w = baseW, y = base;
  for (let t = 0; t < tiers; t++) {
    const x = Math.round(cx - w / 2);
    rect(put, x, y - tierH, w, tierH);
    out.push({ x, y: y - tierH, w, h: tierH });
    y -= tierH;
    w = Math.round(w * 0.72);
  }
  // the shrine: a small house with a stepped-merlon roofline
  const sw = Math.max(8, Math.round(w * 0.8)), sh = Math.round(tierH * 0.9), sx = Math.round(cx - sw / 2);
  rect(put, sx, y - sh, sw, sh);
  for (let x = sx; x < sx + sw; x += 4) { rect(put, x, y - sh - 2, 3, 2); put(x + 1, y - sh - 3); }
  return { tiers: out, shrine: { x: sx, y: y - sh, w: sw, h: sh }, top: y - sh - 3 };
}

// Stepped (Mesopotamian) merlons along a wall top from x0 to x1 at y.
export function merlons(put, x0, x1, y, size = 1) {
  const mw = 3 * size + 2 * size, gap = 2 * size;
  for (let x = x0; x < x1; x += mw + gap) {
    rect(put, x, y - 2 * size, mw, 2 * size);
    rect(put, x + size, y - 3 * size, mw - 2 * size, size);
    rect(put, x + 2 * size, y - 4 * size, mw - 4 * size, size);
  }
}

// City wall from x0 to x1, top at `top`, with square towers every `step` px. Returns the tower boxes.
export function cityWall(put, x0, x1, top, bottom, step, towerW, towerH, size = 1) {
  rect(put, x0, top, x1 - x0, bottom - top);
  merlons(put, x0, x1, top, size);
  const towers = [];
  for (let x = x0 + Math.floor(step / 3); x < x1 - towerW; x += step) {
    rect(put, x, top - towerH, towerW, bottom - top + towerH);
    merlons(put, x, x + towerW, top - towerH, size);
    towers.push({ x, y: top - towerH, w: towerW });
  }
  return towers;
}

// A date palm: a thin curved trunk and a crown of drooping fronds. `s` scales it (1 = ~40 px tall).
export function palm(put, x, base, s, seed) {
  const r = (k) => hash(seed, k, 409);
  const h = Math.round((34 + r(1) * 16) * s), lean = (r(2) - 0.5) * 14 * s;
  const tw = Math.max(1, Math.round(s * 1.3));
  let tx = x, ty = base - h;
  for (let k = 0; k <= h; k++) {
    const v = k / h;
    const px = Math.round(x + lean * v * v);
    for (let d = 0; d < tw + (v < 0.15 ? 1 : 0); d++) put(px + d, base - k);
    if (k === h) { tx = px + (tw >> 1); ty = base - k; }
  }
  // fronds: arcs out from the crown, drooping at the tips
  const n = 7 + Math.floor(r(3) * 3);
  for (let f = 0; f < n; f++) {
    const a = -Math.PI + (Math.PI * (f + 0.5)) / n + (r(10 + f) - 0.5) * 0.3; // spread across the upper half
    const len = (12 + r(20 + f) * 8) * s;
    for (let k = 0; k < len; k++) {
      const v = k / len;
      const fx = tx + Math.cos(a) * k, fy = ty + Math.sin(a) * k * 0.7 + v * v * len * 0.55;
      put(Math.round(fx), Math.round(fy));
      const thick = Math.round((1 - v) * s * 1.2);
      for (let d = 1; d <= thick; d++) put(Math.round(fx), Math.round(fy) + d);
    }
  }
  // a clump of dates / frond bases under the crown
  rect(put, tx - Math.round(2 * s), ty, Math.round(4 * s) + 1, Math.max(1, Math.round(2 * s)));
}

// A city far off on the horizon, a few px tall: a small ziggurat in the middle and a huddle of flat-roofed
// houses that thins out toward the edges. Calls put(x, y) for every pixel of the silhouette.
export function distantCity(put, cx, base, half, seed) {
  ziggurat(put, cx + 4, base, 20, 4, 3);
  let x = cx - half, i = 0;
  while (x < cx + half) {
    const r = (k) => hash(i, k, seed);
    const w = 4 + Math.floor(r(1) * 6), fall = 1 - Math.abs(x + w / 2 - cx) / half;
    const h = 2 + Math.round(r(2) * 7 * fall);
    rect(put, x, base - h, w, h + 1);
    if (r(3) < 0.4 * fall) rect(put, x + (r(4) < 0.5 ? 0 : w - 3), base - h - 2, 3, 2); // upper room
    x += w + (r(5) < 0.3 ? 1 : 0);
    i++;
  }
}
