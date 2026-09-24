import { run } from '../runState.js';
import { ART_SCALE } from '../view.js';
import { AIR_FRAMES } from '../art/characters.js';

// Surviving family members hop up the mountain behind Lot, replaying his recent path (visual only).
const LAG_FRAMES = 9;

export default class MountainFollowers {
  constructor(scene, lot) {
    this.scene = scene;
    this.lot = lot;
    this.history = [];
    this.members = ['wife', 'daughter1', 'daughter2']
      .filter(key => !run.lost.has(key))
      .map(key => ({ key, sprite: scene.add.sprite(lot.x, lot.body.bottom, key).setScale(ART_SCALE).setOrigin(0.5, 1).setDepth(-0.5) }));
  }

  update() {
    const lot = this.lot;
    this.history.push({ x: lot.x, y: lot.body.bottom, vy: lot.body.velocity.y, flip: lot.flipX });
    if (this.history.length > LAG_FRAMES * 4 + 1) this.history.shift();
    this.members.forEach(({ key, sprite }, i) => {
      if (!sprite.active || sprite.lostAt) return;
      const h = this.history[Math.max(0, this.history.length - 1 - LAG_FRAMES * (i + 1))];
      sprite.setPosition(h.x, h.y).setFlipX(h.flip);
      sprite.setFrame(h.vy < 0 ? AIR_FRAMES[key].jump : AIR_FRAMES[key].fall);
    });
  }

  sacrifice(key) {
    const m = this.members.find(k => k.key === key);
    if (!m) return;
    m.sprite.lostAt = true;
    m.sprite.setTint(0xff2020);
    this.scene.tweens.add({ targets: m.sprite, y: m.sprite.y - 30, alpha: 0, duration: 700, onComplete: () => m.sprite.destroy() });
  }
}
