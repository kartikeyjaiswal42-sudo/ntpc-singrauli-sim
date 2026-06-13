import * as THREE from 'three';

function surfaceTexture(base, line, stain, { panels = 16, repeatX = 3, repeatY = 4 } = {}) {
  const c = document.createElement('canvas');
  c.width = c.height = 256;
  const ctx = c.getContext('2d');
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, 256, 256);
  ctx.strokeStyle = line;
  ctx.lineWidth = 2;
  for (let x = 0; x <= 256; x += 256 / panels) {
    ctx.globalAlpha = 0.32;
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, 256);
    ctx.stroke();
  }
  for (let i = 0; i < 220; i++) {
    const x = Math.random() * 256;
    const y = Math.random() * 256;
    const h = 3 + Math.random() * 28;
    ctx.globalAlpha = 0.025 + Math.random() * 0.06;
    ctx.fillStyle = stain;
    ctx.fillRect(x, y, 1 + Math.random() * 3, h);
  }
  ctx.globalAlpha = 1;
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(repeatX, repeatY);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

const cladTexture = surfaceTexture('#aeb1ad', '#707a7d', '#4f514d', { panels: 20, repeatX: 3, repeatY: 5 });
const concreteTexture = surfaceTexture('#a9aaa4', '#8f918c', '#565b56', { panels: 8, repeatX: 2, repeatY: 3 });

const M = {
  steel: new THREE.MeshStandardMaterial({ color: 0x6f7b84, metalness: 0.62, roughness: 0.48 }),
  steelDark: new THREE.MeshStandardMaterial({ color: 0x39454d, metalness: 0.56, roughness: 0.54 }),
  galvanized: new THREE.MeshStandardMaterial({ color: 0xaab4b8, metalness: 0.44, roughness: 0.58 }),
  cladding: new THREE.MeshStandardMaterial({ color: 0xb8b9b4, map: cladTexture, metalness: 0.18, roughness: 0.78 }),
  claddingDark: new THREE.MeshStandardMaterial({ color: 0x858b8c, map: cladTexture, metalness: 0.22, roughness: 0.74 }),
  concrete: new THREE.MeshStandardMaterial({ color: 0x9e9f98, map: concreteTexture, metalness: 0.02, roughness: 0.9 }),
  concreteLight: new THREE.MeshStandardMaterial({ color: 0xc6c6bd, map: concreteTexture, metalness: 0.02, roughness: 0.88 }),
  rust: new THREE.MeshStandardMaterial({ color: 0x8f5139, metalness: 0.24, roughness: 0.82 }),
  safety: new THREE.MeshStandardMaterial({ color: 0xe2b51c, metalness: 0.24, roughness: 0.62 }),
  glass: new THREE.MeshStandardMaterial({ color: 0x476b7d, metalness: 0.15, roughness: 0.22, transparent: true, opacity: 0.78 }),
  road: new THREE.MeshStandardMaterial({ color: 0x3d4244, metalness: 0, roughness: 0.98 }),
  coal: new THREE.MeshStandardMaterial({ color: 0x20252a, metalness: 0.02, roughness: 0.98 }),
  ceramic: new THREE.MeshStandardMaterial({ color: 0xe5d7c2, metalness: 0.02, roughness: 0.58 }),
  ceramicRed: new THREE.MeshStandardMaterial({ color: 0x9d4b3f, metalness: 0.02, roughness: 0.62 }),
  copper: new THREE.MeshStandardMaterial({ color: 0x8b5c38, metalness: 0.68, roughness: 0.4 }),
  vegetation: new THREE.MeshStandardMaterial({ color: 0x3e702f, metalness: 0, roughness: 0.94 }),
  vegetationLight: new THREE.MeshStandardMaterial({ color: 0x628b42, metalness: 0, roughness: 0.94 }),
  trunk: new THREE.MeshStandardMaterial({ color: 0x70513a, metalness: 0, roughness: 0.96 }),
  white: new THREE.MeshStandardMaterial({ color: 0xe6e7e2, metalness: 0.04, roughness: 0.78 }),
  blue: new THREE.MeshStandardMaterial({ color: 0x2774a8, metalness: 0.24, roughness: 0.64 }),
  red: new THREE.MeshStandardMaterial({ color: 0xb84235, metalness: 0.18, roughness: 0.7 }),
  water: new THREE.MeshStandardMaterial({
    color: 0x2f7da5, metalness: 0.35, roughness: 0.12, transparent: true, opacity: 0.88,
  }),
};

function mesh(geometry, material, x = 0, y = 0, z = 0) {
  const m = new THREE.Mesh(geometry, material);
  m.position.set(x, y, z);
  m.castShadow = false;
  m.receiveShadow = true;
  return m;
}

function box(g, w, h, d, material, x, y, z) {
  const m = mesh(new THREE.BoxGeometry(w, h, d), material, x, y, z);
  m.castShadow = w * h * d > 45;
  g.add(m);
  return m;
}

function cyl(g, rTop, rBot, h, material, x, y, z, segments = 16) {
  const m = mesh(new THREE.CylinderGeometry(rTop, rBot, h, segments), material, x, y, z);
  m.castShadow = Math.max(rTop, rBot) * h > 14;
  g.add(m);
  return m;
}

function beamBetween(g, a, b, thickness = 0.35, material = M.steel) {
  const start = new THREE.Vector3(...a);
  const end = new THREE.Vector3(...b);
  const mid = start.clone().add(end).multiplyScalar(0.5);
  const length = start.distanceTo(end);
  const m = mesh(new THREE.BoxGeometry(thickness, thickness, length), material, mid.x, mid.y, mid.z);
  m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), end.clone().sub(start).normalize());
  g.add(m);
  return m;
}

function platform(g, w, d, x, y, z, rail = true) {
  box(g, w, 0.35, d, M.steelDark, x, y, z);
  if (!rail) return;
  const ry = y + 1.05;
  const posts = Math.max(2, Math.round(w / 5));
  for (let i = 0; i <= posts; i++) {
    const px = x - w / 2 + (i / posts) * w;
    beamBetween(g, [px, y + 0.2, z - d / 2], [px, ry, z - d / 2], 0.13, M.safety);
    beamBetween(g, [px, y + 0.2, z + d / 2], [px, ry, z + d / 2], 0.13, M.safety);
  }
  beamBetween(g, [x - w / 2, ry, z - d / 2], [x + w / 2, ry, z - d / 2], 0.13, M.safety);
  beamBetween(g, [x - w / 2, ry, z + d / 2], [x + w / 2, ry, z + d / 2], 0.13, M.safety);
}

function stairFlight(g, x0, y0, z0, x1, y1, z1, width = 2.2) {
  const steps = Math.max(4, Math.round(Math.abs(y1 - y0) * 1.4));
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    box(g, width, 0.14, 0.55, M.steelDark,
      THREE.MathUtils.lerp(x0, x1, t), THREE.MathUtils.lerp(y0, y1, t), THREE.MathUtils.lerp(z0, z1, t));
  }
  beamBetween(g, [x0 - width / 2, y0 + 0.9, z0], [x1 - width / 2, y1 + 0.9, z1], 0.13, M.safety);
  beamBetween(g, [x0 + width / 2, y0 + 0.9, z0], [x1 + width / 2, y1 + 0.9, z1], 0.13, M.safety);
}

function makeStairTower(x, z, height = 56) {
  const g = new THREE.Group();
  const w = 6;
  const levels = Math.floor(height / 7);
  [-w / 2, w / 2].forEach((ox) => [-w / 2, w / 2].forEach((oz) => {
    box(g, 0.35, height, 0.35, M.steel, ox, height / 2, oz);
  }));
  for (let i = 1; i <= levels; i++) {
    const y = i * 7;
    platform(g, w + 0.5, w + 0.5, 0, y, 0, true);
    if (i < levels) {
      const dir = i % 2 ? 1 : -1;
      stairFlight(g, -2 * dir, y + 0.3, -1.6, 2 * dir, y + 6.7, 1.6, 1.5);
    }
  }
  g.position.set(x, 0, z);
  return g;
}

function makeBoilerDetail() {
  const g = new THREE.Group();
  g.name = 'boiler-detail';

  // Stage-II boiler silhouette: exposed lower hopper steel, clad upper pressure parts.
  box(g, 34, 18, 30, M.cladding, 0, 47, -20);
  box(g, 40, 10, 34, M.claddingDark, 0, 61, -20);
  box(g, 42, 1.4, 36, M.steelDark, 0, 66.5, -20);
  box(g, 38, 5, 32, M.cladding, 0, 69.5, -20);

  // Weathered cladding strips and dark ventilation band.
  for (let i = 0; i < 10; i++) {
    const mat = i % 3 === 0 ? M.claddingDark : M.galvanized;
    box(g, 3.1, 17.2, 0.18, mat, -15.3 + i * 3.4, 47, -4.9);
  }
  box(g, 34.5, 2.4, 0.35, M.glass, 0, 55, -4.75);

  // Four ash hoppers and their X-braced support bays, based on the actual facade.
  for (let i = 0; i < 4; i++) {
    const x = -12.6 + i * 8.4;
    const hopper = mesh(new THREE.ConeGeometry(4.2, 13, 4), M.galvanized, x, 25, -37);
    hopper.rotation.y = Math.PI / 4;
    g.add(hopper);
    cyl(g, 0.8, 1.1, 5, M.rust, x, 16.5, -37, 10);
    box(g, 0.45, 27, 0.45, M.steel, x - 4, 22, -41);
    box(g, 0.45, 27, 0.45, M.steel, x + 4, 22, -41);
    beamBetween(g, [x - 4, 10, -41], [x + 4, 32, -41], 0.32, M.steel);
    beamBetween(g, [x + 4, 10, -41], [x - 4, 32, -41], 0.32, M.steel);
  }

  [13, 27, 40, 55, 66].forEach((y, i) => platform(g, 43 + (i > 3 ? -3 : 0), 3, 0, y, -38.5, true));
  g.add(makeStairTower(-23, -35, 63));

  // Roof vents and penthouse service ducts.
  for (let i = 0; i < 5; i++) {
    cyl(g, 1.4, 1.7, 6, M.steelDark, -12 + i * 6, 76, -20, 16);
    cyl(g, 2.2, 2.2, 0.5, M.galvanized, -12 + i * 6, 79, -20, 16);
  }

  // Primary-air and pulverized-fuel pipe clusters at the boiler corners.
  for (let side = -1; side <= 1; side += 2) {
    for (let i = 0; i < 4; i++) {
      const x = side * (13 + i * 0.7);
      beamBetween(g, [x, 6, -8], [x, 34 + i * 2, -8], 0.75, M.rust);
      beamBetween(g, [x, 34 + i * 2, -8], [side * 9, 38 + i * 2, -15], 0.75, M.rust);
    }
  }
  return g;
}

function makeTurbineHallDetail() {
  const g = new THREE.Group();
  g.name = 'turbine-hall-detail';
  const x = 122;
  const z = -15;

  box(g, 84, 2.4, 38, M.concrete, x, 1.2, z);
  box(g, 84, 6, 1.3, M.concreteLight, x, 5, z - 19);
  box(g, 84, 6, 1.3, M.concreteLight, x, 5, z + 19);

  // Tall steel columns, glazed clerestory, open-sided cutaway view.
  for (let i = 0; i <= 8; i++) {
    const px = x - 42 + i * 10.5;
    [-19, 19].forEach((pz) => {
      box(g, 0.65, 28, 0.65, M.steelDark, px, 14, z + pz);
      box(g, 9.5, 4, 0.28, M.glass, px, 21, z + pz);
    });
    if (i < 8) {
      beamBetween(g, [px, 27, z - 19], [px + 5.25, 32, z], 0.42, M.steel);
      beamBetween(g, [px + 5.25, 32, z], [px + 10.5, 27, z + 19], 0.42, M.steel);
    }
  }
  beamBetween(g, [x - 42, 27, z - 19], [x + 42, 27, z - 19], 0.6, M.steelDark);
  beamBetween(g, [x - 42, 27, z + 19], [x + 42, 27, z + 19], 0.6, M.steelDark);
  beamBetween(g, [x - 42, 32, z], [x + 42, 32, z], 0.6, M.steelDark);

  // Roof panels leave a central cutaway strip.
  for (let i = 0; i < 8; i++) {
    const px = x - 36.5 + i * 10.5;
    const left = box(g, 9.8, 0.4, 10, M.cladding, px, 29.2, z - 11.8);
    left.rotation.x = -0.25;
    const right = box(g, 9.8, 0.4, 10, M.cladding, px, 29.2, z + 11.8);
    right.rotation.x = 0.25;
  }

  // Operating floor, handrails and overhead travelling crane.
  platform(g, 72, 22, x, 8.5, z, true);
  box(g, 76, 1.1, 1.2, M.safety, x, 24, z - 12);
  box(g, 76, 1.1, 1.2, M.safety, x, 24, z + 12);
  box(g, 1.2, 1.2, 25, M.safety, x + 18, 24.8, z);
  beamBetween(g, [x + 18, 24, z], [x + 18, 15, z], 0.28, M.steelDark);
  return g;
}

function makeFlueGasDetail() {
  const g = new THREE.Group();
  g.name = 'flue-gas-detail';

  // Twin rectangular ducts on heavy A-frame supports.
  const duct = (a, b, width = 6, height = 6) => {
    const start = new THREE.Vector3(...a);
    const end = new THREE.Vector3(...b);
    const mid = start.clone().add(end).multiplyScalar(0.5);
    const len = start.distanceTo(end);
    const m = mesh(new THREE.BoxGeometry(width, height, len), M.claddingDark, mid.x, mid.y, mid.z);
    m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), end.clone().sub(start).normalize());
    g.add(m);
  };
  duct([-8, 24, -52], [-20, 21, -126], 7, 7);
  duct([8, 24, -52], [-6, 21, -126], 7, 7);
  duct([-22, 18, -150], [42, 18, -160], 7, 7);
  duct([45, 20, -160], [103, 26, -205], 6, 6);

  for (let z = -65; z >= -145; z -= 16) {
    [-14, 2].forEach((x) => {
      box(g, 0.7, 20, 0.7, M.steel, x - 4, 10, z);
      box(g, 0.7, 20, 0.7, M.steel, x + 4, 10, z);
      beamBetween(g, [x - 4, 2, z], [x + 4, 18, z], 0.42, M.steel);
      beamBetween(g, [x + 4, 2, z], [x - 4, 18, z], 0.42, M.steel);
    });
  }

  // ESP fields: four deep modules, roof transformer-rectifiers, hopper grid.
  for (let i = 0; i < 4; i++) {
    const x = -42 + i * 11;
    box(g, 9.5, 16, 24, M.cladding, x, 20, -145);
    box(g, 8, 1.8, 5, M.steelDark, x, 29, -145);
    for (let h = -1; h <= 1; h += 2) {
      const hop = mesh(new THREE.ConeGeometry(4, 7, 4), M.galvanized, x, 8.5, -145 + h * 6);
      hop.rotation.y = Math.PI / 4;
      g.add(hop);
    }
  }
  platform(g, 48, 27, -25.5, 30.5, -145, true);
  g.add(makeStairTower(-51, -135, 29));

  // FGD absorber ancillaries: oxidation tank, booster fan and pipework.
  cyl(g, 7, 7.4, 12, M.cladding, 65, 6, -146, 32);
  cyl(g, 7.2, 7.2, 0.6, M.steelDark, 65, 12.2, -146, 32);
  cyl(g, 5, 5, 7, M.blue, 72, 3.5, -174, 24);
  cyl(g, 5, 5, 7, M.blue, 86, 3.5, -174, 24);
  for (let y = 7; y <= 25; y += 5) {
    const ring = mesh(new THREE.TorusGeometry(7.2, 0.18, 8, 36), M.safety, 45, y, -160);
    ring.rotation.x = Math.PI / 2;
    g.add(ring);
  }
  return g;
}

function makeCoolingTower(x, z) {
  const g = new THREE.Group();
  const points = [];
  for (let i = 0; i <= 32; i++) {
    const t = i / 32;
    const y = 3 + t * 56;
    const r = 10.5 + 9 * Math.pow(Math.abs(t - 0.62), 1.6);
    points.push(new THREE.Vector2(r, y));
  }
  const shell = mesh(
    new THREE.LatheGeometry(points, 56),
    new THREE.MeshStandardMaterial({
      color: 0xaeb7b6, metalness: 0.02, roughness: 0.9, side: THREE.DoubleSide,
    }),
  );
  g.add(shell);
  const basin = cyl(g, 22, 22, 2, M.concrete, 0, 1, 0, 48);
  basin.receiveShadow = true;
  for (let i = 0; i < 20; i++) {
    const a = (i / 20) * Math.PI * 2;
    const b = ((i + 1) / 20) * Math.PI * 2;
    beamBetween(g, [Math.cos(a) * 19, 2, Math.sin(a) * 19], [Math.cos(b) * 15, 8, Math.sin(b) * 15], 0.55, M.concreteLight);
  }
  const rim = mesh(new THREE.TorusGeometry(13.6, 0.65, 10, 56), M.concreteLight, 0, 59, 0);
  rim.rotation.x = Math.PI / 2;
  g.add(rim);
  g.position.set(x, 0, z);
  return g;
}

function makeSwitchyardDetail() {
  const g = new THREE.Group();
  g.name = 'switchyard-detail';
  const x0 = 225;
  const z0 = -80;

  box(g, 115, 0.35, 82, M.concrete, x0 + 25, 0.2, z0 - 15);
  for (let row = 0; row < 4; row++) {
    const z = z0 - 42 + row * 20;
    for (let bay = 0; bay < 6; bay++) {
      const x = x0 - 18 + bay * 17;
      for (let p = -1; p <= 1; p++) {
        cyl(g, 0.34, 0.42, 5.4, row % 2 ? M.ceramicRed : M.ceramic, x + p * 2.2, 3, z, 12);
        cyl(g, 0.7, 0.7, 0.3, M.steelDark, x + p * 2.2, 5.8, z, 10);
      }
      box(g, 5.5, 1.1, 2.2, M.steelDark, x, 1, z + 4.5);
      beamBetween(g, [x - 2.2, 5.8, z], [x + 2.2, 5.8, z], 0.18, M.copper);
    }
    beamBetween(g, [x0 - 22, 7.3, z], [x0 + 74, 7.3, z], 0.24, M.copper);
  }

  // Gantries framing each bus section.
  for (let i = 0; i < 7; i++) {
    const x = x0 - 22 + i * 16;
    box(g, 0.45, 15, 0.45, M.steel, x, 7.5, z0 - 50);
    box(g, 0.45, 15, 0.45, M.steel, x, 7.5, z0 + 18);
    beamBetween(g, [x, 15, z0 - 50], [x, 15, z0 + 18], 0.38, M.steel);
  }
  return g;
}

function makePylon(x, z, scale = 1) {
  const g = new THREE.Group();
  const h = 42 * scale;
  const half = 6 * scale;
  const top = 1.5 * scale;
  [[-half, -half], [half, -half], [-half, half], [half, half]].forEach(([bx, bz]) => {
    beamBetween(g, [bx, 0, bz], [Math.sign(bx) * top, h, Math.sign(bz) * top], 0.45 * scale, M.steel);
  });
  for (let y = 8; y <= h; y += 8) {
    const t = y / h;
    const r = THREE.MathUtils.lerp(half, top, t);
    beamBetween(g, [-r, y, -r], [r, y, -r], 0.28 * scale, M.steel);
    beamBetween(g, [-r, y, r], [r, y, r], 0.28 * scale, M.steel);
    beamBetween(g, [-r, y, -r], [-r, y, r], 0.28 * scale, M.steel);
    beamBetween(g, [r, y, -r], [r, y, r], 0.28 * scale, M.steel);
  }
  [18, 28, 38].forEach((y, i) => {
    const arm = (10 - i * 1.3) * scale;
    beamBetween(g, [-arm, y * scale, 0], [arm, y * scale, 0], 0.4 * scale, M.steel);
  });
  g.position.set(x, 0, z);
  return g;
}

function wire(g, points, radius = 0.09, material = M.copper) {
  const curve = new THREE.CatmullRomCurve3(points.map((p) => new THREE.Vector3(...p)));
  const m = mesh(new THREE.TubeGeometry(curve, 32, radius, 6, false), material);
  m.castShadow = false;
  g.add(m);
  return m;
}

function makeTransmissionLines() {
  const g = new THREE.Group();
  const runs = [
    [[292, 25, -104], [325, 24, -105], [360, 20, -114], [390, 22, -125]],
    [[292, 30, -104], [325, 29, -105], [360, 25, -114], [390, 27, -125]],
    [[292, 35, -104], [325, 34, -105], [360, 30, -114], [390, 32, -125]],
  ];
  runs.forEach((run) => {
    wire(g, run, 0.11, M.copper);
    wire(g, run.map(([x, y, z]) => [x, y, z + 3]), 0.11, M.copper);
  });
  return g;
}

function makeFuelAndAshDetail() {
  const g = new THREE.Group();
  // Fly-ash silos with loading cones and access bridge.
  for (let i = 0; i < 3; i++) {
    const x = 10 + i * 10;
    cyl(g, 4.2, 4.2, 17, M.concreteLight, x, 10, 132, 24);
    const cone = mesh(new THREE.ConeGeometry(4.2, 7, 24), M.concreteLight, x, 21.5, 132);
    cone.rotation.x = Math.PI;
    g.add(cone);
    cyl(g, 0.65, 0.8, 5, M.steelDark, x, 27, 132, 10);
  }
  platform(g, 30, 3, 20, 29, 132, true);

  // Limestone preparation area for FGD.
  for (let i = 0; i < 4; i++) {
    cyl(g, 3.2, 3.2, 8, M.white, 78 + i * 8, 4, -182, 20);
    cyl(g, 3.4, 3.4, 0.5, M.steelDark, 78 + i * 8, 8.2, -182, 20);
  }
  return g;
}

function makeWaterTreatmentDetail(waters) {
  const g = new THREE.Group();
  g.name = 'water-treatment-detail';

  // Intake forebay with retaining walls, trash racks and pump deck.
  const forebay = box(g, 74, 1.2, 38, M.water, -210, 0.8, 175);
  waters.push(forebay);
  [-229, -210, -191].forEach((x) => {
    box(g, 1.2, 5, 42, M.concreteLight, x, 2.5, 175);
    for (let z = 158; z <= 192; z += 3) {
      beamBetween(g, [x - 0.8, 1, z], [x - 0.8, 5.5, z], 0.18, M.steelDark);
    }
  });
  box(g, 76, 1.2, 8, M.concrete, -210, 6.5, 156);
  for (let i = 0; i < 5; i++) {
    const x = -232 + i * 11;
    cyl(g, 1.4, 1.6, 7, M.blue, x, 10.5, 156, 18);
    cyl(g, 0.8, 1.2, 3, M.steelDark, x, 15.5, 156, 16);
  }
  for (let x = -240; x <= -180; x += 10) {
    box(g, 0.45, 15, 0.45, M.steel, x, 13, 153);
    box(g, 0.45, 15, 0.45, M.steel, x, 13, 159);
  }
  beamBetween(g, [-242, 20, 153], [-178, 20, 153], 0.45, M.safety);
  beamBetween(g, [-242, 20, 159], [-178, 20, 159], 0.45, M.safety);

  // DM plant process train: pressure filters, degasser tower, mixed-bed vessels.
  box(g, 52, 1, 32, M.concrete, -150, 0.55, 155);
  box(g, 48, 10, 14, M.cladding, -150, 5.5, 168);
  box(g, 50, 1, 16, M.steelDark, -150, 11, 168);
  for (let i = 0; i < 6; i++) {
    const x = -172 + i * 8.5;
    cyl(g, 2.2, 2.2, 9, i % 2 ? M.blue : M.white, x, 5, 148, 20);
    const dome = mesh(new THREE.SphereGeometry(2.2, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2),
      i % 2 ? M.blue : M.white, x, 9.5, 148);
    g.add(dome);
  }
  cyl(g, 4, 4.5, 15, M.galvanized, -177, 7.5, 168, 24);
  for (let y = 4; y <= 14; y += 4) {
    const ring = mesh(new THREE.TorusGeometry(4.2, 0.15, 8, 28), M.safety, -177, y, 168);
    ring.rotation.x = Math.PI / 2;
    g.add(ring);
  }
  // Horizontal deaerator and storage tanks.
  const dea = cyl(g, 3.8, 3.8, 24, M.galvanized, -100, 16, 140, 24);
  dea.rotation.z = Math.PI / 2;
  [-110, -90].forEach((x) => box(g, 2.2, 12, 2.2, M.concrete, x, 6, 140));
  for (let i = 0; i < 3; i++) cyl(g, 5, 5, 9, M.blue, -135 + i * 13, 4.5, 122, 24);

  // Service pipe rack tying forebay, DM and cycle make-up together.
  for (let x = -205; x <= -105; x += 12) {
    box(g, 0.4, 7, 0.4, M.steel, x, 3.5, 132);
    box(g, 0.4, 7, 0.4, M.steel, x, 3.5, 137);
  }
  wire(g, [[-210, 7, 133], [-165, 7, 133], [-105, 7, 133]], 0.35, M.blue);
  wire(g, [[-210, 8, 136], [-165, 8, 136], [-105, 8, 136]], 0.3, M.galvanized);
  return g;
}

function makeAshHandlingDetail() {
  const g = new THREE.Group();
  g.name = 'ash-handling-detail';

  // Bottom-ash dewatering and slurry handling.
  box(g, 48, 1.1, 30, M.concrete, -40, 0.6, 165);
  const basinA = cyl(g, 11, 11, 2.5, M.concreteLight, -53, 1.4, 165, 32);
  const waterA = cyl(g, 9.5, 9.5, 0.3, M.water, -53, 2.7, 165, 32);
  const basinB = cyl(g, 8, 8, 2.2, M.concreteLight, -27, 1.2, 165, 28);
  const waterB = cyl(g, 6.8, 6.8, 0.3, M.water, -27, 2.35, 165, 28);
  basinA.receiveShadow = basinB.receiveShadow = true;
  waterA.castShadow = waterB.castShadow = false;
  for (let i = 0; i < 4; i++) {
    cyl(g, 1.5, 1.7, 4.5, M.blue, -54 + i * 6, 3, 145, 16);
    cyl(g, 0.7, 1.1, 2.4, M.steelDark, -54 + i * 6, 6.4, 145, 14);
  }
  for (let x = -65; x <= 30; x += 10) {
    box(g, 0.38, 8, 0.38, M.steel, x, 4, 137);
    box(g, 0.38, 8, 0.38, M.steel, x, 4, 141);
  }
  wire(g, [[-65, 8, 138], [-20, 8, 138], [30, 9, 135]], 0.3, M.rust);
  wire(g, [[-65, 9, 141], [-20, 9, 141], [30, 10, 138]], 0.3, M.galvanized);

  // Loading bay beneath silos with a parked bulk tanker.
  const tanker = new THREE.Group();
  const tank = cyl(tanker, 1.7, 1.7, 8, M.white, 0, 2.6, 0, 18);
  tank.rotation.z = Math.PI / 2;
  box(tanker, 3, 2.6, 3, M.blue, 5.5, 2, 0);
  [-2.5, 2.2, 5.7].forEach((x) => [-1.5, 1.5].forEach((z) => {
    const wheel = cyl(tanker, 0.55, 0.55, 0.3, M.steelDark, x, 0.6, z, 10);
    wheel.rotation.x = Math.PI / 2;
  }));
  tanker.position.set(18, 0, 153);
  g.add(tanker);
  return g;
}

function makeCoalDetail() {
  const g = new THREE.Group();
  g.name = 'coal-yard-detail';
  for (let i = 0; i < 5; i++) {
    const pile = mesh(new THREE.ConeGeometry(10 + (i % 2) * 2, 6 + (i % 3), 24), M.coal, -245 + i * 18, 3.5, -58);
    pile.scale.z = 0.65;
    g.add(pile);
  }
  // Twin rail lines and a short MGR rake.
  for (let z = -128; z <= -120; z += 8) {
    beamBetween(g, [-300, 0.35, z - 1.2], [-135, 0.35, z - 1.2], 0.18, M.steelDark);
    beamBetween(g, [-300, 0.35, z + 1.2], [-135, 0.35, z + 1.2], 0.18, M.steelDark);
    for (let x = -298; x <= -137; x += 3) box(g, 2.9, 0.16, 0.25, M.rust, x, 0.2, z);
  }
  for (let i = 0; i < 7; i++) {
    const x = -280 + i * 13;
    const wagon = new THREE.Group();
    box(wagon, 11, 3.8, 5, M.rust, 0, 3, 0);
    const load = mesh(new THREE.ConeGeometry(3, 3.5, 4), M.coal, 0, 5, 0);
    load.rotation.y = Math.PI / 4;
    wagon.add(load);
    [-4, 4].forEach((wx) => [-2, 2].forEach((wz) => {
      const wheel = cyl(wagon, 0.7, 0.7, 0.35, M.steelDark, wx, 0.8, wz, 12);
      wheel.rotation.x = Math.PI / 2;
    }));
    wagon.position.set(x, 0, -124);
    g.add(wagon);
  }
  return g;
}

function makeTree(x, z, s = 1) {
  const g = new THREE.Group();
  cyl(g, 0.35 * s, 0.5 * s, 4.5 * s, M.trunk, 0, 2.25 * s, 0, 8);
  const crowns = [
    [0, 5.2, 0, 2.3], [-1.2, 4.8, 0.5, 1.8], [1.2, 5, -0.4, 1.9],
    [0.2, 6.3, 0.4, 1.8], [-0.5, 5.5, -1.1, 1.6],
  ];
  crowns.forEach(([cx, cy, cz, r], i) => {
    const c = mesh(new THREE.IcosahedronGeometry(r * s, 1), i % 2 ? M.vegetation : M.vegetationLight, cx * s, cy * s, cz * s);
    g.add(c);
  });
  g.position.set(x, 0, z);
  return g;
}

function makeTruck(color = M.blue) {
  const g = new THREE.Group();
  box(g, 7, 2.4, 3.2, M.white, 0, 2, 0);
  box(g, 2.6, 2.8, 3, color, 4.5, 2.2, 0);
  box(g, 1.8, 1, 3.05, M.glass, 5, 2.8, 0);
  [-2.4, 2.2, 4.9].forEach((x) => [-1.55, 1.55].forEach((z) => {
    const wheel = cyl(g, 0.62, 0.62, 0.38, M.steelDark, x, 0.65, z, 12);
    wheel.rotation.x = Math.PI / 2;
  }));
  return g;
}

function makePeople() {
  const g = new THREE.Group();
  const positions = [
    [-25, 71], [-22, 72], [-18, 70], [55, 68], [60, 70], [165, 71], [170, 69],
  ];
  positions.forEach(([x, z], i) => {
    const p = new THREE.Group();
    cyl(p, 0.18, 0.22, 1.3, i % 2 ? M.blue : M.white, 0, 1.1, 0, 8);
    const head = mesh(new THREE.SphereGeometry(0.25, 10, 8), M.ceramic, 0, 1.95, 0);
    const helmet = mesh(new THREE.SphereGeometry(0.28, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2), M.safety, 0, 2.08, 0);
    p.add(head, helmet);
    p.position.set(x, 0, z);
    g.add(p);
  });
  return g;
}

export function createIndustrialDetail({ waters = [] } = {}) {
  const group = new THREE.Group();
  group.name = 'industrial-detail-layer';
  const movers = [];

  group.add(
    makeBoilerDetail(),
    makeTurbineHallDetail(),
    makeFlueGasDetail(),
    makeSwitchyardDetail(),
    makeCoalDetail(),
    makePeople(),
    makePylon(325, -105, 1),
    makePylon(390, -125, 0.9),
    makeTransmissionLines(),
    makeFuelAndAshDetail(),
    makeWaterTreatmentDetail(waters),
    makeAshHandlingDetail(),
  );

  // Dense mature planting along the internal approach road, as on the real site.
  [
    [-70, 62, 1.1], [-52, 62, 1.25], [-34, 62, 1], [-16, 62, 1.2], [8, 62, 1.1],
    [35, 62, 1.3], [62, 62, 1.05], [92, 62, 1.2], [124, 62, 1.15], [156, 62, 1.25],
    [-72, 82, 1.15], [-42, 82, 1], [-10, 82, 1.2], [25, 82, 1], [62, 82, 1.15],
    [100, 82, 1.25], [138, 82, 1.05], [176, 82, 1.2], [-285, -92, 1.4], [-285, -42, 1.3],
  ].forEach(([x, z, s]) => group.add(makeTree(x, z, s)));

  const truckA = makeTruck(M.blue);
  truckA.position.set(-65, 0.2, 69);
  truckA.userData.route = { axis: 'x', min: -70, max: 165, speed: 8, dir: 1 };
  group.add(truckA);
  movers.push(truckA);

  const truckB = makeTruck(M.red);
  truckB.scale.setScalar(0.8);
  truckB.rotation.y = Math.PI;
  truckB.position.set(140, 0.2, 76);
  truckB.userData.route = { axis: 'x', min: -55, max: 155, speed: 5.5, dir: -1 };
  group.add(truckB);
  movers.push(truckB);

  // Decorative water basins for cooling tower detail layer.
  group.traverse((o) => {
    if (o.isMesh && o.geometry?.type === 'CylinderGeometry' && o.material === M.concrete) o.receiveShadow = true;
  });

  return { group, movers };
}
