export const GAME_WIDTH = 320;
export const GAME_HEIGHT = 180;
export const TILE = 16;
export const ZOOM = 2; // canvas pixels per world unit (see src/view.js)

// All movement tuning lives here (internal pixels, px/s).
export const MOVE = {
  gravity: 900,            // px/s²
  runSpeed: 110,           // max horizontal speed
  groundAccel: 1400,       // how fast Lot reaches runSpeed on ground
  airAccel: 900,           // steering in the air
  groundDrag: 1600,        // how fast Lot stops when no input on ground
  airDrag: 300,
  jumpVelocity: 300,       // initial upward speed (~3 tiles high)
  jumpCutMultiplier: 0.45, // releasing jump early multiplies upward velocity by this
  maxFallSpeed: 420,
  coyoteTimeMs: 90,        // can still jump shortly after walking off a ledge
  jumpBufferMs: 110,       // jump pressed shortly before landing still counts
  stompBounce: 230,        // Lot's bounce off salt
};

export const FAMILY = {
  spacing: { daughter1: 18, daughter2: 34, wife: 50 }, // path px behind Lot: the mother walks at the back
  trailMaxLength: 400,   // px of path history kept (must exceed largest spacing + margin)
  rejoinSpeed: 260,      // px/s while flying back to slot after rescue
  invulnMs: 1000,        // blinking protection after rejoining
  saltGravity: 900,
};

export const VENT = {
  offMs: 1400,
  warnMs: 500,           // flicker before erupting
  onMs: 1100,
};

export const DESTRUCTION = {
  startX: -80,          // world x of the kill line at start
  startDelayMs: 2500,   // grace period before it moves
  speed: 34,            // px/s (Lot runs 110)
  maxLag: 70,           // never more than this many px left of the camera's left edge
  warnRange: 160,       // edge warning starts when wall is this close to camera left
};

export const SULFUR = {
  startIntervalMs: 2400, // at level start
  endIntervalMs: 900,    // near the city gate
  warnMs: 700,           // marker time before the drop
  fallSpeed: 150,        // vertical px/s
  angle: 35,             // comets fly in from the top left, this many degrees from vertical
  angleJitter: 6,        // random +- degrees
  aheadMin: -40,         // target x = lot.x + random(aheadMin, aheadMax)
  aheadMax: 170,
  flameMs: 1600,         // ground flame lifetime
};

export const WIFE = {
  lookIntervalMinMs: 9000,
  lookIntervalMaxMs: 16000,
  noticeMs: 600,         // stopped with "!"
  turnMs: 900,           // facing the destruction, trembling
  minWallDistance: 120,
};


export const SODOMITE = {
  speed: 45,            // px/s (Lot runs 110)
  hopVelocity: 240,     // hop when blocked by a wall (~2 tiles)
  wakeMargin: 24,       // wakes when within this many px right of the camera's right edge
  squashMs: 400,        // flattened time before fading
};

export const ANGEL = {
  durationMs: 3200,
  runSpeed: 185,        // Lot's boosted max speed
  accelMultiplier: 1.6,
  lotGap: 18,           // path px Lot and the family fall back while the angels lead
  graceMs: 2000,        // invulnerability for Lot and the family after the angels leave
  swoopMs: 350,         // entry/exit flight time
};

const params = new URLSearchParams(location.search);
export const DEBUG = params.has('debug');
const SCENES = { title: 'TitleScene', sodom: 'SodomScene', flight: 'FlightScene', wilderness: 'WildernessScene',
  mountain: 'MountainScene', ending: 'EndingScene', credits: 'CreditsScene', art: 'ArtScene' };
export const START_SCENE = SCENES[params.get('scene')] || 'TitleScene';
export const START_CP = parseInt(params.get('cp'), 10) || 0; // debug: start Act I at the Nth checkpoint
export const START_LOST = (params.get('lost') || '').split(',').filter(Boolean);

export const FLIGHT = {
  gravity: 700,
  flapVelocity: 230,
  maxFallSpeed: 320,
  scrollSpeed: 85,      // px/s obstacles move left
  carrierX: 90,         // fixed screen x of the group
  hitbox: { w: 24, h: 32 },
  gapSize: 110,         // vertical opening in "gate" obstacles
  obstacleWidth: 20,
};

export const MOUNTAIN = {
  height: 2400,          // world height; a perfect climb is ~82 px/s, so ~30 s
  bounceVelocity: 330,   // auto-bounce (~60 px apex with gravity 900)
  columnLeft: 56,
  columnRight: 264,
  stepMin: 44,           // vertical distance between platforms (must stay < ~55)
  stepMax: 56,
  maxDx: 70,             // max horizontal offset from the previous platform (a bounce only gives ~50 px of air travel)
  minDx: 32,             // min horizontal offset, so the climb zigzags instead of running straight up
  widthStart: 44,
  widthEnd: 24,
  movingFrom: 0.35,      // fraction of the climb after which moving platforms can appear
  movingChance: 0.3,
  movingRange: 40,       // px each side
  movingMs: 1600,
  crumbleFrom: 0.1,      // crumbling ledges come first, moving ones a little later
  crumbleChance: 0.3,
  crumbleRespawnMs: 2500,
  cameraLead: 110,       // Lot's screen y when the camera is pushing up
  topY: 70,              // y of the final platform
};
