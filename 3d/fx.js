// fx.js — atmosphere & live particle systems that make the 3D plant feel real:
//   • physically-based sky + sun (three Sky shader)
//   • image-based environment lighting (RoomEnvironment → PMREM) so metal/water reflect
//   • Plume: pooled sprite smoke/steam for the stack and cooling towers
import * as THREE from 'three';
import { Sky } from 'three/examples/jsm/objects/Sky.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';

let _soft = null;
function softTexture() {
  if (_soft) return _soft;
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const g = c.getContext('2d');
  const grad = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  grad.addColorStop(0, 'rgba(255,255,255,0.95)');
  grad.addColorStop(0.4, 'rgba(255,255,255,0.55)');
  grad.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, 128, 128);
  _soft = new THREE.CanvasTexture(c);
  return _soft;
}

export function setupSky(scene, sunDir) {
  const sky = new Sky();
  sky.scale.setScalar(9000);
  const u = sky.material.uniforms;
  u.turbidity.value = 4;
  u.rayleigh.value = 2.3;
  u.mieCoefficient.value = 0.004;
  u.mieDirectionalG.value = 0.82;
  u.sunPosition.value.copy(sunDir);
  scene.add(sky);
  return sky;
}

export function setupEnvironment(scene, renderer) {
  const pmrem = new THREE.PMREMGenerator(renderer);
  const env = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environment = env;
  return env;
}

export class Plume {
  constructor(scene, origin, opt = {}) {
    this.origin = origin.clone();
    this.o = Object.assign({
      count: 34, rise: 9, spread: 6, size0: 8, size1: 34,
      life: 5, driftX: 7, driftZ: 3, color: 0xbfc4c8, opacity: 0.5,
    }, opt);
    const tex = softTexture();
    this.group = new THREE.Group();
    this.sprites = [];
    for (let i = 0; i < this.o.count; i++) {
      const s = new THREE.Sprite(new THREE.SpriteMaterial({
        map: tex, transparent: true, depthWrite: false,
        color: this.o.color, opacity: 0,
      }));
      this._respawn(s, Math.random() * this.o.life);
      this.group.add(s);
      this.sprites.push(s);
    }
    scene.add(this.group);
    this.intensity = 1;
  }

  _respawn(s, age = 0) {
    s.userData = {
      age,
      life: this.o.life * (0.7 + Math.random() * 0.6),
      ox: (Math.random() - 0.5) * this.o.spread,
      oz: (Math.random() - 0.5) * this.o.spread,
      sway: Math.random() * Math.PI * 2,
      rise: this.o.rise * (0.7 + Math.random() * 0.6),
    };
  }

  setColor(hex) { this._tint = hex; }

  update(dt, intensity) {
    this.intensity += (intensity - this.intensity) * Math.min(1, dt * 2);
    const o = this.o;
    for (const s of this.sprites) {
      const u = s.userData;
      u.age += dt;
      if (u.age > u.life) this._respawn(s);
      const t = u.age / u.life;
      const sway = Math.sin(u.sway + u.age * 0.8) * 2;
      s.position.set(
        this.origin.x + u.ox + o.driftX * u.age * 0.5 + sway,
        this.origin.y + u.rise * u.age,
        this.origin.z + u.oz + o.driftZ * u.age * 0.5,
      );
      const sz = o.size0 + (o.size1 - o.size0) * t;
      s.scale.set(sz, sz, 1);
      s.material.opacity = Math.sin(Math.min(1, t) * Math.PI) * o.opacity * this.intensity;
      if (this._tint !== undefined) s.material.color.setHex(this._tint);
    }
    this.group.visible = this.intensity > 0.02;
  }
}
