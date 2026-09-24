// One character per color, used by the ASCII sprites in sprites.js. '.' = transparent.
// Colors picked from art/reference/style-sheet.webp and art/reference/character-sheet.webp.
export const PALETTE = {
  '.': null,
  K: '#2a1418', // warm dark outline
  I: '#ffffff', // eye whites, sparkles
  D: '#0e080c', // cave darkness

  S: '#f4bf90', // skin
  s: '#d8905e',
  t: '#a05c3a',

  H: '#5c301c', // brown hair / beard
  h: '#8a4c26',
  j: '#381a10',

  W: '#f8f0d8', // cream cloth: tunic, veil
  w: '#ddd0a8',
  v: '#b4a078',

  T: '#8a5428', // leather: belt, sandals
  u: '#54301a',

  B: '#5282e8', // wife's robe
  b: '#3058c0',
  n: '#1e3680',

  M: '#d070e8', // daughter 1 dress (violet)
  m: '#9c40c0',
  P: '#ffb0e0', // daughter 2 dress (pink)
  p: '#e070b8',

  E: '#d48a56', // Sodomite skin (tanned)
  e: '#a45e36',
  f: '#6a3620',
  U: '#544240', // loincloth
  z: '#2e2220',
  R: '#d03030', // headband

  A: '#ffd868', // angel hair
  a: '#d8a030',
  L: '#ffffff', // wings
  l: '#d4e0f6',
  q: '#8ea4cc',
  g: '#c4cee4', // robe fold shadow

  G: '#c0c8d8', // metal cap
  d: '#6a7284',

  Y: '#ffe45a', // gold
  y: '#d89a1c',

  O: '#ff8a20', // fire
  o: '#d83c18',
  F: '#ffd040',
  Q: '#fffbe0',

  C: '#e8a050', // clay jug
  c: '#b06a30',
  k: '#6e3a1a',
  N: '#fae4b0', // jug label

  X: '#9a7250', // rock
  x: '#64462e',
  Z: '#c8a070',
  5: '#b8a898', // crumbling rock
  6: '#857868',
};

// 5-tone ramps (deep shadow -> highlight) for the shaded sprites in rig.js / characters.js. Shadows lean
// toward red/purple, highlights toward yellow, like 16/32-bit console art.
export const OUTLINE = '#1a0c12';
export const RAMPS = {
  skin: ['#6a2a26', '#a8553c', '#dc8a5e', '#f4b886', '#ffdcb0'],
  hairLot: ['#24100c', '#46210f', '#6c3618', '#955222', '#ba7434'],
  hairGirl: ['#2a100c', '#4c1f14', '#74341c', '#9c4f26', '#c47038'],
  cream: ['#6e5236', '#a48656', '#d4bc88', '#efdeb0', '#fff6d8'],
  leather: ['#34180c', '#5a2e16', '#86491f', '#b06d31', '#d49552'],
  blue: ['#141a58', '#1d3494', '#2c5ccc', '#4a86ee', '#86b6ff'],
  veil: ['#424a6c', '#8290b2', '#c0cae0', '#e6ecf8', '#ffffff'],
  violet: ['#34104e', '#61208c', '#933ac2', '#be62e4', '#e49cff'],
  pink: ['#541846', '#93307a', '#cf58b0', '#ee8ad2', '#ffc2ee'],
  tan: ['#461a10', '#7a3318', '#b0582a', '#d6834a', '#f0aa6c'],
  hairDark: ['#160c0c', '#2c1812', '#46261a', '#643824', '#844c30'],
  shorts: ['#120e18', '#241e2c', '#3a3242', '#544a58', '#726672'],
  red: ['#480a10', '#861418', '#c02422', '#e44c36', '#ff8a66'],
  green: ['#0c3418', '#1a6a2a', '#2c9c3c', '#54cc58', '#98f088'],
  gold: ['#6a380a', '#a8660c', '#dc9e1e', '#f6cc46', '#fff29a'],
  wing: ['#39487c', '#7488c2', '#aec2ec', '#dce8ff', '#ffffff'],
  metal: ['#2c3040', '#5a6278', '#949cb0', '#c8cedc', '#f4f6fc'],
  capBlue: ['#16245e', '#2a48a8', '#4a7ade', '#86b0f6', '#d4e6ff'],
  glass: ['#4c6a9a', '#8eaad4', '#c4d8f0', '#e6f0fc', '#ffffff'],
  clay: ['#4a200c', '#823c14', '#c0681e', '#e6963a', '#ffc66a'],
  label: ['#8a6a3a', '#c4a468', '#ecd49a', '#fbecc4', '#fffbea'],
  fire: ['#7a1408', '#c8300c', '#f47418', '#ffc03a', '#fff4b0'],
};

// Environment ramps (index 0 = outline/mortar ... last = brightest highlight), picked from the Sodom panel of
// art/reference/style-sheet.webp: warm sandstone lit by fire, dark maroon back walls, fire-lit sky.
export const ENV = {
  sand: ['#1e080a', '#4e1c16', '#7e3820', '#a8582c', '#c8783c', '#e29c54', '#f6c67e'],
  stone: ['#1e080a', '#5a2c1c', '#8e5230', '#bc7c48', '#daa062', '#f0c282', '#fde8b4'],
  wall: ['#1a0c10', '#4e2c26', '#7a4e3c', '#a0704e', '#c09062', '#dab27c', '#f2d49c'],
  dark: ['#0c0408', '#1e0a14', '#2c0f1e', '#3c1628', '#542036', '#743044', '#9a4a50'],
  darkWarm: ['#120406', '#2c0a10', '#431018', '#5c1a1e', '#7c2826', '#a23c2e', '#cc6038'],
  wood: ['#1e0a06', '#4a2410', '#703a18', '#965424', '#b87434'],
  cloth: ['#4a0a10', '#861a1a', '#bc2e24', '#e05034'],
  linen: ['#6a4a36', '#a88a64', '#d8c09a', '#f4e6c4'],
  glow: ['#1c0406', '#4a0a0a', '#8e1e10', '#d44818', '#ff8c28', '#ffc850', '#fff2b0'],
};

// The same city the night before the destruction (Act I's opening): moonlit, cool, intact, lamps in the windows.
export const ENV_NIGHT = {
  sand: ['#120a16', '#34222e', '#56383c', '#7a5448', '#9c7058', '#bc906c', '#d8b288'],
  stone: ['#120a16', '#3a2834', '#5e4444', '#846252', '#a68064', '#c4a07c', '#e2c89e'],
  wall: ['#100a14', '#342830', '#54443e', '#76604e', '#947c62', '#b09a78', '#ceba94'],
  dark: ['#06060e', '#0e0f1e', '#16182c', '#1e2238', '#282c48', '#343a58', '#484e6e'],
  glow: ['#1c0a06', '#3e180a', '#6e3010', '#a8541a', '#d88230', '#f0aa48', '#fcd27a'],
};
