import Phaser from 'phaser';
import { run } from '../runState.js';
import { letterbox, playMusic, sfx, getVolume } from '../fx.js';
import { setupView, fadeIn, fadeOut } from '../view.js';
import { loadEndingArt, buildEndingArt } from '../art/endingArt.js';

// The last cutscene: a fixed painting of the cave, Lot asleep and the XXX jug. The surviving daughters are laid
// over it and wink at the camera while Zs rise from Lot. Then fade out to the credits.
export default class EndingScene extends Phaser.Scene {
  constructor() {
    super('EndingScene');
  }

  preload() {
    loadEndingArt(this);
  }

  create() {
    playMusic(this, 'ending-comet', 0.5, 'mesopotamian-ruins');
    const snore = this.sound.add('snoring', { loop: true, volume: 0.6 * getVolume('sfx') });
    snore.play();
    this.events.once('shutdown', () => { snore.stop(); snore.destroy(); });
    setupView(this);
    buildEndingArt(this);
    const layout = this.cache.json.get('end-layout');
    const girls = ['daughter1', 'daughter2'].filter(d => !run.lost.has(d));

    this.add.image(0, 0, 'end-cave').setOrigin(0).setDepth(0);
    const sprites = girls.map(d => ({ d, s: this.add.image(layout.daughters[d].x, layout.daughters[d].y, `end-${d}`).setOrigin(0).setDepth(4) }));

    // firelight breathing over the family
    const glow = this.add.image(190, 112, 'end-glow').setBlendMode(Phaser.BlendModes.ADD).setDepth(9).setAlpha(0.28);
    this.tweens.add({ targets: glow, alpha: 0.16, duration: 700, yoyo: true, repeat: -1, ease: 'Sine.inOut' });

    // ZZZ rising one after another from Lot's head, drifting up and to the right
    const zs = () => layout.zs.forEach(([x, y], i) => {
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
      sfx(this, 'pickupCoin', 0.5);
      const [ex, ey] = layout.daughters[d].eye;
      const sp = this.add.image(ex + 5, ey - 4, 'end-sparkle').setDepth(8).setScale(0.3);
      this.tweens.add({ targets: sp, scale: 1, duration: 200, ease: 'Back.out', yoyo: true, hold: 200, onComplete: () => sp.destroy() });
      this.time.delayedCall(650, () => s.setTexture(`end-${d}`));
    }));
    this.time.delayedCall(2200, wink);

    letterbox(this);
    fadeIn(this, 1200);
    this.time.delayedCall(4000, () => fadeOut(this, 1200, () => this.scene.start('CreditsScene')));
  }
}
