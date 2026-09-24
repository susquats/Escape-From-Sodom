import Phaser from 'phaser';
import { run } from '../runState.js';
import { setupView, fadeIn, fadeOut } from '../view.js';
import { loadEndingArt, buildEndingArt, LAYOUT, ZS, WINK_EYE } from '../art/endingArt.js';

// The last cutscene: a fixed painting of the cave with the family laid over it. Lot sleeps with Zs rising,
// the XXX jug sits in front, and the surviving daughters wink at the camera. Then fade out to the credits.
export default class EndingScene extends Phaser.Scene {
  constructor() {
    super('EndingScene');
  }

  preload() {
    loadEndingArt(this);
  }

  create() {
    setupView(this);
    buildEndingArt(this);
    const girls = ['daughter1', 'daughter2'].filter(d => !run.lost.has(d));
    const put = (key, depth) => this.add.image(...LAYOUT[key], `end-${key}`).setOrigin(0).setDepth(depth);

    this.add.image(0, 0, 'end-cave').setOrigin(0).setDepth(0);
    put('lot', 2);
    put('jug-small', 3);
    const sprites = girls.map(d => ({ d, s: put(d, 4) }));
    put('jug', 6);

    // firelight breathing over the family
    const glow = this.add.image(214, 112, 'end-glow').setBlendMode(Phaser.BlendModes.ADD).setDepth(9).setAlpha(0.28);
    this.tweens.add({ targets: glow, alpha: 0.16, duration: 700, yoyo: true, repeat: -1, ease: 'Sine.inOut' });

    // ZZZ rising one after another from Lot's head, drifting up and to the right
    const zs = () => ZS.forEach(([x, y], i) => {
      const z = this.add.image(x, y + 4, `end-z${i}`).setOrigin(0).setDepth(8).setAlpha(0);
      this.tweens.add({ targets: z, alpha: 1, x: x + 1, y, duration: 500, delay: i * 450, ease: 'Sine.out',
        onComplete: () => this.tweens.add({ targets: z, alpha: 0, x: x + 4, y: y - 5, duration: 600, delay: 900 - i * 300,
          onComplete: () => z.destroy() }) });
    });
    zs();
    this.time.addEvent({ delay: 2800, loop: true, callback: zs });

    // winks at the camera, with a sparkle
    const wink = () => sprites.forEach(({ s, d }, i) => this.time.delayedCall(i * 250, () => {
      s.setTexture(`end-${d}-wink`);
      const [ex, ey] = WINK_EYE[d];
      const sp = this.add.image(ex + 5, ey - 4, 'end-sparkle').setDepth(8).setScale(0.3);
      this.tweens.add({ targets: sp, scale: 1, duration: 200, ease: 'Back.out', yoyo: true, hold: 200, onComplete: () => sp.destroy() });
      this.time.delayedCall(650, () => s.setTexture(`end-${d}`));
    }));
    let t = 6500;
    if (girls.length) {
      for (const ms of [2200, 5000]) this.time.delayedCall(ms, wink);
      t = 7600;
    }

    fadeIn(this, 1200);
    this.time.delayedCall(t, () => fadeOut(this, 1500, () => this.scene.start('CreditsScene')));
  }
}
