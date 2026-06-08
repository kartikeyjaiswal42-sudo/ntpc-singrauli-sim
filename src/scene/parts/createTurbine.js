import * as THREE from 'three';
import { M } from '../materials.js';

export function createTurbine() {
  const g = new THREE.Group();

  const turb = new THREE.Group();
  turb.name = 'turbine';
  turb.userData.id = 'turbine';

  const shapes = [
    { r: 3.2, w: 5, x: 12 },
    { r: 3.8, w: 6, x: 17.5 },
    { r: 5, w: 8, x: 24 },
  ];
  shapes.forEach((s, i) => {
    const m = new THREE.Mesh(new THREE.CylinderGeometry(s.r, s.r * 1.05, s.w, 20), M.metal);
    m.rotation.z = Math.PI / 2;
    m.position.set(s.x, 10, 0);
    m.userData.spin = true;
    m.userData.spinAxis = 'z';
    turb.add(m);
  });
  g.add(turb);

  const gen = new THREE.Group();
  gen.name = 'generator';
  gen.userData.id = 'generator';
  const body = new THREE.Mesh(new THREE.CylinderGeometry(4.5, 4.5, 10, 24), M.metalDark);
  body.rotation.z = Math.PI / 2;
  body.position.set(32, 10, 0);
  gen.add(body);
  const windings = new THREE.Mesh(new THREE.TorusGeometry(3.2, 0.35, 8, 24), M.copper);
  windings.rotation.y = Math.PI / 2;
  windings.position.set(32, 10, 0);
  windings.userData.spin = true;
  windings.userData.spinAxis = 'x';
  gen.add(windings);
  g.add(gen);

  return g;
}
