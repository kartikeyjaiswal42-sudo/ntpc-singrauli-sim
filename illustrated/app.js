import { runPlant, SCENARIOS } from '../2d/engine.js';
import { buildScene, LEGEND, VIEWBOX } from './scene.js';
import { buildPFD, updatePFD } from './pfd.js';
import { buildDCS, updateDCS } from './dcs.js';
import { createProtection, stepProtection, resetProtection } from '../shared/protection.js';
import { EQUIPMENT, EQUIPMENT_GROUPS } from './components.js';

const P = createProtection();
let lastProt = { armed: [], trip: null };
const SVGNS = 'http://www.w3.org/2000/svg';

if (location.protocol === 'file:') {
  throw new Error('Open http://localhost:3000/illustrated/');
}

const $ = (id) => document.getElementById(id);

const state = {
  loadSet: 78,
  load: 78,
  gcv: 3600,
  sulphur: 0.42,
  ashFrac: 0.34,
  cwInlet: 27,
  excessAir: 1.20,
  burnerTilt: 0,
  millsInService: 3,
  cwPumpPct: 100,
  useTdbfp: true,
  bcpOn: true,
  fdFanOn: true,
  idFanOn: true,
  espOn: true,
  fgdOn: true,
  clO2On: true,
  running: true,
  tripped: false,
  focus: null,
  focusComp: null,
};

let rampTarget = null;
let lastResult = null;

$('scene').setAttribute('viewBox', VIEWBOX);
$('scene').innerHTML = buildScene();
$('pfd').innerHTML = buildPFD();
$('view-dcs').innerHTML = buildDCS();

let activeView = 'pfd';
document.querySelectorAll('.vbtn').forEach((b) => {
  b.onclick = () => {
    activeView = b.dataset.view;
    document.querySelectorAll('.vbtn').forEach((x) => x.classList.toggle('active', x === b));
    ['pfd', 'dcs', 'cutaway'].forEach((v) => $(`view-${v}`).classList.toggle('hidden', v !== activeView));
    clearBooms();
    if (state.tripped) restoreTripVisual();
    paint();
  };
});

$('legend').innerHTML = LEGEND.map((l) =>
  `<span class="li"><i style="background:${l.c}"></i>${l.t}</span>`).join('');

$('zone-list').innerHTML = EQUIPMENT_GROUPS.map((g) => `
  <div class="eq-group">
    <div class="eq-group-title">${g.name}</div>
    ${g.ids.map((id) => {
      const e = EQUIPMENT[id];
      return `<button type="button" class="zone-btn eq-btn" data-comp="${id}" data-zone="${e.zone}">
        <strong>${e.name}</strong><span>${e.tag}</span>
      </button>`;
    }).join('')}
  </div>`).join('');

function fmt(x, d = 0) {
  if (!isFinite(x)) return '—';
  return Number(x).toLocaleString('en-IN', { minimumFractionDigits: d, maximumFractionDigits: d });
}

function plantInputs() {
  return {
    load: state.tripped ? 0 : state.load,
    gcv: state.gcv,
    sulphur: state.sulphur,
    cwInlet: state.cwInlet,
    excessAir: state.excessAir,
    ashFrac: state.ashFrac,
    espOn: state.espOn,
    fgdOn: state.fgdOn,
    burnerTilt: state.burnerTilt,
    millsInService: state.millsInService,
    cwPumpPct: state.cwPumpPct,
    useTdbfp: state.useTdbfp,
    bcpOn: state.bcpOn,
    fdFanOn: state.fdFanOn,
    idFanOn: state.idFanOn,
    clO2On: state.clO2On,
  };
}

/* ── Controls (17 operator inputs) ───────────────────── */
const CONTROLS = [
  { type: 'slider', key: 'loadSet', label: 'Unit load', min: 0, max: 100, step: 1, fmt: (v) => `${v}%` },
  { type: 'slider', key: 'gcv', label: 'Coal GCV', min: 2800, max: 4500, step: 50, fmt: (v) => `${fmt(v, 0)} kcal/kg` },
  { type: 'slider', key: 'sulphur', label: 'Coal sulphur', min: 0.2, max: 0.9, step: 0.01, fmt: (v) => `${v.toFixed(2)}%`, scale: 100, displayScale: 0.01 },
  { type: 'slider', key: 'ashFrac', label: 'Coal ash', min: 0.28, max: 0.42, step: 0.01, fmt: (v) => `${(v * 100).toFixed(0)}%`, scale: 100, displayScale: 0.01 },
  { type: 'slider', key: 'cwInlet', label: 'CW inlet temperature', min: 20, max: 35, step: 1, fmt: (v) => `${v} °C` },
  { type: 'slider', key: 'excessAir', label: 'Excess combustion air', min: 1.0, max: 1.4, step: 0.02, fmt: (v) => `${Math.round((v - 1) * 100)}%`, scale: 50, displayScale: 0.02, offset: 1.0 },
  { type: 'slider', key: 'burnerTilt', label: 'Burner tilt angle', min: -30, max: 30, step: 1, fmt: (v) => `${v > 0 ? '+' : ''}${v}°` },
  { type: 'slider', key: 'millsInService', label: 'Mills in service (XRP 1003)', min: 1, max: 3, step: 1, fmt: (v) => `${v} / 3` },
  { type: 'slider', key: 'cwPumpPct', label: 'CW pump speed', min: 50, max: 100, step: 5, fmt: (v) => `${v}%` },
  { type: 'toggle', key: 'fdFanOn', label: 'FD fan (forced draft)' },
  { type: 'toggle', key: 'idFanOn', label: 'ID fan (induced draft)' },
  { type: 'toggle', key: 'bcpOn', label: 'Boiler circulating pumps (BCP)' },
  { type: 'toggle', key: 'useTdbfp', label: 'TDBFP (steam-driven feed pump)' },
  { type: 'toggle', key: 'espOn', label: 'ESP (fly ash collection)' },
  { type: 'toggle', key: 'fgdOn', label: 'FGD (SO₂ scrubber)' },
  { type: 'toggle', key: 'clO2On', label: 'ClO₂ biocide dosing' },
  { type: 'toggle', key: 'running', label: 'Unit synchronised / on bars', invertLabel: true },
];

function buildControls() {
  $('controls-list').innerHTML = CONTROLS.map((c, i) => {
    if (c.type === 'slider') {
      const min = c.scale ? (c.min - (c.offset || 0)) * c.scale : c.min;
      const max = c.scale ? (c.max - (c.offset || 0)) * c.scale : c.max;
      const val = c.scale ? (state[c.key] - (c.offset || 0)) * c.scale : state[c.key];
      return `<div class="ctrl" data-idx="${i}">
        <label><span>${c.label}</span><output id="out-${c.key}">${c.fmt(state[c.key])}</output></label>
        <input type="range" id="in-${c.key}" min="${min}" max="${max}" step="${c.step * (c.scale || 1)}" value="${val}"/>
      </div>`;
    }
    const on = state[c.key];
    return `<div class="ctrl toggle-row" data-idx="${i}">
      <span>${c.label}</span>
      <button type="button" class="toggle ${on ? 'on' : ''}" id="tog-${c.key}" aria-pressed="${on}"></button>
    </div>`;
  }).join('');

  CONTROLS.forEach((c) => {
    if (c.type === 'slider') {
      const el = $(`in-${c.key}`);
      el.oninput = () => {
        let v = +el.value;
        if (c.scale) v = v / c.scale + (c.offset || 0);
        state[c.key] = v;
        $(`out-${c.key}`).textContent = c.fmt(v);
        if (c.key === 'loadSet') {
          rampTarget = null;
          if (state.tripped && v > 0) state.tripped = false;
        }
        clearScenarios();
      };
    } else {
      $(`tog-${c.key}`).onclick = (e) => {
        if (c.key === 'running') {
          state.running = !state.running;
          if (state.running && state.tripped) { resetProtection(P); lastProt = { armed: [], trip: null }; clearBooms(); }
          state.tripped = false;
        } else {
          state[c.key] = !state[c.key];
        }
        e.currentTarget.classList.toggle('on', c.key === 'running' ? state.running : state[c.key]);
        e.currentTarget.setAttribute('aria-pressed', c.key === 'running' ? state.running : state[c.key]);
        if (c.key === 'running' && state.running) rampTarget = null;
        clearScenarios();
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
      btn.setAttribute('aria-pressed', on);
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

/* ── Inspect panel ───────────────────────────────────── */
function renderDetail(compId) {
  const comp = EQUIPMENT[compId];
  const el = $('detail');
  if (!comp) {
    el.innerHTML = '<p class="detail-placeholder">Click any equipment on the diagram or pick from the list below.</p>';
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

function focusEquipment(compId) {
  if (!compId || !EQUIPMENT[compId]) {
    state.focusComp = null;
    state.focus = null;
    document.querySelectorAll('.zone').forEach((g) => g.classList.remove('dim'));
    document.querySelectorAll('.comp-hit').forEach((g) => g.classList.remove('selected'));
    document.querySelectorAll('.eq-btn').forEach((b) => b.classList.remove('active'));
    renderDetail(null);
    return;
  }

  const eq = EQUIPMENT[compId];
  const toggleOff = state.focusComp === compId;
  state.focusComp = toggleOff ? null : compId;
  state.focus = toggleOff ? null : eq.zone;

  const zoneId = state.focus;
  document.querySelectorAll('.zone').forEach((g) => {
    g.classList.toggle('dim', zoneId && g.id !== zoneId);
  });
  document.querySelectorAll('.comp-hit').forEach((g) => {
    g.classList.toggle('selected', g.id === state.focusComp);
  });
  document.querySelectorAll('.eq-btn').forEach((b) =>
    b.classList.toggle('active', b.dataset.comp === state.focusComp));

  if (state.focusComp) {
    renderDetail(state.focusComp);
    document.getElementById(state.focusComp)?.scrollIntoView?.({ behavior: 'smooth', block: 'nearest', inline: 'center' });
  } else {
    renderDetail(null);
  }
}

document.querySelectorAll('.eq-btn').forEach((b) => {
  b.onclick = () => focusEquipment(b.dataset.comp);
});

document.querySelectorAll('.comp-hit').forEach((g) => {
  const activate = (e) => {
    e.stopPropagation();
    focusEquipment(g.id);
  };
  g.addEventListener('click', activate);
  g.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); activate(e); } });
});

/* ── Side tabs ───────────────────────────────────────── */
document.querySelectorAll('.stab').forEach((b) => {
  b.onclick = () => {
    document.querySelectorAll('.stab').forEach((x) => x.classList.toggle('active', x === b));
    $('panel-inspect').classList.toggle('hidden', b.dataset.tab !== 'inspect');
    $('panel-controls').classList.toggle('hidden', b.dataset.tab !== 'controls');
  };
});

/* ── Trip / explosion visuals ────────────────────────── */
function svgForView() {
  if (activeView === 'cutaway') return $('scene');
  if (activeView === 'pfd') return $('pfd');
  return null;
}
function clearBooms() {
  document.querySelectorAll('.boom').forEach((e) => e.remove());
  document.querySelectorAll('.tripped').forEach((e) => e.classList.remove('tripped'));
  document.body.classList.remove('boom-flash');
}
function spawnBoom(compId, explode) {
  document.body.classList.add('boom-flash');
  setTimeout(() => document.body.classList.remove('boom-flash'), 700);
  const svg = svgForView();
  if (!svg) return;
  const sel = (window.CSS && CSS.escape) ? CSS.escape(compId) : compId;
  const node = svg.querySelector('#' + sel);
  if (!node) return;
  node.classList.add('tripped');
  let bb; try { bb = node.getBBox(); } catch (e) { return; }
  const cx = bb.x + bb.width / 2, cy = bb.y + bb.height / 2, u = Math.max(bb.width, bb.height) || 60;
  const g = document.createElementNS(SVGNS, 'g');
  g.setAttribute('class', 'boom');
  const circle = (r, fill, cls, stroke) => {
    const c = document.createElementNS(SVGNS, 'circle');
    c.setAttribute('cx', cx); c.setAttribute('cy', cy); c.setAttribute('r', r);
    c.setAttribute('fill', fill); if (stroke) { c.setAttribute('stroke', stroke); c.setAttribute('stroke-width', u * 0.04); }
    c.setAttribute('class', cls); return c;
  };
  if (explode) {
    g.appendChild(circle(u * 1.1, '#ffce6b', 'fire f1'));
    g.appendChild(circle(u * 0.8, '#ff7a1a', 'fire f2'));
    g.appendChild(circle(u * 0.5, '#fff3c0', 'fire f3'));
    g.appendChild(circle(u * 0.5, 'none', 'ring', '#fff'));
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2, d = u * (1.2 + Math.random() * 1.4);
      const deb = circle(u * (0.03 + Math.random() * 0.05), '#2a1c0e', 'deb');
      deb.style.setProperty('--dx', `${Math.cos(a) * d}px`);
      deb.style.setProperty('--dy', `${Math.sin(a) * d}px`);
      g.appendChild(deb);
    }
  }
  const tr = circle(u * 0.72, 'none', 'tripring', '#ff3b30');
  tr.setAttribute('stroke-dasharray', `${u * 0.09} ${u * 0.07}`);
  g.appendChild(tr);
  svg.appendChild(g);
}
function restoreTripVisual() {
  if (lastProt.trip) spawnBoom(lastProt.trip.target, false);
  else if (state.tripped) spawnBoom('c-gen', false);
}

/* ── Paint & dynamics ────────────────────────────────── */
function paint() {
  lastResult = runPlant(plantInputs());
  const r = lastResult;

  const prot = stepProtection(P, state, r, 0.2, performance.now() / 1000);
  lastProt = prot;
  if (prot.justTripped) {
    state.tripped = true; rampTarget = null;
    spawnBoom(prot.trip.target, prot.trip.explode);
    syncControlOutputs();
  }

  const on = state.running && !state.tripped && r.grossMW > 2 && state.fdFanOn;

  $('hero').textContent = state.tripped ? 'Unit tripped'
    : !state.running ? 'Frozen'
    : `${fmt(r.netMW, 0)} MW · ${fmt(r.inputs.loadFrac * 100, 0)}%`;

  const pill = $('status-pill');
  const fdOff = state.running && !state.tripped && !state.fdFanOn;
  pill.textContent = state.tripped ? 'Tripped' : !state.running ? 'Paused' : fdOff ? 'No FD fan' : !state.idFanOn ? 'ID fan off' : 'On bars';
  pill.className = `status-pill ${state.tripped ? 'bad' : !state.running || fdOff || !state.idFanOn ? 'warn' : 'good'}`;

  const scene = $('scene');
  const lf = r.inputs.loadFrac;
  scene.style.setProperty('--load', state.tripped ? 0.02 : Math.max(0.05, lf).toFixed(3));
  scene.style.setProperty('--flow', state.tripped ? 0.05 : Math.max(0.12, lf * state.millsInService / 3).toFixed(3));

  document.body.classList.toggle('running', on);
  document.body.classList.toggle('paused', !state.running && !state.tripped);
  document.body.classList.toggle('tripped', state.tripped);
  document.body.classList.toggle('fd-off', !state.fdFanOn);
  document.body.classList.toggle('esp-off', !state.espOn);
  document.body.classList.toggle('fgd-off', !state.fgdOn);

  document.querySelectorAll('#c-mill .mill-unit').forEach((g, i) => {
    g.style.opacity = i < state.millsInService ? 1 : 0.22;
  });

  if (activeView === 'pfd') updatePFD(r, state);
  else if (activeView === 'dcs') updateDCS(r, state, prot);

  if (state.focusComp) renderDetail(state.focusComp);
}

function physicsStep(dt) {
  if (!state.running) return;
  let target = state.tripped ? 0 : (rampTarget ?? state.loadSet);
  if (!state.fdFanOn) target = 0;
  const rate = state.tripped ? 60 : 14;
  const diff = target - state.load;
  state.load += Math.sign(diff) * Math.min(Math.abs(diff), rate * dt);
  if (rampTarget != null && Math.abs(state.load - rampTarget) < 0.4) rampTarget = null;
}

function clearScenarios() {
  $('scenario-row').querySelectorAll('.scenario-chip').forEach((b) => b.classList.remove('active'));
}

function applyScenario(s) {
  state.tripped = false;
  state.running = true;
  resetProtection(P); lastProt = { armed: [], trip: null }; clearBooms();
  rampTarget = null;
  state.loadSet = s.load;
  state.gcv = s.gcv;
  state.sulphur = s.sulphur;
  state.cwInlet = s.cwInlet;
  state.load = s.load;
  syncControlOutputs();
}

$('btn-pause').onclick = () => { state.running = !state.running; $('btn-pause').textContent = state.running ? 'Pause' : 'Resume'; syncControlOutputs(); };
$('btn-ramp').onclick = () => {
  state.tripped = false; state.running = true; state.fdFanOn = true; state.idFanOn = true; state.bcpOn = true;
  resetProtection(P); lastProt = { armed: [], trip: null }; clearBooms();
  rampTarget = 100; state.loadSet = 100;
  syncControlOutputs(); clearScenarios();
};
$('btn-trip').onclick = () => {
  state.tripped = true; rampTarget = null; focusEquipment(null);
  spawnBoom('c-gen', false);
};

$('scenario-row').innerHTML = SCENARIOS.map((s) =>
  `<button class="scenario-chip" data-id="${s.id}" title="${s.note}">${s.name}</button>`).join('');
$('scenario-row').querySelectorAll('.scenario-chip').forEach((b) => {
  b.onclick = () => {
    applyScenario(SCENARIOS.find((x) => x.id === b.dataset.id));
    $('scenario-row').querySelectorAll('.scenario-chip').forEach((x) => x.classList.toggle('active', x === b));
  };
});

let last = performance.now();
(function loop(now) {
  physicsStep(Math.min(0.05, (now - last) / 1000));
  last = now;
  requestAnimationFrame(loop);
})(performance.now());

buildControls();
syncControlOutputs();
paint();
setInterval(paint, 200);
