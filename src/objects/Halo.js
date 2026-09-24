import Phaser from 'phaser';
import { puff } from '../fx.js';

export default class Halo extends Phaser.Physics.Arcade.Sprite {
  constructor(scene, x, y) {
    super(scene, x, y, 'halo');
    scene.add.existing(this);
    scene.physics.add.existing(this, true);
    this.setDepth(0.3);
    this.play('halo-shine');
    this.body.setSize(14, 12);
    this.body.updateFromGameObject();
    scene.tweens.add({ targets: this, y: y - 2, duration: 500, yoyo: true, repeat: -1 });
  }

  collect() {
    puff(this.scene, this.x, this.y, 0xffe14a);
    this.destroy();
  }
}
