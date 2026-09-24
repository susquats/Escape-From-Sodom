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
    const defs = {
      left: { cls: 'tc-left', label: '<' },
      right: { cls: splitThumbs ? 'tc-jump' : 'tc-right', label: '>' },
      jump: { cls: 'tc-jump', label: t('btn.jump') },
      restart: { cls: 'tc-restart', label: 'R' },
    };

    this.root = document.createElement('div');
    this.root.id = 'touch-controls';
    this.root.style.display = 'none';
    this.held = {};
    this.buttons = {};
    for (const n of names) {
      if (!defs[n]) continue;
      const el = document.createElement('div');
      el.className = `tc-btn ${defs[n].cls}`;
      el.textContent = defs[n].label;
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
    scene.events.once('shutdown', () => this.root.remove());

    this.visible = false;
    if (scene.sys.game.device.input.touch) this.setVisible(true);
    else {
      scene.input.on('pointerdown', (p) => {
        if (p.wasTouch && !this.visible) this.setVisible(true);
      });
    }
  }

  setVisible(v) {
    this.visible = v;
    this.root.style.display = v ? '' : 'none';
    if (!v) for (const ids of Object.values(this.held)) ids.clear();
  }

  update() {
    for (const n of ['left', 'right', 'jump', 'restart']) this[n] = !!this.held[n]?.size;
  }
}
