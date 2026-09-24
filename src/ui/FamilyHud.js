import { ART_SCALE } from '../view.js';
export default class FamilyHud {
  constructor(scene, family) {
    this.scene = scene;
    this.family = family;
    this.icons = family.members.map((m, i) => {
      const icon = scene.add.image(6 + i * 12, 6, m.memberName).setOrigin(0).setScale(0.5 * ART_SCALE)
        .setScrollFactor(0).setDepth(960);
      const x = scene.add.image(6 + i * 12 + 2, 6 + 2, 'x').setOrigin(0).setScrollFactor(0)
        .setDepth(961).setVisible(false);
      return { icon, x };
    });
  }

  update() {
    const blink = Math.floor(this.scene.time.now / 200) % 2 ? 0.4 : 1;
    this.family.members.forEach((m, i) => {
      const { icon, x } = this.icons[i];
      const salted = m.state === 'salted', lost = m.state === 'lost';
      icon.setTexture(salted ? 'salt' : m.memberName);
      icon.setAlpha(lost ? 0.3 : salted ? blink : 1);
      x.setVisible(lost);
    });
  }
}
