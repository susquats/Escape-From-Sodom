import Phaser from 'phaser';
import { COMET_HEAD } from '../art/items.js';
import { buildTitleArt, textTexture } from '../art/titleArt.js';
import { GAME_WIDTH, GAME_HEIGHT } from '../config.js';
import Controls from '../input/Controls.js';
import { t, getLang, setLang, LANGS } from '../i18n.js';
import { resetRun } from '../runState.js';
import { playMusic } from '../fx.js';
import { setupView, fadeIn, fadeOut, ART_SCALE } from '../view.js';

const LEVELS = [
  ['SODOM', 'SodomScene'], ['FLIGHT', 'FlightScene'], ['WILDERNESS', 'WildernessScene'],
  ['MOUNTAIN', 'MountainScene'], ['ENDING', 'EndingScene'],
];
const IS_LOCAL = ['localhost', '127.0.0.1', '[::1]'].includes(window.location.hostname);
const EMBERS = [0xffe890, 0xffa232, 0xfa7c22, 0xd8341a];

export default class TitleScene extends Phaser.Scene {
  constructor() {
    super('TitleScene');
  }

  create() {
    playMusic(this, 'mesopotamian-ruins');
    setupView(this);
    buildTitleArt(this);
    this.starting = false;

    const img = (x, y, key, depth) => this.add.image(x, y, key).setScale(ART_SCALE).setDepth(depth);
    img(0, 0, 'title-sky', 0).setOrigin(0);
    this.add.sprite(0, 5, 'title-flames').setOrigin(0).setScale(ART_SCALE).setDepth(2).play('title-flames');
    img(0, GAME_HEIGHT, 'title-city', 4).setOrigin(0, 1);

    // Embers drifting up out of the fire
    this.time.addEvent({
      delay: 70, loop: true, callback: () => {
        const x = Phaser.Math.Between(0, GAME_WIDTH), y = Phaser.Math.Between(95, 125);
        const e = this.add.rectangle(x, y, 0.5, 0.5, Phaser.Utils.Array.GetRandom(EMBERS)).setDepth(3);
        this.tweens.add({
          targets: e, x: x + Phaser.Math.Between(10, 30), y: y - Phaser.Math.Between(30, 70), alpha: 0,
          duration: Phaser.Math.Between(1400, 2600), onComplete: () => e.destroy(),
        });
      },
    });

    // Now and then a comet streaks down behind the fire
    this.time.addEvent({
      delay: 1700, loop: true, callback: () => {
        const x = Phaser.Math.Between(40, 300), drop = 110, slope = 0.7;
        const fb = this.add.sprite(x - drop * slope, -8, 'fireball').setScale(ART_SCALE).setDepth(1)
          .setOrigin(COMET_HEAD.x / 32, COMET_HEAD.y / 32).setRotation(Math.atan2(1, slope) - Math.PI / 4).play('fireball-flicker');
        this.tweens.add({ targets: fb, x, y: drop - 8, duration: 900, onComplete: () => fb.destroy() });
      },
    });

    // Logo
    img(GAME_WIDTH / 2, 17, `title-logo-top-${getLang()}`, 10);
    const logo = img(GAME_WIDTH / 2, 58, `title-logo-${getLang()}`, 10);
    this.tweens.add({ targets: logo, y: 59, duration: 1400, yoyo: true, repeat: -1, ease: 'Sine.inOut' });

    const touch = this.sys.game.device.input.touch;
    const promptId = touch ? 'title.tap' : 'title.press';
    const promptKey = textTexture(this, `${promptId}-${getLang()}`, [[t(promptId), '#ffffff']]);
    const prompt = img(GAME_WIDTH / 2, IS_LOCAL ? 140 : 152, promptKey, 10);
    this.tweens.add({ targets: prompt, alpha: 0.2, duration: 560, yoyo: true, repeat: -1, ease: 'Sine.inOut' });

    // Input: 300 ms grace period to prevent carry-over taps from credits
    this.ready = false;
    this.time.delayedCall(300, () => { this.ready = true; });

    this.controls = new Controls(this, { touchButtons: ['pause'] });
    this.enterKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ENTER);

    this.input.on('pointerdown', (p, over) => { if (this.ready && !over.length) this.startGame(); });

    this.addLanguageToggle();
    if (IS_LOCAL) this.addLevelPicker();

    fadeIn(this, 400);
  }

  // Below the prompt: English / Español. Click or tap one, or press L to switch. The scene restarts to redraw in the new language.
  addLanguageToggle() {
    const names = { en: 'English', es: 'Español' };
    const y = IS_LOCAL ? 153 : 165;
    const style = (on) => ({ fontFamily: 'monospace', fontSize: '8px', color: on ? '#ffe14a' : '#9aaee0', stroke: '#1a0610', strokeThickness: 2 });
    const items = LANGS.map(l => this.add.text(0, y, names[l], style(l === getLang())).setOrigin(0, 0.5).setDepth(10));
    const gap = 16, total = items.reduce((a, o) => a + o.width, 0) + gap * (items.length - 1);
    let x = (GAME_WIDTH - total) / 2;
    items.forEach((txt, i) => {
      txt.setX(x);
      x += txt.width + gap;
      // generous hit area so it is easy to tap
      txt.setInteractive(new Phaser.Geom.Rectangle(-8, -8, txt.width + 16, txt.height + 16), Phaser.Geom.Rectangle.Contains)
        .input.cursor = 'pointer';
      txt.on('pointerdown', (p, lx, ly, ev) => { ev.stopPropagation(); this.switchLang(LANGS[i]); });
    });
    this.input.keyboard.on('keydown-L', () => this.switchLang(LANGS[(LANGS.indexOf(getLang()) + 1) % LANGS.length]));
  }

  switchLang(l) {
    if (this.starting || l === getLang()) return;
    setLang(l);
    this.scene.restart();
  }

  // Localhost only: jump straight to a level with keys 1-5 or a click on its name.
  addLevelPicker() {
    const labels = LEVELS.map(([label], i) => textTexture(this, `title-level-${i}`, [[`${i + 1} `, '#5a6a9a'], [label, '#9aaee0']]));
    const widths = labels.map(k => this.textures.get(k).getSourceImage().width * ART_SCALE);
    const gap = 8, total = widths.reduce((a, b) => a + b, 0) + gap * (labels.length - 1);
    let x = (GAME_WIDTH - total) / 2;
    LEVELS.forEach(([, key], i) => {
      const t = this.add.image(x, 168, labels[i]).setOrigin(0, 0.5).setScale(ART_SCALE).setDepth(10).setAlpha(0.8)
        .setInteractive({ useHandCursor: true });
      x += widths[i] + gap;
      t.on('pointerover', () => t.setAlpha(1));
      t.on('pointerout', () => t.setAlpha(0.8));
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
