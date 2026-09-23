import Phaser from 'phaser';

export default class BootScene extends Phaser.Scene {
  constructor() {
    super('BootScene');
  }

  create() {
    const g = this.make.graphics({ add: false });

    // Lot 12x20
    g.fillStyle(0xc9a26b).fillRect(0, 0, 12, 20);
    g.fillStyle(0x7a5a30).fillRect(0, 0, 12, 6);
    g.fillStyle(0x000000).fillRect(8, 8, 2, 2);
    g.generateTexture('lot', 12, 20);
    g.clear();

    // Ground 16x16
    g.fillStyle(0xd9b774).fillRect(0, 0, 16, 16);
    g.fillStyle(0x9c7b3e).fillRect(0, 0, 16, 1);
    g.generateTexture('ground', 16, 16);
    g.clear();

    // Wife 11x19
    g.fillStyle(0x3b6fb6).fillRect(0, 0, 11, 19);
    g.fillStyle(0x9ec3e6).fillRect(0, 0, 11, 5);
    g.fillStyle(0x000000).fillRect(8, 7, 2, 2);
    g.generateTexture('wife', 11, 19);
    g.clear();

    // Daughters 10x16
    [['daughter1', 0x4c9a4c, 0x2a5a2a], ['daughter2', 0xd26a9a, 0x8a3a62]].forEach(([key, c, hair]) => {
      g.fillStyle(c).fillRect(0, 0, 10, 16);
      g.fillStyle(hair).fillRect(0, 0, 10, 4);
      g.fillStyle(0x000000).fillRect(7, 6, 2, 2);
      g.generateTexture(key, 10, 16);
      g.clear();
    });

    // Salt shaker 8x12
    g.fillStyle(0xf4f4f4).fillRect(0, 0, 8, 12);
    g.fillStyle(0x9a9a9a).fillRect(0, 0, 8, 3);
    g.fillStyle(0x000000).fillRect(1, 1, 1, 1).fillRect(3, 1, 1, 1).fillRect(6, 1, 1, 1);
    g.generateTexture('salt', 8, 12);
    g.clear();

    // Fire vent 12x32
    g.fillStyle(0xff8a1e).fillRect(0, 0, 12, 32);
    g.fillStyle(0xffe14a).fillRect(3, 12, 6, 20);
    g.generateTexture('vent', 12, 32);
    g.clear();

    // Fireball 8x8
    g.fillStyle(0xff8a1e).fillRect(2, 0, 4, 8).fillRect(0, 2, 8, 4);
    g.fillStyle(0xffe14a).fillRect(3, 3, 2, 2);
    g.generateTexture('fireball', 8, 8);
    g.clear();

    // Ground flame 10x10
    g.fillStyle(0xff8a1e).fillRect(0, 4, 10, 6).fillRect(2, 1, 6, 4).fillRect(4, 0, 2, 2);
    g.fillStyle(0xffe14a).fillRect(3, 5, 4, 5);
    g.generateTexture('flame', 10, 10);
    g.clear();

    // Sulfur warning marker 5x5
    g.fillStyle(0xff2020).fillRect(0, 0, 5, 5);
    g.fillStyle(0xffe14a).fillRect(2, 2, 1, 1);
    g.generateTexture('warn', 5, 5);
    g.clear();

    // HUD X 7x7
    g.fillStyle(0xff2020);
    for (let i = 0; i < 7; i++) g.fillRect(i, i, 1, 1).fillRect(6 - i, i, 1, 1);
    g.generateTexture('x', 7, 7);
    g.clear();

    // Sodomite 12x18
    g.fillStyle(0xa0402a).fillRect(0, 0, 12, 18);
    g.fillStyle(0x4a2c14).fillRect(0, 0, 12, 5);
    g.fillStyle(0x6e2a1a).fillRect(0, 10, 12, 2);
    g.fillStyle(0x000000).fillRect(8, 7, 2, 2).fillRect(7, 5, 3, 1);
    g.generateTexture('sodomite', 12, 18);
    g.clear();

    // Angel 16x18
    g.fillStyle(0xcfd8e6).fillRect(0, 3, 4, 8).fillRect(12, 3, 4, 8);
    g.fillStyle(0xf4f4f4).fillRect(4, 4, 8, 14);
    g.fillStyle(0xf2c9a0).fillRect(6, 4, 4, 3);
    g.fillStyle(0xffe14a).fillRect(5, 0, 6, 1);
    g.generateTexture('angel', 16, 18);
    g.clear();

    // Halo 10x5
    g.fillStyle(0xffe14a).fillRect(2, 0, 6, 1).fillRect(2, 4, 6, 1).fillRect(0, 1, 2, 3).fillRect(8, 1, 2, 3);
    g.generateTexture('halo', 10, 5);
    g.clear();

    // Puff pixel 2x2
    g.fillStyle(0xffffff).fillRect(0, 0, 2, 2);
    g.generateTexture('pixel', 2, 2);
    g.clear();

    // Touch button base 32x32
    g.fillStyle(0xffffff).fillRect(2, 0, 28, 32).fillRect(0, 2, 32, 28);
    g.generateTexture('btn', 32, 32);
    g.destroy();

    this.scene.start('TestScene');
  }
}
