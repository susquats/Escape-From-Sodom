import { run } from '../runState.js';
import { ART_SCALE } from '../view.js';

// Lives left, top-left, for scenes without a Family (flight, mountain): reads run.lost.
export default class RunHud {
  constructor(scene) {
    this.icons = ['wife', 'daughter1', 'daughter2'].map((key, i) => {
      const icon = scene.add.image(6 + i * 12, 6, key).setOrigin(0).setScale(0.5 * ART_SCALE)
        .setScrollFactor(0).setDepth(960);
      const x = scene.add.image(6 + i * 12 + 2, 6 + 2, 'x').setOrigin(0).setScrollFactor(0).setDepth(961);
      return { key, icon, x };
    });
    this.update();
  }

  update() {
    this.icons.forEach(({ key, icon, x }) => {
      const lost = run.lost.has(key);
      icon.setAlpha(lost ? 0.3 : 1);
      x.setVisible(lost);
    });
  }
}
