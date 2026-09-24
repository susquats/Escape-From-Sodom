import { popText, puff } from '../fx.js';

// A post with a cloth flag. Lot lights it up by walking past (checked by x in the scene, no physics).
export default class Checkpoint {
  constructor(scene, x, feetY) {
    this.x = x;
    this.active = false;
    this.post = scene.add.rectangle(x, feetY, 2, 20, 0x4a3a2a).setOrigin(0.5, 1).setDepth(0.1);
    this.flag = scene.add.rectangle(x + 1, feetY - 20, 8, 6, 0x777777).setOrigin(0, 0).setDepth(0.1);
    this.feetY = feetY;
  }

  activate(scene, silent = false) {
    if (this.active) return;
    this.active = true;
    this.flag.setFillStyle(0xffe14a);
    if (silent) return;
    scene.tweens.add({ targets: this.flag, scaleX: 0.7, duration: 250, yoyo: true, repeat: 3 });
    popText(scene, this.x, this.feetY - 26, 'CHECKPOINT', '#ffe14a');
    puff(scene, this.x, this.feetY - 20, 0xffe14a);
  }
}
