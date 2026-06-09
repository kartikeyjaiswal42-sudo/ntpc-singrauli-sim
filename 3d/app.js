import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { CSS2DRenderer } from 'three/examples/jsm/renderers/CSS2DRenderer.js';
import { runPlant, SCENARIOS } from '../2d/engine.js';
import { EQUIPMENT, EQUIPMENT_GROUPS } from '../illustrated/components.js';
import { buildPlant, pipeLegend, ZONE_PADS } from './plant.js';
import { setupSky, setupEnvironment, Plume } from './fx.js';
import { computeImpacts, CONTROL_HINTS } from '../shared/impacts.js';
import { createProtection, stepProtection, resetProtection } from '../shared/protection.js';

if (location.protocol === 'file:') {
  throw new Error('Open http://localhost:3000/3d/');
}

const $ = (id) => document.getElementById(id);

const state = {
  loadSet: 78, load: 78, gcv: 3600, sulphur: 0.42, ashFrac: 0.34, cwInlet: 27,
  excessAir: 1.20, burnerTilt: 0, millsInService: 3, cwPumpPct: 100,
  useTdbfp: true, bcpOn: true, fdFanOn: true, idFanOn: true,
  espOn: true, fgdOn: true, clO2On: true, running: true, tripped: false,
  focusComp: null,
};

let rampTarget = null;
let lastResult = null;
let prevResult = null;
let lastImpactKey = null;

function fmt(x, d = 0) {
  if (!isFinite(x)) return '—';
  return Number(x).toLocaleString('en-IN', { minimumFractionDigits: d, maximumFractionDigits: d });
}

function plantInputs() {
  return {
    load: state.tripped ? 0 : state.load,
    gcv: state.gcv, sulphur: state.sulphur, cwInlet: state.cwInlet,
    excessAir: state.excessAir, ashFrac: state.ashFrac,
    espOn: state.espOn, fgdOn: state.fgdOn, burnerTilt: state.burnerTilt,
    millsInService: state.millsInService, cwPumpPct: state.cwPumpPct,
    useTdbfp: state.useTdbfp, bcpOn: state.bcpOn,
    fdFanOn: state.fdFanOn, idFanOn: state.idFanOn, clO2On: state.clO2On,
  };
}

/* ── Control definitions with human-readable impact hints ── */
const CONTROLS = [
  { type: 'slider', key: 'loadSet', label: 'Unit load', min: 0, max: 100, step: 1, fmt: (v) => `${v}%`,
    hint: '↑ MW export · ↓ part-load efficiency penalty' },
  { type: 'slider', key: 'gcv', label: 'Coal GCV', min: 2800, max: 4500, step: 50, fmt: (v) => `${fmt(v)} kcal/kg`,
    hint: '↑ GCV → less coal for same MW · ↓ GCV → more firing rate' },
  { type: 'slider', key: 'sulphur', label: 'Coal sulphur', min: 0.2, max: 0.9, step: 0.01, fmt: (v) => `${v.toFixed(2)}%`, scale: 100, offset: 0,
    hint: '↑ SO₂ & gypsum · FGD load increases' },
  { type: 'slider', key: 'ashFrac', label: 'Coal ash', min: 0.28, max: 0.42, step: 0.01, fmt: (v) => `${(v * 100).toFixed(0)}%`, scale: 100, displayScale: 0.01,
    hint: '↑ ash → ↓ boiler efficiency · more ESP load' },
  { type: 'slider', key: 'cwInlet', label: 'CW inlet temp', min: 20, max: 35, step: 1, fmt: (v) => `${v} °C`,
    hint: '↑ inlet → ↓ vacuum · ↑ heat rate (monsoon effect)' },
  { type: 'slider', key: 'excessAir', label: 'Excess air', min: 1.0, max: 1.4, step: 0.02, fmt: (v) => `${Math.round((v - 1) * 100)}%`, scale: 50, offset: 1.0,
    hint: '↑ excess air → ↓ combustion eff · ↑ aux fan power' },
  { type: 'slider', key: 'burnerTilt', label: 'Burner tilt', min: -30, max: 30, step: 1, fmt: (v) => `${v > 0 ? '+' : ''}${v}°`,
    hint: '↑ tilt → ↑ reheat / MS temperature' },
  { type: 'slider', key: 'millsInService', label: 'Mills in service', min: 1, max: 3, step: 1, fmt: (v) => `${v}/3`,
    hint: 'Fewer mills → ↓ max output cap · coal flow limited' },
  { type: 'slider', key: 'cwPumpPct', label: 'CW pump speed', min: 50, max: 100, step: 5, fmt: (v) => `${v}%`,
    hint: '↓ speed → ↓ vacuum · ↑ heat rate · ↓ aux' },
  { type: 'toggle', key: 'fdFanOn', label: 'FD fan',
    hint: 'OFF = no combustion → zero MW (trip risk)' },
  { type: 'toggle', key: 'idFanOn', label: 'ID fan',
    hint: 'OFF = poor draft → ~45% derate · furnace pressure risk' },
  { type: 'toggle', key: 'bcpOn', label: 'BCP (CC+ pumps)',
    hint: 'OFF at load → ↓ boiler efficiency · DNB risk' },
  { type: 'toggle', key: 'useTdbfp', label: 'TDBFP vs MDBFP',
    hint: 'TDBFP ON → ↓ auxiliary power · motor BFP uses more aux' },
  { type: 'toggle', key: 'espOn', label: 'ESP',
    hint: 'OFF → PM emissions spike · environmental violation' },
  { type: 'toggle', key: 'fgdOn', label: 'FGD scrubber',
    hint: 'OFF → SO₂ at stack rises · gypsum production stops' },
  { type: 'toggle', key: 'clO2On', label: 'ClO₂ biocide',
    hint: 'OFF → biofouling → ↓ vacuum over time · ↑ heat rate' },
  { type: 'toggle', key: 'running', label: 'Unit synchronised',
    hint: 'Pause freezes load ramp · resume continues simulation' },
];

function renderImpacts(key) {
  const el = $('impact-panel');
  const ctrl = CONTROLS.find((c) => c.key === key);
  const { pos, neg } = computeImpacts(key, prevResult, lastResult, state);
  el.innerHTML = `
    <div class="impact-title">${ctrl?.label || key} — live impact</div>
    ${CONTROL_HINTS[key] ? `<p class="impact-hint">${CONTROL_HINTS[key]}</p>` : ctrl?.hint ? `<p class="impact-hint">${ctrl.hint}</p>` : ''}
    ${pos.length ? `<div class="impact-block pos"><div class="impact-head">▲ Positive</div>${pos.map((t) => `<div class="impact-line">${t}</div>`).join('')}</div>` : ''}
    ${neg.length ? `<div class="impact-block neg"><div class="impact-head">▼ Negative</div>${neg.map((t) => `<div class="impact-line">${t}</div>`).join('')}</div>` : ''}
    ${!pos.length && !neg.length ? '<p class="impact-none">Adjust control to see measured impact on MW, emissions, vacuum, heat rate…</p>' : ''}`;
}

function buildControls() {
  $('controls-list').innerHTML = CONTROLS.map((c) => {
    if (c.type === 'slider') {
      const min = c.scale ? (c.min - (c.offset || 0)) * c.scale : c.min;
      const max = c.scale ? (c.max - (c.offset || 0)) * c.scale : c.max;
      const val = c.scale ? (state[c.key] - (c.offset || 0)) * c.scale : state[c.key];
      return `<div class="ctrl" data-key="${c.key}">
        <label><span>${c.label}</span><output id="out-${c.key}">${c.fmt(state[c.key])}</output></label>
        <input type="range" id="in-${c.key}" min="${min}" max="${max}" step="${c.step * (c.scale || 1)}" value="${val}"/>
      </div>`;
    }
    const on = c.key === 'running' ? state.running : state[c.key];
    return `<div class="ctrl toggle-row" data-key="${c.key}">
      <span>${c.label}</span>
      <button type="button" class="toggle ${on ? 'on' : ''}" id="tog-${c.key}"></button>
    </div>`;
  }).join('');

  CONTROLS.forEach((c) => {
    if (c.type === 'slider') {
      $(`in-${c.key}`).oninput = (e) => {
        const baseline = lastResult || runPlant(plantInputs());
        let v = +e.target.value;
        if (c.scale) v = v / c.scale + (c.offset || 0);
        state[c.key] = v;
        $(`out-${c.key}`).textContent = c.fmt(v);
        if (c.key === 'loadSet') { rampTarget = null; if (state.tripped && v > 0) state.tripped = false; }
        lastResult = runPlant(plantInputs());
        updateHUD(lastResult);
        updateVisuals(lastResult);
        prevResult = baseline;
        renderImpacts(c.key);
        lastImpactKey = c.key;
      };
    } else {
      $(`tog-${c.key}`).onclick = () => {
        const baseline = lastResult || runPlant(plantInputs());
        if (c.key === 'running') {
          state.running = !state.running;
          if (state.running && state.tripped) { resetProtection(P3); prot3 = { armed: [], trip: null }; clearBooms3D(); }
          state.tripped = false;
        } else state[c.key] = !state[c.key];
        syncControlOutputs();
        lastResult = runPlant(plantInputs());
        updateHUD(lastResult);
        updateVisuals(lastResult);
        prevResult = baseline;
        renderImpacts(c.key);
        lastImpactKey = c.key;
      };
    }
  });
}

function syncControlOutputs() {
  CONTROLS.forEach((c) => {
    if (c.type !== 'slider') {
      const btn = $(`tog-${c.key}`);
      if (!btn) return;
      const on = c.key === 'running' ? state.running : state[c.key];
      btn.classList.toggle('on', on);
      return;
    }
    const el = $(`in-${c.key}`);
    const out = $(`out-${c.key}`);
    if (!el || !out) return;
    const v = state[c.key];
    el.value = c.scale ? (v - (c.offset || 0)) * c.scale : v;
    out.textContent = c.fmt(v);
  });
}

function renderDetail(id) {
  const comp = EQUIPMENT[id];
  const el = $('detail');
  if (!comp) {
    el.innerHTML = '<p class="detail-placeholder">Click any 3D component or pick from the list.</p>';
    return;
  }
  const metrics = lastResult ? comp.metrics(lastResult) : [];
  el.innerHTML = `
    <div class="detail-tag">${comp.tag}</div>
    <h2>${comp.name}</h2>
    <p class="detail-body">${comp.body}</p>
    <ul class="detail-specs">${comp.specs.map((s) => `<li>${s}</li>`).join('')}</ul>
    ${metrics.length ? `<div class="detail-metrics">${metrics.map(([k, v]) =>
      `<div class="dm"><span>${k}</span><strong>${v}</strong></div>`).join('')}</div>` : ''}`;
}

/* ── Three.js scene ── */
const canvas = $('viewport');
const labelLayer = $('labels');

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 0.92;

const labelRenderer = new CSS2DRenderer({ element: labelLayer });
labelRenderer.domElement.style.position = 'absolute';
labelRenderer.domElement.style.inset = '0';
labelRenderer.domElement.style.pointerEvents = 'none';

const scene = new THREE.Scene();
scene.fog = new THREE.Fog(0xcddbe6, 330, 780);

const camera = new THREE.PerspectiveCamera(50, 1, 1, 20000);
camera.position.set(280, 200, 320);

const controls = new OrbitControls(camera, canvas);
controls.enableDamping = true;
controls.maxPolarAngle = Math.PI / 2.1;
controls.target.set(10, 15, 10);

// sun direction shared by the sky shader and the shadow-casting light
// (polar 50° = 40° elevation; azimuth 205° = side/back light, sun out of the default view)
const sunDir = new THREE.Vector3().setFromSphericalCoords(
  1, THREE.MathUtils.degToRad(50), THREE.MathUtils.degToRad(205));

const hemi = new THREE.HemisphereLight(0xbcd6f2, 0x5d564a, 0.55);
scene.add(hemi);
scene.add(new THREE.AmbientLight(0xffffff, 0.12));
const sun = new THREE.DirectionalLight(0xfff3e0, 2.1);
sun.position.copy(sunDir).multiplyScalar(320);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
sun.shadow.camera.left = -240;
sun.shadow.camera.right = 240;
sun.shadow.camera.top = 240;
sun.shadow.camera.bottom = -240;
sun.shadow.camera.far = 900;
sun.shadow.bias = -0.0004;
scene.add(sun);

setupEnvironment(scene, renderer);
setupSky(scene, sunDir);

const { root, pickables, spinners, glows, furnace, positions: equipmentMeshes,
  stackTop, towerTops, waters, pipeFlows } = buildPlant();
scene.add(root);

/* ── Live atmosphere: stack smoke + cooling-tower steam plumes ── */
const stackPlume = new Plume(scene, stackTop, {
  count: 44, rise: 12, spread: 5, size0: 7, size1: 42, life: 6,
  driftX: 9, driftZ: 4, color: 0xb8bcc0, opacity: 0.4,
});
const towerPlumes = towerTops.map((t) => new Plume(scene, t, {
  count: 30, rise: 7, spread: 9, size0: 12, size1: 48, life: 5.5,
  driftX: 5, driftZ: 3, color: 0xffffff, opacity: 0.5,
}));

/* ── Protection / cascade-trip + 3D explosions ── */
const P3 = createProtection();
let prot3 = { armed: [], trip: null };
const booms = [];
let blackSmokeUntil = 0;
const TRIP_POS = { 'c-furnace': new THREE.Vector3(0, 28, -20), 'c-stack': new THREE.Vector3(115, 40, -210) };
function boom3D(target) {
  let pos = TRIP_POS[target];
  if (!pos) { pos = new THREE.Vector3(); (equipmentMeshes[target] || furnace || root).getWorldPosition(pos); }
  const m = new THREE.Mesh(new THREE.SphereGeometry(3, 20, 16),
    new THREE.MeshBasicMaterial({ color: 0xffd9a0, transparent: true, opacity: 1, fog: false }));
  m.position.copy(pos); scene.add(m); booms.push({ m, t: 0 });
  blackSmokeUntil = performance.now() / 1000 + 9;
}
function clearBooms3D() { booms.forEach((b) => { scene.remove(b.m); b.m.geometry.dispose(); }); booms.length = 0; blackSmokeUntil = 0; }

const allLabels = [];
root.traverse((o) => {
  if (o.element?.classList?.contains('plant-label') && !o.element.classList.contains('label-zone')) {
    allLabels.push(o);
  }
});

function setLabelVisibility(compId) {
  allLabels.forEach((l) => {
    const pid = l.parent?.userData?.id;
    l.element.classList.toggle('label-hidden', compId ? pid !== compId : true);
  });
}

function focusEquipment(id) {
  state.focusComp = id;
  document.querySelectorAll('.eq-btn').forEach((b) => b.classList.toggle('active', b.dataset.comp === id));
  document.querySelectorAll('.zone-chip').forEach((b) => b.classList.remove('active'));
  renderDetail(id);
  setLabelVisibility(id || null);
  Object.entries(equipmentMeshes).forEach(([k, g]) => {
    g.traverse((o) => {
      if (o.isMesh && !o.userData?.pipe && o.material?.emissive) {
        o.material.emissiveIntensity = k === id ? 0.4 : 0.05;
      }
    });
  });
  if (id && equipmentMeshes[id]) {
    const p = new THREE.Vector3();
    equipmentMeshes[id].getWorldPosition(p);
    flyTo(p, 55);
  }
}

const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();
canvas.addEventListener('click', (e) => {
  const r = canvas.getBoundingClientRect();
  pointer.x = ((e.clientX - r.left) / r.width) * 2 - 1;
  pointer.y = -((e.clientY - r.top) / r.height) * 2 + 1;
  raycaster.setFromCamera(pointer, camera);
  const hits = raycaster.intersectObjects(pickables, true);
  if (!hits.length) return;
  let o = hits[0].object;
  while (o && !o.userData?.id) o = o.parent;
  if (o?.userData?.id) focusEquipment(o.userData.id);
});

let camFrom = camera.position.clone();
let camTo = camera.position.clone();
let tgtFrom = controls.target.clone();
let tgtTo = controls.target.clone();
let camT = 1;

function flyTo(target, dist = 50) {
  camFrom.copy(camera.position);
  tgtFrom.copy(controls.target);
  camTo.set(target.x + dist * 0.6, target.y + dist * 0.45, target.z + dist * 0.7);
  tgtTo.copy(target);
  camT = 0;
}

function resize() {
  const w = canvas.clientWidth;
  const h = canvas.clientHeight;
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  renderer.setSize(w, h, false);
  labelRenderer.setSize(w, h);
}
window.addEventListener('resize', resize);
resize();

function tickSim() {
  lastResult = runPlant(plantInputs());
  const prot = stepProtection(P3, state, lastResult, 0.2, performance.now() / 1000);
  prot3 = prot;
  if (prot.justTripped) { state.tripped = true; rampTarget = null; boom3D(prot.trip.target); }
  updateHUD(lastResult);
  updateVisuals(lastResult);
}

function updateHUD(r) {
  $('hero').textContent = state.tripped ? (prot3.trip ? `⛔ ${prot3.trip.head}` : 'Unit tripped')
    : !state.running ? 'Frozen'
    : (prot3.armed && prot3.armed.length) ? `⚠ ${prot3.armed[0].head} in ${Math.ceil(prot3.armed[0].remain)}s`
    : `${fmt(r.netMW, 0)} MW · ${fmt(r.inputs.loadFrac * 100, 0)}%`;

  const pill = $('status-pill');
  const fdOff = state.running && !state.tripped && !state.fdFanOn;
  pill.textContent = state.tripped ? 'Tripped' : !state.running ? 'Paused'
    : fdOff ? 'No FD fan' : !state.idFanOn ? 'ID fan off' : 'On bars';
  pill.className = `status-pill ${state.tripped ? 'bad' : !state.running || fdOff || !state.idFanOn ? 'warn' : 'good'}`;

  if (state.focusComp) renderDetail(state.focusComp);
}

function updateVisuals(r) {
  const lf = r.inputs.loadFrac;
  const on = state.running && !state.tripped && r.grossMW > 2 && state.fdFanOn;

  if (furnace?.material) {
    furnace.material.emissiveIntensity = on ? 0.35 + lf * 0.9 : 0.02;
    furnace.visible = state.fdFanOn;
  }
  glows.forEach((m) => {
    if (m?.material) m.material.emissiveIntensity = on ? 0.3 + lf : 0.02;
  });

  document.body.classList.toggle('fd-off', !state.fdFanOn);
  document.body.classList.toggle('esp-off', !state.espOn);
  document.body.classList.toggle('fgd-off', !state.fgdOn);
}

function onControlChange(key) {
  /* used by scenario buttons */
  if (key) renderImpacts(key);
}

function physicsStep(dt) {
  if (!state.running) return;
  let target = state.tripped ? 0 : (rampTarget ?? state.loadSet);
  if (!state.fdFanOn) target = 0;
  const rate = state.tripped ? 60 : 14;
  state.load += Math.sign(target - state.load) * Math.min(Math.abs(target - state.load), rate * dt);
  if (rampTarget != null && Math.abs(state.load - rampTarget) < 0.4) rampTarget = null;
}

/* ── UI wiring ── */
$('zone-list').innerHTML = EQUIPMENT_GROUPS.map((g) => `
  <div class="eq-group"><div class="eq-group-title">${g.name}</div>
  ${g.ids.map((id) => {
    const e = EQUIPMENT[id];
    return `<button type="button" class="zone-btn eq-btn" data-comp="${id}"><strong>${e.name}</strong><span>${e.tag}</span></button>`;
  }).join('')}</div>`).join('');
document.querySelectorAll('.eq-btn').forEach((b) => { b.onclick = () => focusEquipment(b.dataset.comp); });

$('legend').innerHTML = pipeLegend().map(([t, c]) =>
  `<span class="li"><i style="background:#${c.toString(16).padStart(6, '0')}"></i>${t}</span>`).join('');

document.querySelectorAll('.stab').forEach((b) => {
  b.onclick = () => {
    document.querySelectorAll('.stab').forEach((x) => x.classList.toggle('active', x === b));
    $('panel-inspect').classList.toggle('hidden', b.dataset.tab !== 'inspect');
    $('panel-controls').classList.toggle('hidden', b.dataset.tab !== 'controls');
  };
});

$('btn-pause').onclick = () => { state.running = !state.running; $('btn-pause').textContent = state.running ? 'Pause' : 'Resume'; syncControlOutputs(); tickSim(); };
$('btn-ramp').onclick = () => {
  state.tripped = false; state.running = true; state.fdFanOn = true; state.idFanOn = true; state.bcpOn = true;
  resetProtection(P3); prot3 = { armed: [], trip: null }; clearBooms3D();
  rampTarget = 100; state.loadSet = 100; syncControlOutputs(); tickSim();
};
$('btn-trip').onclick = () => { state.tripped = true; rampTarget = null; focusEquipment(null); tickSim(); };
$('btn-overview').onclick = () => { camFrom.copy(camera.position); tgtFrom.copy(controls.target); camTo.set(280, 200, 320); tgtTo.set(10, 15, 10); camT = 0; focusEquipment(null); };

$('zone-nav').innerHTML = ZONE_PADS.map((z) =>
  `<button type="button" class="zone-chip" data-zone="${z.id}" data-x="${z.x}" data-z="${z.z}">${z.label}</button>`).join('');
document.querySelectorAll('.zone-chip').forEach((b) => {
  b.onclick = () => {
    document.querySelectorAll('.zone-chip').forEach((x) => x.classList.toggle('active', x === b));
    camFrom.copy(camera.position); tgtFrom.copy(controls.target);
    camTo.set(+b.dataset.x + 80, 70, +b.dataset.z + 100);
    tgtTo.set(+b.dataset.x, 8, +b.dataset.z);
    camT = 0;
  };
});
setLabelVisibility(null);

$('scenario-row').innerHTML = SCENARIOS.map((s) =>
  `<button class="scenario-chip" data-id="${s.id}" title="${s.note}">${s.name}</button>`).join('');
$('scenario-row').querySelectorAll('.scenario-chip').forEach((b) => {
  b.onclick = () => {
    const s = SCENARIOS.find((x) => x.id === b.dataset.id);
    const baseline = lastResult;
    state.tripped = false; state.running = true; rampTarget = null;
    resetProtection(P3); prot3 = { armed: [], trip: null }; clearBooms3D();
    state.loadSet = s.load; state.gcv = s.gcv; state.sulphur = s.sulphur; state.cwInlet = s.cwInlet; state.load = s.load;
    syncControlOutputs();
    lastResult = runPlant(plantInputs());
    prevResult = baseline;
    updateHUD(lastResult);
    updateVisuals(lastResult);
    renderImpacts('loadSet');
    $('scenario-row').querySelectorAll('.scenario-chip').forEach((x) => x.classList.toggle('active', x === b));
  };
});

buildControls();
syncControlOutputs();
tickSim();

const clock = new THREE.Clock();
let simAcc = 0;
let tAcc = 0;
(function loop() {
  requestAnimationFrame(loop);
  const dt = clock.getDelta();
  tAcc += dt;
  physicsStep(Math.min(0.05, dt));
  simAcc += dt;
  if (simAcc > 0.2) {
    simAcc = 0;
    tickSim();
  }

  if (camT < 1) {
    camT = Math.min(1, camT + dt / 1.4);
    const e = 1 - Math.pow(1 - camT, 3);
    camera.position.lerpVectors(camFrom, camTo, e);
    controls.target.lerpVectors(tgtFrom, tgtTo, e);
  }

  if (state.running && !state.tripped) {
    const rpm = lastResult?.inputs?.loadFrac ?? 0;
    spinners.forEach((o) => { o.rotation.y += dt * (1 + rpm * 5); });
  }

  /* ── live atmosphere + energy flow ── */
  const lf = lastResult?.inputs?.loadFrac ?? 0;
  const live = state.running && !state.tripped && (lastResult?.grossMW ?? 0) > 2 && state.fdFanOn;
  const blackNow = (performance.now() / 1000) < blackSmokeUntil;
  stackPlume.setColor(blackNow ? 0x161616 : (state.fgdOn ? 0xb9bdc1 : 0x8a6f54));
  stackPlume.update(dt, blackNow ? 1.0 : (live ? 0.28 + lf * 0.85 : 0.015));
  const towerInt = live ? 0.4 + lf * 0.6 : 0.04;
  towerPlumes.forEach((p) => p.update(dt, state.cwPumpPct > 0 ? towerInt : 0.02));
  const flow = live ? 0.35 + lf : 0.05;
  pipeFlows.forEach((f) => { f.tex.offset.x -= dt * flow * f.speed * 0.7; });
  waters.forEach((w, i) => { w.material.envMapIntensity = 1.1 + Math.sin(tAcc * 1.4 + i * 1.7) * 0.3; });
  if (furnace?.material) {
    furnace.material.emissiveIntensity = live
      ? (0.4 + lf * 0.9) * (0.9 + Math.sin(tAcc * 9) * 0.12)
      : (blackNow ? 2.2 : 0.02);
  }
  // expanding explosion fireballs
  for (const b of booms) { b.t += dt; b.m.scale.setScalar(1 + b.t * 16); b.m.material.opacity = Math.max(0, 1 - b.t / 1.2); }
  for (let i = booms.length - 1; i >= 0; i--) {
    if (booms[i].t > 1.25) { scene.remove(booms[i].m); booms[i].m.geometry.dispose(); booms.splice(i, 1); }
  }

  controls.update();
  renderer.render(scene, camera);
  labelRenderer.render(scene, camera);
})();
