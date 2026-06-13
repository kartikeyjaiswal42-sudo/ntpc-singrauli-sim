import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { CSS2DRenderer } from 'three/examples/jsm/renderers/CSS2DRenderer.js';
import { runPlant, SCENARIOS } from '../2d/engine.js';
import { EQUIPMENT, EQUIPMENT_GROUPS } from '../illustrated/components.js';
import { buildPlant, pipeLegend, ZONE_PADS } from './plant.js';
import { setupSky, setupEnvironment, setupCloudField, Plume } from './fx.js';
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
  focusComp: null, focusZone: null, focusPath: 'generation',
  labelsOn: false, flowOn: true, autoRotate: false, guideOn: false,
};

let rampTarget = null;
let lastResult = null;
let prevResult = null;
let lastImpactKey = null;

function fmt(x, d = 0) {
  if (!isFinite(x)) return '—';
  return Number(x).toLocaleString('en-IN', { minimumFractionDigits: d, maximumFractionDigits: d });
}

const PROCESS_PATHS = [
  {
    id: 'generation', name: 'Operation', color: '#ffb74d',
    title: 'How power is generated',
    note: 'Coal energy becomes steam energy, shaft power, and finally high-voltage electrical power.',
    systems: ['coal', 'steam', 'power'],
    steps: [
      ['c-mgr', 'Coal arrives'], ['c-chp', 'Crush & convey'], ['c-mill', 'Pulverise'],
      ['c-furnace', 'Burn coal'], ['c-sh', 'Make steam'], ['c-hp', 'HP turbine'],
      ['c-rh', 'Reheat'], ['c-ip', 'IP / LP turbine'], ['c-gen', 'Generate'],
      ['c-gt', 'Step up'], ['c-yard', 'Export to grid'],
    ],
  },
  {
    id: 'steamwater', name: 'Steam–water', color: '#ff5575',
    title: 'Reheat Rankine steam–water cycle',
    note: 'A closed working-fluid loop: condense, pump, regenerate, boil, expand, reheat, expand, and condense again.',
    systems: ['steam', 'feedwater'],
    steps: [
      ['c-cond', 'Condenser'], ['c-cep', 'CEP'], ['c-lph', 'LP heaters'],
      ['c-deaerator', 'Deaerator'], ['c-tdbfp', 'Boiler feed pump'], ['c-hph', 'HP heaters'],
      ['c-eco', 'Economizer'], ['c-drum', 'Drum / waterwalls'], ['c-sh', 'Superheater'],
      ['c-hp', 'HP turbine'], ['c-rh', 'Reheater'], ['c-ip', 'IP / LP turbine'], ['c-cond', 'Condense'],
    ],
  },
  {
    id: 'airflue', name: 'Air & flue gas', color: '#8bcf78',
    title: 'Combustion-air and flue-gas path',
    note: 'FD and PA fans supply air; the ID fan keeps the furnace under negative pressure after particulate removal.',
    systems: ['coal', 'air', 'flue'],
    steps: [
      ['c-fd', 'FD fan'], ['c-aph', 'Air preheater'], ['c-furnace', 'Furnace'],
      ['c-eco', 'Rear pass'], ['c-aph', 'APH heat recovery'], ['c-esp', 'ESP'],
      ['c-idf', 'ID fan'], ['c-fgd', 'FGD / bypass'], ['c-stack', 'Stack'],
    ],
  },
  {
    id: 'cooling', name: 'Cooling water', color: '#42a5f5',
    title: 'Singrauli once-through cooling-water path',
    note: 'Stage-I/II draw Rihand water, pass it through condenser tubes once, and return warmer water through the discharge channel.',
    systems: ['cooling'],
    steps: [
      ['c-outfall', 'Rihand intake'], ['c-cwp', 'CW pumps'], ['c-cond', 'Condenser'],
      ['c-outfall', 'Hot-water discharge'],
    ],
  },
  {
    id: 'electrical', name: 'Electrical', color: '#ffd233',
    title: 'Electrical generation and evacuation',
    note: 'The generator makes 21 kV power; the GT raises it to 400 kV while the UAT supplies plant auxiliaries.',
    systems: ['power'],
    steps: [
      ['c-gen', 'Generator'], ['c-ipb', '21 kV IPB'], ['c-uat', 'Auxiliary branch'],
      ['c-gt', '21/400 kV GT'], ['c-yard', '400 kV switchyard'],
    ],
  },
  {
    id: 'ash', name: 'Ash', color: '#b5a58d',
    title: 'Bottom-ash and fly-ash handling',
    note: 'Bottom ash leaves below the furnace; fly ash is collected in ESP hoppers and pneumatically conveyed to silos.',
    systems: ['ash'],
    steps: [
      ['c-furnace', 'Combustion ash'], ['c-bottom-ash', 'Bottom ash slurry'],
      ['c-esp', 'ESP fly ash'], ['c-flyash', 'Fly-ash silos'], ['c-dyke', 'Offsite ash dyke'],
    ],
  },
];

const processPath = (id = state.focusPath) => PROCESS_PATHS.find((p) => p.id === id) || PROCESS_PATHS[0];

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
renderer.setPixelRatio(Math.min(devicePixelRatio, 1.6));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.shadowMap.autoUpdate = false;
renderer.shadowMap.needsUpdate = true;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 0.82;
renderer.outputColorSpace = THREE.SRGBColorSpace;

const labelRenderer = new CSS2DRenderer({ element: labelLayer });
labelRenderer.domElement.style.position = 'absolute';
labelRenderer.domElement.style.inset = '0';
labelRenderer.domElement.style.pointerEvents = 'none';

const scene = new THREE.Scene();
scene.fog = new THREE.Fog(0xc7d6df, 760, 1650);

const camera = new THREE.PerspectiveCamera(44, 1, 1, 20000);
camera.position.set(315, 188, 355);

const controls = new OrbitControls(camera, canvas);
controls.enableDamping = true;
controls.dampingFactor = 0.055;
controls.maxPolarAngle = Math.PI / 2.1;
controls.minDistance = 28;
controls.maxDistance = 720;
controls.zoomToCursor = true;
controls.target.set(15, 18, -12);

// sun direction shared by the sky shader and the shadow-casting light
// (polar 50° = 40° elevation; azimuth 205° = side/back light, sun out of the default view)
const sunDir = new THREE.Vector3().setFromSphericalCoords(
  1, THREE.MathUtils.degToRad(46), THREE.MathUtils.degToRad(132));

const hemi = new THREE.HemisphereLight(0xc9def0, 0x4d5142, 0.62);
scene.add(hemi);
scene.add(new THREE.AmbientLight(0xffffff, 0.08));
const sun = new THREE.DirectionalLight(0xffefd2, 2.15);
sun.position.copy(sunDir).multiplyScalar(320);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
sun.shadow.camera.left = -360;
sun.shadow.camera.right = 360;
sun.shadow.camera.top = 360;
sun.shadow.camera.bottom = -360;
sun.shadow.camera.far = 1200;
sun.shadow.bias = -0.0004;
scene.add(sun);

setupEnvironment(scene, renderer);
setupSky(scene, sunDir);
setupCloudField(scene);

const { root, pickables, spinners, glows, furnace, positions: equipmentMeshes,
  stackTop, towerTops, waters, movers, pipeFlows } = buildPlant();
scene.add(root);
const processPipes = root.getObjectByName('pipes');
if (processPipes) processPipes.visible = state.flowOn;

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
const zoneLabels = [];
root.traverse((o) => {
  if (o.element?.classList?.contains('plant-label')) {
    if (o.element.classList.contains('label-zone')) zoneLabels.push(o);
    else allLabels.push(o);
  }
});

function setLabelVisibility(compId, zoneId = state.focusZone) {
  const pathIds = new Set(processPath().steps.map(([id]) => id));
  allLabels.forEach((l) => {
    const pid = l.parent?.userData?.id;
    const pzone = l.parent?.userData?.zone;
    const visible = compId
      ? pid === compId
      : state.labelsOn && ((zoneId && pzone === zoneId) || (!zoneId && state.focusPath && pathIds.has(pid)));
    l.element.classList.toggle('label-hidden', !visible);
  });
  zoneLabels.forEach((l) => l.element.classList.toggle('label-hidden', Boolean(compId) || !state.labelsOn || Boolean(state.focusPath)));
}

const selectionBox = new THREE.Box3Helper(new THREE.Box3(), 0x51d8ff);
selectionBox.material.transparent = true;
selectionBox.material.opacity = 0.9;
selectionBox.visible = false;
scene.add(selectionBox);

const selectionRing = new THREE.Mesh(
  new THREE.RingGeometry(0.78, 1, 64),
  new THREE.MeshBasicMaterial({
    color: 0x51d8ff, transparent: true, opacity: 0.5,
    side: THREE.DoubleSide, depthWrite: false, blending: THREE.AdditiveBlending,
  }),
);
selectionRing.rotation.x = -Math.PI / 2;
selectionRing.visible = false;
scene.add(selectionRing);

function updateSelectionMarker(id) {
  const target = id && equipmentMeshes[id];
  if (!target) {
    selectionBox.visible = false;
    selectionRing.visible = false;
    return;
  }
  const bounds = new THREE.Box3().setFromObject(target);
  const size = bounds.getSize(new THREE.Vector3());
  const center = bounds.getCenter(new THREE.Vector3());
  selectionBox.box.copy(bounds).expandByScalar(1.5);
  selectionBox.visible = true;
  selectionRing.position.set(center.x, Math.max(0.3, bounds.min.y + 0.25), center.z);
  selectionRing.scale.setScalar(THREE.MathUtils.clamp(Math.max(size.x, size.z) * 0.72, 7, 40));
  selectionRing.visible = true;
}

function focusEquipment(id) {
  state.focusComp = id;
  state.focusZone = null;
  document.querySelectorAll('.eq-btn').forEach((b) => b.classList.toggle('active', b.dataset.comp === id));
  document.querySelectorAll('.zone-chip').forEach((b) => b.classList.remove('active'));
  document.querySelectorAll('.path-step').forEach((b) => b.classList.toggle('active', b.dataset.comp === id));
  renderDetail(id);
  setLabelVisibility(id || null);
  updateSelectionMarker(id);
  if (id && equipmentMeshes[id]) {
    const bounds = new THREE.Box3().setFromObject(equipmentMeshes[id]);
    const p = bounds.getCenter(new THREE.Vector3());
    const radius = bounds.getBoundingSphere(new THREE.Sphere()).radius;
    flyTo(p, THREE.MathUtils.clamp(radius * 2.8, 48, 190));
  }
}

const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();
const hoverTip = $('hover-tip');

function pickAt(e) {
  const r = canvas.getBoundingClientRect();
  pointer.x = ((e.clientX - r.left) / r.width) * 2 - 1;
  pointer.y = -((e.clientY - r.top) / r.height) * 2 + 1;
  raycaster.setFromCamera(pointer, camera);
  const hits = raycaster.intersectObjects(pickables, true);
  if (!hits.length) return null;
  let o = hits[0].object;
  while (o && !o.userData?.id) o = o.parent;
  return o?.userData?.id || null;
}

canvas.addEventListener('click', (e) => {
  const id = pickAt(e);
  if (id) focusEquipment(id);
});
canvas.addEventListener('pointermove', (e) => {
  const id = pickAt(e);
  canvas.classList.toggle('can-pick', Boolean(id));
  if (!id) {
    hoverTip.classList.remove('visible');
    return;
  }
  hoverTip.textContent = EQUIPMENT[id]?.name || id;
  hoverTip.style.left = `${e.clientX + 14}px`;
  hoverTip.style.top = `${e.clientY + 14}px`;
  hoverTip.classList.add('visible');
});
canvas.addEventListener('pointerleave', () => hoverTip.classList.remove('visible'));

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

  $('metric-net').textContent = fmt(r.netMW, 0);
  $('metric-heat').textContent = fmt(r.netHR, 0);
  $('metric-so2').textContent = fmt(r.so2OutMg, 0);
  $('metric-vacuum').textContent = fmt(r.vacuumKgcm2g, 3);
  $('metric-so2-card').classList.toggle('alarm', r.so2OutMg > 200);

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

function applyFlowFilter() {
  if (!processPipes) return;
  const systems = new Set(processPath().systems);
  processPipes.visible = state.flowOn;
  processPipes.children.forEach((p) => {
    p.visible = systems.has(p.userData.system);
  });
}

function renderPathUI() {
  const path = processPath();
  $('path-title').textContent = path.title;
  $('path-note').textContent = path.note;
  $('path-tabs').innerHTML = PROCESS_PATHS.map((p) =>
    `<button type="button" class="path-tab ${p.id === path.id ? 'active' : ''}" data-path="${p.id}" style="--path-color:${p.color}">${p.name}</button>`).join('');
  $('path-steps').innerHTML = path.steps.map(([id, text], i) =>
    `<button type="button" class="path-step ${state.focusComp === id ? 'active' : ''}" data-comp="${id}" data-step="${i}" style="--path-color:${path.color}">${text}</button>`).join('');
  $('path-tabs').querySelectorAll('.path-tab').forEach((b) => { b.onclick = () => selectPath(b.dataset.path); });
  $('path-steps').querySelectorAll('.path-step').forEach((b) => {
    b.onclick = () => {
      state.guideOn = false;
      $('btn-follow').classList.remove('active');
      $('btn-follow').textContent = 'Follow path';
      focusEquipment(b.dataset.comp);
    };
  });
}

function selectPath(id) {
  state.focusPath = id;
  state.focusZone = null;
  state.focusComp = null;
  state.flowOn = true;
  $('btn-flow').classList.add('active');
  document.querySelectorAll('.zone-chip').forEach((b) => b.classList.remove('active'));
  document.querySelectorAll('.eq-btn').forEach((b) => b.classList.remove('active'));
  updateSelectionMarker(null);
  renderDetail(null);
  applyFlowFilter();
  renderPathUI();
  setLabelVisibility(null);
}

let guideIndex = 0;
let guideElapsed = 0;
function stepGuide() {
  const path = processPath();
  const [id] = path.steps[guideIndex % path.steps.length];
  focusEquipment(id);
  guideIndex = (guideIndex + 1) % path.steps.length;
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
$('btn-overview').onclick = () => {
  camFrom.copy(camera.position); tgtFrom.copy(controls.target); camTo.set(315, 188, 355); tgtTo.set(15, 18, -12); camT = 0;
  focusEquipment(null);
  selectPath('generation');
};
$('btn-labels').onclick = () => {
  state.labelsOn = !state.labelsOn;
  $('btn-labels').classList.toggle('active', state.labelsOn);
  setLabelVisibility(state.focusComp);
};
$('btn-flow').onclick = () => {
  state.flowOn = !state.flowOn;
  applyFlowFilter();
  $('btn-flow').classList.toggle('active', state.flowOn);
};
$('btn-rotate').onclick = () => {
  state.autoRotate = !state.autoRotate;
  controls.autoRotate = state.autoRotate;
  controls.autoRotateSpeed = 0.45;
  $('btn-rotate').classList.toggle('active', state.autoRotate);
};
$('btn-follow').onclick = () => {
  state.guideOn = !state.guideOn;
  guideIndex = 0;
  guideElapsed = 0;
  $('btn-follow').classList.toggle('active', state.guideOn);
  $('btn-follow').textContent = state.guideOn ? 'Stop guide' : 'Follow path';
  if (state.guideOn) stepGuide();
};

$('zone-nav').innerHTML = ZONE_PADS.map((z) =>
  `<button type="button" class="zone-chip" data-zone="${z.id}" data-x="${z.x}" data-z="${z.z}">${z.label}</button>`).join('');
document.querySelectorAll('.zone-chip').forEach((b) => {
  b.onclick = () => {
    document.querySelectorAll('.zone-chip').forEach((x) => x.classList.toggle('active', x === b));
    state.focusComp = null;
    state.focusZone = b.dataset.zone;
    state.focusPath = null;
    state.guideOn = false;
    $('btn-follow').classList.remove('active');
    $('btn-follow').textContent = 'Follow path';
    updateSelectionMarker(null);
    renderDetail(null);
    document.querySelectorAll('.eq-btn').forEach((x) => x.classList.remove('active'));
    setLabelVisibility(null, state.focusZone);
    const zoneViews = {
      'z-fuel': { pos: [-95, 72, 70], target: [-185, 14, -70] },
      'z-dm': { pos: [-72, 58, 245], target: [-158, 9, 150] },
      'z-boiler': { pos: [92, 70, 80], target: [0, 31, -26] },
      'z-turbine': { pos: [225, 58, 88], target: [120, 12, -12] },
      'z-cw': { pos: [390, 100, 315], target: [235, 12, 150] },
      'z-env': { pos: [158, 78, -55], target: [25, 22, -155] },
      'z-ash': { pos: [105, 58, 235], target: [-12, 8, 145] },
      'z-grid': { pos: [345, 72, 25], target: [245, 10, -92] },
      'z-h2': { pos: [285, 55, 170], target: [190, 8, 90] },
    };
    const view = zoneViews[b.dataset.zone];
    camFrom.copy(camera.position); tgtFrom.copy(controls.target);
    camTo.set(...view.pos);
    tgtTo.set(...view.target);
    camT = 0;
  };
});
renderPathUI();
applyFlowFilter();
setLabelVisibility(null, null);

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
  if (state.guideOn) {
    guideElapsed += dt;
    if (guideElapsed > 4.2) {
      guideElapsed = 0;
      stepGuide();
    }
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

  if (selectionRing.visible) {
    selectionRing.material.opacity = 0.34 + Math.sin(tAcc * 3.5) * 0.16;
    selectionRing.rotation.z -= dt * 0.25;
  }

  movers.forEach((m) => {
    const route = m.userData.route;
    if (!route || !state.running) return;
    m.position[route.axis] += route.speed * route.dir * dt;
    if (m.position[route.axis] > route.max || m.position[route.axis] < route.min) {
      route.dir *= -1;
      m.rotation.y += Math.PI;
      m.position[route.axis] = THREE.MathUtils.clamp(m.position[route.axis], route.min, route.max);
    }
  });

  controls.update();
  renderer.render(scene, camera);
  labelRenderer.render(scene, camera);
})();
