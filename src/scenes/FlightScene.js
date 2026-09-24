import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT, DEBUG, FLIGHT } from '../config.js';
import Carrier from '../objects/Carrier.js';
import { COMET_HEAD } from '../art/items.js';
import RunHud from '../ui/RunHud.js';
import Controls from '../input/Controls.js';
import { popText, puff, loseLife, speech } from '../fx.js';
import { run } from '../runState.js';
import { setupView, fadeIn, fadeOut, shake, flash, ART_SCALE } from '../view.js';
import { buildingTexture } from '../art/flightBuildings.js';
import { buildSodomBackdrop } from '../art/sodomBackdrop.js';
import { t } from '../i18n.js';

// Seconds after the first flap; obstacles spawn at x = GAME_WIDTH + 20.
// Pipes reach the carrier ~2.9 s after spawning and fireballs ~1.7 s, so fireballs are timed to arrive at
// least a second away from any pipe -- except the one marked "on purpose".
const SCRIPT = [
  { at: 1.0, type: 'tower', top: 110 },
  { at: 3.0, type: 'hang', bottom: 75 },
  { at: 5.0, type: 'gate', gapY: 95 },
  { at: 7.88, type: 'fireball', y: 55 },
  { at: 8.98, type: 'fireball', y: 125 },
  { at: 9.5, type: 'gate', gapY: 70 },
  { at: 11.5, type: 'tower', top: 90 },
  { at: 11.72, type: 'fireball', y: 90 },
  { at: 13.3, type: 'gate', gapY: 110 },
  { at: 15.88, type: 'fireball', y: 60 },
  { at: 16.0, type: 'hang', bottom: 85 },
  { at: 18.0, type: 'gate', gapY: 60 },
  { at: 20.58, type: 'fireball', y: 40 },
  { at: 21.68, type: 'fireball', y: 110 },
  { at: 22.3, type: 'tower', top: 100 },
  { at: 24.2, type: 'gate', gapY: 100 },
  { at: 25.42, type: 'fireball', y: 125 }, // on purpose: crosses the gate above, so stay high in the gap
  { at: 26.0, type: 'gate', gapY: 75 },
  { at: 28.0, type: 'hang', bottom: 65 },
  { at: 29.5, type: 'gate', gapY: 105 },
];
// Building blocks, left to right: w = width (world units), s = style (0 brick, 1 colonnade, 2 tower),
// d = how much shorter than the main building (the one without d).
const CLUSTERS = [
  [{ w: 28, s: 0 }, { w: 22, s: 1, d: 14 }],
  [{ w: 18, s: 2, d: 18 }, { w: 30, s: 1 }, { w: 20, s: 0, d: 8 }],
  [{ w: 22, s: 1, d: 12 }, { w: 28, s: 0 }],
  [{ w: 24, s: 2 }, { w: 18, s: 0, d: 16 }, { w: 22, s: 1, d: 28 }],
];
const LANDING_AT = 33;
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

    this.buildBackground();

    this.carrier = new Carrier(this, FLIGHT.carrierX, 80);
    this.obstacles = this.physics.add.group({ allowGravity: false, immovable: true });
    this.physics.add.overlap(this.carrier.zone, this.obstacles, () => this.crash());
    this.hud = new RunHud(this);
    this.controls = new Controls(this, { touchButtons: ['restart'] });
    this.input.on('pointerdown', () => { this.tapQueued = true; });

    this.title = this.add.text(GAME_WIDTH / 2, 50, t('act2'), { ...STROKE, fontSize: '12px' })
      .setOrigin(0.5).setAlign('center').setDepth(900);
    this.tweens.add({ targets: this.title, alpha: 0, delay: 1500, duration: 500 });
    this.hint = this.add.text(GAME_WIDTH / 2, 120, t('hint.flap'), STROKE).setOrigin(0.5).setDepth(900);

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

  // Obstacles are little blocks of the city: two or three ruined buildings (brick, colonnade, burning tower,
  // painted in src/art/flightBuildings.js) side by side. The main one sets the opening; the others are
  // shorter, so they never narrow it. Each building is one image and one physics body.
  cluster(edge, hang) {
    const n = hang ? this.hangCount++ : this.towerCount++;
    const parts = CLUSTERS[n % CLUSTERS.length];
    const total = parts.reduce((t, q) => t + q.w, 0);
    let x = GAME_WIDTH + 20 - total / 2;
    parts.forEach((q, i) => {
      const cut = q.d || 0;                                  // how much shorter than the main building
      const y = hang ? 0 : edge + cut;
      const wallH = hang ? edge - cut : GAME_HEIGHT + 10 - y;
      // A shallow top half of a gate can be shorter than one of its decorative offsets.  That
      // piece belongs entirely above the screen, so omit it rather than asking Pix to allocate
      // a negative-height texture.  Advancing x preserves the cluster's intended silhouette.
      if (wallH <= 0) {
        x += q.w;
        return;
      }
      const key = buildingTexture(this, { style: q.s, w: q.w * 2, h: Math.round(wallH * 2), hang, seed: n * 3 + i });
      const img = this.add.image(x, y, key).setScale(ART_SCALE).setOrigin(0, 0).setDepth(5);
      this.addBody(img);
      if (!hang && q.s === 2) {
        for (const fx of [0.3, 0.7]) {
          const f = this.add.sprite(x + q.w * fx, y + 4, 'flame').setScale(ART_SCALE).setOrigin(0.5, 1).setDepth(6)
            .play({ key: 'flame-flicker', startFrame: i });
          this.addBody(f);
        }
      }
      x += q.w;
    });
  }

  tower(top) { this.cluster(top, false); }

  hang(bottom) { this.cluster(bottom, true); }

  gate(gapY) {
    this.hang(gapY - FLIGHT.gapSize / 2);
    this.tower(gapY + FLIGHT.gapSize / 2);
  }

  // The burning city from Act I (src/art/sodomBackdrop.js) scrolling past, and a band of fire along the bottom.
  buildBackground() {
    buildSodomBackdrop(this);
    this.towerCount = 0;
    this.hangCount = 0;
    this.add.image(0, 0, 'sodom-sky').setOrigin(0).setScale(ART_SCALE).setScrollFactor(0).setDepth(-3);
    const band = (key, y, h, depth) => this.add.tileSprite(0, y, GAME_WIDTH * 2, h * 2, key).setOrigin(0)
      .setScale(ART_SCALE).setScrollFactor(0).setDepth(depth);
    this.layers = [
      { factor: 0.08, tile: band('sodom-clouds', 0, 150, -2.9) },
      { factor: 0.2, tile: band('sodom-far', 66, 120, -2.6).setTint(0xb090a0) },
      // darker and lower than in Act I, so the obstacles stand out in front of it
      { factor: 0.45, tile: band('sodom-mid', 78, 140, -2.2).setTint(0x8a7080) },
      { factor: 1, tile: band('pitglow', GAME_HEIGHT - 30, 32, -1.9) },
    ];
    // fire along the bottom: falling in means death, so it should look like it
    this.fireRow = [];
    for (let x = 0; x < GAME_WIDTH + 24; x += 12) {
      const f = this.add.sprite(x, GAME_HEIGHT + 3, 'flame').setScale(ART_SCALE).setOrigin(0.5, 1).setScrollFactor(0).setDepth(-1.8)
        .play({ key: 'flame-flicker', startFrame: (x / 12) % 4 });
      this.tweens.add({ targets: f, scaleY: Phaser.Math.FloatBetween(1.1, 1.5) * ART_SCALE, duration: Phaser.Math.Between(180, 320), yoyo: true, repeat: -1 });
      this.fireRow.push(f);
    }
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
    this.hud.update();
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
    const d = FLIGHT.scrollSpeed * this.scrollMul * delta / 1000;
    this.layers.forEach(l => { l.tile.tilePositionX += d * l.factor * 2; }); // texture px = 2 x world
    this.fireRow.forEach(f => {
      f.x -= d;
      if (f.x < -12) f.x += this.fireRow.length * 12;
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
    // desert strip (src/art/flightProps.js); its sandy lip is 3 units below the top of the texture
    const ground = this.add.tileSprite(GAME_WIDTH, GROUND_Y - 3, GAME_WIDTH * 2, (GAME_HEIGHT - GROUND_Y + 3) * 2, 'fland')
      .setScale(ART_SCALE).setOrigin(0).setDepth(8);
    this.tweens.add({ targets: ground, x: 0, duration: 1200 });
    this.tweens.add({ targets: [...this.fireRow, this.layers[3].tile], alpha: 0, duration: 1200 });
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
          popText(this, 160, 140, t('pop.thud'));
          people.forEach(q => puff(this, v.x + q.x, GROUND_Y - 2, 0xd9b774));
        } });
    });
    c.danglers.length = 0;
    this.time.delayedCall(1350, () => {
      people.forEach(p => { p.anims.stop(); p.setFrame(0); }); // back on their feet
      this.tweens.add({ targets: people, angle: 0, duration: 150 });
    });
    // the angels give back anyone lost in the flight, and Lot rejoices
    const lostKeys = ['wife', 'daughter1', 'daughter2'].filter(k => run.lost.has(k));
    if (lostKeys.length) {
      this.time.delayedCall(1700, () => {
        flash(this, 300, 255, 240, 200);
        lostKeys.forEach((k, i) => {
          run.lost.delete(k);
          const x = v.x + (people.length * 7 + 14 + i * 14);
          this.add.sprite(x, GROUND_Y - 12, k, 0).setScale(ART_SCALE).setOrigin(0.5).setDepth(9);
          puff(this, x, GROUND_Y - 10, 0xffe14a);
          popText(this, x, GROUND_Y - 30, t('pop.saved'), '#ffe14a');
        });
        const lot = people.find(q => q.texture.key === 'lot');
        if (lot) {
          lot.setFlipX(true);
          speech(this, v.x + lot.x, GROUND_Y - 30, 1800, t('say.alive'));
        }
      });
    }
    this.time.delayedCall(lostKeys.length ? 4000 : 2150, () => {
      fadeOut(this, 500, () => this.scene.start('WildernessScene'));
    });
  }
}
