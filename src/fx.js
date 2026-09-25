import { GAME_WIDTH, GAME_HEIGHT } from './config.js';
import { t, getLang } from './i18n.js';
import { run, spendLife, resetRun, restoreCheckpoint } from './runState.js';
// Plays one of the loaded sound effects (explosion, hitHurt, jump, powerUp).
export function sfx(scene, key, volume = 0.5) {
  scene.sound.play(key, { volume: volume * volumes.sfx });
}

// Voiced onomatopoeia ('squish', 'bonk', 'pffft', 'thud', 'ahhh'): Spanish swaps bonk -> toc and thud -> pum.
const ES_VOICE = { bonk: 'toc', thud: 'pum' };
export function voice(scene, name, volume = 0.7) {
  sfx(scene, (getLang() === 'es' && ES_VOICE[name]) || name, volume);
}

// A sound that fades with distance (0 = full volume, silent at `range`); returns the sound or null.
export function sfxNear(scene, key, dist, range, volume = 0.5) {
  if (dist >= range) return null;
  const v = volume * (1 - dist / range);
  scene.sound.play(key, { volume: v * volumes.sfx });
  return true;
}

// Rumble for ms milliseconds, fading out over the last 400. loop: keep it going until the scene shuts down.
export function rumble(scene, ms, volume = 0.5, loop = false) {
  const snd = scene.sound.add('rumble', { loop, volume: volume * volumes.sfx });
  snd.play();
  const stop = () => { if (snd.isPlaying) snd.stop(); snd.destroy(); };
  if (loop) { scene.events.once('shutdown', stop); return snd; }
  scene.time.delayedCall(Math.max(0, ms - 400), () => {
    if (!snd.isPlaying) return;
    const from = snd.volume, t0 = performance.now();
    const id = setInterval(() => {
      const k = Math.min(1, (performance.now() - t0) / 400);
      if (snd.isPlaying) snd.setVolume(from * (1 - k));
      if (k === 1) { clearInterval(id); stop(); }
    }, 30);
  });
  return snd;
}

// Player-set volume multipliers (0..1) for music and sound effects, remembered in localStorage.
const volumes = { music: 1, sfx: 1 };
try {
  const saved = JSON.parse(localStorage.getItem('zoar.volumes') || '{}');
  for (const k of ['music', 'sfx']) if (typeof saved[k] === 'number') volumes[k] = Math.min(1, Math.max(0, saved[k]));
} catch { /* storage unavailable: defaults */ }
export function getVolume(kind) { return volumes[kind]; }
export function setVolume(kind, v) {
  volumes[kind] = Math.min(1, Math.max(0, v));
  try { localStorage.setItem('zoar.volumes', JSON.stringify(volumes)); } catch { /* ignore */ }
  if (kind === 'music' && currentMusic) {
    clearInterval(fades.get(currentMusic)); fades.delete(currentMusic);
    currentMusic.setVolume(currentBase * volumes.music);
  }
}

// Background music with crossfades. Music lives on the global sound manager, so it survives scene
// changes and restarts. Asking for the track that is already current does nothing (it just keeps
// playing); asking for a different one fades the old out and the new in.
const MUSIC_FADE = 700;
const MUSIC_VOL = 0.5;
let currentMusic = null;
let currentBase = MUSIC_VOL;
const fades = new Map();
function fadeSound(snd, to, ms, done) {
  clearInterval(fades.get(snd));
  const from = snd.volume, t0 = performance.now();
  const id = setInterval(() => {
    const k = Math.min(1, (performance.now() - t0) / ms);
    snd.setVolume(from + (to - from) * k);
    if (k === 1) { clearInterval(id); fades.delete(snd); done?.(); }
  }, 30);
  fades.set(snd, id);
}
// Speeds the current track up (and raises its pitch with it) or back to normal, easing over ms.
let rateTimer = null;
export function setMusicRate(rate, ms = 400) {
  clearInterval(rateTimer);
  const snd = currentMusic;
  if (!snd) return;
  const from = snd.rate, t0 = performance.now();
  rateTimer = setInterval(() => {
    const k = Math.min(1, (performance.now() - t0) / ms);
    if (snd.isPlaying) snd.setRate(from + (rate - from) * k);
    if (k === 1) clearInterval(rateTimer);
  }, 30);
}
export function stopMusic(scene) {
  if (!currentMusic) return;
  const snd = currentMusic;
  currentMusic = null;
  fadeSound(snd, 0, MUSIC_FADE, () => snd.stop());
}
export const isMusicPlaying = (key) => !!currentMusic && currentMusic.key === key;
// nextKey: play the track once, then crossfade into nextKey when it ends.
export function playMusic(scene, key, volume = MUSIC_VOL, nextKey = null) {
  if (currentMusic && currentMusic.key === key) return;
  stopMusic(scene);
  const snd = scene.sound.add(key, { loop: !nextKey, volume: 0 });
  if (nextKey) snd.once('complete', () => { if (currentMusic === snd) playMusic(scene, nextKey); });
  snd.play();
  currentMusic = snd;
  currentBase = volume;
  fadeSound(snd, volume * volumes.music, MUSIC_FADE);
}

// Call when Lot dies: spends a family life (or ends the run) and announces it. The next member
// (wife, then daughters) turns red and dies if a family is passed; play continues where it is.
// Returns { gameOver, name }; on gameOver the caller restarts the level (the run state is already reset).
export function loseLife(scene, family = null) {
  sfx(scene, 'hitHurt');
  const res = spendLife();
  const { gameOver, name } = res;
  const msg = gameOver ? t('life.gameOver') : t(`gone.${name}`);
  const txt = scene.add.text(160, 40, msg, { fontFamily: 'monospace', fontSize: '8px', color: gameOver ? '#ff5a5a' : '#ffe14a',
    stroke: '#000', strokeThickness: 2, align: 'center' }).setOrigin(0.5).setScrollFactor(0).setDepth(950);
  if (!gameOver) scene.tweens.add({ targets: txt, alpha: 0, delay: 1200, duration: 500, onComplete: () => txt.destroy() });
  if (!gameOver && family) family.members.find(m => m.memberName === name)?.dieRed();
  return res;
}

// Lot died where the wall of destruction can still claim someone: the next family member
// (wife, then daughters) turns to salt instead of dying. Touching the salt rescues them; only
// if the wall (or a pit) destroys the salt is the life lost. Returns true on game over
// (nobody left to turn to salt): the family as it was at the checkpoint is restored and Act I restarts at the last checkpoint,
// or the whole run resets if none was reached.
export function saltLife(scene, family, fell = false) {
  sfx(scene, 'hitHurt');
  const m = family.members.find(k => ['following', 'rejoining', 'lookingBack'].includes(k.state));
  const gameOver = !m;
  const hasCp = run.checkpointX !== null;
  const msg = gameOver ? t(hasCp ? 'life.gameOverCp' : 'life.gameOver')
    : fell ? t('life.fell') : t('life.salt', { name: t(`name.${m.memberName}`) });
  const txt = scene.add.text(160, 40, msg, { fontFamily: 'monospace', fontSize: '8px', color: gameOver ? '#ff5a5a' : '#ffe14a',
    stroke: '#000', strokeThickness: 2, align: 'center' }).setOrigin(0.5).setScrollFactor(0).setDepth(950);
  if (gameOver) { if (hasCp) restoreCheckpoint(); else resetRun(); }
  else {
    scene.tweens.add({ targets: txt, alpha: 0, delay: 1500, duration: 500, onComplete: () => txt.destroy() });
    if (fell) m.dieRed(); // a fall leaves no salt to rescue
    else m.saltify(true);
  }
  return gameOver;
}

export function popText(scene, x, y, str, color = '#fff') {
  const t = scene.add.text(x, y, str, { fontFamily: 'monospace', fontSize: '8px', color,
    stroke: '#000', strokeThickness: 2 }).setOrigin(0.5, 1).setDepth(800);
  scene.tweens.add({ targets: t, y: y - 14, alpha: 0, duration: 700, onComplete: () => t.destroy() });
}

export function puff(scene, x, y, color = 0xffffff, count = 6) {
  for (let i = 0; i < count; i++) {
    const a = (i / count) * Math.PI * 2;
    const p = scene.add.image(x, y, 'pixel').setTint(color).setDepth(799);
    scene.tweens.add({ targets: p, x: x + Math.cos(a) * 10, y: y + Math.sin(a) * 10,
      alpha: 0, duration: 350, onComplete: () => p.destroy() });
  }
}

// A pixel speech bubble whose tail points down at (x, y) (just above a speaker's head), shown for ms. It holds
// `text`, or an ellipsis ("...") drawn as three dots. World units, so it sits in the world and scrolls with it.
export function speech(scene, x, y, ms = 900, text = null) {
  const g = scene.add.graphics().setPosition(Math.round(x), Math.round(y)).setDepth(800);
  const t = text && scene.add.text(0, 0, text, { fontFamily: 'monospace', fontSize: '8px', color: '#1a1420' })
    .setOrigin(0.5, 1).setDepth(801);
  const w = t ? Math.ceil(t.width) + 6 : 13, h = t ? Math.ceil(t.height) + 1 : 7;
  const x0 = -Math.floor(w / 2), y0 = -h - 3;
  g.fillStyle(0x1a1420).fillRect(x0 + 1, y0 - 1, w - 2, h + 2).fillRect(x0 - 1, y0 + 1, w + 2, h - 2)
    .fillRect(x0, y0, w, h).fillRect(-2, y0 + h, 4, 2).fillRect(-1, y0 + h + 2, 2, 1);
  g.fillStyle(0xffffff).fillRect(x0 + 1, y0, w - 2, h).fillRect(x0, y0 + 1, w, h - 2).fillRect(-1, y0 + h, 2, 2);
  g.fillStyle(0x1a1420);
  if (!t) [-4, -1, 2].forEach(dx => g.fillRect(dx + 1, y0 + 3, 1, 1));
  const parts = t ? [g, t.setPosition(g.x, g.y - 3)] : [g];
  parts.forEach(o => o.setScale(0.4));
  scene.tweens.add({ targets: parts, scale: 1, duration: 120, ease: 'Back.out' });
  scene.time.delayedCall(ms, () => scene.tweens.add({ targets: parts, alpha: 0, duration: 120,
    onComplete: () => parts.forEach(o => o.destroy()) }));
  return g;
}

// Cinematic black bars that slide in from the top and bottom of the view. Returns { bars, hide() }.
export function letterbox(scene, ms = 400) {
  const bars = [0, 1].map(i => scene.add.rectangle(0, i ? GAME_HEIGHT : 0, GAME_WIDTH, 22, 0x000000)
    .setOrigin(0, i).setScrollFactor(0).setDepth(940).setScale(1, 0));
  scene.tweens.add({ targets: bars, scaleY: 1, duration: ms, ease: 'Quad.out' });
  return { bars, hide: () => scene.tweens.add({ targets: bars, scaleY: 0, duration: ms, ease: 'Quad.in' }) };
}
