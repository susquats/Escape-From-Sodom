import Phaser from 'phaser';
import { GAME_WIDTH, SODOMITE } from '../config.js';
import { popText, puff, sfx, sfxNear, voice } from '../fx.js';
import { viewX, ART_SCALE } from '../view.js';
import { fitBody } from '../art/sprites.js';
import { t } from '../i18n.js';

let lastGroan = 0; // shared, so a crowd doesn't stack the sound

export default class Sodomite extends Phaser.Physics.Arcade.Sprite {
  constructor(scene, x, y) {
    super(scene, x, y, 'sodomite');
    this.setScale(ART_SCALE);
    scene.add.existing(this);
    scene.physics.add.existing(this);
    fitBody(this, 'sodomite');
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
      if (this.x < viewX(cam) + GAME_WIDTH + SODOMITE.wakeMargin) this.awake = true;
      else { this.setVelocityX(0); return; }
    }
    this.play('sodomite-walk', true);
    const now = this.scene.time.now;
    if (now - lastGroan > 2600 && sfxNear(this.scene, 'sodomite', Math.abs(lot.x - this.x), 110, 0.6)) lastGroan = now;
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
    this.anims.stop();
    this.alive = false;
    this.body.enable = false;
    this.y += this.displayHeight * 0.35;
    this.setScale(1.3 * ART_SCALE, 0.3 * ART_SCALE);
    this.scene.time.delayedCall(SODOMITE.squashMs, () => {
      this.scene.tweens.add({ targets: this, alpha: 0, duration: 200, onComplete: () => this.setVisible(false) });
    });
  }

  squash() {
    this.flatten();
    voice(this.scene, 'squish');
    puff(this.scene, this.x, this.y, 0xffffff);
    popText(this.scene, this.x, this.y - 8, t('pop.squish'));
  }

  burn() {
    this.flatten();
    sfx(this.scene, 'hitHurt2', 0.3);
    this.setTint(0x222222);
    puff(this.scene, this.x, this.y, 0xff8a1e);
  }

  bonk(fromX) {
    this.anims.stop();
    this.alive = false;
    this.body.enable = false;
    voice(this.scene, 'bonk');
    popText(this.scene, this.x, this.y - 8, t('pop.bonk'), '#ffe14a');
    this.scene.tweens.add({ targets: this, x: this.x + (Math.sign(this.x - fromX) || 1) * 60,
      y: this.y - 40, angle: 540, alpha: 0, duration: 600, onComplete: () => this.setVisible(false) });
  }
}
