import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT, TILE, DEBUG, MOVE, FAMILY } from '../config.js';
import Lot from '../objects/Lot.js';
import Controls from '../input/Controls.js';
import Trail from '../objects/Trail.js';
import Family from '../objects/Family.js';
import FireVent from '../objects/FireVent.js';
import Destruction from '../objects/Destruction.js';
import Sulfur from '../objects/Sulfur.js';
import Sodomite from '../objects/Sodomite.js';
import Halo from '../objects/Halo.js';
import AngelBoost from '../objects/AngelBoost.js';
import FamilyHud from '../ui/FamilyHud.js';
import { resetRun } from '../runState.js';
import { popText, loseLife } from '../fx.js';

const WORLD_W = 2400;
const WORLD_H = 360;
const STREET = 16; // street-level tile row

export default class SodomScene extends Phaser.Scene {
  constructor() {
    super('SodomScene');
  }

  create() {
    this.physics.world.gravity.y = MOVE.gravity;
    this.cutscene = false;
    this.lifting = false;
    this.physics.world.setBounds(0, 0, WORLD_W, WORLD_H);
    this.physics.world.setBoundsCollision(true, true, true, false);

    this.buildBackground();
    this.terrain = this.physics.add.staticGroup();
    this.buildLevel();
    this.buildChasm();

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

    this.addHazard(this.vents, v => v.isHot);
    this.addHazard(this.sulfur.flames);
    this.addHazard(this.sulfur.balls, () => true, h => h.destroy());
    this.physics.add.overlap(this.lot, this.family.saltGroup, (lot, salt) => {
      if (this.time.now - salt.member.saltedAt > 350) salt.member.rescue(); // touch is enough
    });

    const ex = (tx) => tx * TILE + TILE / 2;
    this.enemies = [
      new Sodomite(this, ex(28), (STREET - 3) * TILE - 9),
      new Sodomite(this, ex(47), STREET * TILE - 9),
      new Sodomite(this, ex(92), STREET * TILE - 9),
      new Sodomite(this, ex(108), STREET * TILE - 9),
      new Sodomite(this, ex(118), STREET * TILE - 9),
      new Sodomite(this, ex(130), STREET * TILE - 9),
    ];
    this.physics.add.collider(this.enemies, this.terrain);
    this.physics.add.overlap(this.lot, this.enemies, (lot, e) => {
      if (!e.alive) return;
      if (lot.protected) { e.bonk(lot.x); return; }
      if (lot.isStomping(e.body)) { e.squash(); lot.body.setVelocityY(-MOVE.stompBounce); return; }
      this.killLot();
    });
    this.physics.add.overlap(this.family.members, this.enemies, (m, e) => { if (e.alive && e.awake) m.saltify(); });
    this.physics.add.overlap(this.sulfur.balls, this.enemies, (ball, e) => { if (e.alive) { e.burn(); ball.destroy(); } });

    // the way out: a halo by the wall calls the angels
    this.gateHalo = new Halo(this, ex(138), STREET * TILE - 14).setScale(1.5);
    this.physics.add.overlap(this.lot, this.gateHalo, (lot, h) => {
      if (!h.active || this.cutscene) return;
      h.collect();
      this.startPickup();
    });

    this.boost = new AngelBoost(this, this.lot, this.family);
    this.halos = [
      new Halo(this, ex(59), (STREET - 4) * TILE - 28),
      new Halo(this, ex(100), STREET * TILE - 44),
    ];
    this.physics.add.overlap(this.lot, this.halos, (lot, h) => {
      if (!h.active) return;
      h.collect();
      this.boost.start();
    });

    const cam = this.cameras.main;
    cam.setBounds(0, 0, WORLD_W, WORLD_H);
    cam.startFollow(this.lot, true, 0.12, 0.12);
    cam.setDeadzone(40, 30);
    cam.setFollowOffset(-30, 0);
    cam.scrollY = WORLD_H; // clamped to bounds; avoids a camera pan at start
    cam.scrollX = 0;
    cam.fadeIn(400);

    this.controls = new Controls(this);
    this.restarting = false;

    const STROKE = { fontFamily: 'monospace', fontSize: '8px', color: '#fff', stroke: '#000', strokeThickness: 2 };
    const actTitle = this.add.text(GAME_WIDTH / 2, 40, 'ACT I\nSODOM', { ...STROKE, fontSize: '12px' })
      .setOrigin(0.5).setAlign('center').setScrollFactor(0).setDepth(900);
    this.tweens.add({ targets: actTitle, alpha: 0, delay: 1500, duration: 600 });

    const touch = this.sys.game.device.input.touch;
    this.time.delayedCall(1800, () => {
      const hint = this.add.text(GAME_WIDTH / 2, 10,
        (touch ? 'Buttons to move & jump' : '← → move   SPACE jump   R restart') + '\nStomp Sodomites. Touch salt to rescue!',
        { fontFamily: 'monospace', fontSize: '8px', color: '#fff' })
        .setOrigin(0.5, 0).setScrollFactor(0).setDepth(900).setAlpha(0).setAlign('center');
      this.tweens.add({ targets: hint, alpha: 1, duration: 400 });
      this.tweens.add({ targets: hint, alpha: 0, delay: 3000, duration: 600 });
    });

    if (DEBUG) {
      this.debugText = this.add.text(4, 20, '', { fontFamily: 'monospace', fontSize: '8px', color: '#0f0' })
        .setScrollFactor(0).setDepth(900);
      const K = Phaser.Input.Keyboard.KeyCodes;
      this.debugKeys = ['ONE', 'TWO', 'THREE'].map(k => this.input.keyboard.addKey(K[k]));
      this.keyZero = this.input.keyboard.addKey(K.ZERO);
      this.keyFour = this.input.keyboard.addKey(K.FOUR);
      this.keyFive = this.input.keyboard.addKey(K.FIVE);
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

  killLot(force = false) {
    if (this.cutscene) return;
    if (this.restarting) return;
    if (this.lot.protected && !force) return;
    this.restarting = true;
    this.physics.pause();
    const lot = this.lot;
    lot.setTint(0xff4040);
    this.cameras.main.shake(200, 0.01);
    this.tweens.add({ targets: lot, y: lot.y - 24, duration: 150, ease: 'Quad.out', onComplete: () => {
      this.tweens.add({ targets: lot, y: lot.y + 200, angle: 360, duration: 550, ease: 'Quad.in' });
    } });
    const next = loseLife(this);
    this.time.delayedCall(800, () => this.scene.start(next));
  }

  startPickup() {
    this.cutscene = true;
    this.destruction.stopped = true;
    this.sulfur.stop();
    if (this.boost.timer > 0) this.boost.end();
    const { lot, family } = this;
    const cam = this.cameras.main;
    lot.body.setAcceleration(0, 0);
    lot.body.setVelocityX(0);
    lot.body.setDragX(2000);
    lot.setFlipX(false);
    family.members[0].cancelLook();
    family.members.forEach(m => { if (m.state === 'salted') m.lose(); });
    popText(this, lot.x, lot.y - 24, '!');

    this.time.delayedCall(500, () => {
      const angels = [0, 1].map(() => this.add.image(cam.scrollX - 20, cam.scrollY - 20, 'angel').setDepth(700));
      const vis = () => family.members.filter(m => m.visible && m.state !== 'lost');
      const v = vis();
      const bx = v.length ? v.reduce((sum, m) => sum + m.x, 0) / v.length : lot.x - 30;
      const by = v.length ? v[0].y - v[0].height - 22 : lot.y - lot.height - 6;
      const targets = [{ x: lot.x, y: lot.y - lot.height - 6 }, { x: bx, y: by }];
      popText(this, lot.x, lot.y - 30, 'HALLELUJAH!', '#ffe14a');
      angels.forEach((a, i) => {
        this.tweens.add({ targets: a, x: targets[i].x, y: targets[i].y, duration: 500,
          onComplete: () => { if (i === 0) this.lift(angels, vis()); } });
      });
    });
  }

  lift(angels, members) {
    this.lifting = true;
    const cam = this.cameras.main;
    cam.stopFollow();
    this.lot.body.enable = false;
    const targets = [this.lot, ...angels, ...members];
    targets.forEach((t, i) => {
      this.tweens.add({ targets: t, y: '-=220', x: '+=40', duration: 1400, ease: 'Sine.in',
        onComplete: () => {
          if (i !== 0) return;
          cam.fadeOut(400);
          cam.once('camerafadeoutcomplete', () => this.scene.start('FlightScene'));
        } });
    });
  }

  buildChasm() {
    const x0 = 144 * TILE, top = STREET * TILE + 8;
    this.add.rectangle(x0, top, WORLD_W - x0, WORLD_H - top, 0x3a0808).setOrigin(0).setDepth(-0.8);
    for (let i = 0; i < 6; i++) {
      const f = this.add.image(x0 + 8 + i * 16 + Phaser.Math.Between(-3, 3), top, 'flame').setOrigin(0.5, 1).setDepth(-0.7);
      this.tweens.add({ targets: f, scaleY: 0.6, duration: Phaser.Math.Between(150, 280), yoyo: true, repeat: -1 });
    }
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
    solid(82, STREET, 62);         // 8. end area (7. pit is tx 61-81)
    this.platform(140, STREET - 6, 2, 6); // city gate marker
  }

  update(time, delta) {
    this.controls.update();
    if (this.restarting) return;

    if (this.cutscene) {
      if (!this.lifting) this.family.update(delta);
      this.hud.update();
      return;
    }

    if (this.lot.y > WORLD_H + 40) { this.killLot(true); return; }
    if (this.controls.restartPressed) {
      this.restarting = true;
      this.scene.restart();
      return;
    }

    const cam = this.cameras.main;
    this.lot.update(this.controls, delta);
    this.trail.record(this.lot.x, this.lot.body.bottom, this.lot.facing, this.lot.onGround);
    this.family.update(delta);
    this.enemies.forEach(e => e.update(this.lot, cam, this.destruction.x, WORLD_H));
    this.boost.update(delta);
    this.vents.forEach(v => v.update(delta));

    this.destruction.update(delta, cam);
    this.sulfur.update(delta, this.lot, cam);
    this.family.applyDestruction(this.destruction.x);
    if (this.lot.body.left < this.destruction.x) { this.killLot(true); return; }

    this.hud.update();

    if (this.debugText) {
      this.debugKeys.forEach((k, i) => {
        if (Phaser.Input.Keyboard.JustDown(k)) this.family.members[i].saltify(true);
      });
      if (Phaser.Input.Keyboard.JustDown(this.keyZero)) { resetRun(); this.restarting = true; this.scene.restart(); return; }
      if (Phaser.Input.Keyboard.JustDown(this.keyFour)) this.family.members[0].lookTimer = 0;
      if (Phaser.Input.Keyboard.JustDown(this.keyFive)) this.boost.start();
      const b = this.lot.body;
      this.debugText.setText(
        `vx ${b.velocity.x.toFixed(0)} vy ${b.velocity.y.toFixed(0)} onGround ${this.lot.onGround} wall:${this.destruction.x | 0} balls:${this.sulfur.balls.getLength()} enemies:${this.enemies.filter(e => e.alive).length} boost:${Math.max(0, this.boost.timer | 0)}\n` +
        this.family.members.map(m => `${m.memberName}:${m.state}`).join(' '));
    }
  }
}
