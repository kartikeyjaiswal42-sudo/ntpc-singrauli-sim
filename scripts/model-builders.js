import * as THREE from 'three';

export const M = {
  metal: new THREE.MeshStandardMaterial({ color: 0x4a5e72, metalness: 0.55, roughness: 0.45 }),
  metalDark: new THREE.MeshStandardMaterial({ color: 0x2a3544, metalness: 0.5, roughness: 0.55 }),
  concrete: new THREE.MeshStandardMaterial({ color: 0x9aa4ae, roughness: 0.85 }),
  red: new THREE.MeshStandardMaterial({ color: 0xd42b2b, roughness: 0.7 }),
  white: new THREE.MeshStandardMaterial({ color: 0xe8eaed, roughness: 0.75 }),
  pumpBlue: new THREE.MeshStandardMaterial({ color: 0x1e4d8c, metalness: 0.45, roughness: 0.5 }),
  pumpGreen: new THREE.MeshStandardMaterial({ color: 0x1a4030, metalness: 0.35, roughness: 0.55 }),
  copper: new THREE.MeshStandardMaterial({ color: 0xb87333, metalness: 0.7, roughness: 0.35 }),
  truss: new THREE.MeshStandardMaterial({ color: 0x1e4d8c, metalness: 0.45, roughness: 0.5 }),
  coal: new THREE.MeshStandardMaterial({ color: 0x3a4450, roughness: 0.9 }),
};

function addBox(g, w, h, d, material, x, y, z) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
  m.position.set(x, y, z);
  m.castShadow = true;
  m.receiveShadow = true;
  g.add(m);
  return m;
}

function addCyl(g, rt, rb, h, material, x, y, z, segments = 18) {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, segments), material);
  m.position.set(x, y, z);
  m.castShadow = true;
  m.receiveShadow = true;
  g.add(m);
  return m;
}

function addBeam(g, a, b, thickness = 0.28, material = M.metal) {
  const p0 = new THREE.Vector3(...a);
  const p1 = new THREE.Vector3(...b);
  const m = new THREE.Mesh(new THREE.BoxGeometry(thickness, thickness, p0.distanceTo(p1)), material);
  m.position.copy(p0).add(p1).multiplyScalar(0.5);
  m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), p1.clone().sub(p0).normalize());
  m.castShadow = true;
  g.add(m);
  return m;
}

function addPlatform(g, w, d, x, y, z) {
  addBox(g, w, 0.3, d, M.metalDark, x, y, z);
  const rail = new THREE.MeshStandardMaterial({ color: 0xd6a914, metalness: 0.35, roughness: 0.55 });
  addBeam(g, [x - w / 2, y + 1, z - d / 2], [x + w / 2, y + 1, z - d / 2], 0.12, rail);
  addBeam(g, [x - w / 2, y + 1, z + d / 2], [x + w / 2, y + 1, z + d / 2], 0.12, rail);
}

function buildChimney() {
  const g = new THREE.Group();
  const bands = 12;
  const bandH = 52 / bands;
  for (let i = 0; i < bands; i++) {
    const t0 = i / bands;
    const t1 = (i + 1) / bands;
    const r0 = 4.2 + (5.2 - 4.2) * t0;
    const r1 = 4.2 + (5.2 - 4.2) * t1;
    const band = new THREE.Mesh(
      new THREE.CylinderGeometry(r1, r0, bandH, 32),
      i % 2 ? M.red : M.white
    );
    band.position.y = i * bandH + bandH / 2;
    band.castShadow = true;
    g.add(band);
  }
  const cap = new THREE.Mesh(new THREE.CylinderGeometry(4.8, 4.2, 2.5, 24), M.metalDark);
  cap.position.y = 53;
  g.add(cap);
  const ladder = new THREE.Mesh(new THREE.BoxGeometry(0.15, 48, 0.15), M.metal);
  ladder.position.set(5.2, 24, 0);
  g.add(ladder);
  return g;
}

function buildEsp() {
  const g = new THREE.Group();
  for (let field = 0; field < 4; field++) {
    const x = -12 + field * 8;
    addBox(g, 7, 13, 16, field % 2 ? M.concrete : M.white, x, 16, 0);
    addBox(g, 5, 1.4, 4, M.metalDark, x, 23.4, 0);
    for (let z = -1; z <= 1; z += 2) {
      const hop = new THREE.Mesh(new THREE.ConeGeometry(3.2, 7, 4), M.concrete);
      hop.position.set(x, 6.2, z * 4);
      hop.rotation.y = Math.PI / 4;
      hop.castShadow = true;
      g.add(hop);
      addCyl(g, 0.6, 0.8, 2.2, M.metalDark, x, 1.7, z * 4, 10);
    }
  }
  addPlatform(g, 34, 18, 0, 24.8, 0);
  for (let x = -16; x <= 16; x += 8) {
    addBox(g, 0.4, 24, 0.4, M.metal, x, 12, -9);
    addBox(g, 0.4, 24, 0.4, M.metal, x, 12, 9);
  }
  return g;
}

function buildFgd() {
  const g = new THREE.Group();
  addCyl(g, 7, 7.5, 28, M.metal, 0, 14, 0, 32);
  const dome = new THREE.Mesh(new THREE.SphereGeometry(7.05, 32, 14, 0, Math.PI * 2, 0, Math.PI / 2), M.metalDark);
  dome.position.y = 28;
  dome.castShadow = true;
  g.add(dome);
  for (let i = 0; i < 7; i++) {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(7.15, 0.16, 8, 40), M.safety || M.copper);
    ring.rotation.x = Math.PI / 2;
    ring.position.y = 4 + i * 4;
    g.add(ring);
  }
  addCyl(g, 3.6, 3.8, 7, M.pumpBlue, 11, 3.5, 4, 20);
  addCyl(g, 3.6, 3.8, 7, M.pumpBlue, 11, 3.5, -5, 20);
  addBox(g, 12, 7, 8, M.concrete, -13, 3.5, 0);
  for (let y = 6; y <= 26; y += 5) addPlatform(g, 16, 2, 0, y, -7.5);
  return g;
}

function buildBoiler() {
  const g = new THREE.Group();
  addBox(g, 22, 38, 18, M.metalDark, 0, 19, 0);
  addBox(g, 28, 15, 22, M.concrete, 0, 45, 0);
  addBox(g, 31, 7, 24, M.metal, 0, 56, 0);
  addBox(g, 33, 1.2, 26, M.metalDark, 0, 60, 0);
  const drum = new THREE.Mesh(new THREE.CylinderGeometry(4, 4, 15, 28), M.metal);
  drum.rotation.z = Math.PI / 2;
  drum.position.set(0, 54, 0);
  drum.castShadow = true;
  g.add(drum);
  for (let i = 0; i < 8; i++) {
    const tube = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.25, 28, 8), M.metal);
    tube.position.set(-7 + i * 2, 24, 8.5);
    g.add(tube);
  }
  const furnace = new THREE.Mesh(
    new THREE.BoxGeometry(12, 10, 10),
    new THREE.MeshStandardMaterial({ color: 0xff5c1a, emissive: 0xff3a00, emissiveIntensity: 0.6 })
  );
  furnace.position.set(0, 10, 4.4);
  furnace.name = 'furnaceGlow';
  g.add(furnace);

  for (let y = 12; y <= 58; y += 9) addPlatform(g, 30, 2.4, 0, y, -10.5);
  for (let x = -14; x <= 14; x += 7) {
    addBox(g, 0.45, 59, 0.45, M.metal, x, 29.5, -11.5);
    addBox(g, 0.45, 59, 0.45, M.metal, x, 29.5, 11.5);
  }
  for (let i = 0; i < 4; i++) {
    const x = -10.5 + i * 7;
    const hopper = new THREE.Mesh(new THREE.ConeGeometry(3.2, 9, 4), M.concrete);
    hopper.rotation.y = Math.PI / 4;
    hopper.position.set(x, 21, -14);
    g.add(hopper);
  }
  return g;
}

function buildTurbineHall() {
  const g = new THREE.Group();
  const specs = [
    { r: 3.5, w: 5.5, x: 0 },
    { r: 4.2, w: 6.5, x: 7 },
    { r: 5.5, w: 9, x: 15 },
  ];
  specs.forEach((s) => {
    const m = new THREE.Mesh(new THREE.CylinderGeometry(s.r, s.r * 1.05, s.w, 28), M.metal);
    m.rotation.z = Math.PI / 2;
    m.position.set(s.x, 0, 0);
    m.name = 'spinner';
    g.add(m);
  });
  const gen = new THREE.Mesh(new THREE.CylinderGeometry(5, 5, 11, 32), M.metalDark);
  gen.rotation.z = Math.PI / 2;
  gen.position.set(28, 0, 0);
  g.add(gen);
  const windings = new THREE.Mesh(new THREE.TorusGeometry(3.5, 0.4, 12, 32), M.copper);
  windings.rotation.y = Math.PI / 2;
  windings.position.set(28, 0, 0);
  windings.name = 'spinnerX';
  g.add(windings);
  const base = new THREE.Mesh(new THREE.BoxGeometry(42, 2, 10), M.metalDark);
  base.position.y = -4;
  g.add(base);
  addPlatform(g, 47, 15, 14, -2.7, 0);
  for (let x = -5; x <= 38; x += 7) {
    addBox(g, 0.4, 14, 0.4, M.truss, x, 3, -8);
    addBox(g, 0.4, 14, 0.4, M.truss, x, 3, 8);
  }
  addBeam(g, [-5, 10, -8], [42, 10, -8], 0.42, M.truss);
  addBeam(g, [-5, 10, 8], [42, 10, 8], 0.42, M.truss);
  addBox(g, 1, 1, 18, new THREE.MeshStandardMaterial({ color: 0xe5b827 }), 15, 11, 0);
  return g;
}

function buildPumpUnit() {
  const g = new THREE.Group();
  const motor = new THREE.Mesh(new THREE.CylinderGeometry(1.6, 1.6, 5, 20), M.pumpBlue);
  motor.position.y = 7;
  g.add(motor);
  const jb = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.8, 0.6), M.metalDark);
  jb.position.set(1.8, 7, 0);
  g.add(jb);
  const pump = new THREE.Mesh(new THREE.CylinderGeometry(1.8, 2, 5.5, 20), M.pumpGreen);
  pump.position.y = 2.5;
  pump.name = 'spinner';
  g.add(pump);
  const base = new THREE.Mesh(new THREE.CylinderGeometry(2.2, 2.4, 0.8, 16), M.metalDark);
  base.position.y = -0.5;
  g.add(base);
  return g;
}

function buildPumpHouse() {
  const g = new THREE.Group();
  for (let i = 0; i < 5; i++) {
    const unit = buildPumpUnit();
    unit.position.set(i * 5.2, 0, 0);
    g.add(unit);
  }
  for (let i = 0; i < 6; i++) {
    const beam = new THREE.Mesh(new THREE.BoxGeometry(26, 0.35, 0.35), M.truss);
    beam.position.set(10, 12 + i * 0.1, -2);
    beam.rotation.z = 0.2;
    g.add(beam);
    const col = new THREE.Mesh(new THREE.BoxGeometry(0.3, 12, 0.3), M.truss);
    col.position.set(i * 5, 6, -3);
    g.add(col);
  }
  const roof = new THREE.Mesh(new THREE.BoxGeometry(28, 0.4, 8), M.truss);
  roof.position.set(10, 13, 0);
  g.add(roof);
  const crane = new THREE.Mesh(new THREE.BoxGeometry(8, 0.5, 0.5), new THREE.MeshStandardMaterial({ color: 0xfbbf24 }));
  crane.position.set(18, 14, 0);
  g.add(crane);
  return g;
}

function buildCoolingTower() {
  const g = new THREE.Group();
  const points = [];
  for (let i = 0; i <= 32; i++) {
    const t = i / 32;
    const y = t * 28;
    const r = 2.5 + Math.sin(t * Math.PI) * 6 + t * 2.5;
    points.push(new THREE.Vector2(r, y));
  }
  const mesh = new THREE.Mesh(new THREE.LatheGeometry(points, 48), M.concrete);
  g.add(mesh);
  const rim = new THREE.Mesh(new THREE.TorusGeometry(8, 0.4, 8, 48), M.metal);
  rim.rotation.x = Math.PI / 2;
  rim.position.y = 28;
  g.add(rim);
  return g;
}

function buildCoalYard() {
  const g = new THREE.Group();
  for (let i = 0; i < 4; i++) {
    const pile = new THREE.Mesh(new THREE.ConeGeometry(8 + i % 2, 6 + i % 3, 20), M.coal);
    pile.position.set(-14 + i * 9, 3.5, -3 + (i % 2) * 6);
    pile.scale.z = 0.7;
    g.add(pile);
  }
  const conveyor = addBox(g, 40, 0.9, 1.3, M.truss, 8, 11, 0);
  conveyor.rotation.z = -0.44;
  addBox(g, 20, 1, 1.4, M.truss, 15, 15, 0);
  addCyl(g, 2, 2, 3, M.metalDark, -4, 2, 0, 16);
  for (let i = 0; i < 10; i++) {
    addBox(g, 0.25, 7, 0.25, M.truss, -7 + i * 4, 4.5, 0);
  }
  return g;
}

function buildSwitchyard() {
  const g = new THREE.Group();
  for (let row = 0; row < 3; row++) {
    for (let bay = 0; bay < 5; bay++) {
      const x = -16 + bay * 8;
      const z = -10 + row * 10;
      [-1.5, 1.5].forEach((ox) => {
        addCyl(g, 0.3, 0.4, 5, row % 2 ? M.red : M.white, x + ox, 2.5, z, 10);
      });
      addBox(g, 5, 0.8, 2.2, M.metalDark, x, 0.7, z + 3);
    }
    addBeam(g, [-20, 7, -10 + row * 10], [20, 7, -10 + row * 10], 0.22, M.copper);
  }
  [-20, 0, 20].forEach((x) => {
    addBox(g, 0.4, 15, 0.4, M.metal, x, 7.5, -14);
    addBox(g, 0.4, 15, 0.4, M.metal, x, 7.5, 14);
    addBeam(g, [x, 15, -14], [x, 15, 14], 0.35, M.metal);
  });
  return g;
}

function buildCondenser() {
  const g = new THREE.Group();
  addBox(g, 18, 7, 12, M.metal, 0, 3.5, 0);
  addBox(g, 20, 1, 14, M.metalDark, 0, 7.5, 0);
  addCyl(g, 4.5, 5.5, 7, M.concrete, -5, 11, 0, 24);
  addCyl(g, 4.5, 5.5, 7, M.concrete, 5, 11, 0, 24);
  for (let i = 0; i < 12; i++) {
    const tube = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 14, 6), M.metalDark);
    tube.rotation.z = Math.PI / 2;
    tube.position.set(0, 2 + (i % 4) * 0.8, -4 + Math.floor(i / 4) * 4);
    g.add(tube);
  }
  return g;
}

export const MODELS = {
  chimney: buildChimney,
  esp: buildEsp,
  fgd: buildFgd,
  boiler: buildBoiler,
  turbine_hall: buildTurbineHall,
  pump_house: buildPumpHouse,
  cooling_tower: buildCoolingTower,
  coal_yard: buildCoalYard,
  switchyard: buildSwitchyard,
  condenser: buildCondenser,
};
