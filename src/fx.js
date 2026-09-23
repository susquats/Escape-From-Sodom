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
