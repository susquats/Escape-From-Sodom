import { PALETTE } from './palette.js';
import { SPRITES, ANIMS } from './sprites.js';

// Paints every ASCII sprite into a canvas texture with numbered frames (0..n-1), then registers animations.
export function buildTextures(scene) {
  for (const [key, { w, h, frames }] of Object.entries(SPRITES)) {
    if (scene.textures.exists(key)) scene.textures.remove(key);
    const tex = scene.textures.createCanvas(key, w * frames.length, h);
    const ctx = tex.getContext();
    frames.forEach((rows, f) => {
      if (rows.length !== h) throw new Error(`sprite ${key} frame ${f}: ${rows.length} rows, expected ${h}`);
      rows.forEach((row, y) => {
        if (row.length !== w) throw new Error(`sprite ${key} frame ${f} row ${y}: ${row.length} chars, expected ${w}`);
        for (let x = 0; x < w; x++) {
          const ch = row[x];
          if (!(ch in PALETTE)) throw new Error(`sprite ${key} frame ${f} row ${y}: unknown color '${ch}'`);
          if (!PALETTE[ch]) continue;
          ctx.fillStyle = PALETTE[ch];
          ctx.fillRect(f * w + x, y, 1, 1);
        }
      });
      tex.add(f, 0, f * w, 0, w, h);
    });
    tex.refresh();
  }

  for (const [animKey, texKey, frames, frameRate, repeat] of ANIMS) {
    if (scene.anims.exists(animKey)) continue;
    scene.anims.create({ key: animKey, frames: frames.map(frame => ({ key: texKey, frame })), frameRate, repeat });
  }
}
