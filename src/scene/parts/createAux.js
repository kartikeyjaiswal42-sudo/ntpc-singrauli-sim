import * as THREE from 'three';
import { M } from '../materials.js';

export function createCoolingTower() {
  const g = new THREE.Group();
  g.name = 'cooltower';
  g.userData.id = 'cooltower';

  const points = [];
  for (let i = 0; i <= 20; i++) {
    const t = i / 20;
    const y = t * 22;
    const r = 2 + Math.sin(t * Math.PI) * 5 + t * 2;
    points.push(new THREE.Vector2(r, y));
  }
  const geom = new THREE.LatheGeometry(points, 32);
  const mesh = new THREE.Mesh(geom, M.concrete);
  mesh.position.set(55, 0, 8);
  g.add(mesh);
  return g;
}

export function createCondenser() {
  const g = new THREE.Group();
  g.name = 'condenser';
  g.userData.id = 'condenser';
  const box = new THREE.Mesh(new THREE.BoxGeometry(14, 5, 8), M.metal);
  box.position.set(22, 4, 6);
  g.add(box);
  return g;
}

export function createReservoir() {
  const g = new THREE.Group();
  g.name = 'reservoir';
  g.userData.id = 'reservoir';
  const water = new THREE.Mesh(new THREE.BoxGeometry(50, 0.8, 35), M.water);
  water.position.set(55, 0.2, 28);
  g.add(water);
  return g;
}

export function createAuxSkids() {
  const g = new THREE.Group();
  const mk = (id, x, z, label) => {
    const o = new THREE.Group();
    o.name = id;
    o.userData.id = id;
    const m = new THREE.Mesh(new THREE.BoxGeometry(5, 3, 4), M.metal);
    m.position.set(x, 1.5, z);
    o.add(m);
    g.add(o);
  };
  mk('dm', 52, 2, 'DM');
  mk('h2', 58, 2, 'H2');
  mk('chlor', 55, -4, 'Cl');
  return g;
}

export function createSwitchyard() {
  const g = new THREE.Group();
  g.name = 'switchyard';
  g.userData.id = 'switchyard';

  const mkTower = (x, z) => {
    const t = new THREE.Group();
    const leg1 = new THREE.Mesh(new THREE.BoxGeometry(0.3, 16, 0.3), M.metal);
    leg1.position.set(x - 2, 8, z);
    const leg2 = leg1.clone();
    leg2.position.set(x + 2, 8, z);
    const arm = new THREE.Mesh(new THREE.BoxGeometry(5, 0.25, 0.25), M.metal);
    arm.position.set(x, 14, z);
    t.add(leg1, leg2, arm);
    g.add(t);
  };
  mkTower(28, -18);
  mkTower(38, -22);
  mkTower(48, -18);

  const gt = new THREE.Group();
  gt.name = 'gt';
  gt.userData.id = 'gt';
  const tr = new THREE.Mesh(new THREE.BoxGeometry(4, 6, 5), M.metalDark);
  tr.position.set(34, 5, -8);
  gt.add(tr);
  g.add(gt);

  return g;
}
