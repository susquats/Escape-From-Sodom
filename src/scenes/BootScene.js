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

    // Touch button base 32x32
    g.fillStyle(0xffffff).fillRect(2, 0, 28, 32).fillRect(0, 2, 32, 28);
    g.generateTexture('btn', 32, 32);
    g.destroy();

    this.scene.start('TestScene');
  }
}
