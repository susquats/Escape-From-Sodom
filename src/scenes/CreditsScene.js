import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT } from '../config.js';
import Controls from '../input/Controls.js';
import { run, resetRun } from '../runState.js';
import { creditLines } from '../credits.js';
import { setupView, fadeIn, fadeOut } from '../view.js';
import { t } from '../i18n.js';

const SCROLL_SPEED = 14;  // px/s
const FAST_MUL = 4;
const LINE_GAP = 12;
const ROW_WIDTH = 240;
const STROKE = { fontFamily: 'monospace', fontSize: '8px', color: '#ffffff', stroke: '#000', strokeThickness: 2 };

export default class CreditsScene extends Phaser.Scene {
  constructor() {
    super('CreditsScene');
  }

  create() {
    setupView(this);
    this.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, 0x000000).setOrigin(0);

    const lines = creditLines(run.lost);
    this.container = this.add.container(0, 190);
    lines.forEach((line, i) => {
      const y = i * LINE_GAP;
      const cx = GAME_WIDTH / 2;
      if (Array.isArray(line)) {
        // Name flush left, role flush right, dotted leader filling the gap
        const half = ROW_WIDTH / 2;
        const name = this.add.text(cx - half, y, line[0], STROKE).setOrigin(0, 0);
        const role = this.add.text(cx + half, y, line[1], STROKE).setOrigin(1, 0);
        const dot = this.add.text(0, 0, '.', STROKE);
        const gap = role.x - role.width - (name.x + name.width) - 8;
        const dots = this.add.text(name.x + name.width + 4, y, '.'.repeat(Math.max(2, Math.floor(gap / dot.width))), STROKE).setOrigin(0, 0);
        dot.destroy();
        this.container.add([name, dots, role]);
      } else {
        this.container.add(this.add.text(cx, y, line, STROKE).setOrigin(0.5, 0));
      }
    });
    this.totalLines = lines.length;

    this.scrolling = true;
    this.showingCard = false;
    this.starting = false;
    this.ready = false;

    this.controls = new Controls(this, { touchButtons: [] });
    this.enterKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ENTER);

    this.escKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ESC);

    fadeIn(this, 400);
  }

  showFinalCard() {
    this.scrolling = false;
    this.tweens.add({ targets: this.container, alpha: 0, duration: 500, onComplete: () => {
      const cx = GAME_WIDTH / 2;
      const touch = this.sys.game.device.input.touch;
      const make = (y, key, action) => {
        const txt = this.add.text(cx, y, t(key), STROKE).setOrigin(0.5);
        if (touch) {
          // Generous tap target on mobile
          txt.setPadding(24, 8).setInteractive({ useHandCursor: true });
          txt.on('pointerdown', () => { if (this.ready) action(); });
        }
        return txt;
      };
      const again = make(GAME_HEIGHT / 2 - 12, touch ? 'card.againTouch' : 'card.again', () => this.playAgain());
      make(GAME_HEIGHT / 2 + 12, touch ? 'card.menuTouch' : 'card.menu', () => this.toMenu());
      this.tweens.add({ targets: again, alpha: 0.4, duration: 520, yoyo: true, repeat: -1 });

      this.showingCard = true;
      this.time.delayedCall(500, () => { this.ready = true; });
    }});
  }

  update(time, delta) {
    if (!this.scrolling) {
      if (!this.ready || this.starting) return;
      this.controls.update();
      const justEnter = Phaser.Input.Keyboard.JustDown(this.enterKey);
      if (this.showingCard && (this.controls.jumpPressed || justEnter)) {
        this.playAgain();
      } else if (this.showingCard && Phaser.Input.Keyboard.JustDown(this.escKey)) {
        this.toMenu();
      }
      return;
    }

    this.controls.update();

    const k = this.controls.keys;
    const fast = k.SPACE.isDown || k.UP.isDown || k.W.isDown ||
      this.input.manager.pointers.some(p => p.isDown);
    const speed = fast ? SCROLL_SPEED * FAST_MUL : SCROLL_SPEED;
    this.container.y -= speed * delta / 1000;

    // Check if last line has scrolled past y = 60
    const lastLineY = this.container.y + (this.totalLines - 1) * LINE_GAP;
    if (lastLineY < 60) {
      this.showFinalCard();
    }
  }

  playAgain() {
    if (this.starting) return;
    this.starting = true;
    resetRun();
    fadeOut(this, 300, () => this.scene.start('SodomScene'));
  }

  toMenu() {
    if (this.starting) return;
    this.starting = true;
    resetRun();
    fadeOut(this, 300, () => this.scene.start('TitleScene'));
  }
}
