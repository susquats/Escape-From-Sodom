// Survives scene.restart(); a page reload starts a new run.
export const run = { lost: new Set() };
export function resetRun() { run.lost.clear(); }
