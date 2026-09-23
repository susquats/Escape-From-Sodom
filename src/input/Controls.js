import Phaser from 'phaser';
import TouchControls from './TouchControls.js';

// Merges keyboard + touch into one interface reused by later milestones.
export default class Controls {
  constructor(scene) {
    const kb = scene.input.keyboard;
    this.keys = kb.addKeys('LEFT,RIGHT,UP,SPACE,A,D,W,R');
    kb.addCapture('SPACE,UP,DOWN,LEFT,RIGHT');
    this.touch = new TouchControls(scene);

    this.left = false;
    this.right = false;
    this.jumpDown = false;
    this.jumpPressed = false;
    this.restartPressed = false;
    this.prevJumpDown = false;
    this.prevTouchRestart = false;
  }

  update() {
    const k = this.keys;
    const t = this.touch;
    t.update();

    let left = k.LEFT.isDown || k.A.isDown || t.left;
    let right = k.RIGHT.isDown || k.D.isDown || t.right;
    if (left && right) left = right = false;
    this.left = left;
    this.right = right;

    this.jumpDown = k.SPACE.isDown || k.UP.isDown || k.W.isDown || t.jump;
    this.jumpPressed = this.jumpDown && !this.prevJumpDown;
    this.prevJumpDown = this.jumpDown;

    this.restartPressed = Phaser.Input.Keyboard.JustDown(k.R) || (t.restart && !this.prevTouchRestart);
    this.prevTouchRestart = t.restart;
  }
}
