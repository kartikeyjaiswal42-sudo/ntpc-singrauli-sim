import * as THREE from 'three';

export class SmokePlume {
  constructor(scene, origin, color = 0xb8c4d0, count = 80) {
    this.origin = origin.clone();
    this.geo = new THREE.BufferGeometry();
    const pos = new Float32Array(count * 3);
    this.vel = [];
    for (let i = 0; i < count; i++) {
      pos[i * 3] = origin.x + (Math.random() - 0.5) * 2;
      pos[i * 3 + 1] = origin.y + Math.random() * 2;
      pos[i * 3 + 2] = origin.z + (Math.random() - 0.5) * 2;
      this.vel.push({ y: 0.08 + Math.random() * 0.06, life: Math.random() });
    }
    this.geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    this.mat = new THREE.PointsMaterial({ color, size: 1.8, transparent: true, opacity: 0.45, depthWrite: false });
    this.points = new THREE.Points(this.geo, this.mat);
    scene.add(this.points);
    this.count = count;
  }

  update(dt, intensity) {
    if (intensity < 0.05) {
      this.mat.opacity = 0;
      return;
    }
    this.mat.opacity = 0.15 + intensity * 0.4;
    const arr = this.geo.attributes.position.array;
    for (let i = 0; i < this.count; i++) {
      let life = this.vel[i].life + dt * 0.35;
      if (life > 1) {
        life = 0;
        arr[i * 3] = this.origin.x + (Math.random() - 0.5) * 2;
        arr[i * 3 + 1] = this.origin.y;
        arr[i * 3 + 2] = this.origin.z + (Math.random() - 0.5) * 2;
      }
      arr[i * 3 + 1] += this.vel[i].y * intensity * 60 * dt;
      this.vel[i].life = life;
    }
    this.geo.attributes.position.needsUpdate = true;
  }
}

export class FlameBillboard {
  constructor(parent) {
    const geo = new THREE.PlaneGeometry(6, 8);
    const mat = new THREE.MeshBasicMaterial({
      color: 0xff6a2a,
      transparent: true,
      opacity: 0.85,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    this.mesh = new THREE.Mesh(geo, mat);
    this.mesh.position.set(-5, 8, 0);
    parent.add(this.mesh);
  }

  update(intensity, time) {
    const on = intensity > 0.02;
    this.mesh.visible = on;
    if (!on) return;
    const s = 0.7 + intensity * 0.5 + Math.sin(time * 8) * 0.08;
    this.mesh.scale.set(s, s * 1.1, 1);
    this.mesh.material.opacity = 0.5 + intensity * 0.4;
  }
}
