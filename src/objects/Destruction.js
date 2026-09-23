import Phaser from 'phaser';
import { DESTRUCTION, GAME_HEIGHT } from '../config.js';

export default class Destruction {
  constructor(scene, worldH) {
    this.scene = scene;
    this.x = DESTRUCTION.startX;
    this.delay = DESTRUCTION.startDelayMs;
    this.stopped = false;

    this.fill = scene.add.rectangle(0, 0, 3000, worldH, 0x8a1a0a).setOrigin(1, 0).setDepth(600);
    this.glow = [[6, 0.5], [12, 0.3], [20, 0.15]].map(([w, a]) =>
      scene.add.rectangle(0, 0, w, worldH, 0xff6a00, a).setOrigin(0, 0).setDepth(599));
    this.flames = [];
    for (let i = 0; i < 12; i++) {
      this.flames.push(scene.add.image(0, i * worldH / 12, 'flame').setOrigin(0.5, 0).setDepth(601));
    }
    this.warning = scene.add.rectangle(0, 0, 6, GAME_HEIGHT, 0xff2000).setOrigin(0)
      .setScrollFactor(0).setDepth(950).setAlpha(0);
    this.place();
  }

  place() {
    this.fill.x = this.x;
    this.glow.forEach(g => { g.x = this.x; });
  }

  update(delta, cam) {
    if (this.stopped) return;
    if (this.delay > 0) this.delay -= delta;
    else {
      this.x += DESTRUCTION.speed * delta / 1000;
      this.x = Math.max(this.x, cam.scrollX - DESTRUCTION.maxLag);
    }
    this.place();
    this.flames.forEach(f => {
      f.x = this.x + Phaser.Math.FloatBetween(-3, 3);
      f.setScale(1, Phaser.Math.FloatBetween(0.8, 1.6));
    });
    const d = cam.scrollX - this.x;
    this.warning.setAlpha(d > 0
      ? Phaser.Math.Clamp(1 - d / DESTRUCTION.warnRange, 0, 1) * (0.5 + 0.3 * Math.sin(this.scene.time.now / 100))
      : 0);
  }
}
