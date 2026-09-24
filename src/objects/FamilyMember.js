import Phaser from 'phaser';
import { FAMILY, GAME_HEIGHT } from '../config.js';
import { popText, puff } from '../fx.js';
import { run } from '../runState.js';
import { shake, viewY, ART_SCALE } from '../view.js';
import { fitBody } from '../art/sprites.js';
import { AIR_FRAMES } from '../art/characters.js';

export default class FamilyMember extends Phaser.Physics.Arcade.Sprite {
  constructor(scene, key, spacing, trail, saltGroup) {
    super(scene, 0, 0, key);
    this.setScale(ART_SCALE);
    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.setOrigin(0.5, 1); // position = feet
    fitBody(this, key);
    this.body.setAllowGravity(false);
    this.setDepth(key === 'wife' ? -0.4 : -0.5);

    this.memberName = key;
    this.spacing = spacing;
    this.trail = trail;
    this.saltGroup = saltGroup;
    this.state = 'following';
    this.invulnTimer = 0;
    this.salt = null;
    this.saltedAt = 0;
    this.slack = 0; // extra path distance covered while Lot is idle, so a jump always finishes
    this.lastTotal = trail.total;

    const p = trail.sample(spacing);
    this.setPosition(p.x, p.y);
  }

  get canBeHit() {
    return (this.state === 'following' || this.state === 'lookingBack') && this.invulnTimer <= 0;
  }

  get worldX() {
    return this.salt ? this.salt.x : this.x;
  }

  startLost() { // retry: already lost earlier in this run, no popup
    this.state = 'lost';
    this.setVisible(false);
    this.body.enable = false;
  }

  blink(delta) {
    if (this.invulnTimer > 0) {
      this.setAlpha(Math.floor(this.invulnTimer / 80) % 2 ? 0.3 : 1);
      this.invulnTimer -= delta;
      if (this.invulnTimer <= 0) this.setAlpha(1);
    }
  }

  // visual only: jump/fall where Lot was airborne, walk while moving along the trail, stand still otherwise
  animate(delta) {
    const moved = this.lastX !== undefined && (Math.abs(this.x - this.lastX) > 0.3 || Math.abs(this.y - this.lastY) > 0.3);
    // frames without a physics step look like "not moving": only stand still after a short pause,
    // otherwise the run cycle restarts every few frames and just jitters
    this.stillMs = moved ? 0 : (this.stillMs ?? 1000) + delta;
    this.lastX = this.x;
    this.lastY = this.y;
    const air = AIR_FRAMES[this.memberName];
    if (this.airborne && air) { this.anims.stop(); this.setFrame(this.rising ? air.jump : air.fall); }
    else if (this.stillMs < 120) this.play(`${this.memberName}-walk`, true);
    else { this.anims.stop(); this.setFrame(0); }
  }

  // Trail sample for this member. The trail only grows while Lot moves, so if he stops
  // while this member's spot is still mid-jump, walk it forward along the path until it lands.
  // Once Lot moves again the slack is paid back gradually (member moves slower, never backwards).
  sampleTrail(delta) {
    const trail = this.trail;
    const advanced = trail.total - this.lastTotal;
    this.lastTotal = trail.total;
    if (advanced > 0) {
      this.slack = Math.max(0, this.slack - advanced * 0.5);
    } else if (this.slack < this.spacing && !trail.sample(this.spacing - this.slack).onGround) {
      this.slack = Math.min(this.spacing, this.slack + FAMILY.rejoinSpeed * delta / 1000);
    }
    return trail.sample(this.spacing - this.slack);
  }

  update(delta) {
    if (this.state === 'following' || this.state === 'rejoining') this.animate(delta);
    switch (this.state) {
      case 'following': {
        const p = this.sampleTrail(delta);
        this.setPosition(p.x, p.y);
        this.airborne = !p.onGround;
        this.rising = this.trail.sample(Math.max(0, this.spacing - this.slack - 3)).y < p.y; // path ahead goes up
        this.setFlipX(p.facing < 0);
        this.blink(delta);
        break;
      }
      case 'rejoining': {
        this.airborne = false;
        const p = this.sampleTrail(delta);
        const dx = p.x - this.x, dy = p.y - this.y;
        const dist = Math.hypot(dx, dy);
        const step = FAMILY.rejoinSpeed * delta / 1000;
        if (dist <= 3 || dist <= step) {
          this.setPosition(p.x, p.y);
          this.state = 'following';
          this.invulnTimer = FAMILY.invulnMs;
        } else {
          this.setPosition(this.x + dx / dist * step, this.y + dy / dist * step);
        }
        this.setFlipX(p.facing < 0);
        this.blink(delta);
        break;
      }
      case 'salted':
        if (this.salt && this.salt.y > this.scene.physics.world.bounds.bottom + 40) this.lose();
        break;
      default:
        break;
    }
  }

  saltify(force = false) {
    if (this.state === 'salted' || this.state === 'lost') return;
    if (!force && !this.canBeHit) return;
    this.state = 'salted';
    this.saltedAt = this.scene.time.now;
    this.setVisible(false);
    this.body.enable = false;
    this.setAlpha(1);
    this.salt = this.saltGroup.create(this.x, this.y - 6, 'salt').setScale(ART_SCALE);
    this.salt.member = this;
    this.salt.setVelocity(0, -60); // tiny hop
    popText(this.scene, this.x, this.y - 20, 'PFFT!');
    puff(this.scene, this.x, this.y - 8);
    shake(this.scene, 80, 0.004);
  }

  rescue() {
    if (this.state !== 'salted') return;
    popText(this.scene, this.salt.x, this.salt.y - 10, 'POP!', '#ffe14a');
    puff(this.scene, this.salt.x, this.salt.y, 0xffe14a);
    this.setPosition(this.salt.x, this.salt.body.bottom);
    this.salt.destroy();
    this.salt = null;
    this.setVisible(true);
    this.body.enable = true;
    this.state = 'rejoining';
  }

  // Sacrificed in Lot's place: turns red, rises and fades, then is lost.
  dieRed() {
    if (this.state === 'lost' || this.state === 'dying') return;
    if (this.state === 'salted' || !this.visible) { this.lose(); return; }
    this.state = 'dying';
    this.anims.stop();
    this.setTint(0xff2020);
    this.scene.tweens.add({ targets: this, y: this.y - 10, alpha: 0, duration: 600,
      onComplete: () => { this.clearTint(); this.lose(); this.setAlpha(1); } });
  }

  lose() {
    if (this.state === 'lost') return;
    const cam = this.scene.cameras.main;
    let x = this.x, y = this.y;
    if (this.salt) {
      x = this.salt.x;
      y = Math.min(this.salt.y, viewY(cam) + GAME_HEIGHT - 4); // keep the text on screen
      this.salt.destroy();
      this.salt = null;
    }
    this.state = 'lost';
    run.lost.add(this.memberName);
    this.setVisible(false);
    this.body.enable = false;
    popText(this.scene, x, y, 'LOST!', '#ff5a5a');
  }
}
