import Phaser from 'phaser';
import { GAME_WIDTH, TILE, DEBUG, MOVE, FAMILY } from '../config.js';
import Lot from '../objects/Lot.js';
import Controls from '../input/Controls.js';
import Trail from '../objects/Trail.js';
import Family from '../objects/Family.js';
import FamilyHud from '../ui/FamilyHud.js';
import { setupView, fadeIn, fadeOut, setViewX, ART_SCALE } from '../view.js';

const WORLD_W = 1600;
const WORLD_H = 180;
const STREET = 9; // ground top y = 144

export default class WildernessScene extends Phaser.Scene {
  constructor() {
    super('WildernessScene');
  }

  create() {
    setupView(this);
    this.physics.world.gravity.y = MOVE.gravity;
    this.exiting = false;
    this.physics.world.setBounds(0, 0, WORLD_W, WORLD_H);
    this.physics.world.setBoundsCollision(true, true, true, false);

    this.buildBackground();
    this.terrain = this.physics.add.staticGroup();
    this.buildLevel();

    this.lot = new Lot(this, 80, STREET * TILE - 10);
    this.physics.add.collider(this.lot, this.terrain);
    this.trail = new Trail(this.lot.x, STREET * TILE, FAMILY.trailMaxLength);
    this.family = new Family(this, this.trail, this.terrain);
    this.hud = new FamilyHud(this, this.family);
    this.physics.add.overlap(this.lot, this.family.saltGroup, (lot, salt) => {
      if (this.time.now - salt.member.saltedAt > 350) salt.member.rescue();
    });

    const cam = this.cameras.main;
    cam.setBounds(0, 0, WORLD_W, WORLD_H);
    cam.startFollow(this.lot, true, 0.12, 0.12);
    cam.setDeadzone(40, 30);
    cam.setFollowOffset(-30, 0);
    setViewX(cam, 0);
    fadeIn(this, 400);

    this.controls = new Controls(this);

    if (DEBUG) {
      this.debugText = this.add.text(4, 20, '', { fontFamily: 'monospace', fontSize: '8px', color: '#0f0' })
        .setScrollFactor(0).setDepth(900);
      const K = Phaser.Input.Keyboard.KeyCodes;
      this.debugKeys = ['ONE', 'TWO', 'THREE'].map(k => this.input.keyboard.addKey(K[k]));
      this.keyFour = this.input.keyboard.addKey(K.FOUR);
    }
  }

  buildBackground() {
    // dusk sky, fixed
    [0x2a1e3a, 0x4a2a44, 0x7a3a3a, 0xb0603a].forEach((c, i) => {
      this.add.rectangle(0, i * 45, GAME_WIDTH, 45, c).setOrigin(0).setScrollFactor(0).setDepth(-3);
    });

    // burning Sodom, far away on the left
    const gy = STREET * TILE;
    this.add.rectangle(0, gy, 220, 60, 0xff6a1e, 0.25).setOrigin(0, 1).setScrollFactor(0.2).setDepth(-2.6);
    [[4, 30, 22], [30, 48, 16], [52, 26, 20], [76, 56, 18], [100, 36, 24], [128, 44, 16], [150, 28, 22], [176, 40, 18]]
      .forEach(([x, h, w]) => this.add.rectangle(x, gy, w, h, 0x4a1414).setOrigin(0, 1).setScrollFactor(0.2).setDepth(-2.5));
    [20, 88, 150].forEach(x => {
      const f = this.add.image(x, gy - 34, 'flame').setScale(ART_SCALE).setOrigin(0.5, 1).setScrollFactor(0.2).setDepth(-2.4);
      this.tweens.add({ targets: f, scaleY: 0.6 * ART_SCALE, duration: Phaser.Math.Between(150, 280), yoyo: true, repeat: -1 });
    });

    // the mountain grows into view on the right
    const mx = 614, mw = 260, mh = 110;
    const g = this.add.graphics().setScrollFactor(0.3).setDepth(-2);
    g.fillStyle(0x5a4030).fillTriangle(mx - mw / 2, gy, mx + mw / 2, gy, mx, gy - mh);
    g.fillStyle(0x6e5038).fillTriangle(mx, gy - mh, mx + mw / 2, gy, mx + 20, gy);
    this.add.rectangle(mx + 6, gy - mh + 10, 4, 3, 0x140c10).setScrollFactor(0.3).setDepth(-1.9);

    // decorations (no bodies)
    for (let x = 90; x < WORLD_W; x += 150) {
      this.add.image(x + (x * 7) % 40, gy, 'rock').setScale(ART_SCALE).setOrigin(0.5, 1).setDepth(-1);
    }
    for (let x = 60; x < WORLD_W; x += 110) {
      this.add.rectangle(x + (x * 13) % 50, gy, 5, 5 + (x % 4), 0x6a5a2a).setOrigin(0.5, 1).setDepth(-1);
    }

    // signpost at tile 10
    const sx = 10 * TILE;
    this.add.rectangle(sx, gy, 2, 14, 0x6a4a2a).setOrigin(0.5, 1).setDepth(-0.5);
    this.add.rectangle(sx, gy - 14, 30, 10, 0x8a6a3a).setOrigin(0.5, 1).setDepth(-0.5);
    this.add.text(sx, gy - 19, 'CAVES →', { fontFamily: 'monospace', fontSize: '6px', color: '#2a1a0a' })
      .setOrigin(0.5).setDepth(-0.4);
  }

  platform(tx, ty, w, h = 1) {
    const t = this.add.tileSprite(tx * TILE, ty * TILE, w * TILE, h * TILE, 'ground').setOrigin(0);
    this.terrain.add(t);
    return t;
  }

  buildLevel() {
    const solid = (tx, ty, w) => this.platform(tx, ty, w, Math.ceil(WORLD_H / TILE) - ty);
    solid(0, STREET, 20);
    solid(20, STREET - 1, 14);
    solid(34, STREET, 28);
    solid(62, STREET - 1, 12);
    solid(74, STREET, 26);
    // 1-tile rocks
    [[26, STREET - 1], [58, STREET]].forEach(([tx, ty]) => {
      const r = this.add.image(tx * TILE + TILE / 2, ty * TILE, 'rock').setScale(ART_SCALE).setOrigin(0.5, 1).setDepth(-0.2);
      this.terrain.add(r);
    });
  }

  finish() {
    this.exiting = true;
    const { lot, family } = this;
    lot.body.setAcceleration(0, 0);
    lot.body.setDragX(2000);
    family.members.forEach(m => { if (m.state === 'salted') m.lose(); });
    family.members[0].cancelLook();
    this.time.delayedCall(300, () => {
      const cam = this.cameras.main;
      fadeOut(this, 500, () => this.scene.start('MountainScene'));
    });
  }

  update(time, delta) {
    this.controls.update();
    if (this.controls.restartPressed) { this.scene.restart(); return; }

    if (!this.exiting) {
      this.lot.update(this.controls, delta);
      this.trail.record(this.lot.x, this.lot.body.bottom, this.lot.facing, this.lot.onGround);
      if (this.lot.x > WORLD_W - 40) this.finish();
    }
    this.family.update(delta);
    this.hud.update();

    if (this.debugText) {
      this.debugKeys.forEach((k, i) => {
        if (Phaser.Input.Keyboard.JustDown(k)) this.family.members[i].saltify(true);
      });
      if (Phaser.Input.Keyboard.JustDown(this.keyFour)) this.family.members[0].lookTimer = 0;
      this.debugText.setText(`x ${this.lot.x | 0}\n` + this.family.members.map(m => `${m.memberName}:${m.state}`).join(' '));
    }
  }
}
