import { runPlant, DESIGN, SCENARIOS } from './engine.js';
import { SCENES, sceneById } from './scenes.js';
import { EffectsLayer } from './effects.js';
import { EnergyBar, EffCurve, Trend } from './charts.js';

if (location.protocol === 'file:') {
  throw new Error('Open via http://localhost:3000/2d/ — run ./start.sh first');
}

/* ── State ───────────────────────────────────────────── */
const state = {
  loadSet: 78,
  load: 78,
  gcv: 3600,
  sulphur: 0.42,
  cwInlet: 27,
  running: true,
  tripped: false,
  cam: 'plant',
  tourActive: false,
  tourIndex: 0,
};

let rampTarget = null;
let tourTimer = null;

/* ── DOM ─────────────────────────────────────────────── */
const $ = (id) => document.getElementById(id);
const kpiBand = $('kpi-band');
const ledgerEl = $('ledger');
const scenarioRow = $('scenario-row');

const viewport = $('viewport');
const photo = $('vp-photo');
const layer = $('vp-layer');
const chipsEl = $('vp-chips');
const fx = new EffectsLayer($('vp-fx'));

const energyChart = new EnergyBar($('energy-canvas'));
const effChart = new EffCurve($('eff-canvas'));
const trend = new Trend($('trend-canvas'));

/* ── Efficiency curve baseline ───────────────────────── */
const effCurvePoints = [];
for (let l = 30; l <= 100; l += 2) {
  effCurvePoints.push({ load: l, eff: runPlant({ load: l, gcv: 3600, sulphur: 0.42, cwInlet: 27 }).effNet });
}

/* ── KPI definitions ─────────────────────────────────── */
const KPIS = [
  { hero: true, label: 'Net to grid', unit: 'MW', foot: (r) => `gross ${fmt(r.grossMW, 0)} MW`, val: (r) => fmt(r.netMW, 1) },
  { label: 'Net heat rate', unit: 'kcal/kWh', foot: (r) => `gross ${fmt(r.grossHR, 0)}`, val: (r) => fmt(r.netHR, 0) },
  { label: 'Net efficiency', unit: '%', foot: () => `860 ÷ NHR`, val: (r) => fmt(r.effNet * 100, 1) },
  { label: 'Coal firing', unit: 't/h', foot: (r) => `${fmt(r.sCC, 3)} kg/kWh`, val: (r) => fmt(r.coalTh, 0) },
  { label: 'Plant load factor', unit: '%', foot: (r) => `of ${DESIGN.ratedMW} MW`, val: (r) => fmt(r.plf * 100, 0) },
  { label: 'CO₂ intensity', unit: 't/h', foot: (r) => `SO₂ ${fmt(r.so2OutMg, 0)} mg/Nm³`, val: (r) => fmt(r.co2Th, 0) },
];

function fmt(x, d = 0) {
  if (!isFinite(x)) return '—';
  return Number(x).toLocaleString('en-IN', { minimumFractionDigits: d, maximumFractionDigits: d });
}

/* ── Renderers ───────────────────────────────────────── */
function renderKpis(r) {
  kpiBand.innerHTML = KPIS.map((k) => `
    <div class="kpi${k.hero ? ' hero' : ''}">
      <div class="k-label">${k.label}</div>
      <div class="k-val">${k.val(r)}<small>${k.unit}</small></div>
      <div class="k-foot">${k.foot(r)}</div>
    </div>`).join('');
}

let ledgerBuilt = false;
function buildLedgerStructure(r) {
  ledgerEl.innerHTML = r.ledger.map((sec, si) => {
    const steps = sec.steps.map((s, sti) => `
      <div class="ls-step">
        <div class="ls-sym">${s.sym}</div>
        <div class="ls-mid">
          <div class="ls-name">${s.name}</div>
          <div class="ls-expr" data-expr="${si}-${sti}">${s.expr}</div>
        </div>
        <div class="ls-val" data-val="${si}-${sti}">${s.val}<small>${s.unit}</small></div>
      </div>`).join('');
    return `
      <div class="ledger-section" data-section="${sec.id}">
        <div class="ls-head">
          <span class="ls-bar" style="background:${sec.accent}"></span>
          <span class="ls-title">${sec.title}</span>
        </div>
        ${steps}
      </div>`;
  }).join('');
  ledgerBuilt = true;
}

function renderLedger(r) {
  if (!ledgerBuilt) buildLedgerStructure(r);
  // update live figures in place (preserves scroll position)
  r.ledger.forEach((sec, si) => sec.steps.forEach((s, sti) => {
    const v = ledgerEl.querySelector(`[data-val="${si}-${sti}"]`);
    const e = ledgerEl.querySelector(`[data-expr="${si}-${sti}"]`);
    if (v) v.innerHTML = `${s.val}<small>${s.unit}</small>`;
    if (e) e.textContent = s.expr;
  }));
  const focusSection = sceneById(state.cam).section;
  ledgerEl.querySelectorAll('.ledger-section').forEach((d) =>
    d.classList.toggle('focus', !!focusSection && d.dataset.section === focusSection));
}

function scrollLedgerToFocus() {
  const focusSection = sceneById(state.cam).section;
  const sec = focusSection && ledgerEl.querySelector(`[data-section="${focusSection}"]`);
  if (sec) ledgerEl.scrollTo({ top: sec.offsetTop - 4, behavior: 'smooth' });
  else ledgerEl.scrollTo({ top: 0, behavior: 'smooth' });
}

function renderScenarios() {
  scenarioRow.innerHTML = SCENARIOS.map((s) =>
    `<button class="scenario-chip" data-scenario="${s.id}" title="${s.note}">${s.name}</button>`
  ).join('');
  scenarioRow.querySelectorAll('.scenario-chip').forEach((b) => {
    b.onclick = () => applyScenario(b.dataset.scenario);
  });
}

function applyScenario(id) {
  const s = SCENARIOS.find((x) => x.id === id);
  if (!s) return;
  state.tripped = false;
  state.running = true;
  rampTarget = null;
  state.loadSet = s.load;
  state.gcv = s.gcv;
  state.sulphur = s.sulphur;
  state.cwInlet = s.cwInlet;
  syncInputs();
  scenarioRow.querySelectorAll('.scenario-chip').forEach((b) =>
    b.classList.toggle('active', b.dataset.scenario === id));
  $('run-text').textContent = `${s.name} · ${s.note}`;
}

function syncInputs() {
  $('in-load').value = Math.round(state.loadSet);
  $('in-gcv').value = state.gcv;
  $('in-sul').value = Math.round(state.sulphur * 100);
  $('in-cw').value = Math.round(state.cwInlet);
  $('out-load').textContent = `${Math.round(state.loadSet)}%`;
  $('out-gcv').textContent = fmt(state.gcv, 0);
  $('out-sul').textContent = `${state.sulphur.toFixed(2)}%`;
  $('out-cw').textContent = `${Math.round(state.cwInlet)} °C`;
}

/* ── Camera viewport ─────────────────────────────────── */
function renderCamStrip() {
  $('cam-strip').innerHTML = SCENES.map((s) =>
    `<button class="cam-btn${s.id === state.cam ? ' active' : ''}" data-cam="${s.id}">
       <span class="cb-cam">CAM ${s.cam}</span>
       <span class="cb-name">${s.label}</span>
     </button>`).join('');
  $('cam-strip').querySelectorAll('.cam-btn').forEach((b) => {
    b.onclick = () => selectCamera(b.dataset.cam);
  });
}

function buildChips(scene) {
  chipsEl.innerHTML = scene.telemetry.map((t, i) => `
    <div class="chip tone-${t.tone || 'info'}${t.pin ? ' pin' : ''}"
         data-i="${i}" style="left:${t.x * 100}%; top:${t.y * 100}%">
      <span class="chip-k">${t.k}</span>
      <span class="chip-v">—</span>
    </div>`).join('');
}

function updateChips(scene, r) {
  scene.telemetry.forEach((t, i) => {
    const el = chipsEl.querySelector(`.chip[data-i="${i}"] .chip-v`);
    if (el) el.textContent = t.v(r);
  });
}

function layoutLayer() {
  const box = viewport.getBoundingClientRect();
  const iw = photo.naturalWidth, ih = photo.naturalHeight;
  if (!iw || !ih || !box.width) return;
  const scale = Math.min(box.width / iw, box.height / ih);
  const w = iw * scale, h = ih * scale;
  layer.style.left = `${(box.width - w) / 2}px`;
  layer.style.top = `${(box.height - h) / 2}px`;
  layer.style.width = `${w}px`;
  layer.style.height = `${h}px`;
  fx.resize();
}

function selectCamera(id) {
  const scene = sceneById(id);
  state.cam = scene.id;
  $('cam-strip').querySelectorAll('.cam-btn').forEach((b) =>
    b.classList.toggle('active', b.dataset.cam === scene.id));
  $('vp-cam').textContent = `CAM ${scene.cam}`;
  $('vp-label').textContent = scene.label;
  $('vp-sub').textContent = scene.sub;
  $('cam-caption').textContent = scene.caption;
  $('ledger-focus').textContent = scene.section ? scene.label : 'Full plant';

  photo.classList.remove('ready');
  photo.onload = () => { photo.classList.add('ready'); layoutLayer(); };
  photo.src = scene.photo;
  if (photo.complete && photo.naturalWidth) { photo.classList.add('ready'); layoutLayer(); }

  buildChips(scene);
  fx.setScene(scene.effects);
  if (currentResult) { updateChips(scene, currentResult); renderLedger(currentResult); }
  scrollLedgerToFocus();
}

/* ── Compute + paint ─────────────────────────────────── */
let currentResult = null;
function compute() {
  const effLoad = state.tripped ? 0 : state.load;
  currentResult = runPlant({ load: effLoad, gcv: state.gcv, sulphur: state.sulphur, cwInlet: state.cwInlet });
  return currentResult;
}

function paint() {
  const r = compute();
  renderKpis(r);
  renderLedger(r);
  updateChips(sceneById(state.cam), r);
  energyChart.draw(r.energy);
  effChart.draw(effCurvePoints, { load: Math.max(30, state.load || 30), eff: r.effNet });
  trend.push(r.netMW);
  trend.draw('#16a34a', DESIGN.ratedMW);
  $('trend-now').textContent = `${fmt(r.netMW, 0)} MW`;

  document.body.classList.toggle('running', state.running && !state.tripped);
  document.body.classList.toggle('paused', !state.running && !state.tripped);
  document.body.classList.toggle('tripped', state.tripped);
}

/* ── Dynamics + effects loop ─────────────────────────── */
function physicsStep(dt) {
  if (!state.running) return;
  const target = state.tripped ? 0 : (rampTarget != null ? rampTarget : state.loadSet);
  const rate = state.tripped ? 60 : 14; // %/s
  const diff = target - state.load;
  const step = Math.sign(diff) * Math.min(Math.abs(diff), rate * dt);
  state.load += step;
  if (rampTarget != null && Math.abs(state.load - rampTarget) < 0.4) rampTarget = null;
}

let last = performance.now();
function loop(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  physicsStep(dt);
  const liveLoad = state.tripped ? 0 : state.load;
  fx.setState({ intensity: liveLoad / 100, running: state.running && !state.tripped });
  fx.render(dt);
  $('vp-time').textContent = new Date().toLocaleTimeString('en-GB');
  requestAnimationFrame(loop);
}

/* ── Controls ────────────────────────────────────────── */
$('in-load').oninput = (e) => {
  state.loadSet = +e.target.value;
  rampTarget = null;
  if (state.tripped && state.loadSet > 0) state.tripped = false;
  $('out-load').textContent = `${state.loadSet}%`;
  clearScenarioActive();
};
$('in-gcv').oninput = (e) => { state.gcv = +e.target.value; $('out-gcv').textContent = fmt(state.gcv, 0); clearScenarioActive(); };
$('in-sul').oninput = (e) => { state.sulphur = +e.target.value / 100; $('out-sul').textContent = `${state.sulphur.toFixed(2)}%`; clearScenarioActive(); };
$('in-cw').oninput = (e) => { state.cwInlet = +e.target.value; $('out-cw').textContent = `${state.cwInlet} °C`; clearScenarioActive(); };

function clearScenarioActive() {
  scenarioRow.querySelectorAll('.scenario-chip').forEach((b) => b.classList.remove('active'));
  if (!state.tripped) $('run-text').textContent = 'Manual operation';
}

$('btn-pause').onclick = (e) => {
  state.running = !state.running;
  e.currentTarget.textContent = state.running ? '⏸ Pause' : '▶ Resume';
  $('run-text').textContent = state.running ? 'Synchronised · on bars' : 'Freeze-frame (paused)';
};
$('btn-ramp').onclick = () => {
  state.tripped = false; state.running = true;
  rampTarget = 100; state.loadSet = 100;
  syncInputs();
  $('run-text').textContent = 'Ramping to full load';
  clearScenarioActive();
};
$('btn-trip').onclick = () => {
  state.tripped = true;
  rampTarget = null;
  $('run-text').textContent = 'UNIT TRIPPED · turbine coasting down';
  clearScenarioActive();
};

/* ── Guided tour (camera walk-through) ───────────────── */
const TOUR = [
  { cam: 'plant', title: 'Singrauli Stage-2 · 500 MW', desc: 'Live site feed. Every figure overlaid on the photo is computed from coal, steam and cycle data — no lookup tables.' },
  { cam: 'boiler', title: 'Boiler & bunker bay', desc: 'Pulverised coal is fired in the furnace; boiler efficiency (~86%) sets how much fuel heat reaches the steam.' },
  { cam: 'furnace', title: 'Furnace fireball', desc: 'The combustion glow follows the firing rate. Furnace gas approaches ~1450 °C at full load.' },
  { cam: 'turbine', title: 'Turbine–generator', desc: 'Steam expands through HP/IP/LP turbines spinning the generator at 3000 rpm. Shaft power = gross ÷ generator efficiency.' },
  { cam: 'cwpump', title: 'CW pump house', desc: 'Circulating-water pumps reject the cycle’s latent heat — the single largest energy loss in the balance.' },
  { cam: 'stack', title: 'Stack & emissions', desc: 'ESP removes >99.9% particulate; the plume you see is scrubbed flue gas. SO₂ and PM are tracked live.' },
  { cam: 'fgd', title: 'FGD / scrubber', desc: 'Wet-limestone FGD scrubs ~95% of SO₂, producing gypsum as a saleable by-product.' },
];

function stopTour() {
  state.tourActive = false;
  $('btn-tour').textContent = '▶ Guided tour';
  $('btn-tour').classList.remove('on');
  $('tour-toast').classList.add('hidden');
  clearTimeout(tourTimer);
}

function tourStep() {
  if (!state.tourActive) return;
  const t = TOUR[state.tourIndex];
  $('tour-num').textContent = `${state.tourIndex + 1} / ${TOUR.length}`;
  $('tour-title').textContent = t.title;
  $('tour-desc').textContent = t.desc;
  $('tour-toast').classList.remove('hidden');
  selectCamera(t.cam);
  state.tourIndex++;
  if (state.tourIndex >= TOUR.length) { tourTimer = setTimeout(stopTour, 7000); return; }
  tourTimer = setTimeout(tourStep, 7000);
}

$('btn-tour').onclick = () => {
  if (state.tourActive) { stopTour(); return; }
  state.tourActive = true; state.tourIndex = 0;
  $('btn-tour').textContent = '■ Stop tour';
  $('btn-tour').classList.add('on');
  tourStep();
};
$('tour-skip').onclick = stopTour;
document.addEventListener('keydown', (e) => {
  if (e.key === 't' || e.key === 'T') $('btn-tour').click();
  if (e.key === 'Escape' && state.tourActive) stopTour();
});

window.addEventListener('resize', () => { layoutLayer(); paint(); });

/* ── Boot ────────────────────────────────────────────── */
renderScenarios();
renderCamStrip();
syncInputs();
paint();
selectCamera('plant');
requestAnimationFrame(loop);
setInterval(paint, 200);
