// The comet that strikes Lot's wife in the wilderness cutscene, 72x72 px: a white-hot head at the bottom
// right trailing fire up to the top left. Place it with setOrigin(HEAD / 72) and rotate by
// atan2(dy, dx) - PI / 4 to fly along (dx, dy).
import { Pix, hash, dith } from './pix.js';

export const COMET_HEAD = 60;
const F = ['#4a1210', '#8a2416', '#c8401e', '#f07a24', '#ffb848', '#ffe8a0', '#ffffff'];

export function comet() {
  const S = 72, p = new Pix(S, S);
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
    // along: distance from the head back along the diagonal; across: distance off it
    const along = ((COMET_HEAD - x) + (COMET_HEAD - y)) / Math.SQRT2, across = Math.abs(x - y) / Math.SQRT2;
    const head = Math.hypot(x - COMET_HEAD, y - COMET_HEAD);
    let v = -1;
    if (head < 7) v = 6.6 - head * 0.55;                                       // glowing head
    else if (along > 0 && along < 80) {
      const w = 6 * (1 - along / 80) + 0.8;                                     // tail tapers away from the head
      const flick = (hash(Math.round(along / 3), 0, 3) - 0.5) * 1.6;            // ragged flames
      if (across < w + flick) v = 5.2 * (1 - along / 80) + 0.4 - across / (w + 1) * 1.5;
    }
    if (v < 0) continue;
    const i = dith(v, x, y);
    if (i >= 0) p.set(x, y, F[Math.min(6, i)]);
  }
  return p;
}
