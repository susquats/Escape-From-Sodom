// The final cutscene's art. tools/ending/build.py cuts it out of a painting of the whole scene into
// public/ending/: the cave (Lot and the jug baked in), each daughter as her own sprite so a lost one just isn't
// drawn, a winking frame for each, and the three Zs. Their positions are in layout.json (1 px = 1 world unit).
// The sparkle and glow are painted here.
import { Pix, pixTexture } from './pix.js';

export function loadEndingArt(scene) {
  for (const k of ['cave', 'daughter1', 'daughter1-wink', 'daughter2', 'daughter2-wink', 'z0', 'z1', 'z2']) {
    scene.load.image(`end-${k}`, `ending/${k}.png`);
  }
  scene.load.json('end-layout', 'ending/layout.json');
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
