import * as THREE from 'three';

export function stripeTexture(red = '#d42b2b', white = '#e8eaed', bands = 12) {
  const c = document.createElement('canvas');
  c.width = 64;
  c.height = 256;
  const ctx = c.getContext('2d');
  const h = c.height / bands;
  for (let i = 0; i < bands; i++) {
    ctx.fillStyle = i % 2 === 0 ? red : white;
    ctx.fillRect(0, i * h, 64, h);
  }
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(1, bands);
  return t;
}

export const M = {
  metal: new THREE.MeshStandardMaterial({ color: 0x4a5e72, metalness: 0.55, roughness: 0.45 }),
  metalDark: new THREE.MeshStandardMaterial({ color: 0x2a3544, metalness: 0.5, roughness: 0.55 }),
  boiler: new THREE.MeshStandardMaterial({ color: 0x1a2230, metalness: 0.35, roughness: 0.65 }),
  concrete: new THREE.MeshStandardMaterial({ color: 0x9aa4ae, roughness: 0.85 }),
  coal: new THREE.MeshStandardMaterial({ color: 0x3a4450, roughness: 0.9 }),
  pumpBlue: new THREE.MeshStandardMaterial({ color: 0x1e4d8c, metalness: 0.4, roughness: 0.5 }),
  pumpGreen: new THREE.MeshStandardMaterial({ color: 0x1a4030, metalness: 0.35, roughness: 0.55 }),
  water: new THREE.MeshStandardMaterial({ color: 0x1a5570, metalness: 0.2, roughness: 0.3, transparent: true, opacity: 0.85 }),
  ground: new THREE.MeshStandardMaterial({ color: 0x141a1c, roughness: 0.95 }),
  copper: new THREE.MeshStandardMaterial({ color: 0xb87333, metalness: 0.7, roughness: 0.35 }),
  truss: new THREE.MeshStandardMaterial({ color: 0x1e4d8c, metalness: 0.45, roughness: 0.5 }),
  highlight: new THREE.MeshStandardMaterial({ color: 0x3b9eff, emissive: 0x1a4a8a, emissiveIntensity: 0.35, transparent: true, opacity: 0.35 }),
};
