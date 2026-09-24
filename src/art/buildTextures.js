import { PALETTE } from './palette.js';
import { SPRITES, ANIMS } from './sprites.js';

// Paints every sprite into a canvas texture with numbered frames (0..n-1), then registers animations.
// A frame is either ASCII rows (palette chars) or a rendered { px } frame from rig.js.
export function buildTextures(scene) {
  for (const [key, { w, h, frames, px = 1 }] of Object.entries(SPRITES)) {
    // px: texture pixels per ASCII character (2 = a low-detail sprite blown up to hi-res size)
    if (scene.textures.exists(key)) scene.textures.remove(key);
    const W = w * px, H = h * px;
    const tex = scene.textures.createCanvas(key, W * frames.length, H);
    const ctx = tex.getContext();
    frames.forEach((frame, f) => {
      if (frame.px) {
        const img = ctx.createImageData(w, h);
        frame.px.forEach((c, i) => {
          if (!c) return;
          const n = parseInt(c.slice(1), 16);
          img.data.set([n >> 16, (n >> 8) & 255, n & 255, 255], i * 4);
        });
        ctx.putImageData(img, f * W, 0);
      } else {
        if (frame.length !== h) throw new Error(`sprite ${key} frame ${f}: ${frame.length} rows, expected ${h}`);
        frame.forEach((row, y) => {
          if (row.length !== w) throw new Error(`sprite ${key} frame ${f} row ${y}: ${row.length} chars, expected ${w}`);
          for (let x = 0; x < w; x++) {
            const ch = row[x];
            if (!(ch in PALETTE)) throw new Error(`sprite ${key} frame ${f} row ${y}: unknown color '${ch}'`);
            if (!PALETTE[ch]) continue;
            ctx.fillStyle = PALETTE[ch];
            ctx.fillRect(f * W + x * px, y * px, px, px);
          }
        });
      }
      tex.add(f, 0, f * W, 0, W, H);
    });
    tex.refresh();
  }

  for (const [animKey, texKey, frames, frameRate, repeat] of ANIMS) {
    if (scene.anims.exists(animKey)) continue;
    scene.anims.create({ key: animKey, frames: frames.map(frame => ({ key: texKey, frame })), frameRate, repeat });
  }
}
