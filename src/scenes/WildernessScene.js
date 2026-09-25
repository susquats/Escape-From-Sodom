import Phaser from 'phaser';
import { GAME_WIDTH, TILE, DEBUG, MOVE, FAMILY } from '../config.js';
import { WORLD_W, WORLD_H, STREET, SALT_X, CLIFF_X, LOT_START_X, LAYOUT, groundTop, addWildernessBackdrop, addWildernessGround } from '../levels/wilderness.js';
import Lot from '../objects/Lot.js';
import Controls from '../input/Controls.js';
import Trail from '../objects/Trail.js';
import Family from '../objects/Family.js';
import FamilyHud from '../ui/FamilyHud.js';
import { setupView, fadeIn, fadeOut, setViewX, shake, viewX, viewY, ART_SCALE } from '../view.js';
import { puff, speech, sfx, playMusic } from '../fx.js';
import { pixTexture } from '../art/pix.js';
import { comet, COMET_HEAD } from '../art/comet.js';
import { t } from '../i18n.js';

export default class WildernessScene extends Phaser.Scene {
  constructor() {
    super('WildernessScene');
  }

  // data.fromFlight: the flight's landing hands over without a cut (same backdrop, same spots, letterbox still up)
  create(data) {
    playMusic(this, 'ashes-of-ur');
    setupView(this);
    this.physics.world.gravity.y = MOVE.gravity;
    this.exiting = false;
    this.cutscene = false;
    this.physics.world.setBounds(0, 0, WORLD_W, WORLD_H);
    this.physics.world.setBoundsCollision(true, true, true, false);

    this.terrain = this.physics.add.staticGroup();
    this.buildBackground();
    this.buildLevel();

    this.lot = new Lot(this, LOT_START_X, STREET * TILE - 10);
    this.physics.add.collider(this.lot, this.terrain);
    this.trail = new Trail(this.lot.x, STREET * TILE, FAMILY.trailMaxLength);
    this.family = new Family(this, this.trail, this.terrain);
    this.family.members[0].lookTimer = Infinity; // no random look-backs here: she looks back once (saltWife)
    this.hud = new FamilyHud(this, this.family);
    this.physics.add.overlap(this.lot, this.family.saltGroup, (lot, salt) => {
      if (this.time.now - salt.member.saltedAt > 350) salt.member.rescue();
    });

    const cam = this.cameras.main;
    cam.setBounds(0, 0, WORLD_W, WORLD_H);
    cam.setDeadzone(40, 30);
    cam.setFollowOffset(-30, 0);
    setViewX(cam, 0);
    // the camera holds still (as it did in the flight) until Lot starts walking
    this.following = false;
    if (data && data.fromFlight) {
      const bars = [0, 1].map(i => this.add.rectangle(0, i ? 180 : 0, GAME_WIDTH, 22, 0x000000)
        .setOrigin(0, i).setScrollFactor(0).setDepth(940));
      this.tweens.add({ targets: bars, scaleY: 0, delay: 500, duration: 400, ease: 'Quad.in', onComplete: () => bars.forEach(b => b.destroy()) });
    } else {
      fadeIn(this, 400);
    }

    this.controls = new Controls(this);

    if (DEBUG) {
      this.debugText = this.add.text(4, 20, '', { fontFamily: 'monospace', fontSize: '8px', color: '#0f0' })
        .setScrollFactor(0).setDepth(900);
      const K = Phaser.Input.Keyboard.KeyCodes;
      this.debugKeys = ['ONE', 'TWO', 'THREE'].map(k => this.input.keyboard.addKey(K[k]));
      this.keyFour = this.input.keyboard.addKey(K.FOUR);
    }
  }

  // The walk from Act I to Act III (src/art/wildernessArt.js): Sodom burning behind them under a fire-lit
  // sky that darkens into Act III's night as they go, sand turning to the mountain's rock, and the mountain
  // looming up until its cliff rises out of the ground at the end. FlightScene's landing blends into the
  // first screen of it, so both build it from src/levels/wilderness.js.
  buildBackground() {
    addWildernessBackdrop(this);
    const { rocks } = addWildernessGround(this);
    rocks.forEach(r => this.terrain.add(r)); // boulders in the way: sandstone early, the mountain's rock near the end
    this.add.image(CLIFF_X - 12, (STREET - 1) * TILE, 'wild-cliff').setOrigin(0, 1).setScale(ART_SCALE).setDepth(-0.9);
  }

  buildLevel() {
    // physics only; the painted ground (wild-ground) follows the same LAYOUT
    for (const [tx, ty, w] of LAYOUT) {
      const t = this.add.zone(tx * TILE, ty * TILE, w * TILE, WORLD_H - ty * TILE).setOrigin(0);
      this.terrain.add(t);
    }
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

  // Genesis 19:26, as a cinematic: the view letterboxes, Lot's wife stops and looks back at Sodom, a comet
  // streaks in from the burning city and strikes her, and she is a pillar of salt. The family grieves, then
  // Lot says they must go on, and play resumes. Only if she is still alive when they get here.
  async saltWife() {
    this.cutscene = true;
    const { lot, family } = this;
    const [wife, ...girls] = family.members;
    const alive = girls.filter(g => g.state !== 'lost');
    const wait = (ms) => new Promise(r => this.time.delayedCall(ms, r));
    const tween = (cfg) => new Promise(r => this.tweens.add({ ...cfg, onComplete: r }));
    const cam = this.cameras.main;
    lot.body.setAcceleration(0, 0);
    lot.body.setVelocityX(0);
    alive.forEach(g => { g.anims.stop(); g.setFrame(0); });

    // letterbox
    const bars = [0, 1].map(i => this.add.rectangle(0, i ? 180 : 0, GAME_WIDTH, 22, 0x000000)
      .setOrigin(0, i).setScrollFactor(0).setDepth(940).setScale(1, 0));
    tween({ targets: bars, scaleY: 1, duration: 400, ease: 'Quad.out' });
    await wait(300);

    // she looks back
    wife.lastLook();
    await wait(1300);

    // the comet
    if (!this.textures.exists('comet')) pixTexture(this, 'comet', comet());
    const head = { x: wife.x, y: wife.y - 12 };
    const from = { x: viewX(cam) - 30, y: viewY(cam) - 30 };
    const c = this.add.image(from.x, from.y, 'comet').setScale(ART_SCALE).setDepth(5)
      .setOrigin(COMET_HEAD / 72).setRotation(Math.atan2(head.y - from.y, head.x - from.x) - Math.PI / 4);
    const sparks = this.time.addEvent({ delay: 30, loop: true, callback: () => {
      const p = this.add.image(c.x, c.y, 'pixel').setTint(Phaser.Utils.Array.GetRandom([0xffb848, 0xf07a24, 0xffe8a0])).setDepth(4);
      this.tweens.add({ targets: p, x: p.x + Phaser.Math.Between(-6, 6), y: p.y + Phaser.Math.Between(-4, 8), alpha: 0,
        duration: 350, onComplete: () => p.destroy() });
    } });
    sfx(this, 'comet', 0.5);
    shake(this, 900, 0.002);
    await tween({ targets: c, x: head.x, y: head.y, duration: 900, ease: 'Quad.in' });
    sparks.remove();
    c.destroy();

    // impact: she is salt
    [this.view.main, this.view.bg].forEach(c => c.flash(250, 255, 255, 255));
    shake(this, 300, 0.012);
    wife.becomePillar();
    puff(this, wife.x, wife.y - 10, 0xf4f7fa, 14);
    for (let i = 0; i < 14; i++) {
      const p = this.add.image(wife.x, wife.y - 10, 'pixel').setTint(i % 2 ? 0xf4f7fa : 0xa8b2c2).setDepth(4);
      this.tweens.add({ targets: p, x: p.x + Phaser.Math.Between(-18, 18), y: STREET * TILE - 1, duration: Phaser.Math.Between(400, 700),
        ease: 'Quad.in', onComplete: () => this.tweens.add({ targets: p, alpha: 0, delay: 800, duration: 400, onComplete: () => p.destroy() }) });
    }
    await wait(900);

    // grief
    const caption = this.add.text(GAME_WIDTH / 2, 180 - 11, t('wife.caption'), {
      fontFamily: 'monospace', fontSize: '8px', color: '#fff' }).setOrigin(0.5).setScrollFactor(0).setDepth(950).setAlpha(0);
    tween({ targets: caption, alpha: 1, duration: 500 });
    lot.setFlipX(true);
    alive.forEach(g => g.setFlipX(true)); // she was walking behind them: they turn back to her
    const tears = this.time.addEvent({ delay: 260, loop: true, callback: () => alive.forEach(g => {
      const t = this.add.image(g.x + (g.flipX ? -2 : 2), g.y - 13, 'pixel').setTint(0x7ab8ff).setDepth(4);
      this.tweens.add({ targets: t, y: t.y + 7, alpha: 0, duration: 500, onComplete: () => t.destroy() });
    }) });
    await wait(900);
    const lines = alive.length ? [[alive[0], t('say.mother'), 1400]] : [];
    for (const [g, text, ms] of lines) { speech(this, g.x, g.y - 20, ms, text); await wait(ms + 200); }
    tears.remove();

    // Lot: they must go on
    for (const [text, ms] of [[t('say.cannotStay'), 1300], [t('say.run'), 1500]]) {
      speech(this, lot.x, lot.body.top - 3, ms, text);
      await wait(ms + 200);
    }
    lot.setFlipX(false);
    await wait(300);
    tween({ targets: [...bars, caption], scaleY: 0, alpha: 0, duration: 400, ease: 'Quad.in' });
    this.cutscene = false;
  }

  update(time, delta) {
    this.controls.update();
    if (this.controls.restartPressed) { this.scene.restart(); return; }

    const wife = this.family.members[0];
    if (!this.cutscene && !this.exiting && wife.state === 'following' && this.lot.x > SALT_X && this.lot.onGround
      && wife.trail.sample(wife.spacing).onGround) this.saltWife();

    if (this.cutscene) {
      this.lot.update({}, delta); // stands still; the cutscene poses the family
    } else {
      if (!this.exiting) {
        this.lot.update(this.controls, delta);
        if (!this.following && Math.abs(this.lot.x - LOT_START_X) > 2) {
          this.following = true;
          this.cameras.main.startFollow(this.lot, true, 0.12, 0.12);
        }
        this.trail.record(this.lot.x, this.lot.body.bottom, this.lot.facing, this.lot.onGround);
        if (this.lot.x > CLIFF_X - 16) this.finish();
      }
      this.family.update(delta);
    }
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
