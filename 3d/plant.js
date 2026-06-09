import * as THREE from 'three';
import { CSS2DObject } from 'three/examples/jsm/renderers/CSS2DRenderer.js';
import { MODELS } from '../scripts/model-builders.js';

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
    color, metalness: 0.45, roughness: 0.52,
    emissive: emissive || color, emissiveIntensity: ei,
    envMapIntensity: 0.9,
  });
}

// reflective water surface — relies on scene.environment for the sky reflection
function waterMat(color = 0x2f6f96) {
  return new THREE.MeshStandardMaterial({
    color, metalness: 0.55, roughness: 0.08,
    envMapIntensity: 1.3, transparent: true, opacity: 0.92,
  });
}

// ── flowing-energy texture for pipes (bright bands on a dark strip) ──────────
let _flowTex = null;
function flowTexture() {
  if (_flowTex) return _flowTex;
  const c = document.createElement('canvas');
  c.width = 128; c.height = 8;
  const g = c.getContext('2d');
  g.fillStyle = '#000'; g.fillRect(0, 0, 128, 8);
  for (let i = 0; i < 4; i++) {
    const x = i * 32;
    const grad = g.createLinearGradient(x, 0, x + 24, 0);
    grad.addColorStop(0, 'rgba(255,255,255,0)');
    grad.addColorStop(0.5, 'rgba(255,255,255,1)');
    grad.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = grad; g.fillRect(x, 0, 24, 8);
  }
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  _flowTex = t;
  return t;
}

// pipes whose emissive bands scroll to show flow direction; filled by pipe()
const pipeFlows = [];

// ── procedural ground/concrete textures (no external assets) ─────────────────
function noiseTexture(base, dark, light, { size = 512, blots = 1400, repeat = 8 } = {}) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const g = c.getContext('2d');
  g.fillStyle = base; g.fillRect(0, 0, size, size);
  for (let i = 0; i < blots; i++) {
    const x = Math.random() * size, y = Math.random() * size;
    const r = 1 + Math.random() * 4;
    g.fillStyle = Math.random() > 0.5 ? dark : light;
    g.globalAlpha = 0.04 + Math.random() * 0.12;
    g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill();
  }
  g.globalAlpha = 1;
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(repeat, repeat);
  t.anisotropy = 4;
  return t;
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

function pipe(points, radius, color, name, speed = 1) {
  const curve = new THREE.CatmullRomCurve3(points.map((p) => new THREE.Vector3(...p)));
  const len = curve.getLength();
  const geo = new THREE.TubeGeometry(curve, 64, radius, 12, false);
  const tex = flowTexture().clone();
  tex.needsUpdate = true;
  tex.repeat.set(Math.max(2, Math.round(len / 14)), 1);
  const mesh = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({
    color, emissive: color, emissiveIntensity: 0.45,
    emissiveMap: tex, metalness: 0.5, roughness: 0.35, envMapIntensity: 0.8,
  }));
  mesh.castShadow = true;
  mesh.userData.pipe = name;
  pipeFlows.push({ tex, speed });
  return mesh;
}

// red/white banded RCC chimney (reads instantly as a power-station stack)
function bandedStack(rTop, rBot, h, segH, id, zone, lbl, sub) {
  const g = new THREE.Group();
  g.userData = { id, zone };
  const bands = Math.round(h / segH);
  for (let i = 0; i < bands; i++) {
    const t0 = i / bands, t1 = (i + 1) / bands;
    const r0 = rBot + (rTop - rBot) * t0;
    const r1 = rBot + (rTop - rBot) * t1;
    const seg = new THREE.Mesh(
      new THREE.CylinderGeometry(r1, r0, segH + 0.02, 24),
      new THREE.MeshStandardMaterial({
        color: i % 2 ? 0xb23a2e : 0xf2f2ee,
        metalness: 0.1, roughness: 0.85, envMapIntensity: 0.6,
      }),
    );
    seg.position.y = h * t0 + segH / 2;
    seg.castShadow = true;
    g.add(seg);
  }
  const l = label(lbl, sub);
  l.position.set(0, h + 6, 0);
  g.add(l);
  return g;
}

// ── wrap a detailed model-builder as a pickable, labelled component ──────────
function detailComp(builderName, id, zone, scale, lbl, sub, lblY = 22) {
  const inner = MODELS[builderName]();
  inner.scale.setScalar(scale);
  inner.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  const g = new THREE.Group();
  g.userData = { id, zone };
  g.add(inner);
  if (lbl) { const l = label(lbl, sub || ''); l.position.set(0, lblY, 0); g.add(l); }
  g.userData._inner = inner;
  return g;
}

// ── steel exoskeleton (columns + ring beams + X-braces): the iconic boiler look
function steelFrame(w, h, d, levels = 5, color = 0x8893a1) {
  const g = new THREE.Group();
  const m = new THREE.MeshStandardMaterial({ color, metalness: 0.72, roughness: 0.42, envMapIntensity: 0.9 });
  const t = 0.6;
  const beam = (x, y, z, sx, sy, sz) => {
    const b = new THREE.Mesh(new THREE.BoxGeometry(sx, sy, sz), m);
    b.position.set(x, y, z); b.castShadow = true; g.add(b);
  };
  // corner + mid columns
  [-w / 2, 0, w / 2].forEach((x) => [-d / 2, d / 2].forEach((z) => beam(x, h / 2, z, t, h, t)));
  // ring beams + X-braces on the two long faces
  for (let i = 1; i <= levels; i++) {
    const y = (h * i) / levels;
    beam(0, y, -d / 2, w, t, t); beam(0, y, d / 2, w, t, t);
    beam(-w / 2, y, 0, t, t, d); beam(w / 2, y, 0, t, t, d);
    if (i < levels) {
      const hb = h / levels;
      const diag = Math.hypot(w / 2, hb);
      const ang = Math.atan2(hb, w / 2);
      [-d / 2, d / 2].forEach((z) => {
        [[-w / 4, 1], [w / 4, -1]].forEach(([cx, dir]) => {
          const br = new THREE.Mesh(new THREE.BoxGeometry(diag, 0.35, 0.35), m);
          br.position.set(cx, y + hb / 2, z);
          br.rotation.z = dir * ang;
          g.add(br);
        });
      });
    }
  }
  return g;
}

// ── clad industrial building (turbine hall / CHP) with roof + window strip ───
function building(w, h, d, color = 0xb9c2cc) {
  const g = new THREE.Group();
  const wall = new THREE.MeshStandardMaterial({ color, metalness: 0.35, roughness: 0.6, envMapIntensity: 0.7 });
  const body = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), wall);
  body.position.y = h / 2; body.castShadow = true; body.receiveShadow = true; g.add(body);
  const roof = new THREE.Mesh(new THREE.BoxGeometry(w + 1, 1.2, d + 1),
    new THREE.MeshStandardMaterial({ color: 0x59636e, metalness: 0.4, roughness: 0.5 }));
  roof.position.y = h; g.add(roof);
  const win = new THREE.Mesh(new THREE.BoxGeometry(w + 0.1, h * 0.16, 0.1),
    new THREE.MeshStandardMaterial({ color: 0x3a4a5a, metalness: 0.2, roughness: 0.25, envMapIntensity: 1.2 }));
  win.position.set(0, h * 0.62, d / 2 + 0.02); g.add(win);
  const win2 = win.clone(); win2.position.z = -d / 2 - 0.02; g.add(win2);
  return g;
}

// ── pipe rack: trestle bents carrying several service pipes ──────────────────
function pipeRack(x0, z0, x1, z1, h, n = 4) {
  const g = new THREE.Group();
  const steel = new THREE.MeshStandardMaterial({ color: 0x7e8a98, metalness: 0.7, roughness: 0.45 });
  const len = Math.hypot(x1 - x0, z1 - z0);
  const ang = Math.atan2(z1 - z0, x1 - x0);
  const bents = Math.max(2, Math.round(len / 14));
  for (let i = 0; i <= bents; i++) {
    const t = i / bents;
    const x = x0 + (x1 - x0) * t, z = z0 + (z1 - z0) * t;
    [-2.4, 2.4].forEach((o) => {
      const ox = Math.cos(ang + Math.PI / 2) * o, oz = Math.sin(ang + Math.PI / 2) * o;
      const col = new THREE.Mesh(new THREE.BoxGeometry(0.5, h, 0.5), steel);
      col.position.set(x + ox, h / 2, z + oz); col.castShadow = true; g.add(col);
    });
    const cross = new THREE.Mesh(new THREE.BoxGeometry(5.6, 0.5, 0.5), steel);
    cross.position.set(x, h, z); cross.rotation.y = -ang; g.add(cross);
  }
  const palette = [0x37c8e8, 0xff6a3c, 0x66bb6a, 0xc8ccd0];
  for (let k = 0; k < n; k++) {
    const off = -2 + (k / (n - 1)) * 4;
    const ox = Math.cos(ang + Math.PI / 2) * off, oz = Math.sin(ang + Math.PI / 2) * off;
    const p = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.45, len, 12),
      new THREE.MeshStandardMaterial({ color: palette[k % palette.length], metalness: 0.4, roughness: 0.5 }));
    p.rotation.z = Math.PI / 2; p.rotation.y = -ang;
    p.position.set((x0 + x1) / 2 + ox, h + 0.6, (z0 + z1) / 2 + oz);
    p.castShadow = true; g.add(p);
  }
  return g;
}

// ── enclosed inclined conveyor gallery on trestle legs (coal handling) ───────
function conveyorGallery(x0, y0, z0, x1, y1, z1) {
  const g = new THREE.Group();
  const steel = new THREE.MeshStandardMaterial({ color: 0x6f7c8a, metalness: 0.6, roughness: 0.5 });
  const cover = new THREE.MeshStandardMaterial({ color: 0x9aa6b2, metalness: 0.4, roughness: 0.6 });
  const len = Math.hypot(x1 - x0, y1 - y0, z1 - z0);
  const mid = new THREE.Vector3((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2);
  const gall = new THREE.Mesh(new THREE.BoxGeometry(len, 3, 3.4), cover);
  const dir = new THREE.Vector3(x1 - x0, y1 - y0, z1 - z0).normalize();
  gall.quaternion.setFromUnitVectors(new THREE.Vector3(1, 0, 0), dir);
  gall.position.copy(mid); gall.castShadow = true; g.add(gall);
  const legs = Math.max(2, Math.round(len / 10));
  for (let i = 0; i <= legs; i++) {
    const t = i / legs;
    const px = x0 + (x1 - x0) * t, py = y0 + (y1 - y0) * t, pz = z0 + (z1 - z0) * t;
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.6, py, 0.6), steel);
    leg.position.set(px, py / 2, pz); leg.castShadow = true; g.add(leg);
  }
  return g;
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
  const waters = [];
  const towerTops = [];
  let stackTop = null;
  pipeFlows.length = 0;

  /* ── Site base (NTPC Singrauli plant area) ── */
  const site = new THREE.Mesh(
    new THREE.PlaneGeometry(620, 520),
    new THREE.MeshStandardMaterial({
      map: noiseTexture('#6f7d52', '#586945', '#869268', { repeat: 10 }),
      roughness: 0.96, metalness: 0, envMapIntensity: 0.4,
    }),
  );
  site.rotation.x = -Math.PI / 2;
  site.receiveShadow = true;
  root.add(site);

  const pad = new THREE.Mesh(new THREE.PlaneGeometry(560, 420), new THREE.MeshStandardMaterial({
    map: noiseTexture('#9a9f96', '#83887e', '#b0b4aa', { repeat: 9 }),
    roughness: 0.92, metalness: 0.05, envMapIntensity: 0.45,
  }));
  pad.rotation.x = -Math.PI / 2;
  pad.position.y = 0.05;
  pad.receiveShadow = true;
  root.add(pad);

  const sign = label('NTPC SINGRAULI · STAGE-II · 500 MW', 'Singrauli · coal → grid', false);
  sign.position.set(0, 12, -280);
  root.add(sign);

  ZONE_PADS.forEach((zp) => {
    const pad = new THREE.Mesh(
      new THREE.PlaneGeometry(zp.w, zp.d),
      new THREE.MeshStandardMaterial({
        color: zp.color, transparent: true, opacity: 0.14,
        roughness: 1, metalness: 0, depthWrite: false,
      }),
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

  let furnace = null;

  /* ═══ COAL & CHP (far west) ═══ */
  add(box(140, 1, 4, 0x4a4038, 'c-mgr', 'z-fuel', 'MGR Railway', '22 km from Nigahi'), -240, 0.5, -120);
  add(box(14, 6, 20, COL.steel, 'c-hopper', 'z-fuel', 'Track hopper', 'Bottom discharge'), -195, 3, -95);
  add(part('c-chp', 'z-fuel', building(30, 16, 22, 0x9aa6b2), 0, 22, 0, 'Coal Handling Plant', '2400 MTPH'), -165, 0, -70);
  add(detailComp('coal_yard', 'c-stock', 'z-fuel', 1.25, 'Coal stockyard', 'Stacker-reclaimer', 26), -215, 0, -55);
  add(part('c-bunker', 'z-fuel', building(20, 30, 16, 0xa8b0ba), 0, 34, 0, 'Coal bunkers', 'Gravity feed'), -115, 0, -45);
  root.add(conveyorGallery(-200, 6, -55, -150, 14, -68));
  root.add(conveyorGallery(-150, 14, -68, -118, 30, -47));

  const mills = new THREE.Group();
  mills.userData = { id: 'c-mill', zone: 'z-fuel' };
  [-12, 0, 12].forEach((x) => {
    const body = new THREE.Mesh(new THREE.CylinderGeometry(2.6, 3.4, 8, 18), mat(COL.steel));
    body.position.set(x, 4, 0); body.castShadow = true;
    const top = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 2.8, 3, 18), mat(0x6f7c8a));
    top.position.set(x, 9, 0);
    spinners.push(body); mills.add(body, top);
  });
  const ml = label('XRP 1003 Mills', '×3 bowl mills'); ml.position.set(0, 16, 0); mills.add(ml);
  add(mills, -95, 0, -20);

  /* ═══ BOILER ISLAND (centre-north) ═══ */
  add(detailComp('boiler', 'c-drum', 'z-boiler', 1.3, 'Boiler CC+', 'Drum · furnace · 170 bar', 58), 0, 0, -20);
  const bframe = steelFrame(30, 58, 26, 6); bframe.position.set(0, 0, -20); root.add(bframe);
  positions['c-eco'] = positions['c-sh'] = positions['c-rh'] = positions['c-tubes'] = positions['c-drum'];

  // visible furnace glow window on the boiler front face
  furnace = new THREE.Mesh(new THREE.BoxGeometry(15, 11, 1.2), mat(0x140a05, 0xff6622, 0.6));
  furnace.userData.id = 'c-furnace';
  furnace.position.set(0, 13, -7.4);
  glows.push(furnace);
  root.add(furnace);

  const bcp = new THREE.Group();
  bcp.userData = { id: 'c-bcp', zone: 'z-boiler' };
  [0, 1, 2].forEach((i) => {
    const p = new THREE.Mesh(new THREE.CylinderGeometry(1.4, 1.6, 5, 14), mat(0x2890e8));
    p.position.set(-4 + i * 4, 2.5, 0); p.castShadow = true; bcp.add(p);
  });
  const bcpL = label('BCP ×3', 'CC+ circulation'); bcpL.position.set(0, 10, 0); bcp.add(bcpL);
  add(bcp, 0, 2, 7);

  const fan = (id, lbl, sub, x, z) => {
    const g = new THREE.Group();
    g.userData = { id, zone: 'z-boiler' };
    const housing = new THREE.Mesh(new THREE.CylinderGeometry(3.7, 3.7, 2.4, 22), mat(0x55606e));
    housing.castShadow = true;
    const hub = new THREE.Group();
    for (let b = 0; b < 6; b++) {
      const blade = new THREE.Mesh(new THREE.BoxGeometry(6.6, 0.3, 1.5), mat(0xe2ebf2));
      blade.rotation.y = (b / 6) * Math.PI * 2;
      hub.add(blade);
    }
    hub.position.y = 1.5; spinners.push(hub);
    const cone = new THREE.Mesh(new THREE.ConeGeometry(1.2, 2, 16), mat(COL.steel));
    cone.position.y = 1.6; hub.add(cone);
    g.add(housing, hub);
    const fl = label(lbl, sub); fl.position.set(0, 7, 0); g.add(fl);
    add(g, x, 3, z);
  };
  fan('c-fd', 'FD Fan', 'Forced draft', -56, 16);
  fan('c-idf', 'ID Fan', 'Induced draft', 56, 16);
  fan('c-paf', 'PA Fan', 'Primary air to mills', -72, -6);

  add(part('c-aph', 'z-boiler', new THREE.Mesh(new THREE.CylinderGeometry(5, 5, 8, 22), mat(0xb98a3a)), 0, 9, 0, 'APH', 'Ljungström regenerative'), 45, 4, -5);

  /* ═══ TURBINE HALL (far east) ═══ */
  const hall = detailComp('turbine_hall', 'c-gen', 'z-turbine', 1.15, 'Turbine–Generator', 'HP/IP/LP · 3000 rpm · 500 MW', 17);
  add(hall, 108, 7, -15);
  positions['c-hp'] = positions['c-ip'] = positions['c-lp'] = hall;
  const tframe = steelFrame(74, 24, 30, 4); tframe.position.set(122, 0, -15); root.add(tframe);

  add(detailComp('condenser', 'c-cond', 'z-turbine', 1.4, 'Surface condenser', 'Cold CW IN · Hot CW OUT', 12), 132, 0, 42);
  add(box(5, 5, 5, COL.steel, 'c-tdbfp', 'z-turbine', 'TDBFP', 'Steam-driven'), 70, 2.5, 30);
  add(box(4, 4, 4, 0x4890c0, 'c-mdbfp', 'z-turbine', 'MDBFP', 'Motor standby'), 82, 2, 35);
  add(box(3, 3, 4, 0x2890e8, 'c-bfp-boost', 'z-turbine', 'Booster BFP', ''), 58, 1.5, 25);

  // service pipe racks tying the islands together
  root.add(pipeRack(16, -20, 92, -16, 12, 4));
  root.add(pipeRack(130, 28, 150, 108, 8, 3));

  /* ═══ WATER TREATMENT (far south-west) ═══ */
  const forebayWater = new THREE.Mesh(new THREE.BoxGeometry(50, 2, 30), waterMat(0x2c6a8f));
  waters.push(forebayWater);
  add(part('c-forebay', 'z-dm', forebayWater, 0, 6, 0, 'Raw water forebay', 'Rihand canal'), -210, 1, 175);
  add(box(32, 10, 14, 0x64b5f6, 'c-dm', 'z-dm', 'DM Water Plant', 'SAC·Degas·SBA·MB'), -155, 5, 155);
  add(cyl(6, 6, 8, 12, 0x78909c, 'c-deaerator', 'z-dm', 'Deaerator', 'O₂ removal'), -95, 4, 140);

  /* ═══ COOLING WATER (far south-east) ═══ */
  const ph = detailComp('pump_house', 'c-cwp', 'z-cw', 1.0, 'CW Pump House', '×5 vertical CW pumps', 18);
  ph.userData._inner.traverse((o) => { if (o.name === 'spinner') spinners.push(o); });
  add(ph, 150, 0, 118);

  const tower = (x, z) => {
    const g = new THREE.Group();
    g.userData = { id: 'c-ct', zone: 'z-cw' };
    // hyperboloid-ish shell: narrow waist then flare to a wider throat
    const t = new THREE.Mesh(new THREE.CylinderGeometry(11, 15, 38, 28, 1, true),
      new THREE.MeshStandardMaterial({ color: 0xcdd9e0, metalness: 0.1, roughness: 0.9,
        side: THREE.DoubleSide, envMapIntensity: 0.5 }));
    t.position.y = 19;
    t.castShadow = true;
    const waist = new THREE.Mesh(new THREE.CylinderGeometry(9, 11, 14, 28, 1, true),
      new THREE.MeshStandardMaterial({ color: 0xc4d2da, metalness: 0.1, roughness: 0.9,
        side: THREE.DoubleSide, envMapIntensity: 0.5 }));
    waist.position.y = 40;
    const basin = new THREE.Mesh(new THREE.CylinderGeometry(16, 16, 2, 28), waterMat(0x2f6f86));
    basin.position.y = 1;
    waters.push(basin);
    g.add(t, waist, basin);
    const tl = label('Cooling tower', 'Natural draft');
    tl.position.set(0, 52, 0);
    g.add(tl);
    add(g, x, 0, z);
    towerTops.push(new THREE.Vector3(x, 48, z));
  };
  tower(240, 175);
  tower(310, 175);

  add(box(12, 4, 8, 0x66bb6a, 'c-chlorine', 'z-cw', 'ClO₂ Plant', 'Biocide dosing'), 210, 2, 150);

  /* ═══ EMISSIONS (far north) ═══ */
  add(detailComp('esp', 'c-esp', 'z-env', 1.1, 'ESP', 'Multi-field · >99.9%', 22), -25, 0, -145);
  add(detailComp('fgd', 'c-fgd', 'z-env', 1.1, 'FGD Absorber', 'Wet limestone', 28), 45, 0, -160);

  const stack = bandedStack(4, 7, 55, 5, 'c-stack', 'z-env', 'Stack', '275 m RCC · CEMS');
  add(stack, 115, 0, -210);
  stackTop = new THREE.Vector3(115, 57, -210);

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

  add(detailComp('switchyard', 'c-yard', 'z-grid', 1.5, '400 kV Switchyard', 'SF₆ breakers', 30), 245, 0, -95);

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

  return { root, pickables, spinners, glows, furnace, positions,
    stackTop, towerTops, waters, pipeFlows: pipeFlows.slice() };
}

export function pipeLegend() {
  return [
    ['Coal / PF', COL.coal], ['Steam', COL.steam], ['Reheat', COL.reheat],
    ['Feedwater', COL.feed], ['CW hot OUT', COL.cwHot], ['CW cold IN', COL.cwCold],
    ['Flue gas', COL.flue], ['Power', COL.power], ['H₂', COL.h2], ['Ash', COL.ash],
  ];
}
