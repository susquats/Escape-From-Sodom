import { GAME_WIDTH, TILE } from '../config.js';
import { ART_SCALE } from '../view.js';
import { buildWildernessArt, WILD, GROUND_Y0 } from '../art/wildernessArt.js';

// The wilderness walk, shared by FlightScene (which sets the family down at its start and blends into it) and
// WildernessScene (which carries on from there), so the two look like one continuous stretch of desert.
export const WORLD_W = 960;
export const WORLD_H = 180;
export const STREET = 9; // ground top y = 144
export const GROUND_Y = STREET * TILE;
export const SALT_X = 500; // Lot's x where his wife looks back for the last time (a flat stretch)
export const CLIFF_X = 882; // the foot of the mountain's cliff: the walk ends here
export const LOT_START_X = 180; // where the angels set Lot down; the family stands behind him (see FAMILY.spacing)
// ground blocks [tile x, tile y of the top, width in tiles]
export const LAYOUT = [[0, STREET, 14], [14, STREET - 1, 10], [24, STREET, 20], [44, STREET - 1, 16]];
export const groundTop = (x) => {
  const b = LAYOUT.find(([tx, , w]) => x >= tx * TILE && x < (tx + w) * TILE) || LAYOUT[LAYOUT.length - 1];
  return b[1] * TILE;
};

// Sky, distant Sodom, hills and the far mountain (parallax). `depthBase` lifts them above another background.
export function addWildernessBackdrop(scene, { alpha = 1, depthBase = 0 } = {}) {
  buildWildernessArt(scene, WORLD_W, groundTop);
  const layer = (key, f, depth, x = 0) => scene.add.image(x, 0, key).setOrigin(0).setScale(ART_SCALE)
    .setScrollFactor(f, 0).setDepth(depth + depthBase).setAlpha(alpha);
  return [
    layer('wild-sky', WILD.sky, -3),
    layer('wild-far', WILD.far, -2.8),
    layer('wild-hills', WILD.hills, -2.6),
    // the mountain rises on the right from about halfway; its slope starts near the left of the screen at the end
    layer('wild-massif', WILD.massif, -2.4, (WORLD_W - GAME_WIDTH) * WILD.massif + 60),
  ];
}

// The ground, signpost and first boulder, shifted right by `dx`. Returns the images (rocks separately,
// because the wilderness gives them physics bodies).
export function addWildernessGround(scene, dx = 0, boulders = [[19, 'wild-rock0'], [48, 'wild-rock1']]) {
  buildWildernessArt(scene, WORLD_W, groundTop);
  const img = (x, y, key, depth, origin) => scene.add.image(x + dx, y, key).setOrigin(...origin).setScale(ART_SCALE).setDepth(depth);
  const ground = img(0, GROUND_Y0, 'wild-ground', -0.8, [0, 0]);
  const sign = img(13 * TILE, groundTop(13 * TILE), 'wild-sign', -0.5, [0.5, 1]);
  const rocks = boulders.map(([tx, key]) => {
    const x = tx * TILE + TILE / 2;
    return img(x, groundTop(x) + 1, key, -0.2, [0.5, 1]);
  });
  return { ground, sign, rocks, all: [ground, sign, ...rocks] };
}
