import Phaser from 'phaser';
import './style.css';
import { GAME_WIDTH, GAME_HEIGHT, MOVE, DEBUG } from './config.js';
import BootScene from './scenes/BootScene.js';
import SodomScene from './scenes/SodomScene.js';
import FlightScene from './scenes/FlightScene.js';
import WildernessScene from './scenes/WildernessScene.js';
import MountainScene from './scenes/MountainScene.js';

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
  scene: [BootScene, SodomScene, FlightScene, WildernessScene, MountainScene],
});
if (DEBUG) window.game = game;
