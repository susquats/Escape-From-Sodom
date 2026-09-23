import Phaser from 'phaser';
import { GAME_WIDTH, SODOMITE } from '../config.js';
import { popText, puff } from '../fx.js';

export default class Sodomite extends Phaser.Physics.Arcade.Sprite {
  constructor(scene, x, y) {
    super(scene, x, y, 'sodomite');
    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.setCollideWorldBounds(true);
    this.setDepth(0.2);
    this.alive = true;
    this.awake = false;
    this.dir = -1;
    this.setFlipX(true);
  }

  update(lot, cam, wallX, worldH) {
    if (!this.alive) return;
    if (this.x < wallX) { this.burn(); return; }
    if (this.y > worldH + 40) { this.kill(); return; }
    if (!this.awake) {
      if (this.x < cam.scrollX + GAME_WIDTH + SODOMITE.wakeMargin) this.awake = true;
      else { this.setVelocityX(0); return; }
    }
    const dx = lot.x - this.x;
    if (Math.abs(dx) > 4) this.dir = Math.sign(dx);
    this.setVelocityX(this.dir * SODOMITE.speed);
    this.setFlipX(this.dir < 0);
    const b = this.body;
    if (b.blocked.down && ((this.dir < 0 && b.blocked.left) || (this.dir > 0 && b.blocked.right))) {
      this.setVelocityY(-SODOMITE.hopVelocity);
    }
  }

  kill() {
    this.alive = false;
    this.body.enable = false;
    this.setVisible(false);
  }

  flatten() {
    this.alive = false;
    this.body.enable = false;
    this.setScale(1.3, 0.3);
    this.y += this.height * 0.35;
    this.scene.time.delayedCall(SODOMITE.squashMs, () => {
      this.scene.tweens.add({ targets: this, alpha: 0, duration: 200, onComplete: () => this.setVisible(false) });
    });
  }

  squash() {
    this.flatten();
    puff(this.scene, this.x, this.y, 0xffffff);
    popText(this.scene, this.x, this.y - 8, 'SQUISH!');
  }

  burn() {
    this.flatten();
    this.setTint(0x222222);
    puff(this.scene, this.x, this.y, 0xff8a1e);
  }

  bonk(fromX) {
    this.alive = false;
    this.body.enable = false;
    popText(this.scene, this.x, this.y - 8, 'BONK!', '#ffe14a');
    this.scene.tweens.add({ targets: this, x: this.x + (Math.sign(this.x - fromX) || 1) * 60,
      y: this.y - 40, angle: 540, alpha: 0, duration: 600, onComplete: () => this.setVisible(false) });
  }
}
