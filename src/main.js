import Phaser from 'phaser';
import './style.css';
import { GAME_WIDTH, GAME_HEIGHT, ZOOM, MOVE, DEBUG } from './config.js';
import BootScene from './scenes/BootScene.js';
import TitleScene from './scenes/TitleScene.js';
import SodomScene from './scenes/SodomScene.js';
import FlightScene from './scenes/FlightScene.js';
import WildernessScene from './scenes/WildernessScene.js';
import MountainScene from './scenes/MountainScene.js';
import EndingScene from './scenes/EndingScene.js';
import CreditsScene from './scenes/CreditsScene.js';
import ArtScene from './scenes/ArtScene.js';

document.addEventListener('contextmenu', (e) => e.preventDefault());

const game = new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  width: GAME_WIDTH * ZOOM,
  height: GAME_HEIGHT * ZOOM,
  backgroundColor: '#2b1b3a',
  pixelArt: true,
  roundPixels: true,
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
  input: { activePointers: 3 }, // multitouch
  physics: { default: 'arcade', arcade: { gravity: { y: MOVE.gravity }, debug: DEBUG } },
  scene: [BootScene, TitleScene, SodomScene, FlightScene, WildernessScene, MountainScene, EndingScene, CreditsScene, ArtScene],
});
if (DEBUG) window.game = game;
