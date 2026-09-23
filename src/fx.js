import { spendLife } from './runState.js';
// Call when Lot dies: spends a family life (or ends the run) and announces it.
// Returns the scene key to start next: this scene again, or Act I after a game over.
export function loseLife(scene) {
  const { gameOver, name } = spendLife();
  const msg = gameOver ? 'GAME OVER\nThe family is gone. Starting over.' : `Lot fell. ${name.replace('daughter', 'Daughter ').replace('wife', 'Wife')} is lost.`;
  scene.add.text(160, 40, msg, { fontFamily: 'monospace', fontSize: '8px', color: gameOver ? '#ff5a5a' : '#ffe14a',
    stroke: '#000', strokeThickness: 2, align: 'center' }).setOrigin(0.5).setScrollFactor(0).setDepth(950);
  return gameOver ? 'SodomScene' : scene.scene.key;
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
