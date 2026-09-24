import { spendLife, resetRun } from './runState.js';
// Call when Lot dies: spends a family life (or ends the run) and announces it. The next member
// (wife, then daughters) turns red and dies if a family is passed; play continues where it is.
// Returns { gameOver, name }; on gameOver the caller sends the player back to the title.
export function loseLife(scene, family = null) {
  const res = spendLife();
  const { gameOver, name } = res;
  const label = name && name.replace('daughter', 'Daughter ').replace('wife', 'Wife');
  const msg = gameOver ? 'GAME OVER\nThe family is gone. Starting over.' : `Lot fell. ${label} is lost.`;
  const t = scene.add.text(160, 40, msg, { fontFamily: 'monospace', fontSize: '8px', color: gameOver ? '#ff5a5a' : '#ffe14a',
    stroke: '#000', strokeThickness: 2, align: 'center' }).setOrigin(0.5).setScrollFactor(0).setDepth(950);
  if (!gameOver) scene.tweens.add({ targets: t, alpha: 0, delay: 1200, duration: 500, onComplete: () => t.destroy() });
  if (!gameOver && family) family.members.find(m => m.memberName === name)?.dieRed();
  return res;
}

// Lot died where the wall of destruction can still claim someone: the next family member
// (wife, then daughters) turns to salt instead of dying. Touching the salt rescues them; only
// if the wall (or a pit) destroys the salt is the life lost. Returns true on game over
// (nobody left to turn to salt), in which case the run is reset.
export function saltLife(scene, family) {
  const m = family.members.find(k => ['following', 'rejoining', 'lookingBack'].includes(k.state));
  const gameOver = !m;
  const label = m && m.memberName.replace('daughter', 'Daughter ').replace('wife', 'Wife');
  const msg = gameOver ? 'GAME OVER\nThe family is gone. Starting over.' : `Lot fell. ${label} turns to salt!\nTouch the salt to rescue.`;
  const t = scene.add.text(160, 40, msg, { fontFamily: 'monospace', fontSize: '8px', color: gameOver ? '#ff5a5a' : '#ffe14a',
    stroke: '#000', strokeThickness: 2, align: 'center' }).setOrigin(0.5).setScrollFactor(0).setDepth(950);
  if (gameOver) resetRun();
  else {
    scene.tweens.add({ targets: t, alpha: 0, delay: 1500, duration: 500, onComplete: () => t.destroy() });
    m.saltify(true);
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
