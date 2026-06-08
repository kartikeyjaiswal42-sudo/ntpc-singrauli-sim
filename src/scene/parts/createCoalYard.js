import * as THREE from 'three';
import { M } from '../materials.js';

export function createCoalYard() {
  const g = new THREE.Group();
  g.name = 'coal';
  g.userData.id = 'coal';

  const pile = new THREE.Mesh(new THREE.ConeGeometry(12, 6, 4), M.coal);
  pile.position.set(-28, 3, 8);
  pile.rotation.y = Math.PI / 4;
  g.add(pile);

  // conveyor truss
  const truss = new THREE.Group();
  const start = new THREE.Vector3(-28, 6, 8);
  const end = new THREE.Vector3(-8, 28, 0);
  const dir = end.clone().sub(start).normalize();
  const len = start.distanceTo(end);
  const beam = new THREE.Mesh(new THREE.BoxGeometry(len, 0.5, 0.5), M.truss);
  beam.position.copy(start).add(end).multiplyScalar(0.5);
  beam.lookAt(end);
  beam.rotateY(Math.PI / 2);
  truss.add(beam);
  for (let t = 0; t < 8; t++) {
    const p = start.clone().lerp(end, t / 7);
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.2, 2, 0.2), M.truss);
    leg.position.copy(p);
    leg.position.y -= 1;
    truss.add(leg);
  }
  g.add(truss);

  return g;
}
