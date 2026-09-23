import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT, TILE, DEBUG } from '../config.js';
import Lot from '../objects/Lot.js';
import Controls from '../input/Controls.js';

const WORLD_W = 2400;
const WORLD_H = 360;
const STREET = 16; // street-level tile row

export default class TestScene extends Phaser.Scene {
  constructor() {
    super('TestScene');
  }

  create() {
    this.physics.world.setBounds(0, 0, WORLD_W, WORLD_H);
    this.physics.world.setBoundsCollision(true, true, true, false);

    this.buildBackground();
    this.terrain = this.physics.add.staticGroup();
    this.buildLevel();

    this.lot = new Lot(this, 48, STREET * TILE - 20);
    this.physics.add.collider(this.lot, this.terrain);

    const cam = this.cameras.main;
    cam.setBounds(0, 0, WORLD_W, WORLD_H);
    cam.startFollow(this.lot, true, 0.12, 0.12);
    cam.setDeadzone(40, 30);
    cam.setFollowOffset(-30, 0);
    cam.scrollY = WORLD_H; // clamped to bounds; avoids a camera pan at start
    cam.scrollX = 0;

    this.controls = new Controls(this);
    this.restarting = false;

    const touch = this.sys.game.device.input.touch;
    const hint = this.add.text(GAME_WIDTH / 2, 10,
      touch ? 'Buttons to move & jump' : '← → move   SPACE jump   R restart',
      { fontFamily: 'monospace', fontSize: '8px', color: '#fff' })
      .setOrigin(0.5, 0).setScrollFactor(0).setDepth(900);
    this.tweens.add({ targets: hint, alpha: 0, delay: 4000, duration: 600 });

    if (DEBUG) {
      this.debugText = this.add.text(4, 4, '', { fontFamily: 'monospace', fontSize: '8px', color: '#0f0' })
        .setScrollFactor(0).setDepth(900);
    }
  }

  buildBackground() {
    this.add.rectangle(0, 0, WORLD_W, WORLD_H, 0x2b1b3a).setOrigin(0).setScrollFactor(0).setDepth(-3);
    const layers = [[0.3, 0x3d2a52, 40, 110], [0.6, 0x4f3466, 30, 80]];
    layers.forEach(([factor, color, minH, maxH], i) => {
      for (let x = 0; x < WORLD_W; x += 48) {
        const h = minH + ((x * 37 + i * 91) % (maxH - minH));
        this.add.rectangle(x, WORLD_H - 90, 36, h, color).setOrigin(0, 1)
          .setScrollFactor(factor).setDepth(-2 + i * 0.5);
      }
    });
  }

  platform(tx, ty, w, h = 1) {
    const t = this.add.tileSprite(tx * TILE, ty * TILE, w * TILE, h * TILE, 'ground').setOrigin(0);
    this.terrain.add(t);
    return t;
  }

  buildLevel() {
    const bottom = (ty) => Math.max(1, Math.round(WORLD_H / TILE) - ty); // fill down to world bottom
    const solid = (tx, ty, w) => this.platform(tx, ty, w, bottom(ty));

    solid(0, STREET, 15);          // 1. flat street
    solid(15, STREET - 1, 3);      // 2. low step
    solid(18, STREET - 3, 13);     //    fallen pillar -> rooftop
    solid(35, STREET - 3, 8);      // 3. rooftop 2 after a 4-tile gap
    solid(43, STREET, 8);          // 4. drop to street
    solid(51, STREET - 1, 2);      // 5. staircase
    solid(53, STREET - 2, 2);
    solid(55, STREET - 3, 2);
    solid(57, STREET - 4, 4);
    this.platform(63, 11, 3);      // 6. floating platforms over the pit
    this.platform(69, 10, 3);
    this.platform(75, 11, 3);
    solid(82, STREET, 68);         // 8. end area (7. pit is tx 61-81)
    this.platform(140, STREET - 6, 2, 6); // city gate marker
  }

  update(time, delta) {
    this.controls.update();
    if (this.restarting) return;

    if (this.controls.restartPressed || this.lot.y > WORLD_H + 40) {
      this.restarting = true;
      this.scene.restart();
      return;
    }

    this.lot.update(this.controls, delta);

    if (this.debugText) {
      const b = this.lot.body;
      this.debugText.setText(
        `vx ${b.velocity.x.toFixed(0)} vy ${b.velocity.y.toFixed(0)} onGround ${this.lot.onGround}`);
    }
  }
}
