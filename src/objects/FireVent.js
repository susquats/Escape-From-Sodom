import Phaser from 'phaser';
import { VENT } from '../config.js';

export default class FireVent extends Phaser.GameObjects.Sprite {
  constructor(scene, x, groundY, phaseOffsetMs = 0) {
    super(scene, x, groundY, 'vent');
    scene.add.existing(this);
    scene.physics.add.existing(this, true);
    this.setOrigin(0.5, 1);
    this.body.updateFromGameObject();
    this.t = phaseOffsetMs;
    this.ventState = 'off';
    scene.add.rectangle(x, groundY, 12, 3, 0x1a1020).setOrigin(0.5, 1).setDepth(-0.9);
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
      this.setVisible(true).setScale(1, 0.25);
      this.setAlpha(Math.floor(t / 60) % 2 ? 0.3 : 1);
    } else {
      this.ventState = 'on';
      this.setVisible(true).setAlpha(1).setScale(1 + Math.sin(t / 40) * 0.12, 1);
    }
  }

  update(delta) {
    this.t += delta;
    this.applyState();
  }
}
