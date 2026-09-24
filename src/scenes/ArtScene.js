import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT } from '../config.js';
import { SPRITES, ANIMS } from '../art/sprites.js';
import { setupView, setViewY, viewY, ART_SCALE } from '../view.js';

// Debug-only sprite review (?scene=art). Top: animations at in-game size. Then every frame at 2x in-game size
// (1 texture pixel = 2 screen pixels). Scroll with the arrow keys / mouse wheel / dragging.
export default class ArtScene extends Phaser.Scene {
  constructor() {
    super('ArtScene');
  }

  create() {
    setupView(this);
    this.cameras.main.setBackgroundColor('#1e1428');
    const pad = 3;

    // in-game size (ART_SCALE) animations
    let x = pad, y = pad, rowH = 0;
    ANIMS.forEach(([animKey, texKey]) => {
      const { w, h } = SPRITES[texKey];
      this.add.sprite(x, y, texKey).setOrigin(0).setScale(ART_SCALE).play(animKey);
      x += w * ART_SCALE + pad;
      rowH = Math.max(rowH, h * ART_SCALE);
    });
    y += rowH + pad * 2;

    // every frame, 2x in-game size, on a slightly lighter card
    const scale = ART_SCALE * 2;
    x = pad; rowH = 0;
    for (const [key, { w, h, frames }] of Object.entries(SPRITES)) {
      frames.forEach((_, f) => {
        const fw = w * scale, fh = h * scale;
        if (x + fw > GAME_WIDTH - pad) { x = pad; y += rowH + pad; rowH = 0; }
        this.add.rectangle(x, y, fw, fh, 0x2e2240).setOrigin(0);
        this.add.image(x, y, key, f).setOrigin(0).setScale(scale);
        x += fw + pad;
        rowH = Math.max(rowH, fh);
      });
    }
    y += rowH + pad;

    // characters on a light background, in-game size
    this.add.rectangle(0, y, GAME_WIDTH, 30, 0xd8d0c0).setOrigin(0);
    x = pad;
    ['lot', 'wife', 'daughter1', 'daughter2', 'sodomite', 'angel', 'salt', 'jug', 'halo', 'fireball'].forEach(k => {
      this.add.image(x, y + 4, k, 0).setOrigin(0).setScale(ART_SCALE);
      x += SPRITES[k].w * ART_SCALE + pad * 2;
    });
    y += 30;

    const cam = this.cameras.main;
    this.maxScroll = Math.max(0, y - GAME_HEIGHT);
    this.cursors = this.input.keyboard.createCursorKeys();
    this.input.on('wheel', (p, o, dx, dy) => setViewY(cam, Phaser.Math.Clamp(viewY(cam) + dy * 0.3, 0, this.maxScroll)));
    this.input.on('pointermove', p => {
      if (p.isDown) setViewY(cam, Phaser.Math.Clamp(viewY(cam) - (p.y - p.prevPosition.y) / 2, 0, this.maxScroll));
    });
    setViewY(cam, 0);
  }

  update() {
    const cam = this.cameras.main;
    const d = (this.cursors.down.isDown ? 3 : 0) - (this.cursors.up.isDown ? 3 : 0);
    if (d) setViewY(cam, Phaser.Math.Clamp(viewY(cam) + d, 0, this.maxScroll));
  }
}
