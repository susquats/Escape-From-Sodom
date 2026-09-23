import Phaser from 'phaser';
import './style.css';
import { GAME_WIDTH, GAME_HEIGHT, MOVE, DEBUG } from './config.js';
import BootScene from './scenes/BootScene.js';
import TestScene from './scenes/TestScene.js';

document.addEventListener('contextmenu', (e) => e.preventDefault());

const game = new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  width: GAME_WIDTH,
  height: GAME_HEIGHT,
  backgroundColor: '#2b1b3a',
  pixelArt: true,
  roundPixels: true,
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
  input: { activePointers: 3 }, // multitouch
  physics: { default: 'arcade', arcade: { gravity: { y: MOVE.gravity }, debug: DEBUG } },
  scene: [BootScene, TestScene],
});
if (DEBUG) window.game = game;
