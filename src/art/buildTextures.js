import { PALETTE } from './palette.js';
import { SPRITES, ANIMS } from './sprites.js';
import { PNG_SPRITES, buildPngSprites } from './pngSprites.js';
import { paintFrame } from './rig.js';

// Paints every sprite into a canvas texture with numbered frames (0..n-1), then registers animations.
// A frame is either ASCII rows (palette chars) or a rendered { px } frame from rig.js.
export function buildTextures(scene) {
  for (const [key, { w, h, frames, px = 1 }] of Object.entries(SPRITES)) {
    if (key in PNG_SPRITES) continue; // hand-drawn PNG replaces the generated sprite (pngSprites.js)
    // px: texture pixels per ASCII character (2 = a low-detail sprite blown up to hi-res size)
    if (scene.textures.exists(key)) scene.textures.remove(key);
    const W = w * px, H = h * px;
    const tex = scene.textures.createCanvas(key, W * frames.length, H);
    const ctx = tex.getContext();
    frames.forEach((frame, f) => {
      if (frame.px) {
        paintFrame(ctx, frame, f * W, w, h);
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

  buildPngSprites(scene);

  for (const [animKey, texKey, frames, frameRate, repeat] of ANIMS) {
    if (scene.anims.exists(animKey)) continue;
    scene.anims.create({ key: animKey, frames: frames.map(frame => ({ key: texKey, frame })), frameRate, repeat });
  }
}
