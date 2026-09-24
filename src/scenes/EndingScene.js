import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT, ZOOM } from '../config.js';
import { run } from '../runState.js';
import { popText, puff } from '../fx.js';
import { setupView, fadeIn, ART_SCALE } from '../view.js';

const GROUND_Y = 150;
const CAVE_X = 230;
const JUG_SCALE = 1.5 * ART_SCALE;
const JUG_H = 38 * JUG_SCALE; // jug texture height x scale
const STROKE = { fontFamily: 'monospace', fontSize: '8px', color: '#fff', stroke: '#000', strokeThickness: 2 };

export default class EndingScene extends Phaser.Scene {
  constructor() {
    super('EndingScene');
  }

  create() {
    setupView(this);
    // Night sky
    this.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, 0x141024).setOrigin(0);

    // Stars
    for (let i = 0; i < 20; i++) {
      this.add.rectangle((i * 97 + 13) % GAME_WIDTH, (i * 53 + 7) % (GROUND_Y - 10), 1, 1, 0xffffff)
        .setAlpha(0.4 + (i % 4) * 0.15);
    }

    // Moon
    const moon = this.add.rectangle(40, 22, 12, 12, 0xe8dfc8);
    moon.setAlpha(0.9);
    // clip corners (overdraw with sky color)
    this.add.rectangle(40 - 6, 22 - 6, 2, 2, 0x141024);
    this.add.rectangle(40 + 5, 22 - 6, 2, 2, 0x141024);
    this.add.rectangle(40 - 6, 22 + 5, 2, 2, 0x141024);
    this.add.rectangle(40 + 5, 22 + 5, 2, 2, 0x141024);

    // Mountain-top ground
    this.add.rectangle(0, GROUND_Y, GAME_WIDTH, GAME_HEIGHT - GROUND_Y, 0x4a3a2e).setOrigin(0);
    this.add.tileSprite(0, GROUND_Y, GAME_WIDTH, 6, 'ledge').setTileScale(ART_SCALE).setOrigin(0).setDepth(1);

    // Rock details on ground
    for (let i = 0; i < 5; i++) {
      this.add.image(20 + i * 60, GROUND_Y + 5, 'rock').setScale(ART_SCALE).setDepth(2).setAlpha(0.7);
    }

    // Cave (already has Lot inside from mountain scene)
    this.cave = this.add.image(CAVE_X, GROUND_Y, 'cave').setOrigin(0.5, 1).setScale(2 * ART_SCALE).setDepth(5);

    const cam = this.cameras.main;
    cam.setBackgroundColor(0x141024);
    fadeIn(this, 500);

    this.time.delayedCall(500, () => this.play());
  }

  async play() {
    const cam = this.cameras.main;

    const wait = (ms) => new Promise(r => this.time.delayedCall(ms, r));
    const tween = (cfg) => new Promise(r => this.tweens.add({ ...cfg, onComplete: r }));
    const walk = async (sprite, toX, speed = 50) => {
      sprite.setFlipX(toX < sprite.x);
      const bob = this.tweens.add({ targets: sprite, y: sprite.y - 1, duration: 110, yoyo: true, repeat: -1 });
      await tween({ targets: sprite, x: toX, duration: Math.abs(toX - sprite.x) / speed * 1000 });
      bob.stop(); sprite.y = GROUND_Y;
    };
    const enterCave = async (sprite) => {
      await walk(sprite, CAVE_X - 4);
      await tween({ targets: sprite, alpha: 0, duration: 300 });
    };

    await wait(1200);

    // --- Wife ---
    if (!run.lost.has('wife')) {
      const wife = this.add.image(-12, GROUND_Y, 'wife').setScale(ART_SCALE).setOrigin(0.5, 1).setDepth(3);
      await walk(wife, 200);
      popText(this, wife.x, wife.y - 20, '!', '#ffe14a');
      await wait(300);
      wife.setFlipX(true); // looks back
      await wait(900);
      wife.setFlipX(false);
      // little hop
      await tween({ targets: wife, y: GROUND_Y - 4, duration: 100, ease: 'Quad.out' });
      await tween({ targets: wife, y: GROUND_Y, duration: 100, ease: 'Quad.in' });
      await enterCave(wife);
      await wait(600);
    }

    // --- Daughters ---
    const d1Alive = !run.lost.has('daughter1');
    const d2Alive = !run.lost.has('daughter2');
    const numDaughters = (d1Alive ? 1 : 0) + (d2Alive ? 1 : 0);

    if (numDaughters === 2) {
      const d1 = this.add.image(-12, GROUND_Y, 'daughter1').setScale(ART_SCALE).setOrigin(0.5, 1).setDepth(3);
      const d2 = this.add.image(-28, GROUND_Y, 'daughter2').setScale(ART_SCALE).setOrigin(0.5, 1).setDepth(3);

      // Walk to positions together (d2 starts 16px behind)
      await Promise.all([
        walk(d1, 196),
        (async () => { await wait(200); await walk(d2, 176); })(),
      ]);

      await wait(500);

      // Jug appears above d1
      const jugStartY = GROUND_Y - 10 - JUG_H; // 10px above where it will land
      const jug = this.add.image(d1.x + 8, jugStartY, 'jug').setOrigin(0.5, 1).setScale(JUG_SCALE).setDepth(4);
      puff(this, jug.x, jug.y, 0xffe14a, 5);
      popText(this, jug.x, jugStartY - 8, '!', '#ffe14a');
      await tween({ targets: jug, y: GROUND_Y - JUG_H, duration: 220, ease: 'Bounce.out' });

      await wait(400);

      // Look at each other
      d1.setFlipX(true); // d1 looks left toward d2
      d2.setFlipX(false); // d2 looks right toward d1
      await wait(900);

      // Look at the player (zoom + front textures)
      cam.zoomTo(1.6 * ZOOM, 500);
      cam.pan(186, 130, 500);
      await wait(500);
      d1.setTexture('daughter1_front');
      d2.setTexture('daughter2_front');
      await wait(700);

      // Wink
      d1.setTexture('daughter1_wink');
      d2.setTexture('daughter2_wink');
      puff(this, d1.x - 4, d1.y - 9, 0xffe14a, 3);
      puff(this, d2.x - 4, d2.y - 9, 0xffe14a, 3);
      await wait(800);
      d1.setTexture('daughter1_front');
      d2.setTexture('daughter2_front');
      await wait(300);

      // Zoom back, swap to side textures
      cam.zoomTo(ZOOM, 400);
      cam.pan(160, 90, 400);
      await wait(450);
      d1.setTexture('daughter1');
      d2.setTexture('daughter2');
      d1.setFlipX(false);
      d2.setFlipX(false);

      // Carry jug into the cave
      const d1StartX = d1.x;
      const jugDelta = (CAVE_X - 4) - d1StartX;
      const enterDur = Math.abs(CAVE_X - 4 - d1StartX) / 50 * 1000;
      const bob1 = this.tweens.add({ targets: d1, y: d1.y - 1, duration: 110, yoyo: true, repeat: -1 });
      const bob2 = this.tweens.add({ targets: d2, y: d2.y - 1, duration: 110, yoyo: true, repeat: -1 });
      this.tweens.add({ targets: jug, x: jug.x + jugDelta, duration: enterDur });
      await tween({ targets: d1, x: CAVE_X - 4, duration: enterDur });
      bob1.stop(); d1.y = GROUND_Y;

      await Promise.all([
        tween({ targets: d1, alpha: 0, duration: 300 }),
        tween({ targets: jug, alpha: 0, duration: 300 }),
        (async () => {
          await wait(200);
          await walk(d2, CAVE_X - 4);
          bob2.stop();
          await tween({ targets: d2, alpha: 0, duration: 300 });
        })(),
      ]);

    } else if (numDaughters === 1) {
      const dKey = d1Alive ? 'daughter1' : 'daughter2';
      const winkKey = d1Alive ? 'daughter1_wink' : 'daughter2_wink';
      const frontKey = d1Alive ? 'daughter1_front' : 'daughter2_front';
      const d = this.add.image(-12, GROUND_Y, dKey).setScale(ART_SCALE).setOrigin(0.5, 1).setDepth(3);

      await walk(d, 196);
      await wait(500);

      // Jug appears
      const jug = this.add.image(d.x + 8, GROUND_Y - JUG_H - 10, 'jug').setOrigin(0.5, 1).setScale(JUG_SCALE).setDepth(4);
      puff(this, jug.x, jug.y, 0xffe14a, 5);
      popText(this, jug.x, jug.y - 8, '!', '#ffe14a');
      await tween({ targets: jug, y: GROUND_Y - JUG_H, duration: 220, ease: 'Bounce.out' });

      await wait(300);

      // Look left... look right... shrug
      d.setFlipX(true);
      await wait(500);
      d.setFlipX(false);
      await wait(500);
      popText(this, d.x, d.y - 20, '?', '#fff');
      await tween({ targets: d, y: GROUND_Y - 2, duration: 80 });
      await tween({ targets: d, y: GROUND_Y, duration: 80 });

      // Zoom + wink
      cam.zoomTo(1.6 * ZOOM, 500);
      cam.pan(196, 130, 500);
      await wait(500);
      d.setTexture(frontKey);
      await wait(700);
      d.setTexture(winkKey);
      puff(this, d.x - 4, d.y - 9, 0xffe14a, 3);
      await wait(800);
      d.setTexture(frontKey);
      await wait(300);

      // Zoom back
      cam.zoomTo(ZOOM, 400);
      cam.pan(160, 90, 400);
      await wait(450);
      d.setTexture(dKey);
      d.setFlipX(false);

      // Enter with jug
      const dStartX = d.x;
      const jugDelta = (CAVE_X - 4) - dStartX;
      const enterDur = Math.abs(CAVE_X - 4 - dStartX) / 50 * 1000;
      const bob = this.tweens.add({ targets: d, y: d.y - 1, duration: 110, yoyo: true, repeat: -1 });
      this.tweens.add({ targets: jug, x: jug.x + jugDelta, duration: enterDur });
      await tween({ targets: d, x: CAVE_X - 4, duration: enterDur });
      bob.stop(); d.y = GROUND_Y;
      await Promise.all([
        tween({ targets: d, alpha: 0, duration: 300 }),
        tween({ targets: jug, alpha: 0, duration: 300 }),
      ]);

    } else {
      // 0 daughters: Lot peeks out
      await wait(1500);
      const lot = this.add.image(CAVE_X - 8, GROUND_Y, 'lot').setScale(ART_SCALE).setOrigin(0.5, 1).setAlpha(0).setDepth(6).setFlipX(true);
      await tween({ targets: lot, alpha: 1, duration: 200 });
      popText(this, lot.x - 10, lot.y - 24, '...', '#aaaaaa');
      await wait(1200);
      await tween({ targets: lot, alpha: 0, duration: 200 });
    }

    await wait(700);

    // Cut to black (reset camera first)
    cam.setZoom(ZOOM);
    cam.setScroll(0, 0);
    this.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, 0x000000).setOrigin(0).setScrollFactor(0).setDepth(1000);

    await wait(600);

    this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2, 'THE END', {
      fontFamily: 'monospace', fontSize: '16px', color: '#ffffff',
      stroke: '#000', strokeThickness: 2,
    }).setOrigin(0.5).setScrollFactor(0).setDepth(1001);

    await wait(2500);
    this.scene.start('CreditsScene');
  }
}
