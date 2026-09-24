import Phaser from 'phaser';
import FamilyMember from './FamilyMember.js';
import { WIFE } from '../config.js';
import { WIFE_LOOK_FRAME } from '../art/characters.js';
import { run } from '../runState.js';
import { hash } from '../art/pix.js';

const nextLookDelay = () => Phaser.Math.Between(WIFE.lookIntervalMinMs, WIFE.lookIntervalMaxMs);

export default class Wife extends FamilyMember {
  constructor(...args) {
    super(...args);
    this.lookTimer = nextLookDelay();
    this.lookFromX = -Infinity; // she only looks back once past here (Act I: the last stretch)
    this.phaseTimer = 0;
    this.phase = null;
    this.bang = null;
    this.tremble = null;
  }

  update(delta) {
    if (this.state === 'lookingBack') {
      this.phaseTimer -= delta;
      if (this.phaseTimer > 0) return;
      if (this.phase === 'notice') {
        this.phase = 'turn';
        this.phaseTimer = WIFE.turnMs;
        this.setFlipX(true);
        this.bang.setText('...');
        this.tremble = this.scene.tweens.add({ targets: this, x: this.x + 1, duration: 40,
          yoyo: true, repeat: -1 });
      } else {
        this.cleanupLook();
        this.lookTimer = nextLookDelay();
        this.saltify(true);
      }
      return;
    }

    super.update(delta);
    if (this.state === 'following' && this.invulnTimer <= 0 && this.x >= this.lookFromX) {
      if (this.lookFromX > -Infinity && !this.pastLookFrom) { // first look soon after she gets there
        this.pastLookFrom = true;
        this.lookTimer = Math.min(this.lookTimer, Phaser.Math.Between(2500, 5000));
      }
      this.lookTimer -= delta;
      if (this.lookTimer <= 0) {
        const wallX = this.scene.destruction ? this.scene.destruction.x : -Infinity;
        const ok = this.trail.sample(this.spacing).onGround &&
          wallX < this.x - WIFE.minWallDistance;
        if (ok) this.startLook();
        else this.lookTimer = 500;
      }
    }
  }

  startLook() {
    this.state = 'lookingBack';
    this.phase = 'notice';
    this.phaseTimer = WIFE.noticeMs;
    this.anims.stop();
    this.setFrame(WIFE_LOOK_FRAME); // alarmed, looking back
    this.bang = this.scene.add.text(this.x, this.y - this.displayHeight - 2, '!', { fontFamily: 'monospace',
      fontSize: '8px', color: '#ffe14a', stroke: '#000', strokeThickness: 2 })
      .setOrigin(0.5, 1).setDepth(800);
  }

  // Scripted in the wilderness cutscene (WildernessScene.saltWife, Genesis 19:26): she stops and turns to
  // look back at Sodom, trembling...
  lastLook() {
    this.startLook();
    this.state = 'lastLook'; // no timers, no hits, no rescue
    this.lookTimer = Infinity;
    this.scene.time.delayedCall(WIFE.noticeMs, () => {
      this.setFlipX(true);
      this.bang.setText('...');
      this.tremble = this.scene.tweens.add({ targets: this, x: this.x + 1, duration: 40, yoyo: true, repeat: -1 });
    });
  }

  // ...until the comet strikes her: a pillar of salt, for good.
  becomePillar() {
    this.cleanupLook();
    this.state = 'lost';
    run.lost.add('wife');
    this.body.enable = false;
    this.setFlipX(true).setTexture(saltPillar(this.scene)).setDepth(-0.6);
  }

  cancelLook() {
    if (this.state === 'lookingBack') {
      this.cleanupLook();
      this.state = 'following';
    }
    this.lookTimer = Infinity;
  }

  cleanupLook() {
    if (this.tremble) { this.tremble.stop(); this.tremble = null; }
    if (this.bang) { this.bang.destroy(); this.bang = null; }
    this.phase = null;
  }

  saltify(force = false) {
    if (this.state === 'salted' || this.state === 'lost') return;
    if (!force && !this.canBeHit) return;
    this.cleanupLook();
    this.lookTimer = nextLookDelay();
    super.saltify(true);
  }

  dieRed() {
    this.cleanupLook();
    super.dieRed();
  }

  lose() {
    this.cleanupLook();
    super.lose();
  }

  rescue() {
    if (this.state !== 'salted') return;
    this.lookTimer = nextLookDelay();
    super.rescue();
  }
}

// The wife's look-back frame recast in salt: every pixel mapped by brightness onto a pale salt ramp.
const SALT = [[0x6e, 0x7a, 0x90], [0xa8, 0xb2, 0xc2], [0xd6, 0xdd, 0xe6], [0xf4, 0xf7, 0xfa]];
function saltPillar(scene) {
  const key = 'wife-salt';
  if (scene.textures.exists(key)) return key;
  const f = scene.textures.getFrame('wife', WIFE_LOOK_FRAME);
  const tex = scene.textures.createCanvas(key, f.cutWidth, f.cutHeight);
  const ctx = tex.getContext();
  ctx.drawImage(f.source.image, f.cutX, f.cutY, f.cutWidth, f.cutHeight, 0, 0, f.cutWidth, f.cutHeight);
  const img = ctx.getImageData(0, 0, f.cutWidth, f.cutHeight), d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    if (!d[i + 3]) continue;
    const x = (i / 4) % f.cutWidth, y = Math.floor(i / 4 / f.cutWidth);
    const lum = (d[i] * 0.3 + d[i + 1] * 0.59 + d[i + 2] * 0.11) / 255;
    const c = SALT[Math.max(0, Math.min(3, Math.floor(lum * 3.2 + 0.9 + (hash(x, y, 91) - 0.5) * 0.6)))];
    d[i] = c[0]; d[i + 1] = c[1]; d[i + 2] = c[2]; d[i + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
  tex.refresh();
  return key;
}
