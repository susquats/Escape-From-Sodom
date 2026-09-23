import Phaser from 'phaser';
import { FAMILY } from '../config.js';
import { popText, puff } from '../fx.js';

export default class FamilyMember extends Phaser.Physics.Arcade.Sprite {
  constructor(scene, key, spacing, trail, saltGroup) {
    super(scene, 0, 0, key);
    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.setOrigin(0.5, 1); // position = feet
    this.body.setSize(this.width, this.height);
    this.body.setAllowGravity(false);
    this.setDepth(key === 'wife' ? -0.4 : -0.5);

    this.memberName = key;
    this.spacing = spacing;
    this.trail = trail;
    this.saltGroup = saltGroup;
    this.state = 'following';
    this.invulnTimer = 0;
    this.salt = null;

    const p = trail.sample(spacing);
    this.setPosition(p.x, p.y);
  }

  get canBeHit() {
    return this.state === 'following' && this.invulnTimer <= 0;
  }

  blink(delta) {
    if (this.invulnTimer > 0) {
      this.setAlpha(Math.floor(this.invulnTimer / 80) % 2 ? 0.3 : 1);
      this.invulnTimer -= delta;
      if (this.invulnTimer <= 0) this.setAlpha(1);
    }
  }

  update(delta) {
    switch (this.state) {
      case 'following': {
        const p = this.trail.sample(this.spacing);
        this.setPosition(p.x, p.y);
        this.setFlipX(p.facing < 0);
        this.blink(delta);
        break;
      }
      case 'rejoining': {
        const p = this.trail.sample(this.spacing);
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

  saltify() {
    if (!this.canBeHit) return;
    this.state = 'salted';
    this.setVisible(false);
    this.body.enable = false;
    this.setAlpha(1);
    this.salt = this.saltGroup.create(this.x, this.y - 6, 'salt');
    this.salt.member = this;
    this.salt.setVelocity(0, -60); // tiny hop
    popText(this.scene, this.x, this.y - 20, 'PFFT!');
    puff(this.scene, this.x, this.y - 8);
    this.scene.cameras.main.shake(80, 0.004);
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

  lose() {
    if (this.state === 'lost') return;
    const cam = this.scene.cameras.main;
    let x = this.x, y = this.y;
    if (this.salt) {
      x = this.salt.x;
      y = Math.min(this.salt.y, cam.scrollY + cam.height - 4); // keep the text on screen
      this.salt.destroy();
      this.salt = null;
    }
    this.state = 'lost';
    this.setVisible(false);
    this.body.enable = false;
    popText(this.scene, x, y, 'LOST!', '#ff5a5a');
  }
}
