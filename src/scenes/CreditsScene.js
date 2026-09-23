import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT } from '../config.js';
import Controls from '../input/Controls.js';
import { run, resetRun } from '../runState.js';
import { creditLines, RATINGS } from '../credits.js';

const SCROLL_SPEED = 14;  // px/s
const FAST_MUL = 4;
const LINE_GAP = 12;
const STROKE = { fontFamily: 'monospace', fontSize: '8px', color: '#ffffff', stroke: '#000', strokeThickness: 2 };

export default class CreditsScene extends Phaser.Scene {
  constructor() {
    super('CreditsScene');
  }

  create() {
    this.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, 0x000000).setOrigin(0);

    const lines = creditLines(run.lost);
    this.container = this.add.container(0, 190);
    lines.forEach((line, i) => {
      this.container.add(
        this.add.text(GAME_WIDTH / 2, i * LINE_GAP, line, STROKE).setOrigin(0.5, 0),
      );
    });
    this.totalLines = lines.length;

    this.scrolling = true;
    this.showingCard = false;
    this.starting = false;
    this.ready = false;

    this.controls = new Controls(this, { touchButtons: [] });
    this.enterKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ENTER);

    // Tap / click to play again on the final card
    this.input.on('pointerdown', () => {
      if (this.showingCard && this.ready) this.playAgain();
    });

    this.cameras.main.fadeIn(400);
  }

  showFinalCard() {
    this.scrolling = false;
    this.tweens.add({ targets: this.container, alpha: 0, duration: 500, onComplete: () => {
      const n = 3 - run.lost.size;
      const cx = GAME_WIDTH / 2;
      const baseY = 50;

      this.add.text(cx, baseY, `FAMILY SAVED: ${n}/3`, STROKE).setOrigin(0.5);
      this.add.text(cx, baseY + 14, RATINGS[n] || RATINGS[0], {
        fontFamily: 'monospace', fontSize: '8px', color: '#ffe14a',
        stroke: '#000', strokeThickness: 2,
      }).setOrigin(0.5);
      this.add.text(cx, baseY + 32, 'THANKS FOR PLAYING', STROKE).setOrigin(0.5);

      const touch = this.sys.game.device.input.touch;
      const prompt = this.add.text(cx, baseY + 52, touch ? 'TAP TO PLAY AGAIN' : 'SPACE TO PLAY AGAIN', STROKE).setOrigin(0.5);
      this.tweens.add({ targets: prompt, alpha: 0.15, duration: 520, yoyo: true, repeat: -1 });

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
    this.cameras.main.fadeOut(300);
    this.cameras.main.once('camerafadeoutcomplete', () => this.scene.start('TitleScene'));
  }
}
