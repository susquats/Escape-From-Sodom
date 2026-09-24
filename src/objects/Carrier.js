import Phaser from 'phaser';
import { FLIGHT } from '../config.js';
import { run } from '../runState.js';
import { ART_SCALE } from '../view.js';

// The whole group is ONE physics body (invisible zone); the container is just the picture.
export default class Carrier {
  constructor(scene, x, y) {
    this.scene = scene;
    this.zone = scene.add.zone(x, y, FLIGHT.hitbox.w, FLIGHT.hitbox.h);
    scene.physics.add.existing(this.zone);
    this.body = this.zone.body;
    this.body.setAllowGravity(false);
    this.body.setMaxVelocityY(FLIGHT.maxFallSpeed);

    this.view = scene.add.container(x, y).setDepth(10);
    this.angels = [
      scene.add.sprite(-7, -18, 'angel').setScale(ART_SCALE).setOrigin(0.5).play('angel-flap'),
      scene.add.sprite(7, -18, 'angel').setScale(ART_SCALE).setOrigin(0.5).setFlipX(true).play({ key: 'angel-flap', startFrame: 1 }),
    ];
    this.view.add(this.angels);
    // everyone hangs by their hands (hang frames have the hands at the top): parents from the angels' feet,
    // daughters from their parents' feet
    const hanger = (x, y, key, startFrame) =>
      scene.add.sprite(x, y, key).setScale(ART_SCALE).setOrigin(0.5, 0).play({ key: `${key}-hang`, startFrame });
    this.view.add(hanger(-6, -9, 'lot', 0));
    this.danglers = [];
    if (!run.lost.has('wife')) this.view.add(hanger(6, -9, 'wife', 1));
    [['daughter1', -6], ['daughter2', 6]].forEach(([key, px], i) => {
      if (run.lost.has(key)) return;
      const d = hanger(px, 11, key, i);
      this.view.add(d);
      this.danglers.push(d);
    });
  }

  // Family member lost in Lot's place: turns red and drops away.
  sacrifice(key) {
    const img = this.view.list.find(c => c.texture && c.texture.key === key);
    if (!img) return;
    this.danglers = this.danglers.filter(d => d !== img);
    img.setTint(0xff2020);
    this.scene.tweens.add({ targets: img, y: img.y + 60, alpha: 0, duration: 700, onComplete: () => img.destroy() });
  }

  start() { this.body.setAllowGravity(true); }

  flap() {
    this.body.setVelocityY(-FLIGHT.flapVelocity);
    this.scene.tweens.add({ targets: this.angels, scaleY: { from: 0.7 * ART_SCALE, to: ART_SCALE }, duration: 120 });
  }

  update(time) {
    const b = this.body;
    if (b.enable && b.top < 2) {
      this.zone.y += 2 - b.top;
      b.velocity.y = Math.max(b.velocity.y, 0);
    }
    if (!this.crashed && !this.freeze) {
      this.view.setPosition(this.zone.x, this.zone.y);
      this.view.rotation = Phaser.Math.Clamp(b.velocity.y / 900, -0.3, 0.35);
    }
    this.danglers.forEach((d, i) => { d.rotation = Math.sin(time / 150 + i) * 0.3; });
  }

  crash() {
    this.crashed = true;
    this.body.enable = false;
    this.scene.tweens.add({ targets: this.view, angle: 200, y: '+=160', duration: 800, ease: 'Quad.in' });
  }

  people() { return this.view.list.filter(c => !this.angels.includes(c)); }
}
