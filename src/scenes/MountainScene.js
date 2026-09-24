import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT, DEBUG, MOVE, MOUNTAIN } from '../config.js';
import Lot from '../objects/Lot.js';
import Controls from '../input/Controls.js';
import { run } from '../runState.js';
import { popText, puff, loseLife } from '../fx.js';
import { setupView, fadeIn, fadeOut, shake, setViewY, viewY, ART_SCALE } from '../view.js';

const STROKE = { fontFamily: 'monospace', fontSize: '8px', color: '#fff', stroke: '#000', strokeThickness: 2 };

export default class MountainScene extends Phaser.Scene {
  constructor() {
    super('MountainScene');
  }

  create() {
    setupView(this);
    this.physics.world.gravity.y = MOVE.gravity;
    const H = MOUNTAIN.height;
    this.dead = false;
    this.graceMs = 0;
    this.atTop = false;
    this.invincible = false;
    this.elapsed = 0;
    this.physics.world.setBounds(MOUNTAIN.columnLeft, 0, MOUNTAIN.columnRight - MOUNTAIN.columnLeft, H);
    this.physics.world.setBoundsCollision(true, true, false, false);

    this.buildBackground(H);
    this.platforms = this.physics.add.staticGroup();
    this.movers = this.physics.add.group({ allowGravity: false, immovable: true });
    this.buildPlatforms(H);

    this.lot = new Lot(this, 160, H - 8 - 20);
    const onLand = (lot, p) => { if (lot.body.touching.down || lot.body.blocked.down) this.landOn(p); };
    this.physics.add.collider(this.lot, this.platforms, onLand);
    this.physics.add.collider(this.lot, this.movers, onLand);

    this.controls = new Controls(this, { touchButtons: ['left', 'right', 'restart'] });

    const cam = this.cameras.main;
    cam.setBounds(0, 0, GAME_WIDTH, H);
    setViewY(cam, H - GAME_HEIGHT);
    fadeIn(this, 400);

    const title = this.add.text(GAME_WIDTH / 2, 40, 'ACT III\nTHE MOUNTAIN', { ...STROKE, fontSize: '12px' })
      .setOrigin(0.5).setAlign('center').setScrollFactor(0).setDepth(900);
    this.tweens.add({ targets: title, alpha: 0, delay: 1500, duration: 600 });
    const touch = this.sys.game.device.input.touch;
    const hint = this.add.text(GAME_WIDTH / 2, 80, touch ? 'Buttons to steer' : '← → steer', STROKE)
      .setOrigin(0.5).setScrollFactor(0).setDepth(900);
    this.tweens.add({ targets: hint, alpha: 0, delay: 3000, duration: 600 });

    if (DEBUG) {
      this.debugText = this.add.text(4, 4, '', { fontFamily: 'monospace', fontSize: '8px', color: '#0f0' })
        .setScrollFactor(0).setDepth(900);
      const K = Phaser.Input.Keyboard.KeyCodes;
      this.keyI = this.input.keyboard.addKey(K.I);
      this.keyT = this.input.keyboard.addKey(K.T);
    }
  }

  buildBackground(H) {
    this.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, 0x1e1830).setOrigin(0).setScrollFactor(0).setDepth(-3);
    for (let i = 0; i < 30; i++) {
      this.add.rectangle((i * 97) % GAME_WIDTH, (i * 53) % GAME_HEIGHT, 1, 1, 0xffffff)
        .setScrollFactor(0).setDepth(-2.9).setAlpha(0.5 + (i % 3) * 0.2);
    }
    const L = MOUNTAIN.columnLeft, R = MOUNTAIN.columnRight;
    this.add.rectangle(0, 0, L, H, 0x4a3a2e).setOrigin(0).setDepth(-2);
    this.add.rectangle(R, 0, GAME_WIDTH - R, H, 0x4a3a2e).setOrigin(0).setDepth(-2);
    for (let y = 10; y < H; y += 26) {
      this.add.image(6 + (y * 7) % 36, y, 'rock').setScale(ART_SCALE).setDepth(-1.9);
      this.add.image(R + 6 + (y * 11) % 36, y + 12, 'rock').setScale(ART_SCALE).setDepth(-1.9);
    }
  }

  makePlatform(x, y, w, type) {
    const p = this.add.tileSprite(x, y, w, 6, type === 'crumble' ? 'ledge_crumble' : 'ledge').setTileScale(ART_SCALE);
    if (type === 'moving') {
      this.movers.add(p);
    } else {
      this.platforms.add(p);
    }
    const b = p.body;
    b.checkCollision.down = b.checkCollision.left = b.checkCollision.right = false;
    p.kind = type;
    if (type === 'moving') {
      const lo = MOUNTAIN.columnLeft + w / 2, hi = MOUNTAIN.columnRight - w / 2;
      const a = Math.max(lo, x - MOUNTAIN.movingRange), c = Math.min(hi, x + MOUNTAIN.movingRange);
      p.x = a;
      this.tweens.add({ targets: p, x: c, duration: MOUNTAIN.movingMs, ease: 'Sine.inOut', yoyo: true, repeat: -1 });
    }
    return p;
  }

  buildPlatforms(H) {
    const M = MOUNTAIN;
    const rnd = new Phaser.Math.RandomDataGenerator(['lot-climbs']);
    this.makePlatform(160, H - 8, 208, 'normal');
    let y = H - 8, prevX = 160, prevCrumble = false, prevMoving = false;
    while (y - M.topY > M.stepMax) {
      // never leave the last gap to the top platform above stepMax or below stepMin
      y -= Math.min(rnd.between(M.stepMin, M.stepMax), y - M.topY - M.stepMin);
      const progress = 1 - y / H;
      const w = Math.round(Phaser.Math.Linear(M.widthStart, M.widthEnd, progress));
      let type = 'normal';
      if (progress > M.movingFrom && rnd.frac() < M.movingChance) type = 'moving';
      else if (!prevCrumble && progress > M.crumbleFrom && rnd.frac() < M.crumbleChance) type = 'crumble';
      // a moving platform sweeps +-movingRange, so keep hops to/from it short
      const dxMax = type === 'moving' || prevMoving ? M.maxDx - M.movingRange : M.maxDx;
      const minX = M.columnLeft + w / 2, maxX = M.columnRight - w / 2;
      const x = Phaser.Math.Clamp(prevX + rnd.between(-dxMax, dxMax), minX, maxX);
      this.makePlatform(x, y, w, type);
      prevMoving = type === 'moving';
      prevCrumble = type === 'crumble';
      prevX = x;
    }
    this.makePlatform(160, M.topY, 208, 'top');
    this.cave = this.add.image(230, M.topY - 3, 'cave').setScale(ART_SCALE).setOrigin(0.5, 1).setDepth(-1);
  }

  landOn(p) {
    if (this.atTop || this.dead) return;
    if (p.kind === 'top') { this.reachTop(); return; }
    const lot = this.lot;
    lot.body.setVelocityY(-MOUNTAIN.bounceVelocity);
    this.tweens.add({ targets: lot, scaleX: 1.2 * ART_SCALE, scaleY: 0.8 * ART_SCALE, duration: 80, yoyo: true });
    if (p.kind === 'crumble') {
      puff(this, p.x, p.y, 0x8a7a6a);
      p.body.enable = false;
      p.setAlpha(0.2);
      this.time.delayedCall(MOUNTAIN.crumbleRespawnMs, () => { p.body.enable = true; p.setAlpha(1); });
    }
  }

  reachTop() {
    this.atTop = true;
    const lot = this.lot;
    lot.body.setVelocity(0, 0);
    lot.body.setAcceleration(0, 0);
    lot.body.setAllowGravity(false);
    popText(this, lot.x, lot.y - 24, '!');
    lot.setFlipX(this.cave.x < lot.x);
    this.tweens.add({ targets: lot, x: this.cave.x, duration: 900 });
    this.tweens.add({ targets: lot, y: lot.y - 1, duration: 110, yoyo: true, repeat: 3 });
    this.time.delayedCall(900, () => this.tweens.add({ targets: lot, alpha: 0, duration: 300 }));
    this.time.delayedCall(1700, () => {
      fadeOut(this, 500, () => this.scene.start('EndingScene'));
    });
  }

  die() {
    const cam = this.cameras.main;
    popText(this, this.lot.x, viewY(cam) + GAME_HEIGHT - 10, 'AAAAH!');
    shake(this, 200, 0.01);
    const { gameOver } = loseLife(this);
    if (!gameOver) {
      // a family member is lost in Lot's place; Lot bounces back up and carries on
      this.graceMs = 2000;
      this.lot.body.setVelocityY(-500);
      return;
    }
    this.dead = true;
    this.time.delayedCall(700, () => this.scene.start('TitleScene'));
  }

  update(time, delta) {
    this.controls.update();
    if (this.controls.restartPressed) {
      if (!this.atTop) this.scene.restart();
      return;
    }
    const cam = this.cameras.main, lot = this.lot;

    if (this.debugText) {
      if (Phaser.Input.Keyboard.JustDown(this.keyI)) this.invincible = !this.invincible;
      if (Phaser.Input.Keyboard.JustDown(this.keyT) && !this.atTop) {
        lot.setPosition(lot.x, MOUNTAIN.topY + 250);
        lot.body.setVelocityY(0);
        setViewY(cam, Math.max(0, lot.y - MOUNTAIN.cameraLead));
      }
      const pct = Math.max(0, Math.min(100, (1 - (lot.y - MOUNTAIN.topY) / (MOUNTAIN.height - 8 - MOUNTAIN.topY)) * 100));
      this.debugText.setText(`y ${lot.y | 0}  ${pct.toFixed(0)}%  ${this.elapsed.toFixed(1)}s  invincible ${this.invincible}`);
    }

    if (this.dead || this.atTop) return;
    this.elapsed += delta / 1000;
    if (this.graceMs > 0) this.graceMs -= delta;

    lot.update({ left: this.controls.left, right: this.controls.right, jumpDown: true, jumpPressed: false }, delta);
    setViewY(cam, Math.max(0, Math.min(viewY(cam), lot.y - MOUNTAIN.cameraLead)));

    if (lot.y > viewY(cam) + GAME_HEIGHT + 16) {
      if (this.invincible || this.graceMs > 0) lot.body.setVelocityY(-500);
      else this.die();
    }
  }
}
