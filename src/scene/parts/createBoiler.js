import * as THREE from 'three';
import { M } from '../materials.js';

export function createBoiler() {
  const g = new THREE.Group();
  g.name = 'boiler';
  g.userData.id = 'boiler';

  const body = new THREE.Mesh(new THREE.BoxGeometry(16, 36, 12), M.boiler);
  body.position.set(-5, 18, 0);
  body.castShadow = true;
  g.add(body);

  const drum = new THREE.Mesh(new THREE.CylinderGeometry(3.5, 3.5, 14, 20), M.metal);
  drum.rotation.z = Math.PI / 2;
  drum.position.set(-5, 34, 0);
  g.add(drum);

  const furnace = new THREE.Group();
  furnace.name = 'furnace';
  furnace.userData.id = 'furnace';
  const glow = new THREE.Mesh(
    new THREE.BoxGeometry(10, 8, 8),
    new THREE.MeshStandardMaterial({ color: 0xff5c1a, emissive: 0xff3a00, emissiveIntensity: 0.8 })
  );
  glow.position.set(-5, 10, 0);
  furnace.add(glow);
  furnace.userData.glow = glow;
  g.add(furnace);

  // FD fan
  const fan = new THREE.Mesh(new THREE.CylinderGeometry(2, 2, 1.2, 16), M.metal);
  fan.rotation.x = Math.PI / 2;
  fan.position.set(-14, 8, 4);
  fan.userData.spin = true;
  g.add(fan);

  return g;
}
