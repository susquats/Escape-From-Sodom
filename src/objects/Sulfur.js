import Phaser from 'phaser';
import { SULFUR } from '../config.js';
import { puff, sfx, sfxNear } from '../fx.js';
import { viewY, ART_SCALE } from '../view.js';
import { COMET_HEAD } from '../art/items.js';

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
    this.lastCometSound = -1e9;
  }

  update(delta, lot, cam) {
    if (this.stopped) return;
    this.timer -= delta;
    if (this.timer <= 0) {
      const progress = Phaser.Math.Clamp(lot.x / this.worldW, 0, 1);
      this.timer = Phaser.Math.Linear(SULFUR.startIntervalMs, SULFUR.endIntervalMs, progress);
      // never aim at a pit: the family jumping across it would get hit, so try a few spots and skip if all are pits
      for (let i = 0; i < 6; i++) {
        const x = Phaser.Math.Clamp(lot.x + Phaser.Math.Between(SULFUR.aheadMin, SULFUR.aheadMax), 8, this.worldW - 8);
        if (this.scene.nearPit && this.scene.nearPit(x)) continue;
        this.warn(x, lot);
        break;
      }
    }
    this.balls.getChildren().slice().forEach(b => { if (b.y > this.worldH + 20) b.destroy(); });
  }

  // x = where the comet should come down (at Lot's height). It enters from the top left, launched by the
  // destruction; the marker blinks where it will cross the top of the screen.
  warn(x, lot) {
    const cam = this.scene.cameras.main;
    const angle = SULFUR.angle + Phaser.Math.FloatBetween(-SULFUR.angleJitter, SULFUR.angleJitter);
    const slope = Math.tan(Phaser.Math.DegToRad(angle)); // horizontal px per px of fall
    const top = viewY(cam);
    const entryX = x - (lot.y - top) * slope;
    const m = this.scene.add.image(entryX, 6, 'warn').setScrollFactor(1, 0).setDepth(900);
    this.markers.push(m);
    const tw = this.scene.tweens.add({ targets: m, alpha: 0.2, duration: 100, yoyo: true, repeat: -1 });
    this.scene.time.delayedCall(SULFUR.warnMs, () => {
      tw.stop();
      if (!m.active) return;
      this.markers = this.markers.filter(k => k !== m);
      m.destroy();
      if (!this.stopped) this.drop(entryX - 10 * slope, viewY(cam) - 10, slope);
    });
  }

  drop(x, y, slope) {
    const lot = this.scene.lot, now = this.scene.time.now;
    const landX = x + slope * (lot.y - y);
    if (now - this.lastCometSound > 2200 && sfxNear(this.scene, 'comet', Math.abs(landX - lot.x), 150, 0.35)) this.lastCometSound = now;
    const b = this.balls.create(x, y, 'fireball').setScale(ART_SCALE).setDepth(500);
    const vx = SULFUR.fallSpeed * slope, vy = SULFUR.fallSpeed;
    // the comet sprite flies toward the bottom right with its head at COMET_HEAD: pivot on the head,
    // turn it to the flight direction, and make the hitbox a circle around the head
    b.setOrigin(COMET_HEAD.x / b.width, COMET_HEAD.y / b.height);
    b.setRotation(Math.atan2(vy, vx) - Math.PI / 4);
    b.body.setCircle(COMET_HEAD.r, COMET_HEAD.x - COMET_HEAD.r, COMET_HEAD.y - COMET_HEAD.r);
    b.body.reset(x, y); // re-sync the body with the new origin
    b.setVelocity(vx, vy);
    b.play('fireball-flicker');
  }

  impact(ball) {
    if (!ball.active) return;
    const scene = this.scene;
    sfx(scene, 'explosion', 0.25);
    puff(scene, ball.x, ball.y, 0xff8a1e);
    const f = this.flames.create(ball.x, ball.body.bottom, 'flame').setScale(ART_SCALE).setOrigin(0.5, 1).setDepth(500);
    f.body.setSize(16, 16); // texture pixels (= 8x8 world)
    f.body.reset(f.x, f.y);
    f.play('flame-flicker');
    scene.tweens.add({ targets: f, scaleY: 1.3 * ART_SCALE, duration: 120, yoyo: true, repeat: -1 });
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
