import { t } from '../i18n.js';

// On-screen buttons are real DOM elements pinned to the screen edges (not canvas objects), so on a
// wide phone they sit in the letterbox bars instead of covering the playfield.
export default class TouchControls {
  constructor(scene, names = ['left', 'right', 'jump', 'restart']) {
    this.scene = scene;
    this.left = false;
    this.right = false;
    this.jump = false;
    this.restart = false;

    // No jump button: split the thumbs, right button goes to the bottom-right corner
    const splitThumbs = names.includes('right') && !names.includes('jump');
    const svg = (d) => `<svg viewBox="0 0 24 24" width="30" height="30"><path d="${d}" fill="#fff" stroke="#1a0d2e" stroke-width="1.5" stroke-linejoin="round"/></svg>`;
    const ARROW_L = svg('M17 3 L6 12 L17 21 Z'), ARROW_R = svg('M7 3 L18 12 L7 21 Z');
    const PAUSE = svg('M6 4 H10 V20 H6 Z M14 4 H18 V20 H14 Z');
    const defs = {
      left: { cls: 'tc-left', html: ARROW_L },
      right: { cls: splitThumbs ? 'tc-jump' : 'tc-right', html: ARROW_R },
      jump: { cls: 'tc-jump', html: svg('M12 3 L21 15 H15 V21 H9 V15 H3 Z') + `<span>${t('btn.jump')}</span>` },
      restart: { cls: 'tc-pause', html: PAUSE }, // the old restart slot is now pause
      pause: { cls: 'tc-pause', html: PAUSE },
    };

    this.root = document.createElement('div');
    this.root.id = 'touch-controls';
    this.root.style.display = 'none';
    this.held = {};
    this.buttons = {};
    let hasPause = false;
    for (const n of names) {
      if (!defs[n]) continue;
      if (n === 'restart' || n === 'pause') {
        if (hasPause) continue;
        hasPause = true;
        const el = document.createElement('div');
        el.className = 'tc-hit tc-pause';
        el.innerHTML = `<div class="tc-btn">${defs[n].html}</div>`;
        el.addEventListener('pointerdown', (e) => { e.preventDefault(); this.pause(); });
        this.root.appendChild(el);
        continue;
      }
      const el = document.createElement('div');
      el.className = `tc-hit ${defs[n].cls}`;
      el.innerHTML = `<div class="tc-btn">${defs[n].html}</div>`;
      const ids = new Set();
      this.held[n] = ids;
      const down = (e) => { e.preventDefault(); ids.add(e.pointerId); el.classList.add('down'); };
      const up = (e) => { ids.delete(e.pointerId); if (!ids.size) el.classList.remove('down'); };
      el.addEventListener('pointerdown', down);
      for (const ev of ['pointerup', 'pointercancel', 'pointerleave']) el.addEventListener(ev, up);
      this.root.appendChild(el);
      this.buttons[n] = el;
    }
    document.body.appendChild(this.root);
    scene.events.once('shutdown', () => { this.root.remove(); this.overlay?.remove(); });
    this.overlay = null;
    scene.input.keyboard?.on('keydown-P', () => (this.overlay ? this.resume() : this.pause()));

    this.visible = false;
    if (scene.sys.game.device.input.touch) this.setVisible(true);
    else {
      scene.input.on('pointerdown', (p) => {
        if (p.wasTouch && !this.visible) this.setVisible(true);
      });
    }
  }

  pause() {
    if (this.overlay || this.scene.sys.isPaused()) return;
    const o = document.createElement('div');
    o.id = 'pause-overlay';
    o.innerHTML = `<div>${t('btn.paused')}</div><small>${t('btn.resume')}</small>`;
    o.addEventListener('pointerdown', (e) => { e.preventDefault(); this.resume(); });
    document.body.appendChild(o);
    this.overlay = o;
    this.scene.scene.pause();
  }

  resume() {
    this.overlay?.remove();
    this.overlay = null;
    this.scene.scene.resume();
  }

  setVisible(v) {
    this.visible = v;
    this.root.style.display = v ? '' : 'none';
    if (!v) for (const ids of Object.values(this.held)) ids.clear();
  }

  update() {
    // controls stay out of the way during cinematics
    const s = this.scene;
    const hide = !this.visible || s.cutscene || s.atTop || s.landing;
    this.root.style.display = hide ? 'none' : '';
    if (hide) { for (const ids of Object.values(this.held)) ids.clear(); }
    for (const n of ['left', 'right', 'jump', 'restart']) this[n] = !!this.held[n]?.size;
  }
}
