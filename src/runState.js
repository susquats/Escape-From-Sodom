// Survives scene.restart(); a page reload starts a new run.
export const run = { lost: new Set(), checkpointX: null };
export function resetRun() { run.lost.clear(); run.checkpointX = null; }

// Each family member is a life, spent wife first, then the daughters; Lot alone is the last one.
// When Lot dies with nobody left the run is over (gameOver) and reset; otherwise play continues in place.
const LIFE_ORDER = ['wife', 'daughter1', 'daughter2'];
export function spendLife() {
  const next = LIFE_ORDER.find(k => !run.lost.has(k));
  if (next) { run.lost.add(next); return { gameOver: false, name: next }; }
  resetRun();
  return { gameOver: true, name: null };
}
