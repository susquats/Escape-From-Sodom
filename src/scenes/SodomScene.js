import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT, TILE, DEBUG, MOVE, FAMILY, START_CP } from '../config.js';
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
import { popText, saltLife } from '../fx.js';
import { SODOM_SECTIONS } from '../levels/sodom.js';
import { parseLevel, ROWS, SOLID, ONE_WAY, TILE_CHARS } from '../levels/parseLevel.js';
import { hash } from '../art/pix.js';
import { buildSodomTiles } from '../art/sodomTiles.js';
import { buildSodomBackdrop, CLOUD_W, FAR_W, MID_W } from '../art/sodomBackdrop.js';
import { setupView, fadeIn, fadeOut, shake, setViewX, setViewY, viewX, viewY, ART_SCALE } from '../view.js';

const LEVEL = parseLevel(SODOM_SECTIONS);
const WORLD_W = LEVEL.cols * TILE;
const WORLD_H = ROWS * TILE;
const STREET_TOP = 17 * TILE; // y of the normal street surface
const CAM_BOTTOM = 20 * TILE; // the camera never scrolls below this (saves screen on plain ground)
const CHASM_COLS = 6;
let cpDebugApplied = false;
let tileArt = null; // Act I tileset + layer grids (src/art/sodomTiles.js)

export default class SodomScene extends Phaser.Scene {
  constructor() {
    super('SodomScene');
  }

  create() {
    setupView(this);
    this.physics.world.gravity.y = MOVE.gravity;
    this.cutscene = false;
    this.lifting = false;
    this.physics.world.setBounds(0, 0, WORLD_W, WORLD_H);
    this.physics.world.setBoundsCollision(true, true, true, false);

    // debug: ?cp=N starts at the Nth checkpoint (first load only)
    const cps = LEVEL.entities.filter(e => e.type === 'checkpoint');
    if (!cpDebugApplied) {
      cpDebugApplied = true;
      if (START_CP > 0 && run.checkpointX === null && cps[START_CP - 1]) {
        saveCheckpoint(cps[START_CP - 1].col * TILE + TILE / 2);
      }
    }
    const cpX = run.checkpointX;
    const cx = (e) => e.col * TILE + TILE / 2;
    const feetY = (e) => (e.row + 1) * TILE;

    this.buildBackground();
    this.buildTerrain();
    this.buildChasm();

    const spawn = cpX === null
      ? LEVEL.entities.find(e => e.type === 'lot')
      : cps.find(e => cx(e) === cpX) || LEVEL.entities.find(e => e.type === 'lot');
    this.lot = new Lot(this, cx(spawn), feetY(spawn) - 10);
    this.physics.add.collider(this.lot, this.terrain);
    this.buildPitFloors();

    this.trail = new Trail(this.lot.x, feetY(spawn), FAMILY.trailMaxLength);
    this.family = new Family(this, this.trail, this.terrain);

    this.vents = [];
    this.enemies = [];
    this.halos = [];
    this.checkpoints = [];
    let gate = null;
    const behind = (e) => cpX !== null && cx(e) < cpX + 64;
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

    this.destruction = new Destruction(this, WORLD_H);
    if (cpX !== null) {
      this.destruction.x = cpX - 240;
      this.destruction.delay = 1500;
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

    // the way out: a halo by the wall calls the angels
    this.gateHalo = new Halo(this, cx(gate), (gate.row + 1) * TILE - 14).setScale(1.5 * ART_SCALE);
    this.physics.add.overlap(this.lot, this.gateHalo, (lot, h) => {
      if (!h.active || this.cutscene) return;
      h.collect();
      this.startPickup();
    });

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
    const lot = this.lot;
    const gameOver = saltLife(this, this.family);
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

  startPickup() {
    this.cutscene = true;
    run.checkpointX = null; // Act I is finished
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
      const angels = [0, 1].map(() => this.add.sprite(viewX(cam) - 20, viewY(cam) - 20, 'angel').setScale(ART_SCALE).setDepth(700).play('angel-flap'));
      const vis = () => family.members.filter(m => m.visible && m.state !== 'lost');
      const v = vis();
      const bx = v.length ? v.reduce((sum, m) => sum + m.x, 0) / v.length : lot.x - 30;
      const by = v.length ? v[0].y - v[0].displayHeight - 22 : lot.y - lot.displayHeight - 6;
      const targets = [{ x: lot.x, y: lot.y - lot.displayHeight - 6 }, { x: bx, y: by }];
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
    [this.lot, ...members].forEach((m, i) => m.play({ key: `${m === this.lot ? 'lot' : m.memberName}-hang`, startFrame: i % 2 }));
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
    const flame = (x, y, key, anim, depth) => this.add.sprite(x, y, key).setScale(ART_SCALE).setOrigin(0.5, 1).setDepth(depth)
      .play({ key: anim, startFrame: Phaser.Math.Between(0, 3) });

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
          this.add.image(x + rnd(c, r, 4) * 6 - 3, r * TILE + 1, 'rubble', Math.floor(rnd(c, r, 5) * 3)).setScale(ART_SCALE)
            .setOrigin(0.5, 1).setFlipX(rnd(c, r, 6) < 0.5).setDepth(-0.95);
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
    for (const [key, w, fx, fy, y, depth] of layers) {
      const tw = w * ART_SCALE;
      for (let x = 0; x < WORLD_W * fx + GAME_WIDTH + tw; x += tw) {
        this.add.image(x, y, key).setOrigin(0).setScale(ART_SCALE).setScrollFactor(fx, fy).setDepth(depth);
      }
    }
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
    [[art.back, -1.5], [art.front, -1]].forEach(([data, depth]) => {
      const m = this.make.tilemap({ data, tileWidth: TILE * 2, tileHeight: TILE * 2 });
      const ts = m.addTilesetImage(art.key, art.key, TILE * 2, TILE * 2, 1, 2);
      m.createLayer(0, ts, 0, 0).setScale(ART_SCALE).setDepth(depth);
    });
    this.decorate(art.backMask);
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
    if (this.lot.onGround && this.lot.body.left > this.destruction.x + 40) this.lastSafe = { x: this.lot.x, y: this.lot.y };

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
