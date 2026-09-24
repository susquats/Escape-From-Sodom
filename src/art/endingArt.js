// The final cutscene's art. Everything is drawn from scratch by tools/ending/build.py into public/ending/:
// a fixed 320x180 cave backdrop plus separate character sprites laid over it (1 texture px = 1 world unit),
// so a lost daughter just isn't drawn and the winks / Zs can animate. The sparkle and glow are painted here.
import { Pix, pixTexture } from './pix.js';

// Top-left of each sprite in the scene, world units (LAYOUT in tools/ending/build.py).
export const LAYOUT = {
  lot: [4, 84], 'jug-small': [40, 132],
  daughter1: [150, 92], daughter2: [236, 92],
  jug: [199, 116],
};
// Zs rise from Lot's head (lowest first), and where each daughter's winking eye is (for the sparkle).
export const ZS = [[42, 96], [50, 84], [60, 70]];
export const WINK_EYE = { daughter1: [183, 113], daughter2: [269, 113] };

export function loadEndingArt(scene) {
  for (const k of ['cave', 'lot', 'jug', 'jug-small', 'daughter1', 'daughter1-wink', 'daughter2', 'daughter2-wink', 'z0', 'z1', 'z2']) {
    scene.load.image(`end-${k}`, `ending/${k}.png`);
  }
}

function sparkle() {
  const p = new Pix(9, 9);
  for (let i = 0; i < 9; i++) { p.set(4, i, i === 4 ? '#ffffff' : (Math.abs(i - 4) < 3 ? '#fff6a0' : '#ffd040')); p.set(i, 4, Math.abs(i - 4) < 3 ? '#fff6a0' : '#ffd040'); }
  p.set(4, 4, '#ffffff'); p.set(3, 3, '#fff6a0'); p.set(5, 5, '#fff6a0'); p.set(3, 5, '#fff6a0'); p.set(5, 3, '#fff6a0');
  return p;
}

// A soft warm light for the firelight flicker.
function glow(scene) {
  const key = 'end-glow';
  if (scene.textures.exists(key)) scene.textures.remove(key);
  const tex = scene.textures.createCanvas(key, 240, 160);
  const ctx = tex.getContext();
  const g = ctx.createRadialGradient(120, 80, 0, 120, 80, 118);
  g.addColorStop(0, 'rgba(255,170,70,0.55)'); g.addColorStop(0.5, 'rgba(230,110,40,0.22)'); g.addColorStop(1, 'rgba(200,80,30,0)');
  ctx.fillStyle = g; ctx.fillRect(0, 0, 240, 160);
  tex.refresh();
}

export function buildEndingArt(scene) {
  pixTexture(scene, 'end-sparkle', sparkle());
  glow(scene);
}
