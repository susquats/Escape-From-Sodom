export const GAME_WIDTH = 320;
export const GAME_HEIGHT = 180;
export const TILE = 16;

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
  spacing: { wife: 18, daughter1: 34, daughter2: 50 }, // path px behind Lot
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

export const DEBUG = new URLSearchParams(location.search).has('debug');
