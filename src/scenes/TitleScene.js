import Phaser from 'phaser';
import { COMET_HEAD } from '../art/items.js';
import { GAME_WIDTH, GAME_HEIGHT } from '../config.js';
import Controls from '../input/Controls.js';
import { resetRun } from '../runState.js';
import { puff } from '../fx.js';
import { setupView, fadeIn, fadeOut, ART_SCALE } from '../view.js';

const GROUND_Y = 150;
const STROKE = { fontFamily: 'monospace', stroke: '#000', strokeThickness: 2 };

export default class TitleScene extends Phaser.Scene {
  constructor() {
    super('TitleScene');
  }

  create() {
    setupView(this);
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
      const f = this.add.image(flameXs[i], GROUND_Y - 2, 'flame').setScale(ART_SCALE).setDepth(0);
      this.tweens.add({ targets: f, scaleY: (0.55 + (i % 3) * 0.15) * ART_SCALE, duration: 120 + i * 35, yoyo: true, repeat: -1 });
    }

    // Ground strip
    this.add.rectangle(0, GROUND_Y, GAME_WIDTH, GAME_HEIGHT - GROUND_Y, 0x4a3a2e).setOrigin(0).setDepth(1);

    // Lot and family (side textures, static, idle bob)
    const chars = [
      ['lot', 150], ['wife', 132], ['daughter1', 118], ['daughter2', 106],
    ];
    chars.forEach(([key, x], i) => {
      const s = this.add.image(x, GROUND_Y, key).setScale(ART_SCALE).setOrigin(0.5, 1).setDepth(2);
      const baseY = GROUND_Y;
      this.tweens.add({
        targets: s, y: baseY - 1, duration: 700 + i * 160,
        yoyo: true, repeat: -1, ease: 'Sine.inOut',
      });
    });

    // Periodic comets raining in from the top left
    this.time.addEvent({
      delay: 1200, loop: true, callback: () => {
        const x = Phaser.Math.Between(16, 304), drop = GROUND_Y + 12, slope = 0.7;
        const fb = this.add.sprite(x - drop * slope, -8, 'fireball').setScale(ART_SCALE).setDepth(3)
          .setOrigin(COMET_HEAD.x / 32, COMET_HEAD.y / 32).setRotation(Math.atan2(1, slope) - Math.PI / 4).play('fireball-flicker');
        this.tweens.add({
          targets: fb, x, y: GROUND_Y - 4, duration: 800,
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

    this.input.on('pointerdown', (p, over) => { if (this.ready && !over.length) this.startGame(); });

    if (import.meta.env.DEV) this.addLevelPicker();

    fadeIn(this, 400);
  }

  // Dev-only (vite dev server): jump straight to a level with keys 1-5 or a tap on its label.
  addLevelPicker() {
    const levels = [
      ['SODOM', 'SodomScene'], ['FLIGHT', 'FlightScene'], ['WILDERNESS', 'WildernessScene'],
      ['MOUNTAIN', 'MountainScene'], ['ENDING', 'EndingScene'],
    ];
    this.add.text(GAME_WIDTH / 2, 132, 'DEV: PICK LEVEL', { ...STROKE, fontSize: '6px', color: '#7fd4ff' }).setOrigin(0.5).setDepth(10);
    const step = GAME_WIDTH / levels.length;
    levels.forEach(([label, key], i) => {
      const t = this.add.text(step * (i + 0.5), 142, `${i + 1} ${label}`, { ...STROKE, fontSize: '6px', color: '#fff', backgroundColor: '#00000088', padding: { x: 2, y: 2 } })
        .setOrigin(0.5).setDepth(10).setInteractive({ useHandCursor: true });
      t.on('pointerdown', (p, lx, ly, ev) => { ev.stopPropagation(); this.startGame(key); });
      this.input.keyboard.on(`keydown-${i + 1}`, () => this.startGame(key));
    });
  }

  startGame(scene = 'SodomScene') {
    if (this.starting) return;
    this.starting = true;
    resetRun();
    fadeOut(this, 300, () => this.scene.start(scene));
  }

  update() {
    if (!this.ready || this.starting) return;
    this.controls.update();
    if (this.controls.jumpPressed || Phaser.Input.Keyboard.JustDown(this.enterKey)) {
      this.startGame();
    }
  }
}
