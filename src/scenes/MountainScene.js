import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT, DEBUG, MOVE, MOUNTAIN } from '../config.js';
import Lot from '../objects/Lot.js';
import Controls from '../input/Controls.js';
import RunHud from '../ui/RunHud.js';
import MountainFollowers from '../objects/MountainFollowers.js';
import { run } from '../runState.js';
import { popText, puff, sfx, voice, loseLife, speech, letterbox, playMusic } from '../fx.js';
import { setupView, fadeIn, fadeOut, shake, setViewY, viewY, ART_SCALE } from '../view.js';
import { buildMountainArt, buildCliff, ledgeKey, SUMMIT_LIP, LEDGE_HEADROOM, CITY_X, HORIZON, PEAK } from '../art/mountainArt.js';
import { noise1 } from '../art/pix.js';
import { AIR_FRAMES, LOT_FRAMES } from '../art/characters.js';
import { standIdle } from '../art/sprites.js';
import { t } from '../i18n.js';

let cliffChunks = null; // painted cliff (src/art/mountainArt.js buildCliff)
const STROKE = { fontFamily: 'monospace', fontSize: '8px', color: '#fff', stroke: '#000', strokeThickness: 2 };

export default class MountainScene extends Phaser.Scene {
  constructor() {
    super('MountainScene');
  }

  create() {
    setupView(this);
    playMusic(this, 'newer-ashes-of-ur');
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
    this.buildCliff(H);

    this.lot = new Lot(this, 160, H - 8 - 20);
    const onLand = (lot, p) => { if (lot.body.touching.down || lot.body.blocked.down) this.landOn(p); };
    this.physics.add.collider(this.lot, this.platforms, onLand);
    this.physics.add.collider(this.lot, this.movers, onLand);

    this.followers = new MountainFollowers(this, this.lot);
    this.salts = [];
    this.hud = new RunHud(this);
    this.controls = new Controls(this, { touchButtons: ['left', 'right', 'restart'] });

    const cam = this.cameras.main;
    cam.setBounds(0, 0, GAME_WIDTH, H);
    setViewY(cam, H - GAME_HEIGHT);
    fadeIn(this, 400);

    const title = this.add.text(GAME_WIDTH / 2, 40, t('act3'), { ...STROKE, fontSize: '12px' })
      .setOrigin(0.5).setAlign('center').setScrollFactor(0).setDepth(900);
    this.tweens.add({ targets: title, alpha: 0, delay: 1500, duration: 600 });
    const touch = this.sys.game.device.input.touch;
    const hint = this.add.text(GAME_WIDTH / 2, 80, touch ? t('hint.steerTouch') : t('hint.steerKeys'), STROKE)
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

  // The view (src/art/mountainArt.js): night sky, a far cliff on the left, and far out on the plain Sodom
  // burning, meteors falling on it, drifting clouds. The cliff itself is painted after the platforms (buildCliff).
  buildBackground(H) {
    const M = MOUNTAIN;
    buildMountainArt(this);
    this.add.image(0, 0, 'mtn-sky').setOrigin(0).setScale(ART_SCALE).setScrollFactor(0).setDepth(-3);
    // the plain sinks a little as Lot climbs (see update)
    this.vista = ['mtn-city', 'mtn-ridges'].map((k, i) => this.add.image(0, 0, k).setOrigin(0).setScale(ART_SCALE).setScrollFactor(0).setDepth(-2.9 + i * 0.1));
    // a far cliff on the left, scrolling slowly (see update)
    this.distant = this.add.tileSprite(0, 0, GAME_WIDTH * 2, GAME_HEIGHT * 2, 'mtn-distant').setOrigin(0).setScale(ART_SCALE)
      .setScrollFactor(0).setDepth(-2.75);
    // meteors falling on Sodom
    this.time.addEvent({ delay: 900, loop: true, callback: () => this.meteor() });
    const rnd = new Phaser.Math.RandomDataGenerator(['clouds']);
    for (let y = H - 200; y > M.topY + 100; y -= rnd.between(160, 260)) {
      const c = this.add.image(rnd.between(40, 240), y, `mtn-cloud${rnd.between(0, 2)}`).setScale(ART_SCALE).setDepth(-1.7).setAlpha(0.9);
      this.tweens.add({ targets: c, x: c.x + rnd.pick([-1, 1]) * rnd.between(40, 80), duration: rnd.between(9000, 14000), yoyo: true, repeat: -1, ease: 'Sine.inOut' });
    }
  }

  // A meteor streaks down onto the burning city far away and flares where it lands.
  meteor() {
    const land = { x: CITY_X / 2 + Phaser.Math.Between(-60, 60), y: HORIZON / 2 + this.vista[0].y - Phaser.Math.Between(0, 30) };
    const from = { x: land.x + Phaser.Math.Between(-140, 60), y: -10 };
    const m = this.add.image(from.x, from.y, 'mtn-meteor').setScale(ART_SCALE).setScrollFactor(0).setDepth(-2.85)
      .setOrigin(20 / 24, 20 / 24).setRotation(Math.atan2(land.y - from.y, land.x - from.x) - Math.PI / 4);
    this.tweens.add({ targets: m, x: land.x, y: land.y, duration: Phaser.Math.Between(900, 1600), onComplete: () => {
      m.destroy();
      const f = this.add.image(land.x, land.y, 'pixel').setTint(0xffb848).setScrollFactor(0).setDepth(-2.85);
      this.tweens.add({ targets: f, scale: 3, alpha: 0, duration: 400, onComplete: () => f.destroy() });
    } });
  }

  // The cliff seen a little from the side: its left silhouette juts out behind every ledge (so each ledge is
  // an outcrop) and pulls back between them; the shadowed near side begins at the right of the column.
  buildCliff(H) {
    const M = MOUNTAIN;
    const edgeAt = (y) => {
      if (y > H - 11) return 0;
      let e = 205;
      for (const o of this.outcrops) {
        if (Math.abs(o.y - y) > 90) continue;
        const dy = y < o.y ? (o.y - y) * 1.8 : y > o.y + 9 ? (y - o.y - 9) * (o.slope || 1.1) : 0;
        e = Math.min(e, o.left - 3 + dy);
      }
      return Phaser.Math.Clamp(e + (noise1(y / 11, 5) - 0.5) * 10 + (noise1(y / 3.5, 6) - 0.5) * 7, 40, 230);
    };
    const sideAt = (y) => M.columnRight + noise1(y / 13, 7) * 5;
    // the ledge layout is seeded, so the cliff is the same every run: paint it once (~100ms)
    if (!cliffChunks || !this.textures.exists(cliffChunks[0].key)) cliffChunks = buildCliff(this, M.topY, H + 8, edgeAt, sideAt, this.outcrops.filter(o => o.kind === 'normal'));
    cliffChunks.forEach(({ key, y }) => this.add.image(0, y, key).setOrigin(0).setScale(ART_SCALE).setDepth(-1.5));
  }

  makePlatform(x, y, w, type) {
    // physics: the old invisible strip (one-way, 6 units tall, top at y - 3); visuals are separate
    const p = this.add.tileSprite(x, y, w, 6, 'ledge').setTileScale(ART_SCALE).setVisible(false);
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
      // the slab slides in a groove cut across the face
      this.add.tileSprite(a - w / 2 - 3, y - 4, (c - a + w + 6) * 2, 16, 'mtn-groove').setOrigin(0).setScale(ART_SCALE).setDepth(-1.4);
    }
    if (type === 'normal' || type === 'crumble' || type === 'moving') {
      this.outcrops.push({ left: (type === 'moving' ? p.x : x) - w / 2, y, w, kind: type });
      const grass = type === 'moving' ? 0 : LEDGE_HEADROOM; // ledge textures have room for grass above the surface
      p.vis = this.add.image(p.x, y - 3 - grass, ledgeKey(this, type, w)).setOrigin(0.5, 0).setScale(ART_SCALE).setDepth(-1);
    }
    return p;
  }

  buildPlatforms(H) {
    const M = MOUNTAIN;
    const rnd = new Phaser.Math.RandomDataGenerator(['lot-climbs']);
    this.outcrops = [];
    this.makePlatform(160, H - 8, 208, 'base');
    this.add.image(0, H - 11 - SUMMIT_LIP / 2, 'mtn-summit').setOrigin(0).setScale(ART_SCALE).setDepth(-1);
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
      const dxMin = Math.min(M.minDx, dxMax - 8);
      let dx = rnd.between(dxMin, dxMax) * (rnd.frac() < 0.5 ? -1 : 1);
      // if a wall would squash the hop into a near-vertical one, go the other way
      if (Math.abs(Phaser.Math.Clamp(prevX + dx, minX, maxX) - prevX) < dxMin) dx = -dx;
      const x = Phaser.Math.Clamp(prevX + dx, minX, maxX);
      this.makePlatform(x, y, w, type);
      prevMoving = type === 'moving';
      prevCrumble = type === 'crumble';
      prevX = x;
    }
    this.makePlatform(GAME_WIDTH / 2, M.topY, GAME_WIDTH, 'top');
    this.outcrops.push({ left: 44, y: M.topY, slope: 3.5 }); // the cliff top overhangs a little under the summit
    // summit plateau across the whole screen; the mountain rises on at its right with the cave in its foot.
    // The rock right of the mouth is also drawn in front of Lot, so he disappears into the mountain.
    this.add.image(0, M.topY - 3 - SUMMIT_LIP / 2, 'mtn-summit').setOrigin(0).setScale(ART_SCALE).setDepth(-1);
    this.add.image(PEAK.x, M.topY - 3, 'mtn-peak').setOrigin(0, 1).setScale(ART_SCALE).setDepth(-0.95);
    // the cave starts out dark; the light comes up as the daughters talk (familyEnters)
    this.caveDark = this.add.image(PEAK.x, M.topY - 3, 'mtn-peak-dark').setOrigin(0, 1).setScale(ART_SCALE).setDepth(-0.9);
    this.add.image(PEAK.x, M.topY - 3, 'mtn-peak-front').setOrigin(0, 1).setScale(ART_SCALE).setDepth(0.5);
  }

  // A crumbling ledge breaks: its rock falls away in chunks, then it grows back.
  crumble(p) {
    puff(this, p.x, p.y, 0x8e7c74);
    p.body.enable = false;
    p.vis.setVisible(false);
    for (let i = 0; i < 7; i++) {
      const chunk = this.add.image(p.x + Phaser.Math.Between(-p.width / 2, p.width / 2), p.y + Phaser.Math.Between(-2, 6), 'pixel')
        .setTint(Phaser.Utils.Array.GetRandom([0x6a5854, 0x8e7c74, 0xb0a094])).setScale(Phaser.Math.FloatBetween(0.6, 1.4)).setDepth(-0.9);
      this.tweens.add({ targets: chunk, y: chunk.y + Phaser.Math.Between(60, 110), x: chunk.x + Phaser.Math.Between(-10, 10),
        angle: Phaser.Math.Between(-180, 180), alpha: 0, duration: Phaser.Math.Between(600, 900), ease: 'Quad.in', onComplete: () => chunk.destroy() });
    }
    this.time.delayedCall(MOUNTAIN.crumbleRespawnMs, () => {
      p.body.enable = true;
      p.vis.setVisible(true).setAlpha(0);
      this.tweens.add({ targets: p.vis, alpha: 1, duration: 250 });
    });
  }

  landOn(p) {
    if (this.atTop || this.dead) return;
    if (p.kind === 'top') { this.reachSummit(); return; }
    const lot = this.lot;
    lot.body.setVelocityY(-MOUNTAIN.bounceVelocity);
    sfx(this, 'jump', 0.3);
    this.tweens.add({ targets: lot, scaleX: 1.2 * ART_SCALE, scaleY: 0.8 * ART_SCALE, duration: 80, yoyo: true });
    if (p.kind === 'crumble') this.crumble(p);
  }

  // The cinematic waits until the daughters are all with him: any still turned to salt are set out on the plateau
  // (once) for Lot to collect, and the cutscene starts when the last is saved.
  reachSummit() {
    const missing = ['daughter1', 'daughter2'].filter(k => run.lost.has(k));
    if (!missing.length) { this.reachTop(); return; }
    missing.filter(k => !this.salts.some(s => s.key === k)).forEach((k, i) => {
      const x = Phaser.Math.Clamp(this.lot.x + (i ? 36 : -36), MOUNTAIN.columnLeft + 12, MOUNTAIN.columnRight - 12);
      this.dropSalt(k, x, MOUNTAIN.topY - 3);
    });
  }

  // On the summit the bouncing stops and a cinematic takes over: the view letterboxes, Lot walks to the foot of
  // the cave and the family gathers round him and celebrates. He says they should rest in the cave and goes in;
  // familyEnters() then plays out the rest.
  async reachTop() {
    this.atTop = true;
    this.hud.update();
    const lot = this.lot;
    lot.body.setVelocityY(0);
    popText(this, lot.x, lot.y - 24, '!');
    this.physics.world.setBounds(0, 0, GAME_WIDTH, MOUNTAIN.height);
    this.followers.stopX = Infinity;
    const wait = (ms) => new Promise(r => this.time.delayedCall(ms, r));
    letterbox(this); // stays up through the daughters' scene until the fade to the ending
    this.walkTo = { x: PEAK.mouthL - 40 };
    await new Promise(r => { this.walkTo.done = r; });
    this.walkTo = null;
    await wait(500);

    // the family gathers behind him and everyone cheers
    const ground = lot.body.bottom;
    const crew = this.followers.members.filter(m => m.sprite.active && !m.sprite.lostAt);
    this.frozen = true;
    lot.setFlipX(false);
    await Promise.all(crew.map(({ key, sprite }, i) => new Promise(r => {
      sprite.anims.play(`${key}-walk`, true);
      this.tweens.add({ targets: sprite, x: lot.x - 14 * (i + 1), y: ground, duration: 350, onComplete: () => { standIdle(sprite, key); r(); } });
    })));
    const cheers = [{ o: lot, jump: LOT_FRAMES.jump, idle: () => lot.play('lot-idle', true) },
      ...crew.map(({ key, sprite }) => ({ o: sprite, jump: AIR_FRAMES[key].jump, idle: () => standIdle(sprite, key) }))];
    lot.body.enable = false;
    for (let n = 0; n < 3; n++) {
      if (n === 0) speech(this, lot.x, lot.body.top - 3, 1600, t('say.cheer'));
      cheers.forEach(({ o, jump }, i) => this.time.delayedCall(i * 90, () => {
        o.anims.stop(); o.setFrame(jump);
        puff(this, o.x, ground - 12, i % 2 ? 0xffe14a : 0xffffff, 5);
        this.tweens.add({ targets: o, y: '-=9', duration: 170, yoyo: true, ease: 'Quad.out', onComplete: () => o.setFrame(0) });
      }));
      await wait(560);
    }
    cheers.forEach(c => c.idle());
    lot.body.enable = true;
    lot.body.reset(lot.x, lot.y);
    await wait(500);

    const line = t('say.rest');
    speech(this, lot.x, lot.body.top - 3, 2200, line);
    await wait(2500);
    this.entered = true;
  }

  updateSummit(delta) {
    const lot = this.lot;
    if (this.walkTo) {
      // Lot walks himself to the gathering spot
      const dx = this.walkTo.x - lot.x;
      // arrival is a window, not a point: with instant turnaround he can overshoot a 2px target forever
      const arrived = Math.abs(dx) <= 6;
      lot.update({ left: !arrived && dx < 0, right: !arrived && dx > 0, jumpDown: false, jumpPressed: false }, delta);
      if (arrived) {
        lot.body.setVelocityX(0);
        if (this.walkTo.done) { const d = this.walkTo.done; this.walkTo.done = null; d(); }
      }
    } else if (this.entered) {
      lot.update({ right: true, jumpDown: false, jumpPressed: false }, delta);
    }
    if (!this.familyEntering && !this.frozen) this.followers.update();
    if (!this.entered) return;
    // the firelight catches him in the mouth
    const f = Phaser.Math.Clamp((lot.x - PEAK.mouthL) / (PEAK.mouthR - PEAK.mouthL), 0, 1);
    if (f > 0) lot.setTint(Phaser.Display.Color.GetColor(255 - f * 50, 255 - f * 110, 255 - f * 150));
    // out of sight behind the rock: he is in
    if (!this.inside && lot.x > PEAK.mouthR + 10) {
      this.inside = true;
      this.time.delayedCall(700, () => this.familyEnters());
    }
  }

  // Lot is inside. Any daughters left pull out a jug of wine, talk it over ("..."), and follow him in.
  async familyEnters() {
    this.familyEntering = true;
    const end = () => fadeOut(this, 600, () => { this.scene.start('EndingScene'); });
    const girls = this.followers.members.filter(m => m.sprite.active && !m.sprite.lostAt).map(m => m.sprite);
    if (!girls.length) { this.time.delayedCall(300, end); return; }
    const wait = (ms) => new Promise(r => this.time.delayedCall(ms, r));
    const tween = (cfg) => new Promise(r => this.tweens.add({ ...cfg, onComplete: r }));
    const say = (g, ms) => speech(this, g.x, g.y - 20, ms);
    girls.forEach(g => { g.anims.stop(); g.setFrame(0); g.setFlipX(false); });
    const [lead, other] = girls; // the lead stands nearest the mouth

    await wait(400);
    const ground = MOUNTAIN.topY - 3;
    const jug = this.add.image(lead.x + 8, ground - 8, 'jug').setOrigin(0.5, 1).setScale(0.6 * ART_SCALE).setDepth(-0.45);
    puff(this, jug.x, ground - 6, 0xffe14a, 5);
    await tween({ targets: jug, y: ground, duration: 220, ease: 'Bounce.out' });
    await wait(500);

    if (other) {
      lead.setFlipX(true); // they face each other
      await wait(300);
      this.tweens.add({ targets: this.caveDark, alpha: 0, duration: 1800, ease: 'Sine.inOut' });
      for (const [g, ms] of [[other, 800], [lead, 900]]) { say(g, ms); await wait(ms + 250); }
      lead.setFlipX(false);
    } else {
      this.tweens.add({ targets: this.caveDark, alpha: 0, duration: 1800, ease: 'Sine.inOut' });
      say(lead, 1000);
      await wait(1300);
    }

    // into the cave, the lead carrying the jug
    const inside = PEAK.mouthR + 14;
    const walkIn = async (g, delay) => {
      await wait(delay);
      g.setFlipX(false).play(`${g.texture.key}-walk`);
      await tween({ targets: g, x: inside, duration: (inside - g.x) / 45 * 1000,
        onUpdate: () => { if (g === lead) jug.setPosition(g.x + 6, ground - 3); } });
      g.setVisible(false);
      if (g === lead) jug.setVisible(false);
    };
    await Promise.all(girls.map((g, i) => walkIn(g, i * 350)));
    await wait(400);
    end();
  }

  die() {
    const cam = this.cameras.main;
    voice(this, 'ahhh');
    popText(this, this.lot.x, viewY(cam) + GAME_HEIGHT - 10, t('pop.aaah'));
    shake(this, 200, 0.01);
    const { gameOver, name } = loseLife(this);
    this.hud.update();
    if (name) this.followers.sacrifice(name);
    if (!gameOver) {
      if (name !== 'wife') this.dropSalt(name);
      // a family member is lost in Lot's place; Lot bounces back up and carries on
      this.graceMs = 2000;
      this.lot.body.setVelocityY(-500);
      sfx(this, 'jump', 0.3);
      return;
    }
    this.dead = true;
    this.time.delayedCall(700, () => this.scene.restart());
  }

  // A fallen daughter turns to salt on the next ledge up; touching it brings her back.
  dropSalt(key, atX, atY) {
    const cam = this.cameras.main;
    let x = atX, y = atY;
    if (x === undefined) {
      const top = viewY(cam) + 20, bottom = viewY(cam) + GAME_HEIGHT - 30;
      const ledge = this.platforms.getChildren()
        .filter(p => p.kind === 'normal' && p.y > top && p.y < bottom)
        .sort((a, b) => b.y - a.y)[0];
      if (!ledge) return;
      const half = Math.max(0, ledge.width / 2 - 8);
      x = ledge.x + Phaser.Math.Between(-half, half); y = ledge.y - 3;
    }
    const img = this.add.image(x, y, 'salt').setOrigin(0.5, 1).setScale(ART_SCALE).setDepth(-0.6);
    this.tweens.add({ targets: img, alpha: 0.6, duration: 350, yoyo: true, repeat: -1 });
    puff(this, x, y - 6);
    this.salts.push({ key, img });
  }

  updateSalts() {
    const cam = this.cameras.main, lot = this.lot;
    this.salts = this.salts.filter(s => {
      if (Math.abs(lot.x - s.img.x) < 12 && Math.abs(lot.body.center.y - (s.img.y - 6)) < 16) {
        puff(this, s.img.x, s.img.y - 6, 0xffe14a);
        sfx(this, 'powerUp2');
        popText(this, s.img.x, s.img.y - 20, t('pop.saved'), '#ffe14a');
        run.lost.delete(s.key);
        this.followers.restore(s.key);
        this.hud.update();
        s.img.destroy();
        return false;
      }
      if (s.img.y > viewY(cam) + GAME_HEIGHT + 16) { // left behind: she reappears on a ledge in view, never lost for good
        s.img.destroy();
        this.time.delayedCall(0, () => this.dropSalt(s.key));
        return false;
      }
      return true;
    });
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

    this.movers.getChildren().forEach(m => { m.vis.x = m.x; }); // sliding slabs follow their bodies
    const climbed = 1 - viewY(cam) / (MOUNTAIN.height - GAME_HEIGHT);
    this.vista.forEach(v => { v.y = Math.round(climbed * 24); });
    this.distant.tilePositionY = Math.round(viewY(cam) * 2 * 0.3);
    if (this.dead) return;
    if (this.atTop) { this.updateSummit(delta); return; }
    this.elapsed += delta / 1000;
    if (this.graceMs > 0) this.graceMs -= delta;

    lot.update({ left: this.controls.left, right: this.controls.right, jumpDown: true, jumpPressed: false }, delta);
    setViewY(cam, Math.max(0, Math.min(viewY(cam), lot.y - MOUNTAIN.cameraLead)));
    this.followers.update();
    this.updateSalts();

    if (lot.y > viewY(cam) + GAME_HEIGHT + 16) {
      if (this.invincible || this.graceMs > 0) { lot.body.setVelocityY(-500); sfx(this, 'jump', 0.3); }
      else this.die();
    }
  }
}
