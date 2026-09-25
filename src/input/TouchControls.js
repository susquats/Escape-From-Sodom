import { t } from '../i18n.js';
import { getVolume, setVolume } from '../fx.js';

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
    const svg = (d) => `<svg viewBox="0 0 24 24" width="30" height="30"><path d="${d}" fill="#fff" stroke="#1a0d2e" stroke-width="1.5" stroke-linejoin="round" fill-rule="evenodd"/></svg>`;
    const ARROW_L = svg('M17 3 L6 12 L17 21 Z'), ARROW_R = svg('M7 3 L18 12 L7 21 Z');
    const PAUSE = svg('M18.9 9.1 L22.1 9.3 L22.1 14.7 L18.9 14.9 L18.9 14.8 L21.1 17.3 L17.3 21.1 L14.8 18.9 L14.9 18.9 L14.7 22.1 L9.3 22.1 L9.1 18.9 L9.2 18.9 L6.7 21.1 L2.9 17.3 L5.1 14.8 L5.1 14.9 L1.9 14.7 L1.9 9.3 L5.1 9.1 L5.1 9.2 L2.9 6.7 L6.7 2.9 L9.2 5.1 L9.1 5.1 L9.3 1.9 L14.7 1.9 L14.9 5.1 L14.8 5.1 L17.3 2.9 L21.1 6.7 L18.9 9.2 Z M12 8.5 A3.5 3.5 0 1 0 12 15.5 A3.5 3.5 0 1 0 12 8.5 Z'); // gear: opens the settings menu
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
        // Pause button goes in its own always-visible container
        const pauseContainer = document.createElement('div');
        pauseContainer.id = 'pause-button';
        const el = document.createElement('div');
        el.className = 'tc-hit tc-pause';
        el.innerHTML = `<div class="tc-btn">${defs[n].html}</div>`;
        el.addEventListener('pointerdown', (e) => { e.preventDefault(); this.pause(); });
        pauseContainer.appendChild(el);
        document.body.appendChild(pauseContainer);
        this.pauseButton = pauseContainer;
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
    scene.events.once('shutdown', () => { this.root.remove(); this.pauseButton?.remove(); this.overlay?.remove(); });
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
    o.innerHTML = `
      <div>${t('btn.paused')}</div>
      <div class="pause-menu">
        ${['music', 'sfx'].map(k => `<label class="vol-row"><span>${t('vol.' + k)}</span>
          <input type="range" min="0" max="100" step="5" data-kind="${k}" value="${Math.round(getVolume(k) * 100)}"></label>`).join('')}
        <button class="pause-btn resume-btn">${t('btn.resumeMenu')}</button>
        ${this.scene.scene.key === 'TitleScene' ? '' : `<button class="pause-btn end-game-btn">${t('btn.endGame')}</button>`}
      </div>
    `;

    o.querySelectorAll('input[type=range]').forEach(inp => {
      inp.addEventListener('input', () => setVolume(inp.dataset.kind, inp.value / 100));
      inp.addEventListener('pointerdown', (e) => e.stopPropagation());
    });

    // Resume button
    const resumeBtn = o.querySelector('.resume-btn');
    resumeBtn.addEventListener('pointerdown', (e) => { e.preventDefault(); e.stopPropagation(); this.resume(); });

    // End Game button
    const endGameBtn = o.querySelector('.end-game-btn');
    endGameBtn?.addEventListener('pointerdown', (e) => { e.preventDefault(); e.stopPropagation(); this.endGame(); });

    document.body.appendChild(o);
    this.overlay = o;
    this.scene.scene.pause();
  }

  resume() {
    this.overlay?.remove();
    this.overlay = null;
    this.scene.scene.resume();
  }

  endGame() {
    this.overlay?.remove();
    this.overlay = null;
    this.scene.scene.stop();
    this.scene.scene.start('TitleScene');
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
