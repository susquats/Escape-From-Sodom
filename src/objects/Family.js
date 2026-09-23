import FamilyMember from './FamilyMember.js';
import { FAMILY } from '../config.js';

export default class Family {
  constructor(scene, trail, terrain) {
    this.saltGroup = scene.physics.add.group(); // dynamic, world gravity on
    scene.physics.add.collider(this.saltGroup, terrain);
    // Plain array: members are positioned manually, so they must not join a physics group.
    this.members = ['wife', 'daughter1', 'daughter2'].map(key =>
      new FamilyMember(scene, key, FAMILY.spacing[key], trail, this.saltGroup));
  }

  update(delta) {
    this.members.forEach(m => m.update(delta));
  }
}
