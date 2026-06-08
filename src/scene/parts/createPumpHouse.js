import * as THREE from 'three';
import { M } from '../materials.js';

export function createPumpHouse() {
  const g = new THREE.Group();
  g.name = 'pumphouse';
  g.userData.id = 'pumphouse';

  const hall = new THREE.Mesh(new THREE.BoxGeometry(28, 14, 18), M.metalDark);
  hall.position.set(48, 7, 12);
  hall.material = hall.material.clone();
  hall.material.transparent = true;
  hall.material.opacity = 0.35;
  g.add(hall);

  // blue truss roof lines
  for (let i = 0; i < 6; i++) {
    const beam = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.4, 18), M.truss);
    beam.position.set(36 + i * 4.5, 15, 12);
    g.add(beam);
    const rise = new THREE.Mesh(new THREE.BoxGeometry(0.35, 5, 0.35), M.truss);
    rise.position.set(36 + i * 4.5, 12.5, 12);
    rise.rotation.z = 0.35;
    g.add(rise);
  }

  for (let i = 0; i < 5; i++) {
    const px = 38 + i * 4.2;
    const motor = new THREE.Mesh(new THREE.CylinderGeometry(1.4, 1.4, 4.5, 12), M.pumpBlue);
    motor.position.set(px, 10, 12);
    g.add(motor);
    const pump = new THREE.Mesh(new THREE.CylinderGeometry(1.6, 1.8, 5, 12), M.pumpGreen);
    pump.position.set(px, 5.5, 12);
    pump.userData.spin = true;
    g.add(pump);
  }

  return g;
}
