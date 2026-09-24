import Phaser from 'phaser';
import { VENT } from '../config.js';
import { ART_SCALE } from '../view.js';

export default class FireVent extends Phaser.GameObjects.Sprite {
  constructor(scene, x, groundY, phaseOffsetMs = 0) {
    super(scene, x, groundY, 'vent');
    this.setScale(ART_SCALE);
    scene.add.existing(this);
    scene.physics.add.existing(this, true);
    this.setOrigin(0.5, 1);
    this.body.updateFromGameObject();
    this.t = phaseOffsetMs;
    this.ventState = 'off';
    scene.add.image(x, groundY + 1, 'grate').setScale(ART_SCALE).setOrigin(0.5, 1).setDepth(-0.9);
    this.play('vent-roar');
    this.setDepth(0.5);
    this.applyState();
  }

  get isHot() {
    return this.ventState === 'on';
  }

  applyState() {
    const cycle = VENT.offMs + VENT.warnMs + VENT.onMs;
    const t = this.t % cycle;
    if (t < VENT.offMs) {
      this.ventState = 'off';
      this.setVisible(false);
    } else if (t < VENT.offMs + VENT.warnMs) {
      this.ventState = 'warn';
      this.setVisible(true).setScale(ART_SCALE, 0.25 * ART_SCALE);
      this.setAlpha(Math.floor(t / 60) % 2 ? 0.3 : 1);
    } else {
      this.ventState = 'on';
      this.setVisible(true).setAlpha(1).setScale((1 + Math.sin(t / 40) * 0.12) * ART_SCALE, ART_SCALE);
    }
  }

  update(delta) {
    this.t += delta;
    this.applyState();
  }
}
