// Survives scene.restart(); a page reload starts a new run.
export const run = { lost: new Set(), checkpointX: null };
export function resetRun() { run.lost.clear(); run.checkpointX = null; }

// Each family member is a life; Lot alone is the last one. Returns true when the run is over
// (Lot died with nobody left), in which case the run is reset and the next restart is a fresh game.
const LIFE_ORDER = ['daughter2', 'daughter1', 'wife'];
export function spendLife() {
  const next = LIFE_ORDER.find(k => !run.lost.has(k));
  if (next) { run.lost.add(next); return { gameOver: false, name: next }; }
  resetRun();
  return { gameOver: true, name: null };
}
