// scenes.js — the "camera console": each real photograph of NTPC Singrauli is
// turned into a live equipment view. Telemetry chips are anchored in normalised
// photo coordinates (0..1) and animation effects (smoke, glow, spin, water) are
// painted by effects.js on top of the actual image.

const f = (x, d = 0) => (isFinite(x) ? Number(x).toLocaleString('en-IN', {
  minimumFractionDigits: d, maximumFractionDigits: d,
}) : '—');

// Derived furnace gas temperature (not in the core ledger) — illustrative.
const furnaceTemp = (r) => (r.grossMW > 2 ? Math.round(1010 + 460 * r.inputs.loadFrac) : null);

export const SCENES = [
  {
    id: 'plant', cam: '01', label: 'Full Plant', sub: 'Stage-2 · twin 500 MW stacks',
    section: null, photo: './img/plant.jpg',
    caption: 'Live site view — multi-flue RCC chimneys. Plume opacity tracks unit load and FGD performance.',
    effects: [
      { type: 'smoke', x: 0.455, y: 0.075, drift: 0.45, scale: 1.0 },
      { type: 'smoke', x: 0.745, y: 0.150, drift: 0.5, scale: 0.85 },
    ],
    telemetry: [
      { x: 0.16, y: 0.10, k: 'Net to grid', tone: 'good', v: (r) => `${f(r.netMW, 0)} MW` },
      { x: 0.16, y: 0.20, k: 'Gross', tone: 'info', v: (r) => `${f(r.grossMW, 0)} MW` },
      { x: 0.455, y: 0.30, k: 'Flue gas', tone: 'warn', v: (r) => `${f(r.flueNm3h / 1000, 0)}k Nm³/h`, pin: true },
      { x: 0.80, y: 0.36, k: 'Stack SO₂', tone: 'info', v: (r) => `${f(r.so2OutMg, 0)} mg/Nm³`, pin: true },
    ],
  },
  {
    id: 'boiler', cam: '02', label: 'Boiler & Bunker Bay', sub: 'furnace · SH / RH · ducting',
    section: 'boiler', photo: './img/boiler.jpg',
    caption: 'Boiler house and bunker bay. Pulverised coal fired in the furnace raises ~537 °C main steam.',
    effects: [
      { type: 'flame', x: 0.30, y: 0.66, r: 0.13 },
      { type: 'steam', x: 0.28, y: 0.18, drift: 0.5, scale: 0.6 },
    ],
    telemetry: [
      { x: 0.66, y: 0.16, k: 'Main steam', tone: 'good', v: (r) => `${f(r.steamTh, 0)} t/h` },
      { x: 0.66, y: 0.27, k: 'Pressure', tone: 'info', v: (r) => `${f(r.msP, 0)} kg/cm²` },
      { x: 0.66, y: 0.38, k: 'Temp', tone: 'warn', v: (r) => `${f(r.msT, 0)} °C` },
      { x: 0.30, y: 0.66, k: 'Boiler η', tone: 'info', v: (r) => `${f(r.boilerEff * 100, 1)} %`, pin: true },
    ],
  },
  {
    id: 'furnace', cam: '03', label: 'Furnace Fireball', sub: 'burner front · peep-hole',
    section: 'boiler', photo: './img/furnace.jpg',
    caption: 'Through the inspection port — the live combustion fireball. Glow intensity follows firing rate.',
    effects: [
      { type: 'flame', x: 0.55, y: 0.43, r: 0.20 },
      { type: 'flame', x: 0.55, y: 0.43, r: 0.09 },
    ],
    telemetry: [
      { x: 0.20, y: 0.16, k: 'Furnace gas', tone: 'bad', v: (r) => (furnaceTemp(r) ? `${f(furnaceTemp(r), 0)} °C` : 'offline') },
      { x: 0.20, y: 0.27, k: 'Coal firing', tone: 'warn', v: (r) => `${f(r.coalTh, 0)} t/h` },
      { x: 0.20, y: 0.38, k: 'Comb. air', tone: 'info', v: (r) => `${f(r.airKgh / 1000, 0)} t/h` },
    ],
  },
  {
    id: 'turbine', cam: '04', label: 'Turbine–Generator', sub: 'HP/IP/LP · 3000 rpm',
    section: 'turbine', photo: './img/turbine.jpg',
    caption: 'Turbine hall — lagged casings and bearing pedestals. Shaft drives the generator at 3000 rpm.',
    effects: [
      { type: 'steam', x: 0.52, y: 0.30, drift: -0.4, scale: 0.55 },
      { type: 'spin', x: 0.135, y: 0.55, r: 0.045, blades: 3, color: '#7fe1ff', speed: 1 },
      { type: 'spin', x: 0.86, y: 0.40, r: 0.05, blades: 4, color: '#ff9b6b', speed: 1 },
    ],
    telemetry: [
      { x: 0.30, y: 0.13, k: 'Shaft power', tone: 'good', v: (r) => `${f(r.mechMW, 0)} MW` },
      { x: 0.30, y: 0.24, k: 'Speed', tone: 'info', v: (r) => `${f(r.rpm, 0)} rpm` },
      { x: 0.66, y: 0.13, k: 'Cycle η', tone: 'info', v: (r) => `${f(r.cycleEff * 100, 1)} %` },
      { x: 0.66, y: 0.24, k: 'Frequency', tone: 'good', v: (r) => `${f(r.freq, 2)} Hz` },
    ],
  },
  {
    id: 'cwpump', cam: '05', label: 'CW Pump House', sub: 'vertical circulating-water pumps',
    section: 'cw', photo: './img/pumphouse.jpg',
    caption: 'Circulating-water pumps push cooling water through the condenser to reject the cycle heat.',
    effects: [
      { type: 'spin', x: 0.30, y: 0.30, r: 0.06, blades: 4, color: '#7fe1ff', speed: 1 },
      { type: 'spin', x: 0.55, y: 0.36, r: 0.045, blades: 4, color: '#7fe1ff', speed: 1 },
      { type: 'water', x: 0.06, y: 0.82, w: 0.5, amp: 0.012, color: '#37b6ff' },
    ],
    telemetry: [
      { x: 0.30, y: 0.30, k: 'CW flow', tone: 'good', v: (r) => `${f(r.cwM3h, 0)} m³/h`, pin: true },
      { x: 0.74, y: 0.16, k: 'ΔT rise', tone: 'warn', v: (r) => `${f(r.cwDeltaT, 1)} °C` },
      { x: 0.74, y: 0.27, k: 'Cond. duty', tone: 'info', v: (r) => `${f(r.condDuty / 1e6, 0)}M kcal/h` },
    ],
  },
  {
    id: 'intake', cam: '06', label: 'CW Intake & Screens', sub: 'travelling water screens',
    section: 'cw', photo: './img/intake.jpg',
    caption: 'Travelling screens at the intake filter the cooling water before the CW pumps.',
    effects: [
      { type: 'water', x: 0.12, y: 0.78, w: 0.7, amp: 0.014, color: '#3fb0ff' },
    ],
    telemetry: [
      { x: 0.55, y: 0.16, k: 'CW inlet', tone: 'good', v: (r) => `${f(r.cwInlet, 0)} °C` },
      { x: 0.55, y: 0.27, k: 'CW outlet', tone: 'warn', v: (r) => `${f(r.cwOutlet, 1)} °C` },
      { x: 0.55, y: 0.38, k: 'Vacuum', tone: 'info', v: (r) => `${f(r.vacuumKgcm2g, 3)} kg/cm²` },
    ],
  },
  {
    id: 'stack', cam: '07', label: 'Stack & Emissions', sub: 'multi-flue chimney',
    section: 'env', photo: './img/chimney.jpg',
    caption: 'Stack emissions monitoring. Post-ESP / post-FGD figures are continuously computed.',
    effects: [
      { type: 'smoke', x: 0.345, y: 0.075, drift: 0.4, scale: 0.95 },
      { type: 'smoke', x: 0.735, y: 0.095, drift: 0.45, scale: 0.8 },
    ],
    telemetry: [
      { x: 0.345, y: 0.30, k: 'SO₂ stack', tone: 'good', v: (r) => `${f(r.so2OutMg, 0)} mg/Nm³`, pin: true },
      { x: 0.16, y: 0.50, k: 'PM (post-ESP)', tone: 'good', v: (r) => `${f(r.pmOutMg, 1)} mg/Nm³` },
      { x: 0.16, y: 0.60, k: 'CO₂', tone: 'warn', v: (r) => `${f(r.co2Th, 0)} t/h` },
    ],
  },
  {
    id: 'fgd', cam: '08', label: 'FGD / Scrubber', sub: 'wet limestone · oxidation air',
    section: 'env', photo: './img/fgd.jpg',
    caption: 'Wet-limestone FGD scrubs ~95% of SO₂; the oxidation blower converts sulphite to gypsum.',
    effects: [
      { type: 'pulse', x: 0.5, y: 0.4, r: 0.16, color: '#3ad29f' },
    ],
    telemetry: [
      { x: 0.5, y: 0.14, k: 'SO₂ in', tone: 'bad', v: (r) => `${f(r.so2RawMg, 0)} mg/Nm³` },
      { x: 0.5, y: 0.62, k: 'SO₂ out', tone: 'good', v: (r) => `${f(r.so2OutMg, 0)} mg/Nm³` },
      { x: 0.5, y: 0.74, k: 'Gypsum', tone: 'info', v: (r) => `${f(r.gypsumTh, 1)} t/h` },
    ],
  },
];

export const sceneById = (id) => SCENES.find((s) => s.id === id) || SCENES[0];
