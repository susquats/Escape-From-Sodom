import FamilyMember from './FamilyMember.js';
import Wife from './Wife.js';
import { FAMILY } from '../config.js';
import { run } from '../runState.js';

export default class Family {
  constructor(scene, trail, terrain) {
    this.saltGroup = scene.physics.add.group(); // dynamic, world gravity on
    scene.physics.add.collider(this.saltGroup, terrain);
    // Plain array: members are positioned manually, so they must not join a physics group.
    this.members = ['wife', 'daughter1', 'daughter2'].map(key => {
      const Cls = key === 'wife' ? Wife : FamilyMember;
      return new Cls(scene, key, FAMILY.spacing[key], trail, this.saltGroup);
    });
    this.members.forEach(m => { if (run.lost.has(m.memberName)) m.startLost(); });
  }

  get savedCount() {
    return this.members.filter(m => m.state !== 'lost').length;
  }

  update(delta) {
    this.members.forEach(m => m.update(delta));
  }

  rescueAll() { this.members.forEach(m => { if (m.state === 'salted') m.rescue(); }); }

  protect(ms) { this.members.forEach(m => { if (m.state !== 'lost') m.invulnTimer = Math.max(m.invulnTimer, ms); }); }

  applyDestruction(wallX) {
    this.members.forEach(m => { if (m.state !== 'lost' && m.worldX < wallX) m.lose(); });
  }
}
