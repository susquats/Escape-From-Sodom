import Phaser from 'phaser';
import FamilyMember from './FamilyMember.js';
import { WIFE } from '../config.js';

const nextLookDelay = () => Phaser.Math.Between(WIFE.lookIntervalMinMs, WIFE.lookIntervalMaxMs);

export default class Wife extends FamilyMember {
  constructor(...args) {
    super(...args);
    this.lookTimer = nextLookDelay();
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
    if (this.state === 'following' && this.invulnTimer <= 0) {
      this.lookTimer -= delta;
      if (this.lookTimer <= 0) {
        const ok = this.trail.sample(this.spacing).onGround &&
          this.scene.destruction.x < this.x - WIFE.minWallDistance;
        if (ok) this.startLook();
        else this.lookTimer = 500;
      }
    }
  }

  startLook() {
    this.state = 'lookingBack';
    this.phase = 'notice';
    this.phaseTimer = WIFE.noticeMs;
    this.bang = this.scene.add.text(this.x, this.y - this.height - 2, '!', { fontFamily: 'monospace',
      fontSize: '8px', color: '#ffe14a', stroke: '#000', strokeThickness: 2 })
      .setOrigin(0.5, 1).setDepth(800);
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
