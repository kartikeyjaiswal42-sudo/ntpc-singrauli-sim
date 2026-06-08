import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { Events } from '../core/EventBus.js';
import { zoneById } from '../config/zones.js';
import { M } from './materials.js';
import { ModelLoader } from './ModelLoader.js';
import { PlantAssembler } from './PlantAssembler.js';
import { SmokePlume, FlameBillboard } from './effects/Particles.js';

export class PlantWorld {
  static async create(canvas, state, onProgress) {
    const loader = new ModelLoader();
    await loader.loadAll((pct, key) => onProgress?.(pct, key));
    const world = new PlantWorld(canvas, state, loader);
    return world;
  }

  constructor(canvas, state, modelLoader) {
    this.bus = state.bus;
    this.state = state;
    this.clock = new THREE.Clock();
    this.pickables = [];
    this.spinners = [];
    this.furnaceGlow = null;

    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false });
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.05;

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x0a1018);
    this.scene.fog = new THREE.Fog(0x0a1018, 80, 220);

    this.camera = new THREE.PerspectiveCamera(48, 1, 0.5, 400);
    this.camera.position.set(85, 55, 95);

    this.controls = new OrbitControls(this.camera, canvas);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.06;
    this.controls.maxPolarAngle = Math.PI / 2.05;
    this.controls.target.set(0, 12, 0);

    this.#lights();
    this.#ground();

    const assembler = new PlantAssembler(modelLoader);
    this.plantRoot = assembler.build();
    this.scene.add(this.plantRoot);
    this.pickables = assembler.pickables;
    this.spinners = assembler.spinners;
    this.furnaceGlow = assembler.furnaceGlow;

    this.smoke = new SmokePlume(this.scene, new THREE.Vector3(-48, 52, 0));
    this.flame = new FlameBillboard(this.plantRoot);

    this.raycaster = new THREE.Raycaster();
    this.pointer = new THREE.Vector2();
    this.camFrom = this.camera.position.clone();
    this.camTo = this.camera.position.clone();
    this.tgtFrom = this.controls.target.clone();
    this.tgtTo = this.controls.target.clone();
    this.camTween = 1;
    this.camDur = 1.2;

    canvas.addEventListener('pointerdown', (e) => this.#pick(e));
    window.addEventListener('resize', () => this.resize());
    this.bus.on(Events.STATE, (s) => this.#onState(s));
    this.bus.on(Events.ZONE, (z) => this.flyToZone(z));

    this.resize();
    this.animate();
  }

  #lights() {
    this.scene.add(new THREE.AmbientLight(0x6a7a8a, 0.45));
    const sun = new THREE.DirectionalLight(0xfff0dd, 1.1);
    sun.position.set(60, 80, 40);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    this.scene.add(sun);
    const fill = new THREE.DirectionalLight(0x88aaff, 0.35);
    fill.position.set(-40, 30, -30);
    this.scene.add(fill);
  }

  #ground() {
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(200, 200), M.ground);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    this.scene.add(ground);
    const grid = new THREE.GridHelper(200, 40, 0x1a2836, 0x121a22);
    grid.position.y = 0.02;
    this.scene.add(grid);
  }

  flyToZone(zoneId, duration = 1.2) {
    const z = zoneById(zoneId);
    this.camFrom.copy(this.camera.position);
    this.tgtFrom.copy(this.controls.target);
    this.camTo.set(...z.cam.pos);
    this.tgtTo.set(...z.cam.target);
    this.camTween = 0;
    this.camDur = duration;
  }

  #pick(e) {
    const r = this.renderer.domElement.getBoundingClientRect();
    this.pointer.x = ((e.clientX - r.left) / r.width) * 2 - 1;
    this.pointer.y = -((e.clientY - r.top) / r.height) * 2 + 1;
    this.raycaster.setFromCamera(this.pointer, this.camera);
    const hits = this.raycaster.intersectObjects(this.pickables, true);
    if (!hits.length) return;
    let o = hits[0].object;
    while (o && !o.userData.id) o = o.parent;
    if (o?.userData.id) this.state.select(o.userData.id);
  }

  #onState(s) {
    const l = s.load / 100;
    if (this.furnaceGlow?.material) {
      this.furnaceGlow.material.emissiveIntensity = s.tripped ? 0 : 0.4 + l * 1.2;
      this.furnaceGlow.visible = !s.tripped && l > 0.02;
    }
    document.body.classList.toggle('tripped', s.tripped);
    document.body.classList.toggle('paused', !s.running);
    this.intensity = s.tripped ? 0 : l;
    this.running = s.running;
  }

  resize() {
    const w = this.renderer.domElement.clientWidth;
    const h = this.renderer.domElement.clientHeight;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h, false);
  }

  animate() {
    requestAnimationFrame(() => this.animate());
    const dt = this.clock.getDelta();
    const t = this.clock.elapsedTime;

    if (this.camTween < 1) {
      this.camTween = Math.min(1, this.camTween + dt / this.camDur);
      const e = 1 - Math.pow(1 - this.camTween, 3);
      this.camera.position.lerpVectors(this.camFrom, this.camTo, e);
      this.controls.target.lerpVectors(this.tgtFrom, this.tgtTo, e);
    }

    if (this.running) {
      const rpm = this.intensity ?? 1;
      this.spinners.forEach((o) => {
        const ax = o.userData.spinAxis === 'x' ? 'x' : o.userData.spinAxis === 'z' ? 'z' : 'y';
        o.rotation[ax] += dt * (1.5 + rpm * 4);
      });
    }

    this.flame.update(this.intensity ?? 0, t);
    this.smoke.update(dt, this.intensity ?? 0);

    this.controls.update();
    this.renderer.render(this.scene, this.camera);
    this.bus.emit(Events.TICK, { dt, t });
  }
}
