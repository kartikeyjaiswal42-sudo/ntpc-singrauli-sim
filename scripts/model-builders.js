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
  const body = new THREE.Mesh(new THREE.BoxGeometry(22, 12, 14), M.concrete);
  body.position.y = 14;
  g.add(body);
  for (let i = 0; i < 4; i++) {
    const hop = new THREE.Mesh(new THREE.ConeGeometry(3, 6, 4), M.concrete);
    hop.position.set(-7.5 + i * 5, 6, 0);
    hop.rotation.y = Math.PI / 4;
    g.add(hop);
    const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 1.2, 2, 8), M.metalDark);
    neck.position.set(-7.5 + i * 5, 2.5, 0);
    g.add(neck);
  }
  const duct = new THREE.Mesh(new THREE.BoxGeometry(24, 2, 3), M.metal);
  duct.position.y = 1;
  g.add(duct);
  return g;
}

function buildFgd() {
  const g = new THREE.Group();
  const tower = new THREE.Mesh(new THREE.CylinderGeometry(5.5, 6, 20, 24), M.metal);
  tower.position.y = 10;
  g.add(tower);
  const dome = new THREE.Mesh(new THREE.SphereGeometry(5.8, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2), M.metalDark);
  dome.position.y = 20;
  g.add(dome);
  for (let i = 0; i < 5; i++) {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(5.2, 0.15, 8, 32), M.metalDark);
    ring.rotation.x = Math.PI / 2;
    ring.position.y = 4 + i * 3.5;
    g.add(ring);
  }
  return g;
}

function buildBoiler() {
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.BoxGeometry(18, 38, 14), M.metalDark);
  body.position.y = 19;
  body.castShadow = true;
  g.add(body);
  const drum = new THREE.Mesh(new THREE.CylinderGeometry(4, 4, 15, 28), M.metal);
  drum.rotation.z = Math.PI / 2;
  drum.position.set(0, 36, 0);
  g.add(drum);
  for (let i = 0; i < 8; i++) {
    const tube = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.25, 28, 8), M.metal);
    tube.position.set(-6 + i * 1.7, 22, 6.5);
    g.add(tube);
  }
  const furnace = new THREE.Mesh(
    new THREE.BoxGeometry(12, 10, 10),
    new THREE.MeshStandardMaterial({ color: 0xff5c1a, emissive: 0xff3a00, emissiveIntensity: 0.6 })
  );
  furnace.position.y = 8;
  furnace.name = 'furnaceGlow';
  g.add(furnace);
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
  const pile = new THREE.Mesh(new THREE.ConeGeometry(14, 7, 6), M.coal);
  pile.position.y = 3.5;
  g.add(pile);
  const conveyor = new THREE.Mesh(new THREE.BoxGeometry(32, 0.6, 0.6), M.truss);
  conveyor.position.set(8, 10, 0);
  conveyor.rotation.z = -0.65;
  g.add(conveyor);
  for (let i = 0; i < 10; i++) {
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.2, 4, 0.2), M.truss);
    leg.position.set(-2 + i * 3, 5, 0);
    leg.rotation.z = -0.65;
    g.add(leg);
  }
  return g;
}

function buildSwitchyard() {
  const g = new THREE.Group();
  const mkTower = (x) => {
    const t = new THREE.Group();
    [-2, 2].forEach((ox) => {
      const leg = new THREE.Mesh(new THREE.BoxGeometry(0.35, 18, 0.35), M.metal);
      leg.position.set(x + ox, 9, 0);
      t.add(leg);
    });
    const arm = new THREE.Mesh(new THREE.BoxGeometry(6, 0.3, 0.3), M.metal);
    arm.position.set(x, 17, 0);
    t.add(arm);
    g.add(t);
  };
  mkTower(-8);
  mkTower(0);
  mkTower(8);
  const gt = new THREE.Mesh(new THREE.BoxGeometry(5, 7, 6), M.metalDark);
  gt.position.set(-4, 3.5, 6);
  g.add(gt);
  return g;
}

function buildCondenser() {
  const g = new THREE.Group();
  const shell = new THREE.Mesh(new THREE.BoxGeometry(16, 6, 10), M.metal);
  shell.position.y = 3;
  g.add(shell);
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
