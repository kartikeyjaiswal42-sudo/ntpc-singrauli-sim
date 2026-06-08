import * as THREE from 'three';
import { M, stripeTexture } from '../materials.js';

export function createChimney() {
  const g = new THREE.Group();
  g.name = 'stack';
  g.userData.id = 'stack';

  const mat = new THREE.MeshStandardMaterial({
    map: stripeTexture(),
    roughness: 0.75,
    metalness: 0.1,
  });

  const stack = new THREE.Mesh(new THREE.CylinderGeometry(4.2, 5, 52, 24), mat);
  stack.position.set(-48, 26, 0);
  stack.castShadow = true;
  g.add(stack);

  const cap = new THREE.Mesh(new THREE.CylinderGeometry(4.5, 4.2, 2, 24), M.metalDark);
  cap.position.set(-48, 52, 0);
  g.add(cap);

  // ESP box + pyramid hoppers
  const esp = new THREE.Group();
  esp.name = 'esp';
  esp.userData.id = 'esp';
  const box = new THREE.Mesh(new THREE.BoxGeometry(22, 10, 14), M.concrete);
  box.position.set(-38, 10, 0);
  esp.add(box);
  for (let i = 0; i < 4; i++) {
    const hop = new THREE.Mesh(new THREE.ConeGeometry(2.8, 5, 4), M.concrete);
    hop.position.set(-44 + i * 5.5, 5, 0);
    hop.rotation.y = Math.PI / 4;
    esp.add(hop);
  }
  g.add(esp);

  // FGD tower
  const fgd = new THREE.Group();
  fgd.name = 'fgd';
  fgd.userData.id = 'fgd';
  const tower = new THREE.Mesh(new THREE.CylinderGeometry(5, 5.5, 18, 16), M.metal);
  tower.position.set(-32, 12, 0);
  fgd.add(tower);
  g.add(fgd);

  return g;
}
