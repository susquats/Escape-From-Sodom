import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT, ZOOM } from '../config.js';
import { t } from '../i18n.js';

export default class TouchControls {
  constructor(scene, names = ['left', 'right', 'jump', 'restart']) {
    this.scene = scene;
    this.left = false;
    this.right = false;
    this.jump = false;
    this.restart = false;

    // No jump button: split the thumbs, right button goes to the bottom-right corner
    const rightX = names.includes('right') && !names.includes('jump') ? GAME_WIDTH - 8 - 40 : 56;
    const defs = {
      left: () => this.makeButton(8, GAME_HEIGHT - 8 - 40, 40, 40, '<'),
      right: () => this.makeButton(rightX, GAME_HEIGHT - 8 - 40, 40, 40, '>'),
      jump: () => this.makeButton(GAME_WIDTH - 8 - 48, GAME_HEIGHT - 8 - 48, 48, 48, t('btn.jump')),
      restart: () => this.makeButton(GAME_WIDTH - 24, 6, 18, 18, 'R'),
    };
    this.buttons = {};
    for (const n of names) if (defs[n]) this.buttons[n] = defs[n]();

    this.visible = false;
    if (scene.sys.game.device.input.touch) this.setVisible(true);
    else {
      scene.input.on('pointerdown', (p) => {
        if (p.wasTouch && !this.visible) this.setVisible(true);
      });
    }
  }

  makeButton(x, y, w, h, label) {
    const img = this.scene.add.image(x, y, 'btn').setOrigin(0).setDisplaySize(w, h)
      .setScrollFactor(0).setDepth(1000).setAlpha(0.35).setVisible(false);
    const text = this.scene.add.text(x + w / 2, y + h / 2, label, {
      fontFamily: 'monospace', fontSize: '10px', color: '#000',
    }).setOrigin(0.5).setScrollFactor(0).setDepth(1001).setAlpha(0.7).setVisible(false);
    return { rect: new Phaser.Geom.Rectangle(x, y, w, h), img, text };
  }

  setVisible(v) {
    this.visible = v;
    for (const b of Object.values(this.buttons)) {
      b.img.setVisible(v);
      b.text.setVisible(v);
    }
  }

  update() {
    const state = { left: false, right: false, jump: false, restart: false };
    if (this.visible) {
      for (const p of this.scene.input.manager.pointers) {
        if (!p.isDown) continue;
        for (const [name, b] of Object.entries(this.buttons)) {
          if (b.rect.contains(p.x / ZOOM, p.y / ZOOM)) state[name] = true; // pointer is in canvas pixels
        }
      }
      for (const [name, b] of Object.entries(this.buttons)) b.img.setAlpha(state[name] ? 0.6 : 0.35);
    }
    Object.assign(this, state);
  }
}
