// Survives scene.restart(); a page reload starts a new run.
// introSeen: Act I's opening cinematic has played this run (retries skip it)
export const run = { lost: new Set(), checkpointX: null, introSeen: false };
export function resetRun() { run.lost.clear(); run.checkpointX = null; run.introSeen = false; }
// Resurrecting from a checkpoint always brings back the whole family.
export function saveCheckpoint(x) { run.checkpointX = x; }
export function restoreCheckpoint() { run.lost.clear(); }

// Each family member is a life, spent wife first, then the daughters; Lot alone is the last one.
// When Lot dies with nobody left the run is over (gameOver) and reset; otherwise play continues in place.
const LIFE_ORDER = ['wife', 'daughter1', 'daughter2'];
export function spendLife() {
  const next = LIFE_ORDER.find(k => !run.lost.has(k));
  if (next) { run.lost.add(next); return { gameOver: false, name: next }; }
  resetRun();
  return { gameOver: true, name: null };
}
