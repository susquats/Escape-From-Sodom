import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT, DEBUG, FLIGHT } from '../config.js';
import Carrier from '../objects/Carrier.js';
import { COMET_HEAD } from '../art/items.js';
import Controls from '../input/Controls.js';
import { popText, puff, loseLife } from '../fx.js';
import { setupView, fadeIn, fadeOut, shake, flash, ART_SCALE } from '../view.js';

// Seconds after the first flap; obstacles spawn at x = GAME_WIDTH + 20.
const SCRIPT = [
  { at: 1.0, type: 'tower', top: 110 },
  { at: 3.0, type: 'hang', bottom: 75 },
  { at: 5.0, type: 'gate', gapY: 95 },
  { at: 6.8, type: 'fireball', y: 55 },
  { at: 7.8, type: 'fireball', y: 125 },
  { at: 9.5, type: 'gate', gapY: 70 },
  { at: 11.5, type: 'tower', top: 90 },
  { at: 13.3, type: 'gate', gapY: 110 },
];
const LANDING_AT = 17;
const GROUND_Y = 150;
const STROKE = { fontFamily: 'monospace', fontSize: '8px', color: '#fff', stroke: '#000', strokeThickness: 2 };

export default class FlightScene extends Phaser.Scene {
  constructor() {
    super('FlightScene');
  }

  create() {
    setupView(this);
    this.physics.world.gravity.y = FLIGHT.gravity;
    this.started = false;
    this.elapsed = 0;
    this.scriptIndex = 0;
    this.dead = false;
    this.graceUntil = 0;
    this.landing = false;
    this.tapQueued = false;
    this.scrollMul = 1;
    this.invincible = false;

    this.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, 0x3a1010).setOrigin(0).setDepth(-3);
    this.layers = [[0.3, 0x5a1a14, 40, 110], [0.6, 0x7a2418, 30, 80]].map(([factor, color, minH, maxH], i) => {
      const items = [];
      for (let x = 0; x < GAME_WIDTH + 96; x += 48) {
        const h = minH + ((x * 37 + i * 91) % (maxH - minH));
        items.push(this.add.rectangle(x, GAME_HEIGHT - 20, 36, h, color).setOrigin(0, 1).setDepth(-2 + i * 0.5));
        if ((x / 48 + i) % 2 === 0) {
          items.push(this.add.image(x + 18, GAME_HEIGHT - 20 - h, 'flame').setScale(ART_SCALE).setOrigin(0.5, 1).setDepth(-1.9 + i * 0.5));
        }
      }
      return { factor, items, span: Math.ceil((GAME_WIDTH + 96) / 48) * 48 };
    });

    this.carrier = new Carrier(this, FLIGHT.carrierX, 80);
    this.obstacles = this.physics.add.group({ allowGravity: false, immovable: true });
    this.physics.add.overlap(this.carrier.zone, this.obstacles, () => this.crash());
    this.controls = new Controls(this, { touchButtons: ['restart'] });
    this.input.on('pointerdown', () => { this.tapQueued = true; });

    this.title = this.add.text(GAME_WIDTH / 2, 50, 'ACT II\nTHE ANGELS', { ...STROKE, fontSize: '12px' })
      .setOrigin(0.5).setAlign('center').setDepth(900);
    this.tweens.add({ targets: this.title, alpha: 0, delay: 1500, duration: 500 });
    this.hint = this.add.text(GAME_WIDTH / 2, 120, 'TAP or SPACE to flap', STROKE).setOrigin(0.5).setDepth(900);

    fadeIn(this, 400);

    if (DEBUG) {
      this.debugText = this.add.text(4, 20, '', { fontFamily: 'monospace', fontSize: '8px', color: '#0f0' }).setDepth(900);
      this.keyI = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.I);
    }
  }

  addBody(obj) {
    this.physics.add.existing(obj);
    this.obstacles.add(obj);
    obj.body.setAllowGravity(false);
    obj.body.setImmovable(true);
    obj.body.setVelocityX(-FLIGHT.scrollSpeed);
    return obj;
  }

  tower(top) {
    const w = FLIGHT.obstacleWidth, x = GAME_WIDTH + 20;
    const r = this.add.rectangle(x, top, w, GAME_HEIGHT - top, 0xb8894a).setOrigin(0.5, 0).setDepth(5);
    this.addBody(r);
    const edge = this.add.rectangle(x, top, w, 2, 0x6a4a22).setOrigin(0.5, 0).setDepth(6);
    this.addBody(edge);
    for (let i = -1; i <= 1; i++) {
      const f = this.add.image(x + i * 8, top, 'flame').setScale(ART_SCALE).setOrigin(0.5, 1).setDepth(6);
      this.addBody(f);
    }
  }

  hang(bottom) {
    const w = FLIGHT.obstacleWidth, x = GAME_WIDTH + 20;
    this.addBody(this.add.rectangle(x, 0, w, bottom, 0x8a8078).setOrigin(0.5, 0).setDepth(5));
    this.addBody(this.add.rectangle(x, bottom - 4, w, 4, 0x554d46).setOrigin(0.5, 0).setDepth(6));
  }

  gate(gapY) {
    this.hang(gapY - FLIGHT.gapSize / 2);
    this.tower(gapY + FLIGHT.gapSize / 2);
  }

  fireball(y) {
    // comet flying left: pivot on its head, tail streaming behind (the sprite points down-right)
    const f = this.add.sprite(GAME_WIDTH + 20, y, 'fireball').setScale(ART_SCALE).setDepth(6)
      .setOrigin(COMET_HEAD.x / 32, COMET_HEAD.y / 32).setRotation(Math.PI * 0.75).play('fireball-flicker');
    this.addBody(f);
    f.body.setCircle(COMET_HEAD.r, COMET_HEAD.x - COMET_HEAD.r, COMET_HEAD.y - COMET_HEAD.r);
    f.body.setVelocityX(-(FLIGHT.scrollSpeed + 60));
  }

  spawn(e) { this[e.type](e.top ?? e.bottom ?? e.gapY ?? e.y); }

  crash() {
    if (this.dead || this.invincible || this.landing || this.graceUntil > this.time.now) return;
    shake(this, 200, 0.01);
    flash(this, 100, 255, 80, 40);
    const { gameOver, name } = loseLife(this);
    if (!gameOver) {
      // a family member is lost in Lot's place; the flight goes on
      this.carrier.sacrifice(name);
      this.graceUntil = this.time.now + 1500;
      this.tweens.add({ targets: this.carrier.view, alpha: 0.3, duration: 80, yoyo: true, repeat: 8,
        onComplete: () => this.carrier.view.setAlpha(1) });
      return;
    }
    this.dead = true;
    this.physics.pause();
    this.carrier.crash();
    this.time.delayedCall(900, () => this.scene.start('TitleScene'));
  }

  scrollBackground(delta) {
    this.layers.forEach(l => {
      const dx = FLIGHT.scrollSpeed * l.factor * this.scrollMul * delta / 1000;
      l.items.forEach(it => {
        it.x -= dx;
        if (it.x < -48) it.x += l.span;
      });
    });
  }

  update(time, delta) {
    this.controls.update();
    const flap = this.controls.jumpPressed || this.tapQueued;
    this.tapQueued = false;

    if (this.controls.restartPressed) {
      if (!this.dead) this.scene.restart();
      return;
    }

    if (this.debugText) {
      if (Phaser.Input.Keyboard.JustDown(this.keyI)) this.invincible = !this.invincible;
      this.debugText.setText(`t ${this.elapsed.toFixed(1)} vy ${this.carrier.body.velocity.y.toFixed(0)} invincible ${this.invincible}`);
    }

    if (this.dead) { this.carrier.update(time); return; }
    if (this.landing) { this.scrollBackground(delta); this.carrier.update(time); return; }

    if (!this.started) {
      this.carrier.zone.y = 80 + Math.sin(time / 300) * 3;
      if (flap) {
        this.started = true;
        this.carrier.start();
        this.carrier.flap();
        this.hint.destroy();
      }
    } else {
      this.elapsed += delta / 1000;
      while (this.scriptIndex < SCRIPT.length && SCRIPT[this.scriptIndex].at <= this.elapsed) {
        this.spawn(SCRIPT[this.scriptIndex++]);
      }
      if (flap) this.carrier.flap();
      if (this.carrier.body.bottom > GAME_HEIGHT) this.crash();
      if (!this.dead && this.elapsed >= LANDING_AT) this.startLanding();
    }

    this.obstacles.getChildren().slice().forEach(o => { if (o.x < -40) o.destroy(); });
    this.carrier.update(time);
    this.scrollBackground(delta);
  }

  startLanding() {
    this.landing = true;
    const c = this.carrier;
    c.body.enable = false;
    c.freeze = true;
    const ground = this.add.rectangle(GAME_WIDTH, GROUND_Y, GAME_WIDTH, GAME_HEIGHT - GROUND_Y, 0xd9b774)
      .setOrigin(0).setDepth(8);
    this.tweens.add({ targets: ground, x: 0, duration: 1200 });
    this.tweens.addCounter({ from: 1, to: 0, duration: 1200, onUpdate: t => { this.scrollMul = t.getValue(); } });
    this.tweens.add({ targets: c.view, x: 160, y: 100, rotation: 0, duration: 1400, onComplete: () => this.release() });
  }

  release() {
    const c = this.carrier, v = c.view;
    this.tweens.add({ targets: c.angels, y: '-=80', x: '+=60', alpha: 0, duration: 800 });
    const people = c.people();
    people.forEach((p, i) => {
      p.setOrigin(0.5, 0.5);
      p.rotation = 0;
      const targetY = GROUND_Y - v.y - p.displayHeight / 2;
      this.tweens.add({ targets: p, x: (i - (people.length - 1) / 2) * 14, y: targetY, angle: 90, duration: 350, ease: 'Quad.in',
        onComplete: () => {
          if (i !== 0) return;
          shake(this, 150, 0.008);
          popText(this, 160, 140, 'THUD!');
          people.forEach(q => puff(this, v.x + q.x, GROUND_Y - 2, 0xd9b774));
        } });
    });
    c.danglers.length = 0;
    this.time.delayedCall(1350, () => {
      people.forEach(p => { p.anims.stop(); p.setFrame(0); }); // back on their feet
      this.tweens.add({ targets: people, angle: 0, duration: 150 });
    });
    this.time.delayedCall(2150, () => {
      const cam = this.cameras.main;
      fadeOut(this, 500, () => this.scene.start('WildernessScene'));
    });
  }
}
