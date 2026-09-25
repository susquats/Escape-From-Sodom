import { run } from '../runState.js';
import { MOUNTAIN } from '../config.js';
import { ART_SCALE } from '../view.js';
import { AIR_FRAMES } from '../art/characters.js';
import { standIdle } from '../art/sprites.js';

// Surviving family members hop up the mountain behind Lot, replaying his recent path (visual only).
// On the summit they walk after him but stop short of stopX (the cave mouth) and wait there.
const LAG_FRAMES = 9;
const SPACING = 12;
const ORDER = ['daughter1', 'daughter2', 'wife']; // the mother at the back

export default class MountainFollowers {
  constructor(scene, lot) {
    this.scene = scene;
    this.lot = lot;
    this.history = [];
    this.stopX = Infinity;
    this.members = ORDER.filter(key => !run.lost.has(key)).map(key => ({ key, sprite: this.makeSprite(key) }));
  }

  makeSprite(key) {
    return this.scene.add.sprite(this.lot.x, this.lot.body.bottom, key).setScale(ART_SCALE).setOrigin(0.5, 1).setDepth(-0.5);
  }

  // a member rescued from the salt rejoins the queue at her place in the line
  restore(key) {
    const sprite = this.makeSprite(key);
    const old = this.members.findIndex(m => m.key === key);
    if (old >= 0) this.members[old].sprite = sprite;
    else {
      this.members.push({ key, sprite });
      this.members.sort((a, b) => ORDER.indexOf(a.key) - ORDER.indexOf(b.key));
    }
  }

  update() {
    const lot = this.lot;
    const ground = lot.body.blocked.down || lot.body.touching.down;
    this.history.push({ x: lot.x, y: lot.body.bottom, vy: lot.body.velocity.y, flip: lot.flipX, ground });
    if (this.history.length > LAG_FRAMES * 4 + 1) this.history.shift();
    let n = 0; // place in the queue at the cave mouth
    this.members.forEach(({ key, sprite }, i) => {
      if (!sprite.active || sprite.lostAt) return;
      const h = this.history[Math.max(0, this.history.length - 1 - LAG_FRAMES * (i + 1))];
      const stop = this.stopX - SPACING * n++, waiting = h.x > stop && h.y < MOUNTAIN.topY;
      const x = waiting ? stop : h.x;
      const moving = Math.abs(x - sprite.x) > 0.05;
      sprite.setPosition(x, h.y).setFlipX(waiting ? false : h.flip);
      if (!h.ground || this.stopX === Infinity) { sprite.anims.stop(); sprite.setFrame(h.vy < 0 ? AIR_FRAMES[key].jump : AIR_FRAMES[key].fall); }
      else if (moving) sprite.anims.play(`${key}-walk`, true);
      else standIdle(sprite, key);
    });
  }

  sacrifice(key) {
    const m = this.members.find(k => k.key === key);
    if (!m) return;
    const sprite = m.sprite; // not m.sprite later: a quick rescue swaps in a new sprite that must not be destroyed
    sprite.lostAt = true;
    sprite.setTint(0xff2020);
    this.scene.tweens.add({ targets: sprite, y: sprite.y - 30, alpha: 0, duration: 700, onComplete: () => sprite.destroy() });
  }
}
