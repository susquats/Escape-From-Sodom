import { GAME_WIDTH, GAME_HEIGHT, ZOOM } from './config.js';

// The canvas is GAME_WIDTH*ZOOM x GAME_HEIGHT*ZOOM; the main camera zooms in by ZOOM so the world still
// measures GAME_WIDTH x GAME_HEIGHT units. Art textures are drawn at 2x size and shown at ART_SCALE, so one
// texture pixel = 2x2 canvas pixels. The PNG sprites (art/pngSprites.js) carry twice that detail: one of
// their texture pixels = one canvas pixel.
export const ART_SCALE = 0.5;

// With zoom, cam.scrollX is NOT the left edge of the view. Always use these for view edges.
const padX = (cam) => (cam.width - cam.width / cam.zoom) / 2;
const padY = (cam) => (cam.height - cam.height / cam.zoom) / 2;
export const viewX = (cam) => cam.scrollX + padX(cam);
export const viewY = (cam) => cam.scrollY + padY(cam);
export const setViewX = (cam, x) => { cam.scrollX = x - padX(cam); };
export const setViewY = (cam, y) => { cam.scrollY = y - padY(cam); };

// Call first thing in every scene's create().
// main: world objects (scroll factor 1). bg / ui: objects with scroll factor < 1 — skies and parallax
// (depth < 0) behind the world, HUD/text/buttons (depth >= 0) in front. bg/ui use origin (0,0), so the
// old 320x180 coordinates of those objects keep working unchanged.
export function setupView(scene) {
  const main = scene.cameras.main.setZoom(ZOOM);
  setViewX(main, 0); // scroll 0 would show world x 160.. at zoom 2; start with the view at the origin
  setViewY(main, 0);
  const w = GAME_WIDTH * ZOOM, h = GAME_HEIGHT * ZOOM;
  const bg = scene.cameras.add(0, 0, w, h).setOrigin(0, 0).setZoom(ZOOM).setName('bg');
  const ui = scene.cameras.add(0, 0, w, h).setOrigin(0, 0).setZoom(ZOOM).setName('ui');
  const list = scene.cameras.cameras; // render order: bg, main, ui
  list.splice(list.indexOf(bg), 1);
  list.unshift(bg);

  const all = main.id | bg.id | ui.id;
  const sync = () => {
    bg.scrollX = ui.scrollX = viewX(main);
    bg.scrollY = ui.scrollY = viewY(main);
    for (const go of scene.children.list) {
      const fixed = go.scrollFactorX !== 1 || go.scrollFactorY !== 1;
      const cam = !fixed ? main : (go.depth < 0 ? bg : ui);
      go.cameraFilter = all & ~cam.id; // cameraFilter = cameras that must NOT render it
    }
  };
  scene.events.on('postupdate', sync);
  scene.events.once('shutdown', () => scene.events.off('postupdate', sync));
  sync();
  scene.view = { main, bg, ui };
  return scene.view;
}

const cams = (scene, withUi = true) => {
  const v = scene.view;
  if (!v) return [scene.cameras.main];
  return withUi ? [v.main, v.bg, v.ui] : [v.main, v.bg];
};

// Camera effects on the helper cameras too, so the sky/UI fade with the world.
export function fadeOut(scene, ms, onComplete) {
  const [main, ...rest] = cams(scene);
  main.fadeOut(ms);
  rest.forEach(c => c.fadeOut(ms));
  if (onComplete) main.once('camerafadeoutcomplete', onComplete);
}
export function fadeIn(scene, ms) { cams(scene).forEach(c => c.fadeIn(ms)); }
export function flash(scene, ms, r, g, b) { cams(scene, false).forEach(c => c.flash(ms, r, g, b)); }
export function shake(scene, ms, intensity) { cams(scene, false).forEach(c => c.shake(ms, intensity)); }
