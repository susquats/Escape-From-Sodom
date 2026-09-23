import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT } from '../config.js';
import Controls from '../input/Controls.js';
import { resetRun } from '../runState.js';
import { puff } from '../fx.js';

const GROUND_Y = 150;
const STROKE = { fontFamily: 'monospace', stroke: '#000', strokeThickness: 2 };

export default class TitleScene extends Phaser.Scene {
  constructor() {
    super('TitleScene');
  }

  create() {
    this.starting = false;

    // Sky
    this.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, 0x2b1b3a).setOrigin(0);

    // Burning city silhouettes
    const buildings = [
      [0, 80, 34, 80], [36, 100, 22, 60], [60, 68, 42, 82], [104, 88, 28, 62],
      [134, 72, 38, 78], [174, 92, 30, 58], [206, 77, 44, 73], [252, 68, 36, 82], [290, 90, 32, 60],
    ];
    for (const [x, y, w, h] of buildings) {
      this.add.rectangle(x, y, w, h, 0x1a0808).setOrigin(0, 1).setDepth(-1);
    }

    // Flames on rooftops
    const flameXs = [18, 72, 122, 188, 228, 272];
    for (let i = 0; i < flameXs.length; i++) {
      const f = this.add.image(flameXs[i], GROUND_Y - 2, 'flame').setDepth(0);
      this.tweens.add({ targets: f, scaleY: 0.55 + (i % 3) * 0.15, duration: 120 + i * 35, yoyo: true, repeat: -1 });
    }

    // Ground strip
    this.add.rectangle(0, GROUND_Y, GAME_WIDTH, GAME_HEIGHT - GROUND_Y, 0x4a3a2e).setOrigin(0).setDepth(1);

    // Lot and family (side textures, static, idle bob)
    const chars = [
      ['lot', 150], ['wife', 132], ['daughter1', 118], ['daughter2', 106],
    ];
    chars.forEach(([key, x], i) => {
      const s = this.add.image(x, GROUND_Y, key).setOrigin(0.5, 1).setDepth(2);
      const baseY = GROUND_Y;
      this.tweens.add({
        targets: s, y: baseY - 1, duration: 700 + i * 160,
        yoyo: true, repeat: -1, ease: 'Sine.inOut',
      });
    });

    // Periodic fireballs falling from above
    this.time.addEvent({
      delay: 1200, loop: true, callback: () => {
        const x = Phaser.Math.Between(16, 304);
        const fb = this.add.image(x, -8, 'fireball').setDepth(3);
        this.tweens.add({
          targets: fb, y: GROUND_Y - 4, duration: 700,
          onComplete: () => { puff(this, fb.x, GROUND_Y - 4, 0xff8a1e, 4); fb.destroy(); },
        });
      },
    });

    // Title text
    this.add.text(GAME_WIDTH / 2, 36, 'SODOM', { ...STROKE, fontSize: '24px', color: '#ffe14a' }).setOrigin(0.5).setDepth(10);
    this.add.text(GAME_WIDTH / 2, 64, 'AN ESCAPE FROM GENESIS 19', { ...STROKE, fontSize: '8px', color: '#d9b774' }).setOrigin(0.5).setDepth(10);

    const touch = this.sys.game.device.input.touch;
    const prompt = this.add.text(GAME_WIDTH / 2, 118, touch ? 'TAP TO START' : 'PRESS SPACE',
      { ...STROKE, fontSize: '8px', color: '#fff' }).setOrigin(0.5).setDepth(10);
    this.tweens.add({ targets: prompt, alpha: 0.15, duration: 520, yoyo: true, repeat: -1 });

    // Input: 300 ms grace period to prevent carry-over taps from credits
    this.ready = false;
    this.time.delayedCall(300, () => { this.ready = true; });

    this.controls = new Controls(this, { touchButtons: [] });
    this.enterKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ENTER);

    this.input.on('pointerdown', () => { if (this.ready) this.startGame(); });

    this.cameras.main.fadeIn(400);
  }

  startGame() {
    if (this.starting) return;
    this.starting = true;
    resetRun();
    this.cameras.main.fadeOut(300);
    this.cameras.main.once('camerafadeoutcomplete', () => this.scene.start('SodomScene'));
  }

  update() {
    if (!this.ready || this.starting) return;
    this.controls.update();
    if (this.controls.jumpPressed || Phaser.Input.Keyboard.JustDown(this.enterKey)) {
      this.startGame();
    }
  }
}
