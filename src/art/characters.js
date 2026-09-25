// Posed, shaded character sprites (see rig.js). Every character is a little skeleton: hip -> torso -> neck ->
// head, two legs (thigh, shin, foot) and two arms (upper arm, forearm, hand). A pose sets the joint angles;
// clothes and heads are drawn around the joints, far limbs darker and behind the body, near limbs in front.
// Characters face RIGHT. Angles: 0 = straight down, +90 = forward, 180 = up (see `along`).
import { Canvas, along, lerp } from './rig.js';

const EYE = '#ffffff', PUPIL = '#1a0c14', MOUTH = '#7a2226', BROW = '#2a120c';
const FAR = 0.13; // far limbs are this much darker
const P = (x, y) => ({ x, y });
// hair strands: faint diagonal stripes
const STRANDS = (x, y) => ((x * 2 + y) % 5 === 0 ? -0.12 : 0);

// ---------- poses ----------
// legs/arms: [far, near], each [upper angle, bend]. Leg bend folds the shin back, arm bend folds the forearm forward.
const RUN_FRAMES = 8;
// bob: px the body bounces up between footfalls. sweep: how far skirts/veils blow back.
function runPose(i, { stride = 40, lean = 12, arm = 50, knee = 72, elbow = 75, bob = 0, sweep = 0 } = {}) {
  const leg = (ph) => [stride * Math.sin(ph), 14 + knee * Math.max(0, Math.cos(ph))];
  const armA = (ph) => [-arm * Math.sin(ph) + 5, elbow + 25 * Math.cos(ph)];
  const ph = (i / RUN_FRAMES) * Math.PI * 2;
  const up = 0.5 - 0.5 * Math.cos(2 * ph); // 0 at mid-stance, 1 in the air
  return {
    lean, legs: [leg(ph + Math.PI), leg(ph)], arms: [armA(ph), armA(ph + Math.PI)], phase: ph,
    lift: bob * up, flow: 1 + 0.35 * up, hairY: 1.5 - 3 * up, // hair lags the bounce
    sweep, flutter: Math.sin(ph * 2) * 1.2,
  };
}
const IDLE = { lean: 0, legs: [[-4, 3], [5, 3]], arms: [[-7, 12], [5, 18]], flow: 0 };
const JUMP = { lean: 6, air: 3, legs: [[-28, 75], [62, 100]], arms: [[-60, 50], [70, 85]], flow: 1.4 };
const FALL = { lean: 2, air: 0, legs: [[-18, 25], [22, 35]], arms: [[-150, 25], [150, -25]], flow: -1, mouth: 'open', armsBack: true };
// Family jumps: rising = knee up, fist in the air, hair trailing down; falling = arms out, hair and skirt up.
const HOP = { lean: 10, air: 3, legs: [[-40, 70], [70, 115]], arms: [[-70, 60], [75, 75]], flow: 1.3, hairY: 3, sweep: 2.5, flutter: 1, mouth: 'open' };
const DROP = { lean: 4, air: 1, legs: [[-25, 40], [30, 60]], arms: [[-125, 30], [125, -20]], flow: 0.6, hairY: -4, sweep: 1.5, flutter: -1.5, hemUp: 1.5, armsBack: true };
// Hanging from an angel (Act I lift-off, Act II flight): arms up, legs trailing, everything blown back.
const hangPose = (f) => ({
  lean: 10, air: 2, legs: [[-30 - f * 8, 30 + f * 10], [-14 + f * 6, 40 - f * 12]], arms: [[196, 6], [214, -4]],
  flow: 2.2 + f * 0.3, hairY: -2 + f, sweep: 5, flutter: f ? 1.5 : -1, hemUp: 1, mouth: 'open', hang: true,
});

// ---------- skeleton ----------
function legAt(s, hip, [thigh, bend]) {
  const [lt, ls] = s.leg;
  const knee = along(hip, thigh, lt);
  const shinA = thigh - bend;
  const ankle = along(knee, shinA, ls);
  const footA = Math.max(20, Math.min(125, shinA + 90));
  const toe = along(ankle, footA, s.foot);
  return { hip, knee, ankle, toe, shinA };
}
function skeleton(s, pose) {
  const [lt, ls] = s.leg;
  // ground the lowest foot (or hang in the air at the standing height minus `air`)
  const probe = pose.legs.map(l => legAt(s, P(0, 0), l));
  const low = Math.max(...probe.flatMap(l => [l.ankle.y, l.toe.y])) + s.footR;
  const standLow = lt + ls + s.footR;
  const hipY = pose.air !== undefined ? s.h - 0.5 - standLow - pose.air : s.h - 0.5 - low - (pose.lift || 0);
  const sk = build(s, pose, hipY);
  if (!pose.hang) return sk;
  // hanging: hands (or head) at the top of the frame
  const top = Math.min(...sk.arms.map(a => a.hand.y - s.handR), sk.head.y - 7);
  return build(s, pose, hipY + 1.5 - top);
}
function build(s, pose, hipY) {
  const hip = P(s.cx, hipY);
  const legs = pose.legs.map((l, k) => legAt(s, P(hip.x + (k ? 0.8 : -0.8), hip.y), l));

  const lean = pose.lean;
  const tl = s.torso;
  const neck = along(hip, 180 - lean, tl);
  const up = P((neck.x - hip.x) / tl, (neck.y - hip.y) / tl), fwd = P(-up.y, up.x);
  const local = (fx, uy) => P(hip.x + fwd.x * fx + up.x * uy, hip.y + fwd.y * fx + up.y * uy);
  const shoulder = local(s.shoulderX ?? 0, tl - s.shoulderDrop);
  const armAt = (sh, [upper, bend]) => {
    const elbow = along(sh, upper, s.arm[0]);
    const hand = along(elbow, upper + bend, s.arm[1]);
    return { sh, elbow, hand, upper };
  };
  const arms = pose.arms.map((a, k) => armAt(P(shoulder.x + (k ? 1.2 : -1.2), shoulder.y), a));
  const head = along(neck, 180 - lean * 0.6, s.neck);
  return { hip, neck, legs, arms, local, up, fwd, head: P(head.x + s.headFwd, head.y) };
}

// ---------- limbs ----------
function drawLeg(c, s, L, o) {
  const part = c.newPart();
  c.capsule(L.hip, L.knee, s.legR[0], s.legR[1], s.legMat, { part, ...o });
  c.capsule(L.knee, L.ankle, s.legR[1], s.legR[2], s.legMat, { part, ...o });
  c.capsule(L.ankle, L.toe, s.footR, s.footR * 0.85, s.footMat, o);
}
function drawArm(c, s, A, o) {
  const part = c.newPart();
  c.capsule(A.sh, A.elbow, s.armR[0], s.armR[1], s.skinMat, { part, ...o });
  c.capsule(A.elbow, A.hand, s.armR[1], s.armR[2], s.skinMat, { part, ...o });
  if (s.sleeve) {
    const end = lerp(A.sh, A.elbow, s.sleeve.len);
    c.capsule(A.sh, end, s.sleeve.r, s.sleeve.r * 0.9, s.sleeve.mat, { part, ...o });
    if (s.sleeve.len > 1) c.capsule(A.elbow, lerp(A.elbow, A.hand, s.sleeve.len - 1), s.sleeve.r * 0.9, s.sleeve.r * 0.85, s.sleeve.mat, { part, ...o });
  }
  c.ellipse(A.hand.x, A.hand.y, s.handR, s.handR, s.skinMat, { part: c.newPart(false), ...o });
}

// Tunic / dress / robe from the shoulders to a hem that spreads with the knees. `sweep` blows the hem back
// (the trailing corner lifts and flutters), `hemUp` raises it (air rushing up while falling).
function drawGarment(c, sk, pose, { mat, shoulder = 4.5, waist = 4, hemDrop, hemPad = 1.5, top, flare = 0, sweep = 0, flutter = 0, hemUp = 0, follow = 1, o = {} }) {
  const tl = Math.hypot(sk.neck.x - sk.hip.x, sk.neck.y - sk.hip.y);
  const knees = sk.legs.map(l => lerp(l.knee, l.ankle, Math.max(0, hemDrop - 1)));
  sweep += pose.sweep || 0; flutter += pose.flutter || 0; hemUp += pose.hemUp || 0;
  const hemY = sk.hip.y + hemDrop * 5 - hemUp;
  const xs = [...knees.map(k => sk.hip.x + (k.x - sk.hip.x) * follow), sk.hip.x - waist - flare, sk.hip.x + waist + flare];
  const back = Math.min(...xs) - hemPad - sweep;
  const front = Math.min(Math.max(...xs) + hemPad, sk.hip.x + waist + flare + 3) - sweep * 0.3;
  const tail = P(back - sweep * 0.3, hemY - sweep * 0.55 + flutter); // trailing corner
  const pts = [
    sk.local(-2.2, tl + (top ?? 0.8)), sk.local(-shoulder, tl - 1), sk.local(-waist, 2),
    tail, P(back + 1.5, hemY + 1 - sweep * 0.15 - flutter * 0.4), P((back + front) / 2, hemY + 1.2 + flutter * 0.3),
    P(front - 1.5, hemY + 1), P(front, hemY - hemUp * 0.5),
    sk.local(waist + 0.3, 2), sk.local(shoulder - 0.3, tl - 1), sk.local(2.2, tl + (top ?? 0.8)),
  ];
  const part = c.poly(pts, mat, o);
  // fold lines from the waist down toward the hem
  if (sweep > 0) {
    const w = sk.local(-1, 2.5);
    for (const [end, t0] of [[lerp(tail, P(back + 1.5, hemY), 0.5), 0.35], [P((back + front) / 2 - 0.5, hemY), 0.45]]) {
      for (let t = t0; t <= 0.95; t += 0.1) { const q = lerp(w, end, t); if (c.partAt(q.x, q.y) === part) c.setTone(q.x, q.y, 1); }
    }
  }
  return part;
}

// ---------- heads (side view, facing dir) ----------
function eye(c, ex, ey, dir, { blink, dead, big, lash } = {}) {
  const X = (dx) => ex + dx * dir;
  if (dead) { c.ink(X(0), ey, PUPIL); c.ink(X(1), ey + 1, PUPIL); c.ink(X(1), ey, PUPIL); c.ink(X(0), ey + 1, PUPIL); return; }
  if (blink) { c.ink(X(0), ey + 1, PUPIL); c.ink(X(1), ey + 1, PUPIL); return; }
  c.ink(X(0), ey, EYE); c.ink(X(1), ey, PUPIL);
  c.ink(X(0), ey + 1, EYE); c.ink(X(1), ey + 1, PUPIL);
  if (big) { c.ink(X(0), ey + 2, EYE); c.ink(X(1), ey + 2, PUPIL); c.ink(X(1), ey, '#ffffff'); }
  if (lash) { c.ink(X(2), ey - 1, PUPIL); c.ink(X(1), ey - 1, PUPIL); c.ink(X(0), ey - 1, PUPIL); }
}

// style: lot | sodomite | wife | girl | angel
function headSide(c, h, { style, hair, skin = 'skin', dir = 1, blink, dead, mouth, flow = 0, hairY = 0 }) {
  const cx = h.x, cy = h.y, X = (dx) => cx + dx * dir;
  const behind = (x, lim) => (x + 0.5 - cx) * dir < lim;

  if (style === 'girl') { // long hair down the back, streaming when running
    // three locks, each bending through a mid point; the outer ones stream further and lag the bounce more
    for (let k = 2; k >= 0; k--) {
      const base = P(X(-1.5 - k * 0.6), cy - 1 + k * 1.6);
      const tip = P(X(-5 - k * 0.5 - flow * (3 + k * 1.3)), cy + 10 + k - flow * (3.2 - k * 0.4) + hairY * (0.6 + k * 0.35));
      const mid = P((base.x + tip.x) / 2 + dir * 0.8, (base.y + tip.y) / 2 + 1.2);
      const r = 4.2 - k * 0.9;
      c.capsule(base, mid, r, r * 0.8, hair, { tex: STRANDS, dim: 0.04 * k });
      c.capsule(mid, tip, r * 0.8, 1, hair, { tex: STRANDS, dim: 0.04 * k });
    }
    c.ellipse(X(-1.2), cy - 0.6, 5.2, 5.6, hair, { tex: STRANDS });
  } else if (style === 'wife') {
    for (let k = 1; k >= 0; k--) { // veil streams back in two layers
      const base = P(X(-2.4), cy + 1 + k);
      const tip = P(X(-4.5 - k - flow * (3.4 + k * 1.2)), cy + 12 - flow * (2.6 - k * 0.5) + hairY * (0.7 + k * 0.4));
      const mid = P((base.x + tip.x) / 2 + dir, (base.y + tip.y) / 2 + 1);
      c.capsule(base, mid, 4.4 - k, 3.8 - k, 'veil', { dim: 0.08 + k * 0.08 });
      c.capsule(mid, tip, 3.8 - k, 2.2 - k * 0.6, 'veil', { dim: 0.08 + k * 0.08 });
    }
    c.ellipse(X(-1.2), cy - 0.2, 5.4, 6, 'veil');
  } else if (style === 'angel') {
    c.ellipse(X(-1.5), cy + 0.3, 5.3, 5.8, hair, { tex: STRANDS });
    c.ellipse(X(-3.2), cy + 3.5, 2.6, 3, hair, { tex: STRANDS });
  } else { // lot / sodomite: big mane
    c.ellipse(X(-2.4), cy + 0.6, style === 'lot' ? 5 : 4.6, style === 'lot' ? 6 : 5.2, hair, { tex: STRANDS });
    if (style === 'lot') c.ellipse(X(-4), cy + 4.5, 2.6, 3.4, hair, { tex: STRANDS, dim: 0.08 }); // hair over the neck
  }

  // face + nose
  const face = c.newPart();
  const fr = style === 'girl' || style === 'wife' ? 4.6 : 5;
  c.ellipse(X(1.2), cy + 0.7, fr, fr + 0.4, skin, { part: face });
  c.ellipse(X(fr + 1), cy + 1.5, 1.3, 1.3, skin, { part: face });
  if (style === 'lot' || style === 'sodomite') c.ellipse(X(-1.6), cy + 1.2, 1.3, 1.7, skin, { dim: 0.1 }); // ear

  // hair on top / bangs, veil band
  if (style === 'wife') {
    c.ellipse(X(0.3), cy - 2.4, 5.6, 3.8, 'veil', { clip: (x, y) => y + 0.5 < cy - 2 + (x + 0.5 - cx) * dir * 0.3 || behind(x, -1.8) });
    c.capsule(P(X(1), cy - 2.2), P(X(4), cy - 1.8), 0.9, 0.7, 'hairGirl', { contour: false });
  } else if (style === 'girl') {
    c.ellipse(X(0.6), cy - 2.6, 5.3, 3.4, hair, { tex: STRANDS, clip: (x, y) => y + 0.5 < cy - 1.2 + (x + 0.5 - cx) * dir * 0.45 });
    c.capsule(P(X(-0.5), cy - 1), P(X(-0.8), cy + 4), 1.4, 1.1, hair, { tex: STRANDS }); // strand over the ear
  } else if (style === 'angel') {
    c.ellipse(X(0.4), cy - 2.4, 5.2, 3.5, hair, { tex: STRANDS, clip: (x, y) => y + 0.5 < cy - 1.4 + (x + 0.5 - cx) * dir * 0.4 });
  } else {
    c.ellipse(X(-0.2), cy - 3.2, 5.6, 3.2, hair, { tex: STRANDS, clip: (x, y) => y + 0.5 < cy - 3.2 + (x + 0.5 - cx) * dir * 0.2 || (x + 0.5 - cx) * dir < -1.5, contour: false });
    c.capsule(P(X(-1.3), cy - 1.5), P(X(-0.6), cy + 3.5), 1.1, 1.4, hair, { tex: STRANDS }); // sideburn
  }
  if (style === 'sodomite') { // rainbow headband: one color per segment, all one part so no contour between them
    const band = c.newPart(false), mats = ['red', 'clay', 'gold', 'green', 'blue', 'violet'], n = mats.length;
    const at = (t) => P(X(-4.5 + 8.7 * t), cy - 2.4 + 0.2 * t);
    mats.forEach((m, i) => c.capsule(at(i / n), at((i + 1) / n), 1.3 - 0.2 * (i / n), 1.3 - 0.2 * ((i + 1) / n), m, { part: band }));
  }

  // beard
  if (style === 'lot' || style === 'sodomite') {
    const b = c.newPart(false);
    c.ellipse(X(1.8), cy + 4.6, style === 'lot' ? 4.6 : 4.2, style === 'lot' ? 3.6 : 2.8, hair, { tex: STRANDS, part: b, clip: (x, y) => y + 0.5 > cy + 2.9 - Math.max(0, -(x + 0.5 - cx) * dir) * 0.6 });
    if (style === 'lot') c.ellipse(X(1.4), cy + 7.2, 2.6, 2.2, hair, { tex: STRANDS, part: b });
    c.capsule(P(X(3.2), cy + 3.4), P(X(5.6), cy + 3.5), 0.8, 0.7, hair, { tex: STRANDS, part: b }); // moustache
  }

  // features
  const ex = Math.floor(X(style === 'lot' || style === 'sodomite' ? 3.4 : 2.8)), ey = Math.floor(cy + 0.4);
  const girly = style === 'girl' || style === 'wife' || style === 'angel';
  eye(c, dir > 0 ? ex : ex - 1, ey, dir, { blink, dead, big: girly, lash: style === 'girl' || style === 'wife' });
  if (style === 'sodomite') { // angry brow
    c.ink(X(1.5), ey - 2, BROW); c.ink(X(2.5), ey - 1, BROW); c.ink(X(3.5), ey - 1, BROW);
    c.ink(X(4), ey + 4, EYE); c.ink(X(3), ey + 4, EYE); // gritted teeth
  } else if (!girly) {
    c.ink(X(2.4), ey - 1, BROW); c.ink(X(3.4), ey - 1, BROW); c.ink(X(4.4), ey - 1, BROW);
  }
  if (style === 'lot') { c.ink(X(4), ey + 4, mouth === 'open' ? PUPIL : MOUTH); c.ink(X(5), ey + 4, mouth === 'open' ? PUPIL : MOUTH); }
  if (girly) {
    c.ink(X(3.6), ey + 4, MOUTH);
    if (mouth === 'open') c.ink(X(3.6), ey + 5, PUPIL);
    c.setTone(X(2), ey + 3, 3); // cheek
  }
  return face;
}

// Front-facing head (ending scene).
function headFront(c, h, { hair, wink, veil }) {
  const cx = h.x, cy = h.y;
  if (veil) { // white head covering draped over the crown and down past the shoulders
    c.capsule(P(cx - 5, cy), P(cx - 6, cy + 11), 3.8, 3, 'veil');
    c.capsule(P(cx + 5, cy), P(cx + 6, cy + 11), 3.8, 3, 'veil');
    c.ellipse(cx, cy - 1, 7, 6.6, 'veil');
  }
  if (!veil) {
    c.capsule(P(cx - 4.5, cy), P(cx - 5.2, cy + 10), 3.2, 2.4, hair);
    c.capsule(P(cx + 4.5, cy), P(cx + 5.2, cy + 10), 3.2, 2.4, hair);
  }
  if (!veil) c.ellipse(cx, cy - 0.5, 6.2, 5.8, hair);
  c.ellipse(cx, cy + 1, 4.6, 5, 'skin');
  c.ellipse(cx, cy - 2.6, 5.6, 3.2, veil ? 'veil' : hair, { clip: (x, y) => y + 0.5 < cy - 1.6 + Math.abs(x + 0.5 - cx) * 0.35 });
  const L = Math.floor(cx - 3), R = Math.floor(cx + 1), ey = Math.floor(cy + 0.8);
  if (wink) { c.ink(L, ey + 1, PUPIL); c.ink(L + 1, ey + 1, PUPIL); c.ink(L + 1, ey, PUPIL); } else eye(c, L, ey, 1, { big: true, lash: true });
  eye(c, R, ey, 1, { big: true, lash: true });
  c.ink(cx - 0.5, ey + 4, MOUTH); c.ink(cx + 0.5, ey + 4, MOUTH);
  if (wink) { c.ink(cx - 1.5, ey + 4, MOUTH); c.ink(cx + 1.5, ey + 3, MOUTH); }
  c.setTone(cx - 3, ey + 3, 3); c.setTone(cx + 3, ey + 3, 3);
}

// ---------- characters ----------
const LOT = {
  w: 32, h: 46, cx: 14, leg: [5.6, 5.8], legR: [2.3, 1.9, 1.6], foot: 3, footR: 1.5, legMat: 'skin', footMat: 'leather',
  torso: 10.5, shoulderDrop: 1.5, neck: 6.2, headFwd: 0.8, arm: [5, 4.6], armR: [1.9, 1.6, 1.4], handR: 1.6,
  skinMat: 'skin', sleeve: { mat: 'cream', r: 2.4, len: 0.6 },
};
function lotFrame(pose, { blink, dead } = {}) {
  const c = new Canvas(LOT.w, LOT.h), sk = skeleton(LOT, pose);
  drawArm(c, LOT, sk.arms[0], { dim: FAR });
  drawLeg(c, LOT, sk.legs[0], { dim: FAR });
  drawLeg(c, LOT, sk.legs[1], {});
  drawGarment(c, sk, pose, { mat: 'cream', shoulder: 4.8, waist: 4.4, hemDrop: 0.75, hemPad: 1 });
  c.capsule(sk.local(-4.6, 3.2), sk.local(4.9, 3.2), 1.1, 1.1, 'leather'); // belt
  if (pose.armsBack) drawArm(c, LOT, sk.arms[1], {});
  headSide(c, sk.head, { style: 'lot', hair: 'hairLot', blink, dead, mouth: pose.mouth, flow: pose.flow });
  if (!pose.armsBack) drawArm(c, LOT, sk.arms[1], {});
  return c.finish();
}

const WIFE = {
  w: 38, h: 44, cx: 21, leg: [5, 5], legR: [2, 1.7, 1.4], foot: 2.8, footR: 1.3, legMat: 'skin', footMat: 'leather',
  torso: 11, shoulderDrop: 1.6, neck: 5.8, headFwd: 0.6, arm: [4.8, 4.4], armR: [1.7, 1.5, 1.3], handR: 1.4,
  skinMat: 'skin', sleeve: { mat: 'blue', r: 2.2, len: 1.6 },
};
function wifeFrame(pose, { look, blink } = {}) {
  const c = new Canvas(WIFE.w, WIFE.h), sk = skeleton(WIFE, pose);
  drawArm(c, WIFE, sk.arms[0], { dim: FAR });
  drawLeg(c, WIFE, sk.legs[0], { dim: FAR });
  drawLeg(c, WIFE, sk.legs[1], {});
  drawGarment(c, sk, pose, { mat: 'blue', shoulder: 4.5, waist: 4.2, hemDrop: 1.3, hemPad: 1, flare: 1.2, follow: 0.45 });
  c.capsule(sk.local(-4.4, 4.2), sk.local(4.6, 4.2), 0.9, 0.9, 'gold'); // sash
  headSide(c, sk.head, { style: 'wife', hair: 'hairGirl', dir: look ? -1 : 1, blink, mouth: look ? 'open' : pose.mouth, flow: pose.flow, hairY: pose.hairY });
  drawArm(c, WIFE, sk.arms[1], {});
  return c.finish();
}

const GIRL = {
  w: 36, h: 38, cx: 21, leg: [3.8, 4], legR: [1.8, 1.5, 1.2], foot: 2.4, footR: 1.2, legMat: 'skin', footMat: 'leather',
  torso: 8.6, shoulderDrop: 1.4, neck: 5.4, headFwd: 0.6, arm: [4, 3.8], armR: [1.5, 1.3, 1.1], handR: 1.3,
  skinMat: 'skin', sleeve: { mat: null, r: 1.9, len: 0.45 },
};
function girlFrame(dressMat, pose, { front, wink, blink } = {}) {
  const s = { ...GIRL, sleeve: { ...GIRL.sleeve, mat: dressMat } };
  const c = new Canvas(s.w, s.h);
  if (front) return girlFront(c, s, dressMat, wink);
  const sk = skeleton(s, pose);
  drawArm(c, s, sk.arms[0], { dim: FAR });
  drawLeg(c, s, sk.legs[0], { dim: FAR });
  drawLeg(c, s, sk.legs[1], {});
  drawGarment(c, sk, pose, { mat: dressMat, shoulder: 3.6, waist: 3.2, hemDrop: 0.85, hemPad: 1, flare: 1, top: 0.2, follow: 0.4 });
  c.capsule(sk.local(-3.3, 3.4), sk.local(3.5, 3.4), 0.8, 0.8, 'gold'); // belt
  headSide(c, sk.head, { style: 'girl', hair: 'hairGirl', blink, mouth: pose.mouth, flow: pose.flow, hairY: pose.hairY });
  drawArm(c, s, sk.arms[1], {});
  return c.finish();
}
function girlFront(c, s, dressMat, wink) {
  const cx = s.cx, Y = s.h - 32; // drawn standing on the bottom of the frame
  for (const dx of [-2, 2]) {
    c.capsule(P(cx + dx, Y + 21), P(cx + dx * 1.1, Y + 28.5), 1.7, 1.3, 'skin');
    c.ellipse(cx + dx * 1.2, Y + 30, 2, 1.2, 'leather');
  }
  for (const dx of [-1, 1]) c.capsule(P(cx + dx * 4, Y + 14.5), P(cx + dx * 5.2, Y + 21.5), 1.5, 1.2, 'skin');
  c.poly([P(cx - 2.5, Y + 12.5), P(cx - 4.2, Y + 14), P(cx - 3.8, Y + 18.5), P(cx - 6, Y + 25.5), P(cx + 6, Y + 25.5),
    P(cx + 3.8, Y + 18.5), P(cx + 4.2, Y + 14), P(cx + 2.5, Y + 12.5)], dressMat);
  c.capsule(P(cx - 3.8, Y + 17.5), P(cx + 3.8, Y + 17.5), 0.8, 0.8, 'gold');
  for (const dx of [-1, 1]) c.ellipse(cx + dx * 5.4, Y + 22, 1.3, 1.3, 'skin');
  headFront(c, P(cx, Y + 7.5), { hair: 'hairGirl', wink });
  return c.finish();
}

// Front-facing wife (family HUD): a taller, blue-robed version of the girls.
function wifeFront() {
  const c = new Canvas(WIFE.w, WIFE.h), cx = 19, Y = 3;
  for (const dx of [-2.2, 2.2]) {
    c.capsule(P(cx + dx, Y + 24), P(cx + dx * 1.1, Y + 32), 1.8, 1.4, 'skin');
    c.ellipse(cx + dx * 1.2, Y + 33.5, 2.1, 1.3, 'leather');
  }
  for (const dx of [-1, 1]) c.capsule(P(cx + dx * 4.6, Y + 14.5), P(cx + dx * 5.8, Y + 22.5), 1.6, 1.3, 'blue');
  c.poly([P(cx - 3, Y + 12.5), P(cx - 4.8, Y + 14), P(cx - 4.2, Y + 19.5), P(cx - 7, Y + 28), P(cx + 7, Y + 28),
    P(cx + 4.2, Y + 19.5), P(cx + 4.8, Y + 14), P(cx + 3, Y + 12.5)], 'blue');
  c.capsule(P(cx - 4.2, Y + 18), P(cx + 4.2, Y + 18), 0.9, 0.9, 'gold');
  for (const dx of [-1, 1]) c.ellipse(cx + dx * 6, Y + 23.5, 1.4, 1.4, 'skin');
  headFront(c, P(cx, Y + 7.5), { hair: 'hairGirl', veil: true });
  return c.finish();
}

const SODOMITE = {
  w: 32, h: 36, cx: 13, leg: [4.4, 4.6], legR: [2.4, 2, 1.7], foot: 3, footR: 1.5, legMat: 'tan', footMat: 'leather',
  torso: 10.5, shoulderDrop: 2.2, neck: 5, headFwd: 1.6, arm: [5, 4.6], armR: [2.5, 2.1, 1.8], handR: 2,
  skinMat: 'tan', shoulderX: 0.5,
};
function sodomiteFrame(pose) {
  const c = new Canvas(SODOMITE.w, SODOMITE.h), sk = skeleton(SODOMITE, pose);
  drawArm(c, SODOMITE, sk.arms[0], { dim: FAR });
  drawLeg(c, SODOMITE, sk.legs[0], { dim: FAR });
  drawLeg(c, SODOMITE, sk.legs[1], {});
  // bare, broad torso
  const tl = SODOMITE.torso;
  c.poly([sk.local(-2.5, tl + 1), sk.local(-6, tl - 1), sk.local(-4.4, 2), sk.local(4.2, 2), sk.local(6.4, tl - 1.6), sk.local(3, tl + 1)], 'tan', { bend: 0.5 });
  const chest = sk.local(3.2, tl - 3.8);
  c.setTone(chest.x, chest.y + 1, 0); c.setTone(chest.x - 1, chest.y + 1, 0); // pec line
  const ab = sk.local(1.8, 5);
  c.setTone(ab.x, ab.y, 1); c.setTone(ab.x, ab.y + 2, 1);
  // shorts
  const hem = sk.legs.map(l => lerp(l.hip, l.knee, 0.55));
  c.poly([sk.local(-4.6, 3), sk.local(4.6, 3), P(Math.max(...hem.map(p => p.x)) + 2.6, Math.max(...hem.map(p => p.y))),
    P(Math.min(...hem.map(p => p.x)) - 2.6, Math.max(...hem.map(p => p.y)))], 'shorts');
  headSide(c, sk.head, { style: 'sodomite', hair: 'hairDark', skin: 'tan' });
  drawArm(c, SODOMITE, sk.arms[1], {});
  return c.finish();
}

// Angel: flying pose, big feathered wings (4-frame flap), halo, pointing forward.
const ANGEL = {
  w: 44, h: 40, cx: 22, leg: [4.6, 4.8], legR: [1.8, 1.5, 1.3], foot: 2.4, footR: 1.2, legMat: 'skin', footMat: 'skin',
  torso: 12, shoulderDrop: 2.4, neck: 5.6, headFwd: 0.6, arm: [4.8, 4.4], armR: [1.6, 1.4, 1.2], handR: 1.4,
  skinMat: 'skin', sleeve: { mat: 'veil', r: 2.3, len: 1.6 },
};
function wing(c, root, base, spread, len, o) {
  const n = 5;
  c.ellipse(root.x, root.y, 3.2, 2.8, 'wing', o);
  for (let i = n - 1; i >= 0; i--) {
    const a = base + (i / (n - 1)) * spread;
    const l = len * (1 - i * 0.1);
    c.capsule(along(root, a, 1), along(root, a, l), 2.6 - i * 0.15, 1.3, 'wing', o);
  }
}
function angelFrame(flap) {
  const pose = { lean: 16, air: 0, legs: [[-30, 20], [-14, 15]], arms: [[40, 50], [92, -5]], flow: 0 };
  const c = new Canvas(ANGEL.w, ANGEL.h), sk = skeleton(ANGEL, pose);
  const back = sk.local(-3, ANGEL.torso - 2.5);
  const beat = [-150, -120, -80, -120][flap]; // wing angle: raised back .. swept down
  wing(c, P(back.x + 1.5, back.y - 1.5), beat + 28, -55, 15, { dim: 0.2 });
  drawArm(c, ANGEL, sk.arms[0], { dim: FAR });
  drawLeg(c, ANGEL, sk.legs[0], { dim: FAR });
  drawLeg(c, ANGEL, sk.legs[1], {});
  drawGarment(c, sk, pose, { mat: 'veil', shoulder: 4.2, waist: 4, hemDrop: 1.9, hemPad: 1.2, flare: 1.2 });
  wing(c, back, beat, -55, 17, {});
  headSide(c, sk.head, { style: 'angel', hair: 'gold' });
  c.ring(sk.head.x - 0.5, sk.head.y - 7.2, 4.6, 1.6, 1.2, 'gold', { lift: 0.15 });
  drawArm(c, ANGEL, sk.arms[1], {});
  return c.finish();
}

// ---------- sprite table ----------
const run = (fn, opts) => Array.from({ length: RUN_FRAMES }, (_, i) => fn(runPose(i, opts)));
const HANG = [hangPose(0)]; // one hanging pose each
const run4 = (fn, opts) => run(fn, opts).filter((_, i) => i % 2 === 0); // 4-frame cycles, like the PNGs
// the women run big: long strides, high knees, pumping fists, a bounce, skirts and hair streaming back
const GIRL_RUN = { stride: 58, lean: 16, arm: 60, knee: 95, elbow: 88, bob: 1.6, sweep: 2 };
const WIFE_RUN = { stride: 52, lean: 14, arm: 55, knee: 88, elbow: 85, bob: 1.4, sweep: 2.5 };
const girl = (mat) => ({
  side: [girlFrame(mat, IDLE), girlFrame(mat, IDLE, { blink: true }), ...run4(p => girlFrame(mat, p), GIRL_RUN), girlFrame(mat, HOP), girlFrame(mat, DROP), ...HANG.map(p => girlFrame(mat, p))],
  front: [girlFrame(mat, null, { front: true })],
  wink: [girlFrame(mat, null, { front: true, wink: true })],
});
const D1 = girl('violet'), D2 = girl('pink');

// Frame layouts (the objects reference these indices):
//   lot:      0 idle, 1 blink, 2-5 run, 6 jump, 7 fall, 8 dead, 9 hang
//   wife:     0 idle, 1 blink, 2-5 run, 6 look back (alarmed), 7 jump, 8 fall, 9 hang
//   daughter: 0 idle, 1 blink, 2-5 run, 6 jump, 7 fall, 8 hang
//   sodomite: 0 idle, 1-4 run
//   angel:    0-3 flap
export const LOT_FRAMES = { jump: 6, fall: 7, dead: 8 };
export const WIFE_LOOK_FRAME = 6;
export const AIR_FRAMES = { wife: { jump: 7, fall: 8 }, daughter1: { jump: 6, fall: 7 }, daughter2: { jump: 6, fall: 7 } };
export const CHARACTER_SPRITES = {
  lot: { w: LOT.w, h: LOT.h, cx: LOT.cx, body: [24, 40], frames: [
    lotFrame(IDLE), lotFrame(IDLE, { blink: true }),
    ...run4(lotFrame, { bob: 1 }), lotFrame(JUMP), lotFrame(FALL), lotFrame(FALL, { dead: true }),
    ...HANG.map(p => lotFrame(p)),
  ] },
  wife: { w: WIFE.w, h: WIFE.h, cx: WIFE.cx, body: [22, 38], frames: [
    wifeFrame(IDLE), wifeFrame(IDLE, { blink: true }), ...run4(wifeFrame, WIFE_RUN), wifeFrame(IDLE, { look: true }),
    wifeFrame(HOP), wifeFrame(DROP), ...HANG.map(p => wifeFrame(p)),
  ] },
  daughter1: { w: GIRL.w, h: GIRL.h, cx: GIRL.cx, body: [20, 32], frames: D1.side },
  daughter2: { w: GIRL.w, h: GIRL.h, cx: GIRL.cx, body: [20, 32], frames: D2.side },
  wife_front: { w: WIFE.w, h: WIFE.h, frames: [wifeFront()] },
  daughter1_front: { w: GIRL.w, h: GIRL.h, frames: D1.front },
  daughter2_front: { w: GIRL.w, h: GIRL.h, frames: D2.front },
  daughter1_wink: { w: GIRL.w, h: GIRL.h, frames: D1.wink },
  daughter2_wink: { w: GIRL.w, h: GIRL.h, frames: D2.wink },
  sodomite: { w: SODOMITE.w, h: SODOMITE.h, cx: SODOMITE.cx, body: [24, 40], frames: [
    sodomiteFrame({ ...IDLE, lean: 8, arms: [[-15, 50], [15, 60]] }),
    ...run(sodomiteFrame, { stride: 34, lean: 16, arm: 45 }).filter((_, i) => i % 2 === 0), // 4-frame run like the PNGs
  ] },
  angel: { w: ANGEL.w, h: ANGEL.h, frames: [0, 1, 2, 3].map(angelFrame) },
};

const BLINK_IDLE = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1]; // still, with a blink every ~2s at 5fps (no breathing)
export const CHARACTER_ANIMS = [
  ['lot-idle', 'lot', BLINK_IDLE, 5, -1],
  ['lot-run', 'lot', [2, 3, 4, 5], 8, -1],
  ['lot-hang', 'lot', [9], 1, -1],
  ['wife-idle', 'wife', BLINK_IDLE, 5, -1],
  ['wife-walk', 'wife', [2, 3, 4, 5], 7.5, -1],
  ['wife-hang', 'wife', [9], 1, -1],
  ['daughter1-idle', 'daughter1', BLINK_IDLE, 5, -1],
  ['daughter1-walk', 'daughter1', [2, 3, 4, 5], 8, -1],
  ['daughter1-hang', 'daughter1', [8], 1, -1],
  ['daughter2-idle', 'daughter2', BLINK_IDLE, 5, -1],
  ['daughter2-walk', 'daughter2', [2, 3, 4, 5], 8, -1],
  ['daughter2-hang', 'daughter2', [8], 1, -1],
  ['sodomite-walk', 'sodomite', [1, 2, 3, 4], 5, -1],
  ['angel-flap', 'angel', [0, 1, 2, 3], 10, -1],
];
