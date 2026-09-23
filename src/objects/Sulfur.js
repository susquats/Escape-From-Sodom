import Phaser from 'phaser';
import { SULFUR } from '../config.js';
import { puff } from '../fx.js';

export default class Sulfur {
  constructor(scene, terrain, worldW, worldH) {
    this.scene = scene;
    this.worldW = worldW;
    this.worldH = worldH;
    this.balls = scene.physics.add.group({ allowGravity: false });
    this.flames = scene.physics.add.group({ allowGravity: false, immovable: true });
    scene.physics.add.collider(this.balls, terrain, (ball) => this.impact(ball));
    this.markers = [];
    this.timer = SULFUR.startIntervalMs;
    this.stopped = false;
  }

  update(delta, lot, cam) {
    if (this.stopped) return;
    this.timer -= delta;
    if (this.timer <= 0) {
      const progress = Phaser.Math.Clamp(lot.x / this.worldW, 0, 1);
      this.timer = Phaser.Math.Linear(SULFUR.startIntervalMs, SULFUR.endIntervalMs, progress);
      const x = Phaser.Math.Clamp(lot.x + Phaser.Math.Between(SULFUR.aheadMin, SULFUR.aheadMax), 8, this.worldW - 8);
      this.warn(x);
    }
    this.balls.getChildren().slice().forEach(b => { if (b.y > this.worldH + 20) b.destroy(); });
  }

  warn(x) {
    const cam = this.scene.cameras.main;
    const m = this.scene.add.image(x, 6, 'warn').setScrollFactor(1, 0).setDepth(900);
    this.markers.push(m);
    const tw = this.scene.tweens.add({ targets: m, alpha: 0.2, duration: 100, yoyo: true, repeat: -1 });
    this.scene.time.delayedCall(SULFUR.warnMs, () => {
      tw.stop();
      if (!m.active) return;
      this.markers = this.markers.filter(k => k !== m);
      m.destroy();
      if (!this.stopped) this.drop(x, cam.scrollY - 10);
    });
  }

  drop(x, y) {
    const b = this.balls.create(x, y, 'fireball').setDepth(500);
    b.setVelocity(Phaser.Math.FloatBetween(-SULFUR.maxDrift, SULFUR.maxDrift), SULFUR.fallSpeed);
    this.scene.tweens.add({ targets: b, angle: 360, duration: 600, repeat: -1 });
  }

  impact(ball) {
    if (!ball.active) return;
    const scene = this.scene;
    puff(scene, ball.x, ball.y, 0xff8a1e);
    const f = this.flames.create(ball.x, ball.body.bottom, 'flame').setOrigin(0.5, 1).setDepth(500);
    f.body.setSize(8, 8);
    f.body.reset(f.x, f.y);
    scene.tweens.add({ targets: f, scaleY: 1.3, duration: 120, yoyo: true, repeat: -1 });
    scene.tweens.add({ targets: f, alpha: 0, delay: SULFUR.flameMs - 300, duration: 300,
      onComplete: () => f.destroy() });
    scene.tweens.killTweensOf(ball);
    ball.destroy();
  }

  stop() {
    this.stopped = true;
    this.balls.clear(true, true);
    this.markers.forEach(m => m.destroy());
    this.markers = [];
    this.flames.clear(true, true);
  }
}
