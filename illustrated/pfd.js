// pfd.js — accurate Process Flow Diagram of the 500 MW unit.
// Each system is a node; flows are correctly connected, colour-coded, animated,
// and carry LIVE values from runPlant(). Clicking a node opens its explanation.

export const PFD_VIEWBOX = '0 0 1700 1020';

// medium colours (match the cutaway legend)
const C = {
  coal: '#1f2937', air: '#8aa0b4', steam: '#ff5e7a', reheat: '#ff9bb0',
  feed: '#1ba3c4', cw: '#2f8fe0', cwhot: '#e8472a', flue: '#8a93a0',
  power: '#e0a400', mech: '#9aa6b2', ash: '#9c8f7a',
};

const f = (x, d = 0) => (isFinite(x) ? Number(x).toLocaleString('en-IN',
  { minimumFractionDigits: d, maximumFractionDigits: d }) : '—');
const furnaceTemp = (r) => (r.grossMW > 2 ? Math.round(1010 + 460 * (r.inputs?.loadFrac || 0)) : 0);

// ── nodes: id (matches EQUIPMENT where possible), label, box, live value ─────
const N = {
  'c-chp':      { x: 40,  y: 120, w: 150, h: 66, t: 'Coal & CHP',        v: (r) => `${f(r.coalTh)} t/h` },
  'c-mill':     { x: 250, y: 120, w: 150, h: 66, t: 'Pulverising mills', v: (r, s) => `${s.millsInService}/3 mills` },
  'c-fd':       { x: 40,  y: 250, w: 150, h: 60, t: 'FD fan · air',      v: (r) => `${f(r.airKgh / 1000)} t/h` },
  'c-paf':      { x: 40,  y: 348, w: 150, h: 60, t: 'PA fan',            v: () => 'to mills' },
  'c-aph':      { x: 250, y: 300, w: 150, h: 60, t: 'Air pre-heater',    v: () => 'heat recovery' },
  'c-drum':     { x: 470, y: 96,  w: 220, h: 96, t: 'Drum · SH · RH',    v: (r) => `${f(r.msT)} °C / ${f(r.msP)} ata` },
  'c-furnace':  { x: 470, y: 198, w: 220, h: 286, t: 'Furnace · waterwalls', v: (r) => (r.grossMW > 2 ? `${f(furnaceTemp(r))} °C` : 'shut'), glow: true },
  'c-eco':      { x: 470, y: 492, w: 220, h: 66, t: 'Economizer',        v: () => 'feed pre-heat' },
  'c-hp':       { x: 770, y: 150, w: 120, h: 84, t: 'HP turbine',        v: () => 'expand' },
  'c-ip':       { x: 930, y: 150, w: 120, h: 84, t: 'IP turbine',        v: () => 'reheat' },
  'c-lp':       { x: 1090, y: 150, w: 150, h: 92, t: 'LP turbine',       v: () => 'low-p' },
  'c-gen':      { x: 1300, y: 150, w: 160, h: 92, t: 'Generator',        v: (r) => `${f(r.grossMW)} MW · ${f(r.freq, 2)} Hz` },
  'c-gt':       { x: 1510, y: 150, w: 150, h: 92, t: 'GT → 400 kV grid', v: (r) => `${f(r.netMW)} MW` },
  'c-cond':     { x: 1090, y: 600, w: 150, h: 92, t: 'Condenser',        v: (r) => `${f(r.vacuumKgcm2g, 3)} ata` },
  'c-cep':      { x: 900, y: 606, w: 130, h: 70, t: 'Condensate pumps',  v: () => 'hotwell → ' },
  'c-deaerator':{ x: 720, y: 606, w: 130, h: 70, t: 'Deaerator',         v: () => 'de-aerate' },
  'c-tdbfp':    { x: 540, y: 606, w: 130, h: 70, t: 'Boiler feed pump',  v: (r) => `${f(r.steamTh * 1.02)} t/h` },
  'c-esp':      { x: 40,  y: 720, w: 150, h: 70, t: 'ESP',               v: (r) => `${f(r.pmOutMg)} mg/Nm³` },
  'c-idf':      { x: 250, y: 720, w: 120, h: 70, t: 'ID fan',            v: () => 'draught' },
  'c-fgd':      { x: 420, y: 720, w: 150, h: 70, t: 'FGD / bypass',      v: (r) => `SO₂ ${f(r.so2OutMg)}` },
  'c-stack':    { x: 640, y: 640, w: 96,  h: 168, t: 'Stack',           v: (r) => `${f(r.co2Th)} t/h CO₂` },
  'c-cwp':      { x: 1320, y: 740, w: 130, h: 64, t: 'CW pumps',         v: (r) => `${f(r.cwM3h)} m³/h` },
  'c-outfall':  { x: 1510, y: 600, w: 150, h: 92, t: 'Rihand / outfall', v: (r) => `ΔT ${f(r.cwDeltaT, 1)} °C` },
};

const cx = (id) => N[id].x + N[id].w / 2;
const cy = (id) => N[id].y + N[id].h / 2;
const port = (id, s) => {
  const n = N[id];
  if (s === 'R') return [n.x + n.w, cy(id)];
  if (s === 'L') return [n.x, cy(id)];
  if (s === 'T') return [cx(id), n.y];
  if (s === 'B') return [cx(id), n.y + n.h];
  return [cx(id), cy(id)];
};

// orthogonal elbow path: mode 'h' = horizontal-first, 'v' = vertical-first
function route(a, b, mode = 'h') {
  if (mode === 'v') return `M${a[0]},${a[1]} L${a[0]},${b[1]} L${b[0]},${b[1]}`;
  const mx = (a[0] + b[0]) / 2;
  return `M${a[0]},${a[1]} L${mx},${a[1]} L${mx},${b[1]} L${b[0]},${b[1]}`;
}

// ── edges: from-port → to-port, medium colour, live label, routing mode ──────
const E = [
  { a: ['c-chp', 'R'], b: ['c-mill', 'L'], c: C.coal, l: () => 'crushed coal' },
  { a: ['c-mill', 'R'], b: ['c-furnace', 'L'], c: C.coal, l: (r) => `PF ${f(r.coalTh)} t/h` },
  { a: ['c-fd', 'R'], b: ['c-aph', 'L'], c: C.air, l: () => 'comb. air' },
  { a: ['c-aph', 'R'], b: ['c-furnace', 'L'], c: C.air, l: () => 'hot air' },
  { a: ['c-paf', 'R'], b: ['c-mill', 'L'], c: C.air, l: () => 'primary air', m: 'v' },
  // steam / power
  { a: ['c-drum', 'R'], b: ['c-hp', 'L'], c: C.steam, l: (r) => `MS ${f(r.msT)}°C · ${f(r.steamTh)} t/h`, w: 5 },
  { a: ['c-hp', 'T'], b: ['c-drum', 'T'], c: C.reheat, l: () => 'cold reheat', m: 'v' },
  { a: ['c-drum', 'R'], b: ['c-ip', 'L'], c: C.steam, l: () => 'hot reheat 538°C' },
  { a: ['c-ip', 'R'], b: ['c-lp', 'L'], c: C.steam, l: () => 'crossover' },
  { a: ['c-lp', 'B'], b: ['c-cond', 'T'], c: C.steam, l: () => 'LP exhaust', m: 'v' },
  { a: ['c-lp', 'R'], b: ['c-gen', 'L'], c: C.mech, l: () => 'shaft 3000 rpm', w: 6, dash: false },
  { a: ['c-gen', 'R'], b: ['c-gt', 'L'], c: C.power, l: (r) => `${f(r.grossMW)} MW` },
  { a: ['c-gt', 'R'], b: [null, null, [1690, 196]], c: C.power, l: (r) => `${f(r.netMW)} MW → grid` },
  // condensate / feedwater loop
  { a: ['c-cond', 'L'], b: ['c-cep', 'R'], c: C.feed, l: () => 'condensate' },
  { a: ['c-cep', 'L'], b: ['c-deaerator', 'R'], c: C.feed, l: () => 'LP heaters →' },
  { a: ['c-deaerator', 'L'], b: ['c-tdbfp', 'R'], c: C.feed, l: () => 'de-aerated' },
  { a: ['c-tdbfp', 'L'], b: ['c-eco', 'B'], c: C.feed, l: (r) => `feed ${f(r.steamTh * 1.02)} t/h`, m: 'v' },
  // Singrauli Stage-I/II once-through cooling water
  { a: ['c-cwp', 'T'], b: ['c-cond', 'B'], c: C.cw, l: (r) => `CW ${f(r.cwM3h)} m³/h`, m: 'v' },
  { a: ['c-cond', 'R'], b: ['c-outfall', 'L'], c: C.cwhot, l: (r) => `discharge +${f(r.cwDeltaT, 1)}°C` },
  { a: ['c-outfall', 'B'], b: ['c-cwp', 'R'], c: C.cw, l: () => 'Rihand intake', m: 'v' },
  // flue-gas train
  { a: ['c-furnace', 'B'], b: ['c-eco', 'T'], c: C.flue, l: () => 'flue gas', m: 'v', hide: true },
  { a: ['c-eco', 'B'], b: ['c-esp', 'T'], c: C.flue, l: () => 'flue gas', m: 'v' },
  { a: ['c-esp', 'R'], b: ['c-idf', 'L'], c: C.flue, l: (r) => `PM ${f(r.pmOutMg)}` },
  { a: ['c-idf', 'R'], b: ['c-fgd', 'L'], c: C.flue, l: () => 'to retrofit / bypass' },
  { a: ['c-fgd', 'R'], b: ['c-stack', 'L'], c: C.flue, l: () => 'to stack' },
];

function nodeSVG(id) {
  const n = N[id];
  const glow = n.glow ? `<ellipse class="pfd-glow" cx="${cx(id)}" cy="${n.y + n.h * 0.62}" rx="${n.w * 0.42}" ry="${n.h * 0.36}" fill="url(#pfdFlame)"/>` : '';
  return `<g class="pfd-node comp-hit" id="${id}" data-comp="${id}" tabindex="0" role="button">
    <rect class="pfd-box${n.glow ? ' furnace' : ''}" x="${n.x}" y="${n.y}" width="${n.w}" height="${n.h}" rx="9"/>
    ${glow}
    <text class="pfd-t" x="${cx(id)}" y="${n.y + 26}" text-anchor="middle">${n.t}</text>
    <text class="pfd-v" id="pv-${id}" x="${cx(id)}" y="${n.y + n.h - 14}" text-anchor="middle">—</text>
  </g>`;
}

function edgeSVG(e, i) {
  const a = port(e.a[0], e.a[1]);
  const b = e.b[0] ? port(e.b[0], e.b[1]) : e.b[2];
  const d = route(a, b, e.m || 'h');
  const dash = e.dash === false ? '' : ' pfd-flow';
  const mid = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
  return `<g class="pfd-edge">
    <path class="pfd-line" d="${d}" stroke="${e.c}" stroke-width="${e.w || 3.5}" marker-end="url(#pfdArrow)"/>
    <path class="pfd-dash${dash}" d="${d}" stroke="${e.c}" stroke-width="${(e.w || 3.5) + 0.5}"/>
    ${e.hide ? '' : `<text class="pfd-l" id="pl-${i}" x="${mid[0]}" y="${mid[1] - 7}" text-anchor="middle">${typeof e.l === 'function' ? '' : e.l}</text>`}
  </g>`;
}

export function buildPFD() {
  const defs = `<defs>
    <marker id="pfdArrow" markerWidth="9" markerHeight="9" refX="7" refY="4.5" orient="auto">
      <path d="M0,0 L9,4.5 L0,9 z" fill="#445"/>
    </marker>
    <radialGradient id="pfdFlame" cx="0.5" cy="0.6" r="0.6">
      <stop offset="0" stop-color="#ffd36b" stop-opacity="0.95"/>
      <stop offset="0.6" stop-color="#ff7a1a" stop-opacity="0.6"/>
      <stop offset="1" stop-color="#ff5a1a" stop-opacity="0"/>
    </radialGradient>
    <pattern id="pfdGrid" width="34" height="34" patternUnits="userSpaceOnUse">
      <path d="M34 0 H0 V34" fill="none" stroke="#e6ebf1" stroke-width="1"/>
    </pattern>
  </defs>`;
  const bg = `<rect width="1700" height="1020" fill="#f7f9fc"/><rect width="1700" height="1020" fill="url(#pfdGrid)"/>`;
  // section bands
  const bands = `
    <text class="pfd-band" x="30" y="60">FUEL · AIR · FLUE GAS</text>
    <text class="pfd-band" x="770" y="60">STEAM CYCLE → GENERATOR → 400 kV GRID</text>
    <text class="pfd-band" x="540" y="585">CONDENSATE · FEED-WATER LOOP</text>
    <text class="pfd-band" x="1300" y="585">ONCE-THROUGH COOLING WATER</text>`;
  const edges = E.map(edgeSVG).join('');
  const nodes = Object.keys(N).map(nodeSVG).join('');
  return PFD_HEADER(defs + bg + bands + edges + nodes);
}
const PFD_HEADER = (inner) => inner;

// live update — node values, edge labels, flow speed
export function updatePFD(r, s) {
  const root = document.getElementById('pfd');
  if (!root) return;
  Object.keys(N).forEach((id) => {
    const el = document.getElementById(`pv-${id}`);
    if (el) el.textContent = N[id].v(r, s);
  });
  E.forEach((e, i) => {
    if (e.hide || typeof e.l !== 'function') return;
    const el = document.getElementById(`pl-${i}`);
    if (el) el.textContent = e.l(r);
  });
  const lf = s.tripped ? 0.02 : Math.max(0.05, r.inputs?.loadFrac || 0);
  root.style.setProperty('--pfd-flow', lf.toFixed(3));
  root.classList.toggle('off', !(s.running && !s.tripped && r.grossMW > 2 && s.fdFanOn));
}
