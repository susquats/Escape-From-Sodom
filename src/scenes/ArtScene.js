import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT } from '../config.js';
import { SPRITES, ANIMS } from '../art/sprites.js';

// Debug-only sprite review (?scene=art): every frame at 2x, live animations at the top.
// Scroll with the arrow keys / mouse wheel / dragging.
export default class ArtScene extends Phaser.Scene {
  constructor() {
    super('ArtScene');
  }

  create() {
    const scale = 2, pad = 4;
    this.cameras.main.setBackgroundColor('#1e1428');

    // animations row
    let x = pad;
    ANIMS.forEach(([animKey, texKey]) => {
      const { w, h } = SPRITES[texKey];
      this.add.sprite(x, pad, texKey).setOrigin(0).setScale(scale).play(animKey);
      x += w * scale + pad;
      if (h * scale > 0) this.animRowH = Math.max(this.animRowH || 0, h * scale);
    });

    // light strip to check contrast on bright backgrounds
    let y = pad * 2 + this.animRowH;
    x = pad;
    let rowH = 0;
    for (const [key, { w, h, frames }] of Object.entries(SPRITES)) {
      frames.forEach((_, f) => {
        const fw = w * scale, fh = h * scale;
        if (x + fw > GAME_WIDTH - pad) { x = pad; y += rowH + pad; rowH = 0; }
        this.add.rectangle(x - 1, y - 1, fw + 2, fh + 2, 0x3a2e48).setOrigin(0);
        this.add.image(x, y, key, f).setOrigin(0).setScale(scale);
        x += fw + pad;
        rowH = Math.max(rowH, fh);
      });
    }
    const bottom = y + rowH + pad;
    // repeat the characters on a light background
    const light = this.add.rectangle(0, bottom, GAME_WIDTH, 60, 0xd8d0c0).setOrigin(0);
    x = pad;
    ['lot', 'wife', 'daughter1', 'daughter2', 'sodomite', 'angel', 'salt', 'jug', 'halo', 'fireball'].forEach(k => {
      this.add.image(x, light.y + 6, k, 0).setOrigin(0).setScale(scale);
      x += SPRITES[k].w * scale + pad;
    });

    const cam = this.cameras.main;
    this.maxScroll = Math.max(0, light.y + 60 - GAME_HEIGHT);
    this.cursors = this.input.keyboard.createCursorKeys();
    this.input.on('wheel', (p, o, dx, dy) => { cam.scrollY = Phaser.Math.Clamp(cam.scrollY + dy * 0.3, 0, this.maxScroll); });
    this.input.on('pointermove', p => {
      if (p.isDown) cam.scrollY = Phaser.Math.Clamp(cam.scrollY - (p.y - p.prevPosition.y), 0, this.maxScroll);
    });
  }

  update() {
    const cam = this.cameras.main;
    const d = (this.cursors.down.isDown ? 3 : 0) - (this.cursors.up.isDown ? 3 : 0);
    cam.scrollY = Phaser.Math.Clamp(cam.scrollY + d, 0, this.maxScroll);
  }
}
