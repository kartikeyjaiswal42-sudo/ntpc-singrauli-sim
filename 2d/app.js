import { runPlant, DESIGN, SCENARIOS } from './engine.js';
import { SCENES, sceneById } from './scenes.js';
import { EffectsLayer } from './effects.js';
import { EnergyBar, EffCurve, Trend } from './charts.js';
import manifest from './manifest.json' with { type: 'json' };

const PHOTO_BASE = '../photos/';
const photoUrl = (file) => `${PHOTO_BASE}${encodeURIComponent(file)}`;
const zonePhotos = (zone) => manifest.photos[zone] || [];
const catalogByFile = Object.fromEntries((manifest.catalog || []).map((p) => [p.file, p]));
const photoMeta = (file) => catalogByFile[file] || {};

if (location.protocol === 'file:') {
  throw new Error('Open via local web server — run ./start.sh first');
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
  cam: 'overview',
  photoFile: null,
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
const video = $('vp-video');
const layer = $('vp-layer');
const chipsEl = $('vp-chips');
const hotspotsEl = $('vp-hotspots');
const hotPop = $('hot-pop');
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
  $('cam-strip').innerHTML = SCENES.map((s) => {
    const n = zonePhotos(s.zone).length;
    return `<button class="cam-btn${s.id === state.cam ? ' active' : ''}" data-cam="${s.id}">
       <span class="cb-cam">CAM ${s.cam}</span>
       <span class="cb-name">${s.label}<span class="cb-n">${n}</span></span>
     </button>`;
  }).join('');
  $('cam-strip').querySelectorAll('.cam-btn').forEach((b) => {
    b.onclick = () => selectCamera(b.dataset.cam);
  });
  $('photo-meta').textContent = `${manifest.totalPhotos ?? manifest.total} photos · ${manifest.totalVideos ?? 0} videos · ${manifest.zoneCount ?? 14} zones`;
}

function renderPhotoStrip(scene) {
  const photos = zonePhotos(scene.zone);
  const label = manifest.zones[scene.zone]?.title || scene.label;
  $('photo-strip-label').textContent = label;
  const idx = photos.findIndex((p) => p.file === state.photoFile);
  $('photo-strip-count').textContent = photos.length
    ? `${(idx >= 0 ? idx : 0) + 1} / ${photos.length}`
    : '0 photos';

  $('photo-strip').innerHTML = photos.map((p) => {
    const comp = p.component || photoMeta(p.file).component || '';
    return `<button type="button" class="photo-thumb${p.file === state.photoFile ? ' active' : ''}" data-file="${p.file}" title="${comp ? comp + ' · ' : ''}${p.file}">
       <img src="${photoUrl(p.file)}" alt="" loading="lazy" decoding="async"/>
     </button>`;
  }).join('');

  $('photo-strip').querySelectorAll('.photo-thumb').forEach((b) => {
    b.onclick = () => selectPhoto(b.dataset.file);
  });

  const active = $('photo-strip').querySelector('.photo-thumb.active');
  if (active) active.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
}

function selectPhoto(file) {
  if (!file || state.photoFile === file) return;
  state.photoFile = file;
  
  const isVideo = file.toLowerCase().endsWith('.mp4');
  
  if (isVideo) {
    photo.classList.add('hidden');
    video.classList.remove('hidden');
    video.classList.remove('ready');
    video.src = photoUrl(file);
    video.onloadedmetadata = () => {
      video.classList.add('ready');
      layoutLayer();
    };
  } else {
    video.classList.add('hidden');
    photo.classList.remove('hidden');
    photo.classList.remove('ready');
    photo.onload = () => {
      photo.classList.add('ready');
      layoutLayer();
    };
    photo.src = photoUrl(file);
    if (photo.complete && photo.naturalWidth) {
      photo.classList.add('ready');
      layoutLayer();
    }
  }
  
  renderPhotoStrip(sceneById(state.cam));
  renderHotspots(file);

  if (!$('comp-explorer').classList.contains('hidden')) {
    updateExplorerUI(file);
  }
}

/* ── Hotspot overlays (clickable labelled callouts) ──── */
function hideHotPop() {
  hotPop.classList.add('hidden');
  hotspotsEl.querySelectorAll('.hotspot.active').forEach((m) => m.classList.remove('active'));
}

function showHotPop(marker, h) {
  hotspotsEl.querySelectorAll('.hotspot.active').forEach((m) => m.classList.remove('active'));
  marker.classList.add('active');
  $('hot-pop-label').textContent = h.label;
  $('hot-pop-detail').textContent = h.detail;
  // place the popover near the marker, kept inside the frame
  const lx = parseFloat(marker.style.left);
  const ly = parseFloat(marker.style.top);
  hotPop.style.left = `${Math.min(Math.max(lx, 22), 78)}%`;
  hotPop.style.top = `${ly > 55 ? ly - 4 : ly + 6}%`;
  hotPop.style.transform = `translate(-50%, ${ly > 55 ? '-100%' : '0'})`;
  hotPop.classList.remove('hidden');
}

function renderHotspots(file) {
  hideHotPop();
  const spots = (file ? photoMeta(file).hotspots : null) || [];
  hotspotsEl.innerHTML = spots.map((h, i) => `
    <button type="button" class="hotspot" data-i="${i}"
            style="left:${h.x * 100}%; top:${h.y * 100}%">
      <span class="hs-dot">${i + 1}</span>
      <span class="hs-tag">${h.label}</span>
    </button>`).join('');
  hotspotsEl.querySelectorAll('.hotspot').forEach((m) => {
    m.onclick = (e) => {
      e.stopPropagation();
      const h = spots[+m.dataset.i];
      if (m.classList.contains('active')) hideHotPop();
      else showHotPop(m, h);
    };
  });
  const hint = $('vp-hot-hint');
  if (spots.length) {
    $('vp-hot-n').textContent = spots.length;
    hint.classList.remove('hidden');
  } else {
    hint.classList.add('hidden');
  }
}

/* ── Component Detail Explorer Logic ─────────────────── */
function getLiveValue(key, result) {
  if (!result) return '—';
  if (key === 'gcv') return fmt(result.inputs?.gcv || 3600, 0) + ' kcal/kg';
  if (key === 'sulphur') return ((result.inputs?.sulphur || 0.42) * 100).toFixed(2) + ' %';
  if (key === 'furnaceTemp') {
    const temp = result.grossMW > 2 ? Math.round(1010 + 460 * result.inputs?.loadFrac) : null;
    return temp ? temp + ' °C' : 'offline';
  }
  if (key === 'ashTh') return (result.coalTh * 0.38).toFixed(1) + ' t/h';
  if (key === 'espDp') return (result.grossMW > 2 ? (15 + 10 * (result.inputs?.loadFrac || 0)).toFixed(0) : '0') + ' mm WC';
  
  const val = result[key];
  if (val === undefined) return '—';
  
  if (key === 'netMW' || key === 'grossMW' || key === 'mechMW') return fmt(val, 1) + ' MW';
  if (key === 'freq') return val.toFixed(2) + ' Hz';
  if (key === 'rpm') return fmt(val, 0) + ' rpm';
  if (key === 'steamTh' || key === 'coalTh' || key === 'co2Th' || key === 'gypsumTh') return fmt(val, 0) + ' t/h';
  if (key === 'cwM3h') return fmt(val, 0) + ' m³/h';
  if (key === 'cwDeltaT') return val.toFixed(1) + ' °C';
  if (key === 'cwInlet' || key === 'cwOutlet' || key === 'msT' || key === 'flueT') return Math.round(val) + ' °C';
  if (key === 'condDuty') return fmt(val / 1e6, 1) + 'M kcal/h';
  if (key === 'vacuumKgcm2g') return val.toFixed(3) + ' kg/cm²';
  if (key === 'msP') return val.toFixed(1) + ' kg/cm²';
  if (key === 'so2OutMg' || key === 'so2RawMg' || key === 'pmOutMg') return Math.round(val) + ' mg/Nm³';
  if (key === 'cycleEff' || key === 'boilerEff' || key === 'effNet') return (val * 100).toFixed(2) + ' %';
  if (key === 'auxMW') return val.toFixed(1) + ' MW';
  if (key === 'airKgh') return fmt(val / 1000, 0) + ' t/h';
  
  return val;
}

function updateExplorerUI(file) {
  const meta = photoMeta(file);
  const zone = sceneById(state.cam).zone;
  const zoneTitle = manifest.zones[zone]?.title || 'Singrauli';
  
  $('ce-zone-tag').textContent = zoneTitle;
  $('ce-title').textContent = meta.component || 'Plant Component';
  $('ce-what-is').textContent = meta.what_is_this || 'No description available.';
  $('ce-what-does').textContent = meta.what_it_does || 'No operational data available.';
  $('ce-insights').textContent = meta.engineering_insight || 'No design parameters documented.';
  
  const liveGrid = $('ce-live-grid');
  const liveRow = $('ce-live-row');
  const vars = meta.live_variables || {};
  
  if (Object.keys(vars).length === 0) {
    liveRow.classList.add('hidden');
    liveGrid.innerHTML = '';
  } else {
    liveRow.classList.remove('hidden');
    liveGrid.innerHTML = Object.entries(vars).map(([label, key]) => `
      <div class="ce-live-item">
        <span class="ce-live-label">${label}</span>
        <span class="ce-live-value" data-live-key="${key}">—</span>
      </div>
    `).join('');
    updateExplorerLiveValues();
  }
}

function updateExplorerLiveValues() {
  if (!currentResult) return;
  const grid = $('ce-live-grid');
  grid.querySelectorAll('[data-live-key]').forEach((el) => {
    const key = el.dataset.liveKey;
    el.textContent = getLiveValue(key, currentResult);
  });
}

function toggleExplorer() {
  const c = $('comp-explorer');
  const btn = $('vp-info-btn');
  const isHidden = c.classList.toggle('hidden');
  btn.classList.toggle('active', !isHidden);
  if (!isHidden && state.photoFile) {
    updateExplorerUI(state.photoFile);
  }
}

function openExplorer() {
  const c = $('comp-explorer');
  const btn = $('vp-info-btn');
  c.classList.remove('hidden');
  btn.classList.add('active');
  if (state.photoFile) {
    updateExplorerUI(state.photoFile);
  }
}

function closeExplorer() {
  const c = $('comp-explorer');
  const btn = $('vp-info-btn');
  c.classList.add('hidden');
  btn.classList.remove('active');
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
  const isVideo = state.photoFile && state.photoFile.toLowerCase().endsWith('.mp4');
  const iw = isVideo ? video.videoWidth : photo.naturalWidth;
  const ih = isVideo ? video.videoHeight : photo.naturalHeight;
  
  if (!iw || !ih || !box.width) return;
  const scale = Math.min(box.width / iw, box.height / ih);
  const w = iw * scale, h = ih * scale;
  layer.style.left = `${(box.width - w) / 2}px`;
  layer.style.top = `${(box.height - h) / 2}px`;
  layer.style.width = `${w}px`;
  layer.style.height = `${h}px`;
  fx.resize();
}

function selectCamera(id, photoIndex = 0) {
  const scene = sceneById(id);
  state.cam = scene.id;
  $('cam-strip').querySelectorAll('.cam-btn').forEach((b) =>
    b.classList.toggle('active', b.dataset.cam === scene.id));
  $('vp-cam').textContent = `CAM ${scene.cam}`;
  $('vp-label').textContent = scene.label;
  $('vp-sub').textContent = scene.sub;
  const meta = state.photoFile ? photoMeta(state.photoFile) : {};
  $('cam-caption').textContent = meta.component
    ? `${meta.component} · ${scene.caption}`
    : scene.caption;
  $('ledger-focus').textContent = scene.section ? scene.label : 'Full plant';

  const photos = zonePhotos(scene.zone);
  const hero = manifest.heroes[scene.zone];
  const file = photos[photoIndex]?.file || hero || photos[0]?.file;
  state.photoFile = file || null;

  if (file) {
    const isVideo = file.toLowerCase().endsWith('.mp4');
    if (isVideo) {
      photo.classList.add('hidden');
      video.classList.remove('hidden');
      video.classList.remove('ready');
      video.src = photoUrl(file);
      video.onloadedmetadata = () => {
        video.classList.add('ready');
        layoutLayer();
      };
    } else {
      video.classList.add('hidden');
      photo.classList.remove('hidden');
      photo.classList.remove('ready');
      photo.onload = () => {
        photo.classList.add('ready');
        layoutLayer();
      };
      photo.src = photoUrl(file);
      if (photo.complete && photo.naturalWidth) {
        photo.classList.add('ready');
        layoutLayer();
      }
    }
    
    if (!$('comp-explorer').classList.contains('hidden')) {
      updateExplorerUI(file);
    }
  }

  buildChips(scene);
  fx.setScene(scene.effects);
  renderPhotoStrip(scene);
  renderHotspots(state.photoFile);
  if (currentResult) { updateChips(scene, currentResult); renderLedger(currentResult); }
  scrollLedgerToFocus();
}

/* ── Component index / search ─────────────────────────── */
const ZONE_ORDER = ['overview', 'coal', 'boiler', 'chimney_fgd', 'turbine', 'condenser',
  'feedwater', 'pumphouse', 'chlorination', 'dm_water', 'electrical', 'control', 'auxiliary', 'unclassified'];

function buildIndexData() {
  // one entry per distinct component, pointing at its first photo
  const seen = new Set();
  const entries = [];
  (manifest.catalog || []).forEach((c) => {
    const key = c.zone + '|' + c.component;
    if (seen.has(key)) return;
    seen.add(key);
    const n = (manifest.photos[c.zone] || []).filter((p) => p.component === c.component).length;
    entries.push({ zone: c.zone, component: c.component, file: c.file, what: c.what_is_this || '', n });
  });
  return entries;
}
const INDEX = buildIndexData();

function renderIndex(query = '') {
  const q = query.trim().toLowerCase();
  const hits = INDEX.filter((e) =>
    !q || e.component.toLowerCase().includes(q) || e.what.toLowerCase().includes(q) ||
    (manifest.zones[e.zone]?.title || '').toLowerCase().includes(q));
  const byZone = {};
  hits.forEach((e) => { (byZone[e.zone] ||= []).push(e); });
  const html = ZONE_ORDER.filter((z) => byZone[z]).map((z) => `
    <div class="idx-zone">
      <div class="idx-zone-h">${manifest.zones[z]?.title || z}<span>${byZone[z].length}</span></div>
      ${byZone[z].map((e) => `
        <button type="button" class="idx-item" data-file="${e.file}" data-zone="${e.zone}">
          <img src="${photoUrl(e.file)}" alt="" loading="lazy"/>
          <span class="idx-item-txt"><b>${e.component}</b><small>${e.what.slice(0, 96)}${e.what.length > 96 ? '…' : ''}</small></span>
          <span class="idx-item-n">${e.n}📷</span>
        </button>`).join('')}
    </div>`).join('');
  $('idx-list').innerHTML = html || `<div class="idx-empty">No component matches “${query}”.</div>`;
  $('idx-list').querySelectorAll('.idx-item').forEach((b) => {
    b.onclick = () => jumpToPhoto(b.dataset.file, b.dataset.zone);
  });
}

function jumpToPhoto(file, zone) {
  closeIndex();
  // scene id matches zone id for all camera zones
  if (sceneById(zone).id === zone) selectCamera(zone);
  selectPhoto(file);
  openExplorer();
}

function openIndex() {
  $('index-modal').classList.remove('hidden');
  $('idx-search').value = '';
  renderIndex('');
  setTimeout(() => $('idx-search').focus(), 30);
}
function closeIndex() { $('index-modal').classList.add('hidden'); }

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

  if (!$('comp-explorer').classList.contains('hidden')) {
    updateExplorerLiveValues();
  }

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
  { cam: 'overview', title: 'Singrauli Stage-2 · 500 MW', desc: `Live site feed from ${manifest.total} photographs. Every overlay is computed from coal, steam and cycle data.` },
  { cam: 'chimney_fgd', title: 'Stack & FGD', desc: 'ESP removes >99.9% particulate; wet-limestone FGD scrubs ~95% of SO₂.' },
  { cam: 'boiler', title: 'Boiler & bunker bay', desc: 'Pulverised coal is fired in the furnace; boiler efficiency (~86%) sets how much fuel heat reaches the steam.' },
  { cam: 'coal', title: 'Coal handling', desc: 'MGR receipt through bunkers and XRP 1003 bowl mills to the furnace.' },
  { cam: 'turbine', title: 'Turbine–generator', desc: 'Steam expands through HP/IP/LP turbines spinning the generator at 3000 rpm.' },
  { cam: 'pumphouse', title: 'CW pump house', desc: 'Circulating-water pumps reject the cycle’s latent heat — the single largest energy loss.' },
  { cam: 'chlorination', title: 'Chlorination plant', desc: 'Electrochlorination and biocide dosing for cooling-water biofouling control.' },
  { cam: 'electrical', title: '400 kV switchyard', desc: 'Generator output stepped up for export to the national grid.' },
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
  if (e.key === 'Escape' && !$('comp-explorer').classList.contains('hidden')) closeExplorer();
});

$('ce-close').onclick = (e) => {
  e.stopPropagation();
  closeExplorer();
};
$('vp-info-btn').onclick = (e) => {
  e.stopPropagation();
  toggleExplorer();
};
$('vp-photo').onclick = (e) => {
  e.stopPropagation();
  hideHotPop();
  toggleExplorer();
};
$('vp-video').onclick = (e) => {
  e.stopPropagation();
  toggleExplorer();
};

/* ── Hotspot popover + component index events ────────── */
$('hot-pop-x').onclick = (e) => { e.stopPropagation(); hideHotPop(); };
$('hot-pop').onclick = (e) => e.stopPropagation();
$('btn-index').onclick = (e) => { e.stopPropagation(); openIndex(); };
$('idx-x').onclick = closeIndex;
$('index-modal').onclick = (e) => { if (e.target.id === 'index-modal') closeIndex(); };
$('idx-search').oninput = (e) => renderIndex(e.target.value);
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') { hideHotPop(); closeIndex(); }
  if ((e.key === 'i' || e.key === 'I') && !/input|textarea|select/i.test(document.activeElement.tagName)) openIndex();
});

window.addEventListener('resize', () => { layoutLayer(); paint(); });

/* ── Boot ────────────────────────────────────────────── */
renderScenarios();
renderCamStrip();
syncInputs();
paint();
selectCamera('overview');
requestAnimationFrame(loop);
setInterval(paint, 200);
