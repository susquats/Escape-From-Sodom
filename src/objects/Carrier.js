import Phaser from 'phaser';
import { FLIGHT } from '../config.js';
import { run } from '../runState.js';

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
      scene.add.sprite(-7, -18, 'angel').setOrigin(0.5).play('angel-flap'),
      scene.add.sprite(7, -18, 'angel').setOrigin(0.5).setFlipX(true).play({ key: 'angel-flap', startFrame: 1 }),
    ];
    this.view.add(this.angels);
    this.view.add(scene.add.image(-5, 2, 'lot').setOrigin(0.5));
    this.danglers = [];
    if (!run.lost.has('wife')) this.view.add(scene.add.image(5, 3, 'wife').setOrigin(0.5));
    [['daughter1', -5], ['daughter2', 5]].forEach(([key, px]) => {
      if (run.lost.has(key)) return;
      const d = scene.add.image(px, 12, key).setOrigin(0.5, 0);
      this.view.add(d);
      this.danglers.push(d);
    });
  }

  start() { this.body.setAllowGravity(true); }

  flap() {
    this.body.setVelocityY(-FLIGHT.flapVelocity);
    this.scene.tweens.add({ targets: this.angels, scaleY: { from: 0.7, to: 1 }, duration: 120 });
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
