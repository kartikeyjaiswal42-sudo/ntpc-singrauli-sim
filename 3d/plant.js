import * as THREE from 'three';
import { CSS2DObject } from 'three/examples/jsm/renderers/CSS2DRenderer.js';

const COL = {
  coal: 0x2a2a30,
  steam: 0xff4466,
  reheat: 0xff88aa,
  feed: 0x38c8e8,
  cwHot: 0xe84828,
  cwCold: 0x2890e8,
  flue: 0x889098,
  power: 0xffcc00,
  h2: 0xaa88dd,
  lime: 0x66bb6a,
  ash: 0x8a8070,
  steel: 0x9aa8b4,
  concrete: 0xc8ccd0,
  gen: 0xd08020,
  water: 0x3a9ad4,
  grass: 0x5a9e48,
};

function mat(color, emissive = 0, ei = 0) {
  return new THREE.MeshStandardMaterial({
    color, metalness: 0.25, roughness: 0.65,
    emissive: emissive || color, emissiveIntensity: ei,
  });
}

function label(text, sub = '', hidden = true) {
  const el = document.createElement('div');
  el.className = `plant-label${hidden ? ' label-hidden' : ''}`;
  el.innerHTML = sub ? `<b>${text}</b><span>${sub}</span>` : `<b>${text}</b>`;
  return new CSS2DObject(el);
}

export const ZONE_PADS = [
  { id: 'z-fuel', label: 'COAL & CHP', x: -180, z: -80, w: 200, d: 140, color: 0x8d6e63 },
  { id: 'z-dm', label: 'WATER', x: -180, z: 130, w: 180, d: 100, color: 0x42a5f5 },
  { id: 'z-boiler', label: 'BOILER', x: 0, z: -30, w: 120, d: 100, color: 0x90a4ae },
  { id: 'z-turbine', label: 'TURBINE', x: 120, z: -20, w: 140, d: 90, color: 0x4db6ac },
  { id: 'z-cw', label: 'COOLING WATER', x: 175, z: 130, w: 180, d: 100, color: 0x29b6f6 },
  { id: 'z-env', label: 'EMISSIONS', x: 45, z: -150, w: 160, d: 90, color: 0x81c784 },
  { id: 'z-ash', label: 'ASH', x: -30, z: 155, w: 120, d: 80, color: 0xa1887f },
  { id: 'z-grid', label: 'GRID', x: 210, z: -70, w: 120, d: 90, color: 0xffb74d },
  { id: 'z-h2', label: 'AUX / H₂', x: 190, z: 85, w: 100, d: 70, color: 0xce93d8 },
];

function part(id, zone, mesh, lx = 0, ly = 0, lz = 0, lblText, lblSub) {
  const g = new THREE.Group();
  g.userData = { id, zone };
  g.add(mesh);
  if (lblText) {
    const l = label(lblText, lblSub || '');
    l.position.set(lx, ly, lz);
    g.add(l);
  }
  return g;
}

function box(w, h, d, color, id, zone, lbl, sub) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat(color));
  m.castShadow = true;
  m.receiveShadow = true;
  return part(id, zone, m, 0, h / 2 + 6, 0, lbl, sub);
}

function boxSilent(w, h, d, color, id, zone) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat(color));
  m.castShadow = true;
  const g = new THREE.Group();
  g.userData = { id, zone };
  g.add(m);
  return g;
}

function cyl(rt, rb, h, seg, color, id, zone, lbl, sub) {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg), mat(color));
  m.castShadow = true;
  return part(id, zone, m, 0, h / 2 + 5, 0, lbl, sub);
}

function pipe(points, radius, color, name) {
  const curve = new THREE.CatmullRomCurve3(points.map((p) => new THREE.Vector3(...p)));
  const geo = new THREE.TubeGeometry(curve, 48, radius, 10, false);
  const mesh = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({
    color, emissive: color, emissiveIntensity: 0.35,
    metalness: 0.15, roughness: 0.4,
  }));
  mesh.userData.pipe = name;
  return mesh;
}

/** NTPC Singrauli Stage-II — spaced 3D layout (metres, Y up) */
export function buildPlant() {
  const root = new THREE.Group();
  root.name = 'plant';
  const pickables = [];
  const spinners = [];
  const glows = [];

  const add = (g, x, y, z) => {
    g.position.set(x, y, z);
    root.add(g);
    pickables.push(g);
    g.traverse((o) => { if (o.isMesh) pickables.push(o); });
    if (g.userData?.id) positions[g.userData.id] = g;
    if (g.userData?.spin) spinners.push(g);
    return g;
  };

  const positions = {};

  /* ── Site base (NTPC Singrauli plant area) ── */
  const site = new THREE.Mesh(
    new THREE.PlaneGeometry(620, 520),
    mat(0x6b8f5a, 0x4a7040, 0.05),
  );
  site.rotation.x = -Math.PI / 2;
  site.receiveShadow = true;
  root.add(site);

  const pad = new THREE.Mesh(new THREE.PlaneGeometry(560, 420), mat(0x9aa090));
  pad.rotation.x = -Math.PI / 2;
  pad.position.y = 0.05;
  root.add(pad);

  const sign = label('NTPC SINGRAULI · STAGE-II · 500 MW', 'Singrauli · coal → grid', false);
  sign.position.set(0, 12, -280);
  root.add(sign);

  ZONE_PADS.forEach((zp) => {
    const pad = new THREE.Mesh(
      new THREE.PlaneGeometry(zp.w, zp.d),
      mat(zp.color, zp.color, 0.04),
    );
    pad.rotation.x = -Math.PI / 2;
    pad.position.set(zp.x, 0.12, zp.z);
    pad.receiveShadow = true;
    root.add(pad);
    const zl = label(zp.label, '', false);
    zl.element.classList.add('label-zone');
    zl.position.set(zp.x, 3, zp.z);
    root.add(zl);
  });

  /* ═══ COAL & CHP (far west) ═══ */
  add(box(140, 1, 4, 0x4a4038, 'c-mgr', 'z-fuel', 'MGR Railway', '22 km from Nigahi'), -240, 0.5, -120);
  add(box(14, 6, 20, COL.steel, 'c-hopper', 'z-fuel', 'Track hopper', 'Bottom discharge'), -195, 3, -95);
  add(box(28, 12, 22, COL.steel, 'c-chp', 'z-fuel', 'CHP', '2400 MTPH'), -165, 6, -70);
  add(box(18, 28, 14, COL.steel, 'c-bunker', 'z-fuel', 'Coal bunkers', 'Gravity feed'), -115, 14, -45);
  const mills = new THREE.Group();
  mills.userData = { id: 'c-mill', zone: 'z-fuel', spin: true };
  [-12, 0, 12].forEach((x) => {
    const m = new THREE.Mesh(new THREE.CylinderGeometry(3, 3, 8, 12), mat(COL.steel));
    m.position.set(x, 4, 0);
    mills.add(m);
    spinners.push(m);
  });
  const ml = label('XRP 1003 Mills', '×3 bowl mills');
  ml.position.set(0, 16, 0);
  mills.add(ml);
  add(mills, -95, 0, -20);

  /* ═══ BOILER (centre-north) ═══ */
  const boilerShell = box(22, 48, 18, COL.concrete, 'c-drum', 'z-boiler', 'Boiler CC+', 'Drum · furnace · 170 bar');

  const drum = new THREE.Mesh(new THREE.CylinderGeometry(9, 9, 4, 16), mat(COL.steel));
  drum.position.set(0, 46, 0);
  boilerShell.add(drum);

  const furnace = new THREE.Mesh(new THREE.BoxGeometry(12, 22, 10), mat(0x1a1008, 0xff6622, 0.6));
  furnace.name = 'furnace';
  furnace.userData.id = 'c-furnace';
  furnace.position.set(0, 18, 0);
  boilerShell.add(furnace);
  glows.push(furnace);

  add(boilerShell, 0, 24, -20);
  add(boxSilent(20, 3, 16, 0x38b6c9, 'c-eco', 'z-boiler'), 0, 8, -20);
  add(boxSilent(20, 4, 16, 0xff6644, 'c-sh', 'z-boiler'), 0, 36, -20);
  add(boxSilent(20, 3, 16, 0xff8899, 'c-rh', 'z-boiler'), 0, 32, -20);
  add(boxSilent(18, 24, 14, 0x5588aa, 'c-tubes', 'z-boiler'), 0, 16, -20);
  const bcp = new THREE.Group();
  bcp.userData = { id: 'c-bcp', zone: 'z-boiler' };
  [0, 1, 2].forEach((i) => {
    const p = new THREE.Mesh(new THREE.BoxGeometry(2, 5, 2), mat(0x2890e8));
    p.position.set(-4 + i * 4, 2.5, 0);
    bcp.add(p);
  });
  const bcpL = label('BCP ×3', 'CC+ circulation');
  bcpL.position.set(0, 10, 0);
  bcp.add(bcpL);
  add(bcp, 0, 2, 5);

  const fan = (id, lbl, sub, x, z) => {
    const g = new THREE.Group();
    g.userData = { id, zone: 'z-boiler', spin: true };
    const hub = new THREE.Mesh(new THREE.CylinderGeometry(3, 3, 1.5, 16), mat(COL.steel));
    const blade = new THREE.Mesh(new THREE.BoxGeometry(7, 0.4, 1.2), mat(0xddeeff));
    blade.position.y = 0.8;
    spinners.push(blade);
    g.add(hub, blade);
    const fl = label(lbl, sub);
    fl.position.set(0, 8, 0);
    g.add(fl);
    add(g, x, 2, z);
  };
  fan('c-fd', 'FD Fan', 'Forced draft', -55, 15);
  fan('c-idf', 'ID Fan', 'Induced draft', 55, 15);
  fan('c-paf', 'PA Fan', 'Primary air to mills', -70, -5);

  add(box(8, 6, 10, 0xf0a040, 'c-aph', 'z-boiler', 'APH', 'Ljungström regenerative'), 45, 3, -5);

  /* ═══ TURBINE HALL (far east) ═══ */
  add(box(8, 8, 8, COL.steel, 'c-hp', 'z-turbine', 'HP Turbine', 'Single flow'), 85, 4, -15);
  add(box(10, 9, 9, COL.steel, 'c-ip', 'z-turbine', 'IP Turbine', 'Double flow'), 115, 4.5, -15);
  add(box(12, 10, 10, COL.steel, 'c-lp', 'z-turbine', 'LP Turbine', 'Double flow'), 148, 5, -15);

  const gen = new THREE.Group();
  gen.userData = { id: 'c-gen', zone: 'z-turbine', spin: true };
  const genBody = new THREE.Mesh(new THREE.CylinderGeometry(5, 5, 14, 20), mat(COL.gen));
  const rotor = new THREE.Mesh(new THREE.CylinderGeometry(1.5, 1.5, 15, 8), mat(0xffdd88));
  rotor.userData.spinPart = true;
  spinners.push(rotor);
  gen.add(genBody, rotor);
  const gl = label('Generator THDF', '500 MW · 21 kV · H₂');
  gl.position.set(0, 12, 0);
  gen.add(gl);
  add(gen, 185, 7, -15);

  add(box(36, 6, 18, 0xa8d8f0, 'c-cond', 'z-turbine', 'Surface condenser', 'Cold CW IN · Hot CW OUT'), 130, 3, 45);
  add(box(5, 5, 5, COL.steel, 'c-tdbfp', 'z-turbine', 'TDBFP', 'Steam-driven'), 70, 2.5, 30);
  add(box(4, 4, 4, 0x4890c0, 'c-mdbfp', 'z-turbine', 'MDBFP', 'Motor standby'), 82, 2, 35);
  add(box(3, 3, 4, 0x2890e8, 'c-bfp-boost', 'z-turbine', 'Booster BFP', ''), 58, 1.5, 25);

  /* ═══ WATER TREATMENT (far south-west) ═══ */
  add(part('c-forebay', 'z-dm', new THREE.Mesh(new THREE.BoxGeometry(50, 2, 30), mat(COL.water, COL.water, 0.08)), 0, 6, 0, 'Raw water forebay', 'Rihand canal'), -210, 1, 175);
  add(box(32, 10, 14, 0x64b5f6, 'c-dm', 'z-dm', 'DM Water Plant', 'SAC·Degas·SBA·MB'), -155, 5, 155);
  add(cyl(6, 6, 8, 12, 0x78909c, 'c-deaerator', 'z-dm', 'Deaerator', 'O₂ removal'), -95, 4, 140);

  /* ═══ COOLING WATER (far south-east) ═══ */
  const cwp = new THREE.Group();
  cwp.userData = { id: 'c-cwp', zone: 'z-cw', spin: true };
  [0, 1].forEach((i) => {
    const p = new THREE.Mesh(new THREE.CylinderGeometry(2, 2, 8, 10), mat(0x2890e8));
    p.position.set(i * 6, 4, 0);
    p.userData.spinPart = true;
    spinners.push(p);
    cwp.add(p);
  });
  const cwpl = label('CW Pumps', '×2 vertical');
  cwpl.position.set(3, 12, 0);
  cwp.add(cwpl);
  add(cwp, 155, 0, 120);

  const tower = (x, z) => {
    const g = new THREE.Group();
    g.userData = { id: 'c-ct', zone: 'z-cw' };
    const t = new THREE.Mesh(new THREE.CylinderGeometry(8, 14, 38, 16, 1, true), mat(0xd0e8f4));
    t.position.y = 19;
    const basin = new THREE.Mesh(new THREE.CylinderGeometry(14, 14, 2, 16), mat(COL.water));
    basin.position.y = 1;
    g.add(t, basin);
    const tl = label('Cooling tower', 'Induced draft');
    tl.position.set(0, 44, 0);
    g.add(tl);
    add(g, x, 0, z);
  };
  tower(240, 175);
  tower(310, 175);

  add(box(12, 4, 8, 0x66bb6a, 'c-chlorine', 'z-cw', 'ClO₂ Plant', 'Biocide dosing'), 210, 2, 150);

  /* ═══ EMISSIONS (far north) ═══ */
  add(box(22, 12, 14, COL.concrete, 'c-esp', 'z-env', 'ESP', 'Multi-field · >99.9%'), -25, 6, -145);
  add(box(14, 22, 14, 0xa8dcc0, 'c-fgd', 'z-env', 'FGD Absorber', 'Wet limestone'), 45, 11, -160);

  const stack = cyl(4, 7, 55, 12, COL.concrete, 'c-stack', 'z-env', 'Stack', '500 MW · CEMS');
  add(stack, 115, 0, -210);

  add(box(40, 3, 6, 0x9098a0, 'c-flue', 'z-env', 'Flue gas duct', 'Boiler→ESP→FGD→Stack'), 35, 18, -100);

  /* ═══ ASH (south) ═══ */
  add(cyl(4, 4, 14, 10, 0xb0a090, 'c-flyash', 'z-ash', 'Fly ash silo', 'Pneumatic'), 25, 0, 130);
  add(box(8, 4, 6, COL.steel, 'c-bottom-ash', 'z-ash', 'BA slurry pump', 'To dyke'), 0, 2, 115);
  add(box(40, 3, 25, 0xc0b8a8, 'c-dyke', 'z-ash', 'Ash dyke', '400 acres'), -90, 1.5, 200);

  /* ═══ H₂ & GRID (north-east) ═══ */
  add(box(16, 8, 10, 0xbbdefb, 'c-h2', 'z-h2', 'H₂ Plant', 'Electrolyser'), 155, 4, 85);
  add(box(20, 2, 3, COL.power, 'c-ipb', 'z-grid', 'IPB', '21 kV busduct'), 165, 16, -25);
  add(box(8, 14, 8, COL.steel, 'c-gt', 'z-grid', 'GT', '21→400 kV'), 205, 7, -55);
  add(box(6, 8, 6, 0x78909c, 'c-uat', 'z-grid', 'UAT', 'Aux transformer'), 185, 4, -40);

  const yard = new THREE.Group();
  yard.userData = { id: 'c-yard', zone: 'z-grid' };
  for (let i = 0; i < 3; i++) {
    const cb = new THREE.Mesh(new THREE.BoxGeometry(2, 5, 2), mat(0x546e7a));
    cb.position.set(i * 12 - 12, 2.5, 0);
    yard.add(cb);
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 18, 6), mat(0x889098));
    pole.position.set(i * 12 - 12, 9, 8);
    yard.add(pole);
  }
  const yl = label('400 kV Switchyard', 'SF₆ breakers');
  yl.position.set(0, 22, 0);
  yard.add(yl);
  add(yard, 245, 0, -95);

  add(box(14, 6, 10, 0xeceff1, 'c-compressor', 'z-aux', 'Instrument air', 'Compressors'), 225, 3, 105);

  /* ═══ PIPES — colour-coded routes across site ═══ */
  const pipes = new THREE.Group();
  pipes.name = 'pipes';

  pipes.add(pipe(
    [[-240, 3, -120], [-165, 8, -70], [-115, 20, -45], [-95, 10, -20], [0, 22, -20]],
    0.65, COL.coal, 'Coal / PF',
  ));
  pipes.add(pipe(
    [[0, 44, -20], [85, 10, -15], [115, 10, -15], [148, 10, -15], [170, 8, -15]],
    0.85, COL.steam, 'Main steam',
  ));
  pipes.add(pipe(
    [[148, 8, -15], [120, 14, -40], [80, 22, -35], [40, 30, -28], [0, 36, -20]],
    0.55, COL.reheat, 'Cold reheat',
  ));
  pipes.add(pipe(
    [[148, 6, -15], [140, 4, 15], [130, 4, 45]],
    0.75, COL.steam, 'LP exhaust',
  ));
  pipes.add(pipe(
    [[-155, 8, 155], [-95, 10, 140], [58, 6, 25], [0, 12, -20]],
    0.5, COL.feed, 'DM feedwater',
  ));
  pipes.add(pipe(
    [[130, 5, 45], [155, 4, 120], [240, 4, 175], [310, 4, 175]],
    0.75, COL.cwHot, 'CW hot OUT',
  ));
  pipes.add(pipe(
    [[310, 4, 175], [240, 4, 175], [155, 4, 120], [130, 4, 48]],
    0.75, COL.cwCold, 'CW cold IN',
  ));
  pipes.add(pipe(
    [[0, 28, -20], [-25, 12, -145], [45, 14, -160], [115, 30, -210]],
    0.8, COL.flue, 'Flue gas',
  ));
  pipes.add(pipe(
    [[185, 12, -15], [165, 14, -25], [205, 10, -55], [245, 6, -95]],
    0.5, COL.power, 'Power evacuation',
  ));
  pipes.add(pipe(
    [[155, 6, 85], [185, 10, -15]],
    0.3, COL.h2, 'H₂ to generator',
  ));
  pipes.add(pipe(
    [[45, 8, -160], [25, 6, 130]],
    0.4, COL.ash, 'Fly ash',
  ));
  pipes.add(pipe(
    [[0, 4, -5], [0, 3, 115], [-90, 2, 200]],
    0.4, COL.ash, 'Bottom ash slurry',
  ));

  root.add(pipes);

  positions['c-furnace'] = furnace;

  return { root, pickables, spinners, glows, furnace, positions };
}

export function pipeLegend() {
  return [
    ['Coal / PF', COL.coal], ['Steam', COL.steam], ['Reheat', COL.reheat],
    ['Feedwater', COL.feed], ['CW hot OUT', COL.cwHot], ['CW cold IN', COL.cwCold],
    ['Flue gas', COL.flue], ['Power', COL.power], ['H₂', COL.h2], ['Ash', COL.ash],
  ];
}
