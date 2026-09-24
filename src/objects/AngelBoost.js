import { ANGEL, FAMILY } from '../config.js';
import { LOT_FRAMES } from '../art/characters.js';
import { popText } from '../fx.js';
import { flash, viewX, viewY, ART_SCALE } from '../view.js';

export default class AngelBoost {
  constructor(scene, lot, family) {
    this.scene = scene;
    this.lot = lot;
    this.family = family;
    this.timer = 0;
    this.angels = [];
    this.attached = false;
    this.follower = null;
    this.gap = { v: 0 }; // extra path distance Lot and the family fall back while the angels lead
  }

  start() {
    if (this.timer > 0) { this.timer = ANGEL.durationMs; return; }
    const { scene, lot } = this;
    this.timer = ANGEL.durationMs;
    lot.setBoost(true);
    this.family.rescueAll();
    this.family.protect(ANGEL.durationMs);
    this.attached = false;
    // the player now steers the angels; Lot's own body is just the hidden pilot, and Lot tags along like the family
    lot.setVisible(false);
    this.follower = scene.add.sprite(lot.x, lot.body.bottom, 'lot').setScale(ART_SCALE).setOrigin(0.5, 1).setDepth(-0.3);
    scene.tweens.add({ targets: this.gap, v: ANGEL.lotGap, duration: ANGEL.swoopMs });
    const cam = scene.cameras.main;
    this.angels = [0, 1].map(() => scene.add.sprite(viewX(cam) - 20, viewY(cam) - 20, 'angel').setScale(ART_SCALE).setDepth(700).play('angel-flap'));
    this.angels.forEach((a, i) => {
      const t = this.targets()[i];
      scene.tweens.add({ targets: a, x: t.x, y: t.y, duration: ANGEL.swoopMs,
        onComplete: () => { if (i === 0) this.attached = true; } });
    });
    popText(scene, lot.x, lot.y - 24, 'HALLELUJAH!', '#ffe14a');
    flash(scene, 150, 255, 240, 180);
  }

  // two angels side by side in front of the pilot, shielding him and everyone behind
  targets() {
    const lot = this.lot, f = lot.facing || 1;
    return [{ x: lot.x + f * 24, y: lot.y - 22 }, { x: lot.x + f * 14, y: lot.y - 2 }];
  }

  // Lot and the family trail behind the angels
  followTrail(delta) {
    this.family.members.forEach(m => { m.spacing = FAMILY.spacing[m.memberName] + this.gap.v; });
    const f = this.follower;
    if (!f) return;
    const p = this.scene.trail.sample(this.gap.v);
    const moved = Math.abs(p.x - f.x) > 0.3 || Math.abs(p.y - f.y) > 0.3;
    this.still = moved ? 0 : (this.still ?? 1000) + delta;
    const rising = this.scene.trail.sample(Math.max(0, this.gap.v - 3)).y < p.y;
    f.setPosition(p.x, p.y).setFlipX(p.facing < 0);
    if (!p.onGround) { f.anims.stop(); f.setFrame(rising ? LOT_FRAMES.jump : LOT_FRAMES.fall); }
    else if (this.still < 120) f.play('lot-run', true);
    else { f.anims.stop(); f.play('lot-idle', true); }
  }

  update(delta) {
    if (this.timer <= 0) return;
    this.timer -= delta;
    if (this.timer <= 0) { this.end(); return; }
    const time = this.scene.time.now;
    const bob = Math.sin(time / 90) * 1.5;
    if (this.attached) {
      const t = this.targets();
      this.angels.forEach((a, i) => a.setPosition(t[i].x, t[i].y + bob));
    }
    this.angels.forEach(a => a.setFlipX(this.lot.facing < 0));
    this.followTrail(delta);
    this.follower.setTint(Math.floor(this.timer / 100) % 2 ? 0xfff4b0 : 0xffffff);
  }

  end() {
    this.lot.setBoost(false);
    this.lot.clearTint();
    this.lot.setVisible(true);
    if (this.follower) { this.follower.destroy(); this.follower = null; }
    this.family.members.forEach(m => { m.spacing = FAMILY.spacing[m.memberName]; });
    this.gap.v = 0;
    this.attached = false;
    this.angels.forEach(a => {
      this.scene.tweens.add({ targets: a, x: a.x + 120, y: a.y - 120, alpha: 0, duration: ANGEL.swoopMs,
        onComplete: () => a.destroy() });
    });
    this.angels = [];
  }
}
