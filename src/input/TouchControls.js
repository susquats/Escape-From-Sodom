import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT } from '../config.js';

export default class TouchControls {
  constructor(scene, names = ['left', 'right', 'jump', 'restart']) {
    this.scene = scene;
    this.left = false;
    this.right = false;
    this.jump = false;
    this.restart = false;

    const defs = {
      left: () => this.makeButton(8, GAME_HEIGHT - 8 - 40, 40, 40, '<'),
      right: () => this.makeButton(56, GAME_HEIGHT - 8 - 40, 40, 40, '>'),
      jump: () => this.makeButton(GAME_WIDTH - 8 - 48, GAME_HEIGHT - 8 - 48, 48, 48, 'JUMP'),
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
          if (b.rect.contains(p.x, p.y)) state[name] = true;
        }
      }
      for (const [name, b] of Object.entries(this.buttons)) b.img.setAlpha(state[name] ? 0.6 : 0.35);
    }
    Object.assign(this, state);
  }
}
