import Phaser from 'phaser';
import { MOVE, ANGEL } from '../config.js';
import { ART_SCALE } from '../view.js';
import { fitBody } from '../art/sprites.js';
import { LOT_FRAMES } from '../art/characters.js';
import { sfx } from '../fx.js';

export default class Lot extends Phaser.Physics.Arcade.Sprite {
  constructor(scene, x, y) {
    super(scene, x, y, 'lot');
    this.setScale(ART_SCALE);
    this.setOrigin(0.5, 1 - 20 / this.height); // keep x/y at the middle of the 40px-tall body, as before
    scene.add.existing(this);
    scene.physics.add.existing(this);
    fitBody(this, 'lot'); // the frame is bigger than the hitbox (room for arms, legs and hair)

    this.setCollideWorldBounds(true);
    this.body.setMaxVelocity(MOVE.runSpeed, MOVE.maxFallSpeed);

    this.coyoteTimer = 0;
    this.jumpBufferTimer = 0;
    this.facing = 1;
    this.jumpCut = false;
    this.onGround = false;
    this.accelMul = 1;
    this.protected = false;
  }

  setBoost(on) {
    this.accelMul = on ? ANGEL.accelMultiplier : 1;
    this.body.setMaxVelocity(on ? ANGEL.runSpeed : MOVE.runSpeed, MOVE.maxFallSpeed);
    this.protected = on;
  }

  isStomping(targetBody) {
    const b = this.body;
    return b.velocity.y > 0 && b.prev.y + b.height <= targetBody.top + 4;
  }

  update(controls, delta) {
    const body = this.body;
    const onGround = body.blocked.down || body.touching.down;
    this.onGround = onGround;
    const dir = (controls.right ? 1 : 0) - (controls.left ? 1 : 0);

    // horizontal
    if (dir !== 0) {
      body.setAccelerationX(dir * (onGround ? MOVE.groundAccel : MOVE.airAccel) * this.accelMul);
      body.setDragX(0);
      // instant turnaround feels arcade-y
      if (Math.sign(body.velocity.x) === -dir) body.setVelocityX(0);
      this.facing = dir;
      this.setFlipX(dir < 0);
    } else {
      body.setAccelerationX(0);
      body.setDragX(onGround ? MOVE.groundDrag : MOVE.airDrag);
    }

    // timers
    this.coyoteTimer = onGround ? MOVE.coyoteTimeMs : this.coyoteTimer - delta;
    this.jumpBufferTimer = controls.jumpPressed ? MOVE.jumpBufferMs : this.jumpBufferTimer - delta;

    // jump
    if (this.jumpBufferTimer > 0 && this.coyoteTimer > 0) {
      body.setVelocityY(-MOVE.jumpVelocity);
      sfx(this.scene, 'jump', 0.3);
      this.jumpBufferTimer = 0;
      this.coyoteTimer = 0;
      this.jumpCut = false;
    }

    // variable jump height
    if (!controls.jumpDown && body.velocity.y < 0 && !this.jumpCut) {
      body.setVelocityY(body.velocity.y * MOVE.jumpCutMultiplier);
      this.jumpCut = true;
    }

    this.animate();
  }

  // visual only: idle / run / jump / fall frames (see src/art/sprites.js)
  animate() {
    const body = this.body;
    if (!this.onGround) {
      this.anims.stop();
      this.setFrame(body.velocity.y < 0 ? LOT_FRAMES.jump : LOT_FRAMES.fall);
    } else if (Math.abs(body.velocity.x) > 10) {
      this.play('lot-run', true);
    } else {
      this.play('lot-idle', true);
    }
  }

  showDead() {
    this.anims.stop();
    this.setFrame(LOT_FRAMES.dead);
  }
}
