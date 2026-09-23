// Records Lot's feet path; family members sample it at a fixed path distance behind him.
export default class Trail {
  constructor(x, y, maxLength) {
    this.maxLength = maxLength;
    this.total = 0;
    this.points = [];
    // Pre-seed a flat path to the LEFT so the family starts lined up behind Lot.
    for (let i = maxLength; i >= 0; i -= 2) this.push(x - i, y, 1, true);
  }

  push(x, y, facing, onGround = true) {
    const last = this.points[this.points.length - 1];
    if (last) this.total += Math.hypot(x - last.x, y - last.y);
    this.points.push({ x, y, d: this.total, facing, onGround });
    while (this.points.length > 2 && this.total - this.points[1].d > this.maxLength) this.points.shift();
  }

  record(x, y, facing, onGround) {
    const last = this.points[this.points.length - 1];
    if (Math.hypot(x - last.x, y - last.y) < 0.5) return; // Lot not moving: family waits
    this.push(x, y, facing, onGround);
  }

  sample(distBack) { // returns {x, y, facing, onGround}
    const pts = this.points;
    const target = this.total - distBack;
    if (target <= pts[0].d) return pts[0];
    for (let i = pts.length - 1; i > 0; i--) {
      const a = pts[i - 1], b = pts[i];
      if (a.d <= target) {
        const t = b.d === a.d ? 0 : (target - a.d) / (b.d - a.d);
        return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t, facing: b.facing, onGround: a.onGround && b.onGround };
      }
    }
    return pts[0];
  }
}
