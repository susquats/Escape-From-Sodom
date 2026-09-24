import Phaser from 'phaser';
import { START_SCENE, START_LOST } from '../config.js';
import { run } from '../runState.js';
import { buildTextures } from '../art/buildTextures.js';

export default class BootScene extends Phaser.Scene {
  constructor() {
    super('BootScene');
  }

  create() {
    // Characters and objects: pixel art from src/art/sprites.js
    buildTextures(this);

    // Remaining simple generated textures
    const g = this.make.graphics({ add: false });

    // Ground 16x16
    g.fillStyle(0xd9b774).fillRect(0, 0, 16, 16);
    g.fillStyle(0x9c7b3e).fillRect(0, 0, 16, 1);
    g.generateTexture('ground', 16, 16);
    g.clear();

    // Tileset for the Act I tilemap: 8 tiles of 16x16 side by side (128x16). M9 art replaces this
    // texture with a PNG in the same order: sandstone, brick, roof, pillar, awning, city wall, back wall, window.
    const T = (i) => i * 16;
    g.fillStyle(0xd9b774).fillRect(T(0), 0, 16, 16);
    g.fillStyle(0x9c7b3e).fillRect(T(0), 0, 16, 1);
    g.fillStyle(0xb99a5a);
    for (let k = 0; k < 2; k++) g.fillRect(T(0) + Phaser.Math.Between(1, 14), Phaser.Math.Between(4, 14), 1, 1);
    g.fillStyle(0xa0643a).fillRect(T(1), 0, 16, 16);
    g.fillStyle(0x5a3320);
    for (let y = 0; y < 16; y += 4) {
      g.fillRect(T(1), y, 16, 1);
      const off = (y / 4) % 2 ? 2 : 6;
      for (let x = off; x < 16; x += 8) g.fillRect(T(1) + x, y, 1, 4);
    }
    g.fillStyle(0x8a4a2a).fillRect(T(2), 0, 16, 16);
    g.fillStyle(0xb06a42).fillRect(T(2), 0, 16, 2);
    g.fillStyle(0x5a2e18).fillRect(T(2), 2, 16, 1);
    g.fillStyle(0xe8dcc0).fillRect(T(3), 0, 16, 16);
    g.fillStyle(0xb8a880).fillRect(T(3) + 4, 0, 1, 16).fillRect(T(3) + 11, 0, 1, 16);
    for (let x = 0; x < 16; x += 4) {
      g.fillStyle(x % 8 ? 0xf0e0d0 : 0xc03030).fillRect(T(4) + x, 0, 4, 4);
    }
    g.fillStyle(0xb09a70).fillRect(T(5), 0, 16, 16);
    g.lineStyle(1, 0x7a6a48);
    for (let y = 0; y < 16; y += 8) for (let x = 0; x < 16; x += 8) g.strokeRect(T(5) + x + 0.5, y + 0.5, 7, 7);
    g.fillStyle(0x5a3a4a).fillRect(T(6), 0, 16, 16);
    g.fillStyle(0x5a3a4a).fillRect(T(7), 0, 16, 16);
    g.fillStyle(0x000000).fillRect(T(7) + 5, 4, 6, 8);
    g.fillStyle(0xffb040).fillRect(T(7) + 5, 12, 6, 1);
    g.generateTexture('tiles', 128, 16);
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

    // Puff pixel 2x2
    g.fillStyle(0xffffff).fillRect(0, 0, 2, 2);
    g.generateTexture('pixel', 2, 2);
    g.clear();

    // Touch button base 32x32
    g.fillStyle(0xffffff).fillRect(2, 0, 28, 32).fillRect(0, 2, 32, 28);
    g.generateTexture('btn', 32, 32);
    g.destroy();

    START_LOST.forEach(n => run.lost.add(n));
    this.scene.start(START_SCENE);
  }
}
