import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT, TILE, DEBUG, MOVE, FAMILY, START_CP, DESTRUCTION } from '../config.js';
import Lot from '../objects/Lot.js';
import Controls from '../input/Controls.js';
import Trail from '../objects/Trail.js';
import Family from '../objects/Family.js';
import FireVent from '../objects/FireVent.js';
import Destruction from '../objects/Destruction.js';
import Sulfur from '../objects/Sulfur.js';
import Sodomite from '../objects/Sodomite.js';
import Halo from '../objects/Halo.js';
import Checkpoint from '../objects/Checkpoint.js';
import AngelBoost from '../objects/AngelBoost.js';
import FamilyHud from '../ui/FamilyHud.js';
import { run, resetRun, saveCheckpoint } from '../runState.js';
import { popText, saltLife, letterbox, speech, puff, sfx, rumble, playMusic } from '../fx.js';
import { SODOM_SECTIONS } from '../levels/sodom.js';
import { parseLevel, ROWS, SOLID, ONE_WAY, TILE_CHARS } from '../levels/parseLevel.js';
import { hash } from '../art/pix.js';
import { COMET_HEAD } from '../art/items.js';
import { buildSodomTiles } from '../art/sodomTiles.js';
import { buildSodomBackdrop, buildSodomNightBackdrop, CLOUD_W, FAR_W, MID_W } from '../art/sodomBackdrop.js';
import { setupView, fadeIn, fadeOut, flash, shake, setViewX, setViewY, viewX, viewY, ART_SCALE } from '../view.js';
import { t } from '../i18n.js';

const LEVEL = parseLevel(SODOM_SECTIONS);
const WORLD_W = LEVEL.cols * TILE;
const WORLD_H = ROWS * TILE;
const STREET_TOP = 17 * TILE; // y of the normal street surface
const CAM_BOTTOM = 20 * TILE; // the camera never scrolls below this (saves screen on plain ground)
const CHASM_COLS = 6;
const INTRO = LEVEL.entities.find(e => e.type === 'intro'); // Lot's door: the angels' cinematic starts here
const WALL_BEHIND = 248; // how far behind Lot's door the destruction starts
let cpDebugApplied = false;
let tileArt = null; // Act I tileset + layer grids (src/art/sodomTiles.js)
let nightArt = null; // the same, painted as the intact city of the calm opening

export default class SodomScene extends Phaser.Scene {
  constructor() {
    super('SodomScene');
  }

  create() {
    setupView(this);
    playMusic(this, 'mesopotamian-ruins');
    this.physics.world.gravity.y = MOVE.gravity;
    this.cutscene = false;
    this.lifting = false;
    this.physics.world.setBounds(0, 0, WORLD_W, WORLD_H);
    this.physics.world.setBoundsCollision(true, true, true, false);

    // debug: ?cp=N starts at the Nth checkpoint (first load only)
    const cps = LEVEL.entities.filter(e => e.type === 'checkpoint').sort((a, b) => a.col - b.col); // left to right
    if (!cpDebugApplied) {
      cpDebugApplied = true;
      if (START_CP > 0 && run.checkpointX === null && cps[START_CP - 1]) {
        saveCheckpoint(cps[START_CP - 1].col * TILE + TILE / 2);
      }
    }
    const cpX = run.checkpointX;
    const cx = (e) => e.col * TILE + TILE / 2;
    const feetY = (e) => (e.row + 1) * TILE;
    this.introX = cx(INTRO);
    // The run opens in the calm city the night before: no fire, no hazards, a few Sodomites to learn on. At
    // Lot's door the angels' cinematic plays and the city catches fire (ignite). Retries restart at the door.
    this.calm = cpX === null && !run.introSeen;
    this.calmArt = [];   // night-time layers over the burning ones, faded out by ignite()
    this.fireDecor = []; // fire and rubble scenery, faded in by ignite()

    this.buildBackground();
    this.buildTerrain();
    this.buildChasm();

    const startX = cpX ?? (this.calm ? null : this.introX);
    const spawn = cpX !== null ? cps.find(e => cx(e) === cpX) || INTRO
      : this.calm ? LEVEL.entities.find(e => e.type === 'lot') : INTRO;
    this.lot = new Lot(this, cx(spawn), feetY(spawn) - 10);
    this.physics.add.collider(this.lot, this.terrain);
    this.buildPitFloors();

    this.trail = new Trail(this.lot.x, feetY(spawn), FAMILY.trailMaxLength);
    this.family = new Family(this, this.trail, this.terrain);
    this.family.members[0].lookFromX = cx(cps[cps.length - 1]); // she only looks back on the last stretch
    // salt that lands over a pit rests on its invisible floor instead of falling out of the world, so it can be rescued
    this.physics.add.collider(this.family.saltGroup, this.pitFloors);

    this.vents = [];
    this.enemies = [];
    this.halos = [];
    this.checkpoints = [];
    let gate = null;
    const behind = (e) => startX !== null && cx(e) < startX + 64;
    LEVEL.entities.forEach(e => {
      switch (e.type) {
        case 'vent': this.vents.push(new FireVent(this, cx(e), feetY(e), (this.vents.length % 3) * 700)); break;
        case 'sodomite': if (!behind(e)) this.enemies.push(new Sodomite(this, cx(e), feetY(e) - 9)); break;
        case 'halo': if (!behind(e)) this.halos.push(new Halo(this, cx(e), e.row * TILE + TILE / 2)); break;
        case 'checkpoint': {
          const cp = new Checkpoint(this, cx(e), feetY(e));
          if (cpX !== null && cp.x <= cpX) cp.activate(this, true);
          this.checkpoints.push(cp);
          break;
        }
        case 'gate': gate = e; break;
      }
    });

    // calm opening: a banner a few tiles before Lot's door that brings back the whole family once crossed, so
    // they are all there when the mob arrives. It does not save a checkpoint (retries still start at the opening).
    this.familyBanner = null;
    if (this.calm) this.familyBanner = new Checkpoint(this, this.introX - 14 * TILE, feetY(INTRO));

    this.destruction = new Destruction(this, WORLD_H);
    if (cpX !== null) {
      this.destruction.x = cpX - 240;
      this.destruction.delay = 1500;
      this.destruction.place();
    } else if (!this.calm) {
      this.destruction.x = this.introX - WALL_BEHIND;
      this.destruction.place();
    }
    this.sulfur = new Sulfur(this, this.terrain, WORLD_W, WORLD_H);
    this.hud = new FamilyHud(this, this.family);

    this.addHazard(this.vents, v => v.isHot);
    this.addHazard(this.sulfur.flames);
    this.addHazard(this.sulfur.balls, () => true, h => h.destroy());
    this.physics.add.overlap(this.lot, this.family.saltGroup, (lot, salt) => {
      if (this.time.now - salt.member.saltedAt > 350) salt.member.rescue(); // touch is enough
    });

    this.physics.add.collider(this.enemies, this.terrain);
    this.physics.add.overlap(this.lot, this.enemies, (lot, e) => {
      if (!e.alive) return;
      if (lot.protected) { e.bonk(lot.x); return; }
      if (lot.isStomping(e.body)) { e.squash(); lot.body.setVelocityY(-MOVE.stompBounce); return; }
      this.killLot();
    });
    this.physics.add.overlap(this.family.members, this.enemies, (m, e) => { if (e.alive && e.awake) m.saltify(); });
    this.physics.add.overlap(this.sulfur.balls, this.enemies, (ball, e) => { if (e.alive) { e.burn(); ball.destroy(); } });

    // the way out: reaching the gate starts the ending cinematic (see startPickup)
    this.gateX = cx(gate);
    this.edgeX = (LEVEL.cols - CHASM_COLS) * TILE - 14; // where the street ends at the chasm

    this.boost = new AngelBoost(this, this.lot, this.family);
    this.physics.add.overlap(this.lot, this.halos, (lot, h) => {
      if (!h.active) return;
      h.collect();
      this.boost.start();
    });

    const cam = this.cameras.main;
    cam.setBounds(0, 0, WORLD_W, CAM_BOTTOM);
    cam.startFollow(this.lot, true, 0.12, 0.12);
    cam.setDeadzone(40, 30);
    cam.setFollowOffset(-30, 0);
    // start close to the spawn so there is no long pan
    setViewX(cam, Phaser.Math.Clamp(this.lot.x - 130, 0, WORLD_W - GAME_WIDTH));
    setViewY(cam, Phaser.Math.Clamp(this.lot.y - GAME_HEIGHT * 0.6, 0, CAM_BOTTOM - GAME_HEIGHT));
    fadeIn(this, 400);

    this.controls = new Controls(this);
    this.restarting = false;

    const STROKE = { fontFamily: 'monospace', fontSize: '8px', color: '#fff', stroke: '#000', strokeThickness: 2 };
    const actTitle = this.add.text(GAME_WIDTH / 2, 40, t('act1'), { ...STROKE, fontSize: '12px' })
      .setOrigin(0.5).setAlign('center').setScrollFactor(0).setDepth(900);
    this.tweens.add({ targets: actTitle, alpha: 0, delay: 1500, duration: 600 });

    this.time.delayedCall(1800, () => this.showHint());

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

  showHint() {
    const touch = this.sys.game.device.input.touch;
    const hint = this.add.text(GAME_WIDTH / 2, 10,
      t(touch ? 'hint.sodomTouch' : 'hint.sodomKeys') + '\n' + t('hint.sodomGoal'),
      { fontFamily: 'monospace', fontSize: '8px', color: '#fff' })
      .setOrigin(0.5, 0).setScrollFactor(0).setDepth(900).setAlpha(0).setAlign('center');
    this.tweens.add({ targets: hint, alpha: 1, duration: 400 });
    this.tweens.add({ targets: hint, alpha: 0, delay: 3000, duration: 600 });
  }

  // Genesis 19:4-17, as a cinematic when Lot gets home: the view letterboxes and a mob of Sodomites closes in on
  // the family from both sides. Before it arrives, the two angels Lot sheltered burst out of his house, a blinding
  // flash and a quake strike the mob, and it is thrown out of the scene. The angels tell the family to flee and
  // not look back, the city catches fire (ignite), Lot turns to go, the angels leave, and play starts (the
  // destruction's grace period only runs after this). Once per run; it cannot be skipped.
  async intro() {
    run.introSeen = true;
    this.cutscene = true;
    const { lot } = this;
    lot.body.setVelocityX(0);
    this.enemies.forEach(e => { if (e.alive) { e.setVelocityX(0); e.anims.stop(); } });
    const wait = (ms) => new Promise(r => this.time.delayedCall(ms, r));
    const box = letterbox(this);
    const feet = lot.body.bottom;
    const door = { x: this.introX - 6.5 * TILE, y: feet - 12 }; // Lot's house (the back wall left of the 'A')
    const cam = this.cameras.main;
    const tailX = Math.max(lot.x - 80, Math.min(lot.x, ...this.family.members.filter(m => m.visible).map(m => m.x)));
    // one angel between Lot and the mob on the right, one behind the family facing the mob on the left
    const spots = [{ x: lot.x + 20, y: feet - 28 }, { x: tailX - 18, y: feet - 28 }];
    const angels = spots.map((sp, i) => this.add.sprite(door.x, door.y, 'angel').setScale(ART_SCALE).setDepth(-0.6)
      .setAlpha(0).setFlipX(i === 1).play({ key: 'angel-flap', startFrame: Phaser.Math.Between(0, 3) }));
    // the mob: decorative Sodomites (no physics), most from the right, some from behind; each walks toward a spot
    // packed around the family, but the angels strike before anyone gets there
    const mob = [];
    const addMob = (n, side) => {
      for (let i = 0; i < n; i++) {
        const from = side > 0 ? viewX(cam) + GAME_WIDTH + 12 + i * 14 + Phaser.Math.Between(0, 8) : viewX(cam) - 12 - i * 14 - Phaser.Math.Between(0, 8);
        const to = side > 0 ? lot.x + 30 + i * 9 : tailX - 34 - i * 9;
        const m = this.add.sprite(from, feet, 'sodomite').setScale(ART_SCALE).setOrigin(0.5, 1).setFlipX(side > 0)
          .setDepth(0.15 + (i % 3) * 0.02).play({ key: 'sodomite-walk', startFrame: Phaser.Math.Between(0, 3) });
        m.side = side;
        m.walk = this.tweens.add({ targets: m, x: to, duration: 3000 + i * 120, ease: 'Sine.out' });
        mob.push(m);
      }
    };
    // Sodomites scattered by the angels: flung away from Lot, spinning, and gone
    const scatter = () => mob.forEach((m, i) => {
      if (!m.active) return;
      m.walk.stop();
      m.anims.stop();
      puff(this, m.x, m.y - 8, 0xffffff, 4);
      this.tweens.add({ targets: m, x: m.x + m.side * Phaser.Math.Between(80, 170), y: m.y - Phaser.Math.Between(40, 110),
        angle: m.side * Phaser.Math.Between(360, 900), alpha: 0, delay: i * 25, duration: 700, ease: 'Quad.out',
        onComplete: () => m.destroy() });
    });
    const facing = (dir) => this.family.members.forEach(m => { m.faceOverride = dir; if (dir) m.setFlipX(dir < 0); });
    // the mob arrives: from the right first, then from behind; the ground rumbles under the crowd
    addMob(12, 1);
    rumble(this, 2900, 0.5);
    shake(this, 2900, 0.0006); // a faint rumble; ends before the strike: a running shake would swallow the next one
    await wait(500);
    popText(this, lot.x, lot.y - 24, '!');
    addMob(6, -1);
    await wait(700);
    lot.setFlipX(true); // they are behind us too!
    facing(-1);
    this.family.members.filter(m => m.visible).forEach((m, i) => this.time.delayedCall(i * 120, () => popText(this, m.x, m.y - 24, '!')));
    await wait(700);
    lot.setFlipX(false);
    facing(1);
    await wait(500);
    // the angels burst out of the house between the family and the mob
    flash(this, 200, 255, 240, 200);
    angels.forEach((a, i) => this.tweens.add({ targets: a, alpha: 1, x: spots[i].x, y: spots[i].y, delay: i * 120,
      duration: 380, ease: 'Quad.out', onComplete: () => this.tweens.add({ targets: a, y: a.y - 2, duration: 450,
        yoyo: true, repeat: -1, ease: 'Sine.inOut' }) }));
    await wait(650);
    // ... and strike the mob (Genesis 19:11): a blinding flash and a quake, and they are gone
    flash(this, 700, 255, 255, 235);
    rumble(this, 1200, 0.7);
    shake(this, 700, 0.02);
    scatter();
    await wait(1000);
    // they turn from the fleeing mob to the family to speak
    angels[0].setFlipX(true);
    angels[1].setFlipX(false);
    await wait(400);
    for (const [a, text, ms] of [[angels[1], t('say.flee'), 900], [angels[0], t('say.dontLook'), 1500]]) {
      speech(this, a.x + 2, a.y - 10, ms, text);
      await wait(ms + 200);
    }
    this.ignite();
    await wait(900);
    popText(this, lot.x, lot.y - 24, '!');
    lot.setFlipX(false); // to the way out
    facing(1);
    await wait(900);
    facing(null);
    angels.forEach((a, i) => this.tweens.add({ targets: a, x: a.x + 140, y: a.y - 130, alpha: 0, delay: i * 120,
      duration: 700, ease: 'Quad.in', onComplete: () => a.destroy() }));
    box.hide();
    this.cutscene = false;
  }

  // The destruction begins: a flash and a rumble, comets streak over the rooftops, the night layers fade into the
  // burning city, the fire scenery flares up and the Sodomites still around burn. Then the wall of fire starts
  // behind Lot's house. Runs once.
  ignite() {
    if (!this.calm) return;
    this.calm = false;
    flash(this, 600, 255, 150, 50);
    rumble(this, 0, 0.35, true);
    shake(this, 900, 0.012);
    this.calmArt.forEach(o => this.tweens.add({ targets: o, alpha: 0, duration: 1600, ease: 'Sine.in', onComplete: () => o.destroy() }));
    this.fireDecor.forEach(o => this.tweens.add({ targets: o, alpha: 1, delay: 300, duration: 1200 }));
    this.enemies.filter(e => e.alive && e.x < this.introX + GAME_WIDTH)
      .forEach((e, i) => this.time.delayedCall(250 + i * 150, () => { if (e.alive) e.burn(); }));
    const cam = this.cameras.main;
    for (let i = 0; i < 5; i++) {
      const x = viewX(cam) + 40 + i * 70 + Phaser.Math.Between(-20, 20), y = viewY(cam) - 20;
      const c = this.add.sprite(x, y, 'fireball').setScale(ART_SCALE).setDepth(-1.6).play('fireball-flicker');
      c.setOrigin(COMET_HEAD.x / c.width, COMET_HEAD.y / c.height).setRotation(Math.atan2(1, 0.7) - Math.PI / 4);
      this.tweens.add({ targets: c, x: x + 84, y: y + 120, delay: i * 180, duration: 700, ease: 'Quad.in',
        onComplete: () => { puff(this, c.x, c.y, 0xff8a1e); c.destroy(); } });
    }
    this.destruction.x = this.introX - WALL_BEHIND;
    this.destruction.delay = DESTRUCTION.startDelayMs;
    this.destruction.place();
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
    const lot = this.lot;
    const fell = lot.y > WORLD_H + 40; // off the world: nobody turns to salt, they are just lost
    const gameOver = saltLife(this, this.family, fell);
    if (!gameOver) {
      // a family member turned to salt in Lot's place: carry on from here
      shake(this, 200, 0.01);
      if (lot.y > WORLD_H + 40 && this.lastSafe) lot.setPosition(this.lastSafe.x, this.lastSafe.y);
      if (lot.body.left < this.destruction.x) {
        this.destruction.x = lot.body.left - 140;
        this.destruction.delay = 1500;
        this.destruction.place();
      }
      lot.body.setVelocity(0, 0);
      this.grace(1500);
      return;
    }
    this.restarting = true;
    this.physics.pause();
    lot.setTint(0xff4040);
    shake(this, 200, 0.01);
    this.tweens.add({ targets: lot, y: lot.y - 24, duration: 150, ease: 'Quad.out', onComplete: () => {
      this.tweens.add({ targets: lot, y: lot.y + 200, angle: 360, duration: 550, ease: 'Quad.in' });
    } });
    this.time.delayedCall(800, () => (run.checkpointX !== null ? this.scene.restart() : this.scene.start('TitleScene')));
  }

  // brief invulnerability after a sacrifice (also makes enemies bonk off Lot)
  grace(ms) {
    const lot = this.lot;
    lot.protected = true;
    this.tweens.add({ targets: lot, alpha: 0.3, duration: 80, yoyo: true, repeat: Math.floor(ms / 160) - 1,
      onComplete: () => { lot.setAlpha(1); if (this.boost.timer <= 0) lot.protected = false; } });
  }

  // Act I's ending, as a cinematic: the view letterboxes, Lot walks the family to the edge of the chasm, and
  // with nowhere left to go, angels swoop down and carry them away (lift).
  async startPickup() {
    this.cutscene = true;
    run.checkpointX = null; // Act I is finished
    this.destruction.stopped = true;
    this.sulfur.stop();
    if (this.boost.timer > 0) this.boost.end();
    const { lot, family } = this;
    const cam = this.cameras.main;
    const wait = (ms) => new Promise(r => this.time.delayedCall(ms, r));
    lot.protected = true;
    lot.body.setAcceleration(0, 0);
    lot.setFlipX(false);
    family.members[0].cancelLook();
    family.members.forEach(m => { if (m.state === 'salted') m.lose(); });
    const box = letterbox(this);

    // to the edge, the family right behind him
    await wait(300);
    this.autoWalkX = this.edgeX;
    await new Promise(r => { this.autoWalkDone = r; });
    this.autoWalkX = null;
    lot.body.setVelocityX(0);
    await wait(1200); // the family catches up and stops
    speech(this, lot.x, lot.body.top - 3, 2000, t('say.noWay'));
    await wait(2300);
    popText(this, lot.x, lot.y - 24, '!');
    await wait(500);

    const angels = [0, 1].map(() => this.add.sprite(viewX(cam) - 20, viewY(cam) - 20, 'angel').setScale(ART_SCALE).setDepth(700).play('angel-flap'));
    const vis = () => family.members.filter(m => m.visible && m.state !== 'lost');
    const hover = () => {
      const v = vis();
      const bx = v.length ? v.reduce((sum, m) => sum + m.x, 0) / v.length : lot.x - 30;
      const by = v.length ? v[0].y - v[0].displayHeight - 22 : lot.y - lot.displayHeight - 6;
      return [{ x: lot.x, y: lot.y - lot.displayHeight - 6 }, { x: bx, y: by }];
    };
    const fly = (targets) => Promise.all(angels.map((a, i) => new Promise(r =>
      this.tweens.add({ targets: a, x: targets[i].x, y: targets[i].y, duration: 700, onComplete: r }))));
    await fly(hover());

    // the angels give back everyone lost along the way, and Lot rejoices
    const lostOnes = family.members.filter(m => m.state === 'lost');
    if (lostOnes.length) {
      flash(this, 300, 255, 240, 200);
      lostOnes.forEach(m => m.restore(true));
      await wait(150);
      if (lostOnes.length) sfx(this, 'powerUp2');
      lostOnes.forEach(m => { puff(this, m.x, m.y - 8, 0xffe14a); popText(this, m.x, m.y - 24, t('pop.saved'), '#ffe14a'); });
      await wait(700);
      lot.setFlipX(true); // turn back toward the family
      await wait(350);
      speech(this, lot.x, lot.body.top - 3, 1800, t('say.family'));
      lot.body.setVelocityY(-170);
      await wait(600);
      lot.body.setVelocityY(-170);
      await wait(1400);
      lot.setFlipX(false);
      await fly(hover());
    }
    popText(this, lot.x, lot.y - 30, t('pop.hallelujah'), '#ffe14a');
    await wait(300);
    this.lift(angels, vis());
  }

  lift(angels, members) {
    this.lifting = true;
    const cam = this.cameras.main;
    cam.stopFollow();
    this.lot.body.enable = false;
    [this.lot, ...members].forEach((m, i) => m.play(`${m === this.lot ? 'lot' : m.memberName}-hang`));
    const targets = [this.lot, ...angels, ...members];
    targets.forEach((t, i) => {
      this.tweens.add({ targets: t, y: '-=220', x: '+=40', duration: 1400, ease: 'Sine.in',
        onComplete: () => {
          if (i !== 0) return;
          fadeOut(this, 400, () => this.scene.start('FlightScene'));
        } });
    });
  }

  buildChasm() {
    const x0 = (LEVEL.cols - CHASM_COLS) * TILE;
    this.pitFire(x0, WORLD_W - x0);
  }

  // Fire light and flames at the bottom of a pit (x .. x + w). The camera never shows below CAM_BOTTOM.
  pitFire(x, w) {
    this.add.rectangle(x, CAM_BOTTOM - 8, w, WORLD_H - CAM_BOTTOM + 8, 0xff8c28).setOrigin(0).setDepth(-0.8);
    this.add.tileSprite(x, CAM_BOTTOM - 40, w * 2, 64, 'pitglow').setScale(ART_SCALE).setOrigin(0).setDepth(-0.8);
    for (let fx = x + 6; fx < x + w; fx += 12) {
      const f = this.add.sprite(fx + Phaser.Math.Between(-2, 2), CAM_BOTTOM + 2, 'flame').setScale(ART_SCALE).setOrigin(0.5, 1).setDepth(-0.7)
        .play({ key: 'flame-flicker', startFrame: Phaser.Math.Between(0, 3) });
      this.tweens.add({ targets: f, scaleY: Phaser.Math.FloatBetween(1.2, 1.6) * ART_SCALE, duration: Phaser.Math.Between(180, 320), yoyo: true, repeat: -1 });
    }
  }

  // Scenery with no gameplay. Fire stays off walkable ground so it never reads as a hazard: flames flicker in
  // windows, blazes burn on ruined wall tops and in every pit; rubble lies along the street.
  decorate(backMask) {
    const at = (c, r) => (r < 0 || r >= ROWS || c < 0 || c >= LEVEL.cols ? -1 : LEVEL.data[r][c]);
    const solidAt = (c, r) => SOLID.includes(at(c, r));
    const nearEntity = (c) => LEVEL.entities.some(e => Math.abs(e.col - c) <= 2);
    const rnd = (c, r, s) => hash(c, r, s);
    const hide = (o) => { if (this.calm) { o.setAlpha(0); this.fireDecor.push(o); } return o; };
    const flame = (x, y, key, anim, depth) => hide(this.add.sprite(x, y, key).setScale(ART_SCALE).setOrigin(0.5, 1).setDepth(depth)
      .play({ key: anim, startFrame: Phaser.Math.Between(0, 3) }));

    let pitStart = -1;
    for (let c = 0; c <= LEVEL.cols; c++) {
      for (let r = 0; r < ROWS; r++) {
        const x = c * TILE + TILE / 2;
        if (at(c, r) === TILE_CHARS.w && rnd(c, r, 1) < 0.6) flame(x, r * TILE + 13, 'flame_small', 'flame-small', -1.45);
        // blaze behind a ruined wall top: its flat base sits below the deepest possible break (12 units) and the
        // wall continues on both sides, so the wall always hides it
        const wallTop = (k) => backMask[r]?.[k] && !backMask[r - 1]?.[k] && backMask[r + 1]?.[k];
        if (wallTop(c) && wallTop(c - 1) && wallTop(c + 1) && rnd(c, r, 2) < 0.1) {
          flame(x, r * TILE + 18, 'flame', 'flame-flicker', -1.55).setScale((1.7 + rnd(c, r, 7) * 0.5) * ART_SCALE);
        }
        if (r === STREET_TOP / TILE && at(c, r) === TILE_CHARS['#'] && !solidAt(c, r - 1) && backMask[r - 1]?.[c] && !nearEntity(c) && rnd(c, r, 3) < 0.16) {
          hide(this.add.image(x + rnd(c, r, 4) * 6 - 3, r * TILE + 1, 'rubble', Math.floor(rnd(c, r, 5) * 3)).setScale(ART_SCALE)
            .setOrigin(0.5, 1).setFlipX(rnd(c, r, 6) < 0.5).setDepth(-0.95));
        }
      }
      // pits: columns with no ground at the street, before the chasm
      const pit = c < LEVEL.cols - CHASM_COLS && at(c, ROWS - 1) < 0 && !solidAt(c, ROWS - 1);
      if (pit && pitStart < 0) pitStart = c;
      if (!pit && pitStart >= 0) { this.pitFire(pitStart * TILE, (c - pitStart) * TILE); pitStart = -1; }
    }
  }

  buildBackground() {
    buildSodomBackdrop(this);
    this.add.image(0, 0, 'sodom-sky').setOrigin(0).setScale(ART_SCALE).setScrollFactor(0).setDepth(-3);
    // [texture, width px, scroll x, scroll y, y at the top of the level, depth]; bottoms stay below the
    // screen at the lowest camera position (view y 140)
    const layers = [
      ['sodom-clouds', CLOUD_W, 0.05, 0.02, 0, -2.9],
      ['sodom-far', FAR_W, 0.15, 0.1, 74, -2.6],
      ['sodom-mid', MID_W, 0.35, 0.3, 82, -2.2],
    ];
    const addLayers = (night) => layers.forEach(([key, w, fx, fy, y, depth], i) => {
      const tw = w * ART_SCALE;
      for (let x = 0; x < WORLD_W * fx + GAME_WIDTH + tw; x += tw) {
        const img = this.add.image(x, y, night ? key.replace('sodom-', 'sodom-night-') : key).setOrigin(0).setScale(ART_SCALE)
          .setScrollFactor(fx, fy).setDepth(night ? -2 + i * 0.1 : depth);
        if (night) this.calmArt.push(img);
      }
    });
    addLayers(false);
    if (!this.calm) return;
    // the calm night, stacked over the whole burning backdrop (depths -2.1 .. -1.8, below the terrain)
    buildSodomNightBackdrop(this);
    this.calmArt.push(this.add.image(0, 0, 'sodom-night-sky').setOrigin(0).setScale(ART_SCALE).setScrollFactor(0).setDepth(-2.1));
    addLayers(true);
  }

  buildTerrain() {
    // collision: the plain 16px map, not drawn
    const map = this.make.tilemap({ data: LEVEL.data, tileWidth: TILE, tileHeight: TILE });
    const tileset = map.addTilesetImage('tiles', 'tiles', TILE, TILE, 0, 0);
    const layer = map.createLayer(0, tileset, 0, 0).setVisible(false);
    layer.setCollision(SOLID);
    layer.forEachTile(t => { if (t.index === ONE_WAY) t.setCollision(false, false, true, false); });
    this.terrain = layer;

    // visuals: autotiled 2x art (src/art/sodomTiles.js), a back-wall layer behind a front layer
    // painted once per page load (~100ms); restarts reuse the texture
    if (!tileArt || !this.textures.exists(tileArt.key)) tileArt = buildSodomTiles(this, LEVEL.data);
    const art = tileArt;
    const layers = (art, depths) => [art.back, art.front].map((data, i) => {
      const m = this.make.tilemap({ data, tileWidth: TILE * 2, tileHeight: TILE * 2 });
      const ts = m.addTilesetImage(art.key, art.key, TILE * 2, TILE * 2, 1, 2);
      return m.createLayer(0, ts, 0, 0).setScale(ART_SCALE).setDepth(depths[i]);
    });
    layers(art, [-1.5, -1]);
    if (this.calm) {
      // the intact city, over the burning one (and its fire scenery) up to a little past Lot's door
      const cols = INTRO.col + 26;
      if (!nightArt || !this.textures.exists(nightArt.key)) {
        nightArt = buildSodomTiles(this, LEVEL.data.map(row => row.slice(0, cols)), 'sodom-tiles-night', { calm: true });
      }
      this.calmArt.push(...layers(nightArt, [-1.44, -0.94]));
    }
    this.decorate(art.backMask);
  }

  // true while Lot is over a bottomless pit (or within a tile of one)
  overPit(lot) {
    const last = ROWS - 1, data = LEVEL.data;
    const c0 = Math.floor((lot.body.left - TILE) / TILE), c1 = Math.floor((lot.body.right + TILE) / TILE);
    for (let c = c0; c <= c1; c++) if (c >= 0 && c < LEVEL.cols && !SOLID.includes(data[last][c])) return true;
    return false;
  }

  // true if a comet landing at world x would fall on or beside a bottomless pit (within ~2 tiles)
  nearPit(x) {
    const last = ROWS - 1, data = LEVEL.data;
    const c0 = Math.floor(x / TILE) - 2, c1 = Math.floor(x / TILE) + 2;
    for (let c = c0; c <= c1; c++) if (c >= 0 && c < LEVEL.cols && !SOLID.includes(data[last][c])) return true;
    return false;
  }

  // invisible floors across every bottomless pit, solid only while the angels carry Lot
  buildPitFloors() {
    const data = LEVEL.data, last = ROWS - 1;
    const solid = (r, c) => SOLID.includes(data[r][c]);
    const surface = (c) => { let r = last; while (r > 0 && solid(r - 1, c)) r--; return r; };
    this.pitFloors = this.physics.add.staticGroup();
    for (let c = 0; c < LEVEL.cols; c++) {
      if (solid(last, c)) continue;
      let end = c;
      while (end + 1 < LEVEL.cols && !solid(last, end + 1)) end++;
      if (c > 0 && end + 1 < LEVEL.cols) {
        const row = Math.min(surface(c - 1), surface(end + 1));
        const w = (end - c + 1) * TILE;
        const z = this.add.zone(c * TILE + w / 2, row * TILE + TILE / 2, w, TILE);
        this.physics.add.existing(z, true);
        z.body.checkCollision.down = z.body.checkCollision.left = z.body.checkCollision.right = false;
        this.pitFloors.add(z);
      }
      c = end;
    }
    this.physics.add.collider(this.lot, this.pitFloors, null, () => this.boost.timer > 0);
  }

  update(time, delta) {
    this.controls.update();
    if (this.restarting) return;

    if (this.cutscene) {
      if (this.autoWalkX != null) {
        const lot = this.lot, dx = this.autoWalkX - lot.x;
        lot.update({ left: false, right: dx > 3, jumpDown: false, jumpPressed: false }, delta);
        this.trail.record(lot.x, lot.body.bottom, lot.facing, lot.onGround);
        if (dx <= 3 && this.autoWalkDone) { const d = this.autoWalkDone; this.autoWalkDone = null; d(); }
      }
      else if (!this.lifting) this.lot.update({}, delta);
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

    if (this.lot.x > this.gateX) { this.startPickup(); return; }
    if (this.calm && this.lot.x > this.introX && this.lot.onGround) { this.intro(); return; }
    const cam = this.cameras.main;
    this.lot.update(this.controls, delta);
    this.trail.record(this.lot.x, this.lot.body.bottom, this.lot.facing, this.lot.onGround);
    this.family.update(delta);
    this.enemies.forEach(e => e.update(this.lot, cam, this.destruction.x, WORLD_H));
    this.boost.update(delta);

    if (!this.calm) {
      this.vents.forEach(v => v.update(delta));
      this.destruction.update(delta, cam);
      this.sulfur.update(delta, this.lot, cam);
      this.family.applyDestruction(this.destruction.x);
      if (this.lot.body.left < this.destruction.x) { this.killLot(true); return; }
    }

    this.hud.update();
    if (this.lot.onGround && this.lot.body.left > this.destruction.x + 40) this.lastSafe = { x: this.lot.x, y: this.lot.y };

    const fb = this.familyBanner;
    if (fb && !fb.active && this.lot.x > fb.x) {
      fb.activate(this);
      this.family.rescueAll();
      this.family.members.forEach(m => m.restore());
    }
    for (const cp of this.checkpoints) {
      if (!cp.active && this.lot.x > cp.x) { cp.activate(this); saveCheckpoint(cp.x); }
    }

    if (this.debugText) {
      this.debugKeys.forEach((k, i) => {
        if (Phaser.Input.Keyboard.JustDown(k)) this.family.members[i].saltify(true);
      });
      if (Phaser.Input.Keyboard.JustDown(this.keyZero)) { resetRun(); this.restarting = true; this.scene.restart(); return; }
      if (Phaser.Input.Keyboard.JustDown(this.keyFour)) this.family.members[0].lookTimer = 0;
      if (Phaser.Input.Keyboard.JustDown(this.keyFive)) this.boost.start();
      const b = this.lot.body;
      this.debugText.setText(
        `vx ${b.velocity.x.toFixed(0)} vy ${b.velocity.y.toFixed(0)} onGround ${this.lot.onGround} wall:${this.destruction.x | 0} balls:${this.sulfur.balls.getLength()} enemies:${this.enemies.filter(e => e.alive).length} boost:${Math.max(0, this.boost.timer | 0)} col:${(this.lot.x / TILE) | 0} cp:${run.checkpointX ?? '-'}\n` +
        this.family.members.map(m => `${m.memberName}:${m.state}`).join(' '));
    }
  }
}
