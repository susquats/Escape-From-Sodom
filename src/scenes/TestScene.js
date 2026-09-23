import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT, TILE, DEBUG, MOVE, FAMILY } from '../config.js';
import Lot from '../objects/Lot.js';
import Controls from '../input/Controls.js';
import Trail from '../objects/Trail.js';
import Family from '../objects/Family.js';
import FireVent from '../objects/FireVent.js';
import Destruction from '../objects/Destruction.js';
import Sulfur from '../objects/Sulfur.js';
import FamilyHud from '../ui/FamilyHud.js';
import { resetRun } from '../runState.js';

const WORLD_W = 2400;
const WORLD_H = 360;
const STREET = 16; // street-level tile row

export default class TestScene extends Phaser.Scene {
  constructor() {
    super('TestScene');
  }

  create() {
    this.physics.world.setBounds(0, 0, WORLD_W, WORLD_H);
    this.physics.world.setBoundsCollision(true, true, true, false);

    this.buildBackground();
    this.terrain = this.physics.add.staticGroup();
    this.buildLevel();

    this.lot = new Lot(this, 48, STREET * TILE - 10);
    this.physics.add.collider(this.lot, this.terrain);

    this.trail = new Trail(this.lot.x, STREET * TILE, FAMILY.trailMaxLength);
    this.family = new Family(this, this.trail, this.terrain);

    const vx = (tx) => tx * TILE + TILE / 2;
    this.vents = [
      new FireVent(this, vx(10), STREET * TILE, 0),
      new FireVent(this, vx(24), (STREET - 3) * TILE, 700),
      new FireVent(this, vx(95), STREET * TILE, 0),
      new FireVent(this, vx(100), STREET * TILE, 1200),
    ];
    this.destruction = new Destruction(this, WORLD_H);
    this.sulfur = new Sulfur(this, this.terrain, WORLD_W, WORLD_H);
    this.hud = new FamilyHud(this, this.family);
    this.finished = false;

    this.addHazard(this.vents, v => v.isHot);
    this.addHazard(this.sulfur.flames);
    this.addHazard(this.sulfur.balls, () => true, h => h.destroy());
    this.physics.add.overlap(this.lot, this.family.saltGroup, (lot, salt) => {
      const lb = lot.body;
      const prevBottom = lb.prev.y + lb.height;
      if (lb.velocity.y > 0 && prevBottom <= salt.body.top + 4) {
        lb.setVelocityY(-MOVE.stompBounce);
        salt.member.rescue();
      }
    });

    const cam = this.cameras.main;
    cam.setBounds(0, 0, WORLD_W, WORLD_H);
    cam.startFollow(this.lot, true, 0.12, 0.12);
    cam.setDeadzone(40, 30);
    cam.setFollowOffset(-30, 0);
    cam.scrollY = WORLD_H; // clamped to bounds; avoids a camera pan at start
    cam.scrollX = 0;

    this.controls = new Controls(this);
    this.restarting = false;

    const touch = this.sys.game.device.input.touch;
    const hint = this.add.text(GAME_WIDTH / 2, 10,
      (touch ? 'Buttons to move & jump' : '← → move   SPACE jump   R restart') + '\nJump on salt to rescue!',
      { fontFamily: 'monospace', fontSize: '8px', color: '#fff' })
      .setOrigin(0.5, 0).setScrollFactor(0).setDepth(900).setAlign('center');
    this.tweens.add({ targets: hint, alpha: 0, delay: 4000, duration: 600 });

    if (DEBUG) {
      this.debugText = this.add.text(4, 20, '', { fontFamily: 'monospace', fontSize: '8px', color: '#0f0' })
        .setScrollFactor(0).setDepth(900);
      const K = Phaser.Input.Keyboard.KeyCodes;
      this.debugKeys = ['ONE', 'TWO', 'THREE'].map(k => this.input.keyboard.addKey(K[k]));
      this.keyZero = this.input.keyboard.addKey(K.ZERO);
      this.keyFour = this.input.keyboard.addKey(K.FOUR);
    }
  }

  addHazard(target, isActive = () => true, onHit = null) {
    this.physics.add.overlap(this.lot, target, (lot, h) => {
      if (!isActive(h)) return;
      this.killLot();
      if (onHit) onHit(h);
    });
    this.physics.add.overlap(this.family.members, target, (m, h) => {
      if (!isActive(h) || !h.active) return;
      const before = m.state;
      m.saltify();
      if (onHit && m.state !== before) onHit(h);
    });
  }

  killLot() {
    if (this.restarting) return;
    this.restarting = true;
    this.physics.pause();
    const lot = this.lot;
    lot.setTint(0xff4040);
    this.cameras.main.shake(200, 0.01);
    this.tweens.add({ targets: lot, y: lot.y - 24, duration: 150, ease: 'Quad.out', onComplete: () => {
      this.tweens.add({ targets: lot, y: lot.y + 200, angle: 360, duration: 550, ease: 'Quad.in' });
    } });
    this.time.delayedCall(800, () => this.scene.restart());
  }

  finish() {
    this.finished = true;
    this.destruction.stopped = true;
    this.sulfur.stop();
    this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2,
      `SAFE!\nFamily: ${this.family.savedCount}/3\nR to play again`,
      { fontFamily: 'monospace', fontSize: '8px', color: '#fff', stroke: '#000', strokeThickness: 2 })
      .setOrigin(0.5).setAlign('center').setScrollFactor(0).setDepth(900);
  }

  buildBackground() {
    this.add.rectangle(0, 0, WORLD_W, WORLD_H, 0x2b1b3a).setOrigin(0).setScrollFactor(0).setDepth(-3);
    const layers = [[0.3, 0x3d2a52, 40, 110], [0.6, 0x4f3466, 30, 80]];
    layers.forEach(([factor, color, minH, maxH], i) => {
      for (let x = 0; x < WORLD_W; x += 48) {
        const h = minH + ((x * 37 + i * 91) % (maxH - minH));
        this.add.rectangle(x, WORLD_H - 90, 36, h, color).setOrigin(0, 1)
          .setScrollFactor(factor).setDepth(-2 + i * 0.5);
      }
    });
  }

  platform(tx, ty, w, h = 1) {
    const t = this.add.tileSprite(tx * TILE, ty * TILE, w * TILE, h * TILE, 'ground').setOrigin(0);
    this.terrain.add(t);
    return t;
  }

  buildLevel() {
    const bottom = (ty) => Math.max(1, Math.round(WORLD_H / TILE) - ty); // fill down to world bottom
    const solid = (tx, ty, w) => this.platform(tx, ty, w, bottom(ty));

    solid(0, STREET, 15);          // 1. flat street
    solid(15, STREET - 1, 3);      // 2. low step
    solid(18, STREET - 3, 13);     //    fallen pillar -> rooftop
    solid(35, STREET - 3, 8);      // 3. rooftop 2 after a 4-tile gap
    solid(43, STREET, 8);          // 4. drop to street
    solid(51, STREET - 1, 2);      // 5. staircase
    solid(53, STREET - 2, 2);
    solid(55, STREET - 3, 2);
    solid(57, STREET - 4, 4);
    this.platform(63, 11, 3);      // 6. floating platforms over the pit
    this.platform(69, 10, 3);
    this.platform(75, 11, 3);
    solid(82, STREET, 68);         // 8. end area (7. pit is tx 61-81)
    this.platform(140, STREET - 6, 2, 6); // city gate marker
  }

  update(time, delta) {
    this.controls.update();
    if (this.restarting) return;

    if (this.lot.y > WORLD_H + 40) { this.killLot(); return; }
    if (this.controls.restartPressed) {
      if (this.finished) resetRun();
      this.restarting = true;
      this.scene.restart();
      return;
    }

    const cam = this.cameras.main;
    this.lot.update(this.controls, delta);
    this.trail.record(this.lot.x, this.lot.body.bottom, this.lot.facing, this.lot.onGround);
    this.family.update(delta);
    this.vents.forEach(v => v.update(delta));

    if (!this.finished) {
      this.destruction.update(delta, cam);
      this.sulfur.update(delta, this.lot, cam);
      this.family.applyDestruction(this.destruction.x);
      if (this.lot.body.left < this.destruction.x) { this.killLot(); return; }
      if (this.lot.x > 140 * TILE) this.finish();
    }

    this.hud.update();

    if (this.debugText) {
      this.debugKeys.forEach((k, i) => {
        if (Phaser.Input.Keyboard.JustDown(k)) this.family.members[i].saltify(true);
      });
      if (Phaser.Input.Keyboard.JustDown(this.keyZero)) { resetRun(); this.restarting = true; this.scene.restart(); return; }
      if (Phaser.Input.Keyboard.JustDown(this.keyFour)) this.family.members[0].lookTimer = 0;
      const b = this.lot.body;
      this.debugText.setText(
        `vx ${b.velocity.x.toFixed(0)} vy ${b.velocity.y.toFixed(0)} onGround ${this.lot.onGround} wall:${this.destruction.x | 0} balls:${this.sulfur.balls.getLength()}\n` +
        this.family.members.map(m => `${m.memberName}:${m.state}`).join(' '));
    }
  }
}
