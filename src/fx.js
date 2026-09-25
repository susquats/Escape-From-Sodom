import { GAME_WIDTH, GAME_HEIGHT } from './config.js';
import { t } from './i18n.js';
import { run, spendLife, resetRun, restoreCheckpoint } from './runState.js';
// Plays one of the loaded sound effects (explosion, hitHurt, jump, powerUp).
export function sfx(scene, key, volume = 0.5) {
  scene.sound.play(key, { volume });
}

// Call when Lot dies: spends a family life (or ends the run) and announces it. The next member
// (wife, then daughters) turns red and dies if a family is passed; play continues where it is.
// Returns { gameOver, name }; on gameOver the caller sends the player back to the title.
export function loseLife(scene, family = null) {
  sfx(scene, 'hitHurt');
  const res = spendLife();
  const { gameOver, name } = res;
  const msg = gameOver ? t('life.gameOver') : t(`gone.${name}`);
  const txt = scene.add.text(160, 40, msg, { fontFamily: 'monospace', fontSize: '8px', color: gameOver ? '#ff5a5a' : '#ffe14a',
    stroke: '#000', strokeThickness: 2, align: 'center' }).setOrigin(0.5).setScrollFactor(0).setDepth(950);
  if (!gameOver) scene.tweens.add({ targets: txt, alpha: 0, delay: 1200, duration: 500, onComplete: () => txt.destroy() });
  if (!gameOver && family) family.members.find(m => m.memberName === name)?.dieRed();
  return res;
}

// Lot died where the wall of destruction can still claim someone: the next family member
// (wife, then daughters) turns to salt instead of dying. Touching the salt rescues them; only
// if the wall (or a pit) destroys the salt is the life lost. Returns true on game over
// (nobody left to turn to salt): the family as it was at the checkpoint is restored and Act I restarts at the last checkpoint,
// or the whole run resets if none was reached.
export function saltLife(scene, family, fell = false) {
  sfx(scene, 'hitHurt');
  const m = family.members.find(k => ['following', 'rejoining', 'lookingBack'].includes(k.state));
  const gameOver = !m;
  const hasCp = run.checkpointX !== null;
  const msg = gameOver ? t(hasCp ? 'life.gameOverCp' : 'life.gameOver')
    : fell ? t('life.fell') : t('life.salt', { name: t(`name.${m.memberName}`) });
  const txt = scene.add.text(160, 40, msg, { fontFamily: 'monospace', fontSize: '8px', color: gameOver ? '#ff5a5a' : '#ffe14a',
    stroke: '#000', strokeThickness: 2, align: 'center' }).setOrigin(0.5).setScrollFactor(0).setDepth(950);
  if (gameOver) { if (hasCp) restoreCheckpoint(); else resetRun(); }
  else {
    scene.tweens.add({ targets: txt, alpha: 0, delay: 1500, duration: 500, onComplete: () => txt.destroy() });
    if (fell) m.dieRed(); // a fall leaves no salt to rescue
    else m.saltify(true);
  }
  return gameOver;
}

export function popText(scene, x, y, str, color = '#fff') {
  const t = scene.add.text(x, y, str, { fontFamily: 'monospace', fontSize: '8px', color,
    stroke: '#000', strokeThickness: 2 }).setOrigin(0.5, 1).setDepth(800);
  scene.tweens.add({ targets: t, y: y - 14, alpha: 0, duration: 700, onComplete: () => t.destroy() });
}

export function puff(scene, x, y, color = 0xffffff, count = 6) {
  for (let i = 0; i < count; i++) {
    const a = (i / count) * Math.PI * 2;
    const p = scene.add.image(x, y, 'pixel').setTint(color).setDepth(799);
    scene.tweens.add({ targets: p, x: x + Math.cos(a) * 10, y: y + Math.sin(a) * 10,
      alpha: 0, duration: 350, onComplete: () => p.destroy() });
  }
}

// A pixel speech bubble whose tail points down at (x, y) (just above a speaker's head), shown for ms. It holds
// `text`, or an ellipsis ("...") drawn as three dots. World units, so it sits in the world and scrolls with it.
export function speech(scene, x, y, ms = 900, text = null) {
  const g = scene.add.graphics().setPosition(Math.round(x), Math.round(y)).setDepth(800);
  const t = text && scene.add.text(0, 0, text, { fontFamily: 'monospace', fontSize: '8px', color: '#1a1420' })
    .setOrigin(0.5, 1).setDepth(801);
  const w = t ? Math.ceil(t.width) + 6 : 13, h = t ? Math.ceil(t.height) + 1 : 7;
  const x0 = -Math.floor(w / 2), y0 = -h - 3;
  g.fillStyle(0x1a1420).fillRect(x0 + 1, y0 - 1, w - 2, h + 2).fillRect(x0 - 1, y0 + 1, w + 2, h - 2)
    .fillRect(x0, y0, w, h).fillRect(-2, y0 + h, 4, 2).fillRect(-1, y0 + h + 2, 2, 1);
  g.fillStyle(0xffffff).fillRect(x0 + 1, y0, w - 2, h).fillRect(x0, y0 + 1, w, h - 2).fillRect(-1, y0 + h, 2, 2);
  g.fillStyle(0x1a1420);
  if (!t) [-4, -1, 2].forEach(dx => g.fillRect(dx + 1, y0 + 3, 1, 1));
  const parts = t ? [g, t.setPosition(g.x, g.y - 3)] : [g];
  parts.forEach(o => o.setScale(0.4));
  scene.tweens.add({ targets: parts, scale: 1, duration: 120, ease: 'Back.out' });
  scene.time.delayedCall(ms, () => scene.tweens.add({ targets: parts, alpha: 0, duration: 120,
    onComplete: () => parts.forEach(o => o.destroy()) }));
  return g;
}

// Cinematic black bars that slide in from the top and bottom of the view. Returns { bars, hide() }.
export function letterbox(scene, ms = 400) {
  const bars = [0, 1].map(i => scene.add.rectangle(0, i ? GAME_HEIGHT : 0, GAME_WIDTH, 22, 0x000000)
    .setOrigin(0, i).setScrollFactor(0).setDepth(940).setScale(1, 0));
  scene.tweens.add({ targets: bars, scaleY: 1, duration: ms, ease: 'Quad.out' });
  return { bars, hide: () => scene.tweens.add({ targets: bars, scaleY: 0, duration: ms, ease: 'Quad.in' }) };
}
