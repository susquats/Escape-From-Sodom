import Phaser from 'phaser';
import { DESTRUCTION, GAME_HEIGHT } from '../config.js';
import { viewX, ART_SCALE } from '../view.js';

export default class Destruction {
  constructor(scene, worldH) {
    this.scene = scene;
    this.x = DESTRUCTION.startX;
    this.delay = DESTRUCTION.startDelayMs;
    this.stopped = false;

    this.fill = scene.add.tileSprite(0, 0, 6000, worldH * 2, 'fireinner').setScale(ART_SCALE).setOrigin(1, 0).setDepth(600);
    // roiling fire along the leading edge (src/art/props.js), scrolled upward in update()
    this.edge = scene.add.tileSprite(0, 0, 64, worldH * 2, 'firewall').setScale(ART_SCALE).setOrigin(0.55, 0).setDepth(600.5);
    this.glow = [[6, 0.5], [12, 0.3], [20, 0.15]].map(([w, a]) =>
      scene.add.rectangle(0, 0, w, worldH, 0xff6a00, a).setOrigin(0, 0).setDepth(599));
    this.warning = scene.add.rectangle(0, 0, 6, GAME_HEIGHT, 0xff2000).setOrigin(0)
      .setScrollFactor(0).setDepth(950).setAlpha(0);
    this.place();
  }

  place() {
    this.fill.x = this.x - 8;
    this.edge.x = this.x;
    this.glow.forEach(g => { g.x = this.x; });
  }

  update(delta, cam) {
    if (this.stopped) return;
    if (this.delay > 0) this.delay -= delta;
    else {
      this.x += DESTRUCTION.speed * delta / 1000;
      this.x = Math.max(this.x, viewX(cam) - DESTRUCTION.maxLag);
    }
    this.place();
    this.edge.tilePositionY += delta * 0.12;
    this.fill.tilePositionY += delta * 0.07;
    const d = viewX(cam) - this.x;
    this.warning.setAlpha(d > 0
      ? Phaser.Math.Clamp(1 - d / DESTRUCTION.warnRange, 0, 1) * (0.5 + 0.3 * Math.sin(this.scene.time.now / 100))
      : 0);
  }
}
