import Phaser from 'phaser';
import { puff, sfx } from '../fx.js';
import { ART_SCALE } from '../view.js';

export default class Halo extends Phaser.Physics.Arcade.Sprite {
  constructor(scene, x, y) {
    super(scene, x, y, 'halo');
    this.setScale(ART_SCALE);
    scene.add.existing(this);
    scene.physics.add.existing(this, true);
    this.setDepth(0.3);
    this.play('halo-shine');
    this.body.setSize(14, 12);
    this.body.updateFromGameObject();
    scene.tweens.add({ targets: this, y: y - 2, duration: 500, yoyo: true, repeat: -1 });
  }

  collect() {
    sfx(this.scene, 'powerUp');
    puff(this.scene, this.x, this.y, 0xffe14a);
    this.destroy();
  }
}
