// ASCII pixel art. Every frame of a sprite has exactly h rows of w characters; colors come from palette.js.
// Side-view characters face RIGHT (code flips them with setFlipX). Sizes must match the physics bodies —
// don't change w/h without checking the objects that use them.

// ---------- Lot 12x20 ----------
const LOT_HEAD = [
  '....KKKKK...',
  '...KHHHHHK..',
  '..KHHhHHHHK.',
  '..KHHHSSSSK.',
  '..KHHSSSKSK.',
  '..KHHSSSSSSK',
  '..KHHHHHHHK.',
  '...KHHHHHHK.',
  '....KKHHKK..',
];
const LOT_HEAD_BLINK = LOT_HEAD.map((r, i) => (i === 4 ? '..KHHSSSSSK.' : r));
const LOT_BODY = [
  '...KWWWWWK..',
  '..KWWWWWWWK.',
  '..KSWWWWWSK.',
  '..KSWTTTWSK.',
  '..KSWWWWWSK.',
  '...KWWWWwK..',
  '...KWWWWwK..',
  '...KwwwwwK..',
];
const LOT_BODY_RUN = [
  '...KWWWWWK..',
  '..KWWWWWWWK.',
  '.KSWWWWWWWSK',
  '..KWWTTTWWK.',
  '..KWWWWWWWK.',
  '...KWWWWwK..',
  '...KWWWWwK..',
  '...KwwwwwK..',
];
const LOT_BODY_UP = [
  '.KSKWWWWWKSK',
  '..KWWWWWWWK.',
  '..KWWWWWWWK.',
  '..KWWTTTWWK.',
  '..KWWWWWWWK.',
  '...KWWWWwK..',
  '...KWWWWwK..',
  '...KwwwwwK..',
];
const LOT_LEGS = {
  stand: ['....KSKSK...', '....KSKSK...', '...KTTKTTK..'],
  strideA: ['...KSKKSK...', '..KSK..KSK..', '.KTTK..KTTK.'],
  passB: ['....KSSK....', '....KSK.KSK.', '...KTTK..KTK'],
  passD: ['....KSSK....', '...KSK.KSK..', '..KTK...KTTK'],
  tuck: ['...KSSSSK...', '...KTTKTTK..', '............'],
  dangle: ['...KSK.KSK..', '..KSK...KSK.', '..KTK...KTK.'],
};
const lot = (head, body, legs) => [...head, ...body, ...LOT_LEGS[legs]];

// ---------- Lot's wife 11x19 ----------
const WIFE = [
  '...KKKKK...',
  '..KWWWWWK..',
  '.KWWWWWWWK.',
  '.KWWWSSSSK.',
  '.KWWSSSKSK.',
  '.KWWSSSSSK.',
  '.KWWWSSSK..',
  '.KwWWKBBK..',
  '.KwWKBBBBK.',
  '.KwKBBBBBK.',
  '..KBBBBBSK.',
  '..KBBBBBBK.',
  '..KBBBbBBK.',
  '..KBBBbBBK.',
  '..KBBbBBBK.',
  '.KBBBbBBBK.',
  '.KBBbBBBbK.',
  '.KbbbbbbbK.',
  '..KTK.KTK..',
];
const wife = (rows) => WIFE.map((r, i) => rows[i] ?? r);

// ---------- Daughters 10x16 (1 = dress, 2 = dress shadow, 3 = hair accent) ----------
const DAUGHTER = [
  '..KKKKK...',
  '.KHHH3HK..',
  'KHHHSSSSK.',
  'KHHSSSKSK.',
  'KHHSSSSSK.',
  'KHHHSSSK..',
  'KHHHK11K..',
  'KHHK1111K.',
  'KHK1111SK.',
  '.KK11111K.',
  '..K11211K.',
  '..K11211K.',
  '.K111211K.',
  '.K1121111K',
  '.K2222222K',
  '..KTK.KTK.',
];
const DAUGHTER_FRONT = [
  '..KKKKKK..',
  '.KHHH3HHK.',
  'KHHSSSSHHK',
  'KHSSSSSSHK',
  'KHSKSSKSHK',
  'KHSSSSSSHK',
  'KHSSooSSHK',
  'KHHSSSSHHK',
  'KHK1111KHK',
  'KH111111HK',
  '.K111111K.',
  '.K112211K.',
  '.K112211K.',
  'K11122111K',
  'K22222222K',
  '.KTK..KTK.',
];
const DAUGHTER_WINK = DAUGHTER_FRONT.map((r, i) => ({
  4: 'KHKKSSKSHK', // left eye closed: a flat line
  6: 'KHSooooSHK', // bigger grin
}[i] ?? r));
const DAUGHTER_WALK1 = { 15: '.KTK..KTK.' };
const DAUGHTER_WALK2 = { 15: '...KTKTK..' };
const dress = (rows, c1, c2, accent) =>
  rows.map(r => r.replace(/1/g, c1).replace(/2/g, c2).replace(/3/g, accent));
const withRows = (base, changes) => base.map((r, i) => changes[i] ?? r);
const daughterFrames = (c1, c2, accent) => [
  dress(DAUGHTER, c1, c2, accent),
  dress(withRows(DAUGHTER, DAUGHTER_WALK1), c1, c2, accent),
  dress(withRows(DAUGHTER, DAUGHTER_WALK2), c1, c2, accent),
];

// ---------- Sodomite 12x18 ----------
const SODOMITE = [
  '...KKKKK....',
  '..KHHHHHK...',
  '.KHHHHHHHK..',
  '.KHHSSKKSK..',
  '.KHSSSSKSK..',
  '.KHSSSSSSSK.',
  '.KHHHHHKHK..',
  '..KHHHHHK...',
  '.KSSKKKSSK..',
  'KSSSSSSSSSK.',
  'KSKsSSSsKSK.',
  'KSKSSSSSKSK.',
  '.KKUUUUUKK..',
  '..KUUUUUK...',
  '..KUUKUUK...',
  '..KSK.KSK...',
  '..KSK.KSK...',
  '.KTTK.KTTK..',
];

// ---------- Angel 16x18 ----------
const ANGEL_UP = [
  '.....YYYYYY.....',
  'LL...KAAAK....LL',
  'LLL.KAAAAAK..LLL',
  '.LLLKAASSSK.LLL.',
  '.LLLKASSKSKLLLL.',
  '..LLKASSSSKLLL..',
  '..LLLKKSSKLLLL..',
  '...LLKWWWWKLL...',
  '....KWWWWWWK....',
  '....KWWWWWSK....',
  '....KWWwWWWK....',
  '....KWWwWWWK....',
  '...KWWWwWWWWK...',
  '...KWWwWWWwWK...',
  '...KWWwWWWwWK...',
  '..KWWWwWWWwWWK..',
  '..KwwwwwwwwwwK..',
  '.....KSK.KSK....',
];
const ANGEL_DOWN = withRows(ANGEL_UP, {
  1: '.....KAAAK......',
  2: '....KAAAAAK.....',
  3: '....KAASSSK.....',
  4: '....KASSKSK.....',
  5: '.L..KASSSSK..L..',
  6: 'LL...KKSSK...LL.',
  7: 'LLL..KWWWWK.LLL.',
  8: 'LLLLKWWWWWWKLLLL',
  9: '.LLLKWWWWWSKLLL.',
  10: '..LLKWWwWWWKLL..',
  11: '...LKWWwWWWKL...',
});

// ---------- Objects ----------
const SALT = [
  '..KKKK..',
  '.KGgGgK.',
  '.KGGGGK.',
  'KKKKKKKK',
  'KLWWWWLK',
  'KWKKKWLK',
  'KWKWWWLK',
  'KWKKKWLK',
  'KWWWKWLK',
  'KWKKKWLK',
  'KLWWWWLK',
  '.KKKKKK.',
];

const HALO = [
  '..YYYYYY..',
  '.YY....YY.',
  'YY......YY',
  '.YY....YY.',
  '..yyyyyy..',
];
const HALO_SHINE = withRows(HALO, { 0: '..YYWWYY..', 2: 'YW......YY' });

const FIREBALL = [
  '..o..o..',
  '.oOo.Oo.',
  '.oOOOOo.',
  'oOOYYOOo',
  'oOYWWYOo',
  'oOYWWYOo',
  '.oOYYOo.',
  '..oooo..',
];
const FIREBALL_2 = withRows(FIREBALL, { 0: '...o..o.', 1: '..oOoOo.' });

const FLAME = [
  '....o.....',
  '....Oo..o.',
  '.o.OOo.oO.',
  '.OoOYOoOO.',
  'oOOYYYOOOo',
  'oOYYWYYOOo',
  'oOYWWWYYOo',
  'oOYWWWWYOo',
  '.oOYWWYOo.',
  '..oOOOOo..',
];
const FLAME_2 = withRows(FLAME, {
  0: '.o........',
  1: '.oO...o...',
  2: '.OO..oOo..',
  3: '.OOo.OYOo.',
});

// Fire vent column 12x32: jagged flame, widest at the base.
function ventFrame() {
  const rows = [];
  for (let y = 0; y < 32; y++) {
    const half = Math.min(6, 1 + Math.floor(y / 5)) - (y % 4 === 1 ? 1 : 0);
    let r = '';
    for (let x = 0; x < 12; x++) {
      const d = Math.abs(x - 5.5);
      if (d > half) r += '.';
      else if (d > half - 1) r += 'o';
      else if (d > half - 2.5) r += 'O';
      else if (y > 14 && d < half - 3.5) r += 'W';
      else r += 'Y';
    }
    rows.push(r);
  }
  return rows;
}

// 20x19; only used in the ending (no physics). The XXX needs 2-px gaps to read as letters.
const JUG = [
  '........KNNK........',
  '........KNNK........',
  '.......KCCCCK.......',
  '........KCCK........',
  '........KCCK...KK...',
  '.....KKCCCCCCKK.K...',
  '....KCCCCCCCCCCK.K..',
  '...KCCCCCCCCCCCCKK..',
  '..KCCCCCCCCCCCCCCK..',
  '.KCCCCCCCCCCCCCCCCK.',
  '.KNNNNNNNNNNNNNNNNK.',
  '.KNKNKNNKNKNNKNKNNK.',
  '.KNNKNNNNKNNNNKNNNK.',
  '.KNKNKNNKNKNNKNKNNK.',
  '.KNNNNNNNNNNNNNNNNK.',
  '.KCCCCCCCCCCCCCCCCK.',
  '..KcCCCCCCCCCCCCcK..',
  '...KccccccccccccK...',
  '....KKKKKKKKKKKK....',
];

// Cave mouth 28x26: rocky rim around a dark arch.
function caveFrame() {
  const rows = [];
  for (let y = 0; y < 26; y++) {
    let r = '';
    for (let x = 0; x < 28; x++) {
      const dx = (x - 13.5) / 14, dy = (y - 26) / 26;
      const d = dx * dx + dy * dy;
      if (d > 1) r += '.';
      else if (d > 0.72) r += (x + y) % 5 === 0 ? 'x' : (y < 6 ? 'Z' : 'X');
      else if (d > 0.62) r += 'K';
      else r += 'D';
    }
    rows.push(r);
  }
  return rows;
}

const ROCK = [
  '.....KKKK.....',
  '...KKZZXXKK...',
  '..KZZXXXXXXK..',
  '.KZXXXXXXXxxK.',
  '.KXXXXXXXXXxK.',
  'KXXXXXXXXXXxxK',
  'KXXXxXXXXXxxxK',
  'KXXXXXXXXxxxxK',
  'KxxXXXXXxxxxxK',
  '.KKKKKKKKKKKK.',
];

const LEDGE = [
  'ZZZZZZZZZZZZZZZZ',
  'XXXXZXXXXXXZXXXX',
  'XXxXXXXxXXXXXxXX',
  'xXXXXxXXXXxXXXXx',
  'xxXxxxxXxxxxXxxx',
  'KxKKxKKKKxKKKxKK',
];
const LEDGE_CRUMBLE = [
  'QQQQQQQQQQQQQQQQ',
  'qqqqKqqqqqqqKqqq',
  'qqqKqqqqqqqqqKqq',
  'qqqKqqqqqqqqKqqq',
  'qqqqKqqqqqqqqKqq',
  'KqKKqKKKKqKKKqKK',
];

export const SPRITES = {
  // frames: 0 idle, 1 blink, 2-5 run, 6 jump, 7 fall, 8 dead
  lot: {
    w: 12, h: 20, frames: [
      lot(LOT_HEAD, LOT_BODY, 'stand'),
      lot(LOT_HEAD_BLINK, LOT_BODY, 'stand'),
      lot(LOT_HEAD, LOT_BODY_RUN, 'strideA'),
      lot(LOT_HEAD, LOT_BODY, 'passB'),
      lot(LOT_HEAD, LOT_BODY_RUN, 'strideA'),
      lot(LOT_HEAD, LOT_BODY, 'passD'),
      lot(LOT_HEAD, LOT_BODY_UP, 'tuck'),
      lot(LOT_HEAD, LOT_BODY_UP, 'dangle'),
      lot(LOT_HEAD_BLINK, LOT_BODY_UP, 'dangle'),
    ],
  },
  // frames: 0 idle, 1-2 walk, 3 alarmed look-back
  wife: {
    w: 11, h: 19, frames: [
      WIFE,
      wife({ 17: '.KbbbbbbbbK', 18: '.KTK...KTK.' }),
      wife({ 18: '...KTKTK...' }),
      wife({ 4: '.KWWSKSKSK.', 6: '.KWWWSKSK..', 9: '.KwKBBBBSSK' }),
    ],
  },
  daughter1: { w: 10, h: 16, frames: daughterFrames('M', 'm', 'H') },
  daughter2: { w: 10, h: 16, frames: daughterFrames('P', 'p', 'Y') },
  daughter1_front: { w: 10, h: 16, frames: [dress(DAUGHTER_FRONT, 'M', 'm', 'H')] },
  daughter2_front: { w: 10, h: 16, frames: [dress(DAUGHTER_FRONT, 'P', 'p', 'Y')] },
  daughter1_wink: { w: 10, h: 16, frames: [dress(DAUGHTER_WINK, 'M', 'm', 'H')] },
  daughter2_wink: { w: 10, h: 16, frames: [dress(DAUGHTER_WINK, 'P', 'p', 'Y')] },
  // frames: 0 idle, 1-2 walk
  sodomite: {
    w: 12, h: 18, frames: [
      SODOMITE,
      withRows(SODOMITE, { 15: '.KSK..KSK...', 16: '.KSK...KSK..', 17: 'KTTK...KTTK.' }),
      withRows(SODOMITE, { 15: '...KSKSK....', 16: '...KSKSK....', 17: '..KTTKTTK...' }),
    ],
  },
  angel: { w: 16, h: 18, frames: [ANGEL_UP, ANGEL_DOWN] },
  salt: { w: 8, h: 12, frames: [SALT] },
  halo: { w: 10, h: 5, frames: [HALO, HALO_SHINE] },
  fireball: { w: 8, h: 8, frames: [FIREBALL, FIREBALL_2] },
  flame: { w: 10, h: 10, frames: [FLAME, FLAME_2] },
  vent: { w: 12, h: 32, frames: [ventFrame()] },
  jug: { w: 20, h: 19, frames: [JUG] },
  cave: { w: 28, h: 26, frames: [caveFrame()] },
  rock: { w: 14, h: 10, frames: [ROCK] },
  ledge: { w: 16, h: 6, frames: [LEDGE] },
  ledge_crumble: { w: 16, h: 6, frames: [LEDGE_CRUMBLE] },
};

// [animation key, texture key, frames, fps, repeat]
export const ANIMS = [
  ['lot-idle', 'lot', [0, 0, 0, 0, 0, 1], 4, -1],
  ['lot-run', 'lot', [2, 3, 4, 5], 10, -1],
  ['wife-walk', 'wife', [1, 2], 8, -1],
  ['daughter1-walk', 'daughter1', [1, 2], 8, -1],
  ['daughter2-walk', 'daughter2', [1, 2], 8, -1],
  ['sodomite-walk', 'sodomite', [1, 2], 6, -1],
  ['angel-flap', 'angel', [0, 1], 8, -1],
  ['halo-shine', 'halo', [0, 0, 0, 1], 6, -1],
  ['fireball-flicker', 'fireball', [0, 1], 8, -1],
  ['flame-flicker', 'flame', [0, 1], 6, -1],
];
