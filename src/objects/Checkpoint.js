import { popText, puff } from '../fx.js';
import { ART_SCALE } from '../view.js';
import { t } from '../i18n.js';

// A pole with a cloth banner (src/art/props.js). Lot lights it up by walking past (checked by x in the scene,
// no physics): the banner turns gold and a flame catches on top.
export default class Checkpoint {
  constructor(scene, x, feetY) {
    this.x = x;
    this.active = false;
    this.sprite = scene.add.image(x - 2, feetY, 'checkpoint', 0).setScale(ART_SCALE).setOrigin(0.25, 1).setDepth(0.1);
    this.feetY = feetY;
  }

  activate(scene, silent = false) {
    if (this.active) return;
    this.active = true;
    this.sprite.setFrame(1);
    if (silent) return;
    scene.tweens.add({ targets: this.sprite, scaleX: 0.7 * ART_SCALE, duration: 250, yoyo: true, repeat: 3 });
    popText(scene, this.x, this.feetY - 26, t('pop.checkpoint'), '#ffe14a');
    puff(scene, this.x, this.feetY - 20, 0xffe14a);
  }
}
