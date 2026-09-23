import { ANGEL } from '../config.js';
import { popText } from '../fx.js';

export default class AngelBoost {
  constructor(scene, lot, family) {
    this.scene = scene;
    this.lot = lot;
    this.family = family;
    this.timer = 0;
    this.angels = [];
    this.attached = false;
  }

  start() {
    if (this.timer > 0) { this.timer = ANGEL.durationMs; return; }
    const { scene, lot } = this;
    this.timer = ANGEL.durationMs;
    lot.setBoost(true);
    this.family.rescueAll();
    this.family.protect(ANGEL.durationMs);
    this.attached = false;
    const cam = scene.cameras.main;
    this.angels = [0, 1].map(() => scene.add.image(cam.scrollX - 20, cam.scrollY - 20, 'angel').setDepth(700));
    this.angels.forEach((a, i) => {
      const t = this.targets()[i];
      scene.tweens.add({ targets: a, x: t.x, y: t.y, duration: ANGEL.swoopMs,
        onComplete: () => { if (i === 0) this.attached = true; } });
    });
    popText(scene, lot.x, lot.y - 24, 'HALLELUJAH!', '#ffe14a');
    cam.flash(150, 255, 240, 180);
  }

  targets() {
    const lot = this.lot;
    const vis = this.family.members.filter(m => m.visible && m.state !== 'lost' && m.state !== 'salted');
    let b = { x: lot.x - 30, y: lot.y - lot.height - 6 };
    if (vis.length) {
      const m = vis[0];
      b = { x: vis.reduce((s, v) => s + v.x, 0) / vis.length, y: m.y - m.height - 22 };
    }
    return [{ x: lot.x, y: lot.y - lot.height - 6 }, b];
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
    this.lot.setTint(Math.floor(this.timer / 100) % 2 ? 0xfff4b0 : 0xffffff);
  }

  end() {
    this.lot.setBoost(false);
    this.lot.clearTint();
    this.attached = false;
    this.angels.forEach(a => {
      this.scene.tweens.add({ targets: a, x: a.x + 120, y: a.y - 120, alpha: 0, duration: ANGEL.swoopMs,
        onComplete: () => a.destroy() });
    });
    this.angels = [];
  }
}
