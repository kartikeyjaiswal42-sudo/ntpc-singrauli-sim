// scenes.js — camera zones mapped to all 387 site photos (via manifest.json)

const f = (x, d = 0) => (isFinite(x) ? Number(x).toLocaleString('en-IN', {
  minimumFractionDigits: d, maximumFractionDigits: d,
}) : '—');

const furnaceTemp = (r) => (r.grossMW > 2 ? Math.round(1010 + 460 * r.inputs.loadFrac) : null);

export const SCENES = [
  {
    id: 'overview', cam: '01', zone: 'overview',
    label: 'Full Plant', sub: 'Stage-2 · twin 500 MW stacks',
    section: null,
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
    id: 'chimney_fgd', cam: '02', zone: 'chimney_fgd',
    label: 'Stack & FGD', sub: 'multi-flue chimney · scrubber',
    section: 'env',
    caption: 'Stack emissions monitoring. Post-ESP / post-FGD figures are continuously computed.',
    effects: [
      { type: 'smoke', x: 0.345, y: 0.075, drift: 0.4, scale: 0.95 },
      { type: 'smoke', x: 0.735, y: 0.095, drift: 0.45, scale: 0.8 },
      { type: 'pulse', x: 0.5, y: 0.4, r: 0.16, color: '#3ad29f' },
    ],
    telemetry: [
      { x: 0.345, y: 0.30, k: 'SO₂ stack', tone: 'good', v: (r) => `${f(r.so2OutMg, 0)} mg/Nm³`, pin: true },
      { x: 0.16, y: 0.50, k: 'PM (post-ESP)', tone: 'good', v: (r) => `${f(r.pmOutMg, 1)} mg/Nm³` },
      { x: 0.16, y: 0.60, k: 'CO₂', tone: 'warn', v: (r) => `${f(r.co2Th, 0)} t/h` },
      { x: 0.5, y: 0.74, k: 'Gypsum', tone: 'info', v: (r) => `${f(r.gypsumTh, 1)} t/h` },
    ],
  },
  {
    id: 'boiler', cam: '03', zone: 'boiler',
    label: 'Boiler & Bunker Bay', sub: 'furnace · SH / RH · ducting',
    section: 'boiler',
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
    id: 'coal', cam: '04', zone: 'coal',
    label: 'Coal Handling', sub: 'MGR · bunkers · XRP mills',
    section: 'coal',
    caption: 'Coal receipt, crushing, conveying and pulverising — fuel path to the furnace.',
    effects: [
      { type: 'spin', x: 0.45, y: 0.55, r: 0.05, blades: 4, color: '#8a9aaa', speed: 0.8 },
    ],
    telemetry: [
      { x: 0.20, y: 0.16, k: 'Coal firing', tone: 'warn', v: (r) => `${f(r.coalTh, 0)} t/h` },
      { x: 0.20, y: 0.27, k: 'GCV', tone: 'info', v: (r) => `${f(r.inputs?.gcv || 3600, 0)} kcal/kg` },
      { x: 0.20, y: 0.38, k: 'Sulphur', tone: 'bad', v: (r) => `${f((r.inputs?.sulphur || 0.42) * 100, 2)} %` },
    ],
  },
  {
    id: 'turbine', cam: '05', zone: 'turbine',
    label: 'Turbine–Generator', sub: 'HP/IP/LP · 3000 rpm',
    section: 'turbine',
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
    id: 'condenser', cam: '06', zone: 'condenser',
    label: 'Condenser', sub: 'vacuum · LP exhaust',
    section: 'turbine',
    caption: 'Surface condenser rejects latent heat from the LP exhaust steam into circulating water.',
    effects: [
      { type: 'water', x: 0.2, y: 0.75, w: 0.6, amp: 0.012, color: '#37b6ff' },
    ],
    telemetry: [
      { x: 0.55, y: 0.16, k: 'Vacuum', tone: 'info', v: (r) => `${f(r.vacuumKgcm2g, 3)} kg/cm²` },
      { x: 0.55, y: 0.27, k: 'Cond. duty', tone: 'warn', v: (r) => `${f(r.condDuty / 1e6, 0)}M kcal/h` },
      { x: 0.55, y: 0.38, k: 'CW ΔT', tone: 'good', v: (r) => `${f(r.cwDeltaT, 1)} °C` },
    ],
  },
  {
    id: 'pumphouse', cam: '07', zone: 'pumphouse',
    label: 'CW Pump House', sub: 'vertical circulating-water pumps',
    section: 'cw',
    caption: 'Circulating-water pumps push cooling water through the condenser to reject the cycle heat.',
    effects: [
      { type: 'spin', x: 0.30, y: 0.30, r: 0.06, blades: 4, color: '#7fe1ff', speed: 1 },
      { type: 'spin', x: 0.55, y: 0.36, r: 0.045, blades: 4, color: '#7fe1ff', speed: 1 },
      { type: 'water', x: 0.06, y: 0.82, w: 0.5, amp: 0.012, color: '#37b6ff' },
    ],
    telemetry: [
      { x: 0.30, y: 0.30, k: 'CW flow', tone: 'good', v: (r) => `${f(r.cwM3h, 0)} m³/h`, pin: true },
      { x: 0.74, y: 0.16, k: 'ΔT rise', tone: 'warn', v: (r) => `${f(r.cwDeltaT, 1)} °C` },
      { x: 0.74, y: 0.27, k: 'CW inlet', tone: 'good', v: (r) => `${f(r.cwInlet, 0)} °C` },
      { x: 0.74, y: 0.38, k: 'CW outlet', tone: 'info', v: (r) => `${f(r.cwOutlet, 1)} °C` },
    ],
  },
  {
    id: 'feedwater', cam: '08', zone: 'feedwater',
    label: 'Feed-water & BFP', sub: 'deaerator · heaters · BFP',
    section: 'boiler',
    caption: 'Condensate is reheated and pressurised by boiler feed pumps before entering the economiser.',
    effects: [
      { type: 'steam', x: 0.4, y: 0.25, drift: 0.3, scale: 0.4 },
    ],
    telemetry: [
      { x: 0.25, y: 0.16, k: 'Feed flow', tone: 'good', v: (r) => `${f(r.steamTh * 1.02, 0)} t/h` },
      { x: 0.25, y: 0.27, k: 'BFP duty', tone: 'info', v: (r) => `${f(r.bfpMW || r.mechMW * 0.02, 1)} MW` },
    ],
  },
  {
    id: 'dm_water', cam: '09', zone: 'dm_water',
    label: 'DM Water Plant', sub: 'ion exchange · make-up',
    section: 'aux',
    caption: 'Demineralised make-up water for boiler and auxiliary systems.',
    effects: [],
    telemetry: [
      { x: 0.5, y: 0.2, k: 'Make-up', tone: 'info', v: () => '~12 m³/h' },
    ],
  },
  {
    id: 'hydrogen', cam: '10', zone: 'hydrogen',
    label: 'Hydrogen Plant', sub: 'generator cooling gas',
    section: 'aux',
    caption: 'Electrolytic hydrogen for generator stator cooling and purging.',
    effects: [
      { type: 'pulse', x: 0.5, y: 0.45, r: 0.12, color: '#b39ddb' },
    ],
    telemetry: [
      { x: 0.5, y: 0.2, k: 'H₂ purity', tone: 'good', v: () => '99.7 %' },
    ],
  },
  {
    id: 'chlorination', cam: '11', zone: 'chlorination',
    label: 'Chlorination', sub: 'ClO₂ / NaOCl dosing',
    section: 'cw',
    caption: 'Electrochlorination and biocide dosing for cooling-water biofouling control.',
    effects: [
      { type: 'water', x: 0.12, y: 0.78, w: 0.7, amp: 0.014, color: '#3fb0ff' },
    ],
    telemetry: [
      { x: 0.55, y: 0.16, k: 'ClO₂', tone: 'info', v: () => 'On dose' },
    ],
  },
  {
    id: 'electrical', cam: '12', zone: 'electrical',
    label: 'Switchyard', sub: '400 kV · transformers',
    section: 'grid',
    caption: 'Generator output stepped up to 400 kV for the national grid.',
    effects: [
      { type: 'pulse', x: 0.5, y: 0.35, r: 0.14, color: '#ffd400' },
    ],
    telemetry: [
      { x: 0.3, y: 0.15, k: 'Net export', tone: 'good', v: (r) => `${f(r.netMW, 0)} MW` },
      { x: 0.3, y: 0.26, k: 'Frequency', tone: 'info', v: (r) => `${f(r.freq, 2)} Hz` },
    ],
  },
  {
    id: 'control', cam: '13', zone: 'control',
    label: 'Control Room', sub: 'DCS · instrumentation',
    section: 'control',
    caption: 'Distributed control system — load, emissions and auxiliary plant supervision.',
    effects: [],
    telemetry: [
      { x: 0.5, y: 0.2, k: 'Unit load', tone: 'good', v: (r) => `${f(r.inputs.loadFrac * 100, 0)} %` },
      { x: 0.5, y: 0.32, k: 'Status', tone: 'info', v: (r) => (r.grossMW > 2 ? 'On bars' : 'Offline') },
    ],
  },
  {
    id: 'auxiliary', cam: '14', zone: 'auxiliary',
    label: 'Auxiliaries', sub: 'pipe racks · workshops · fuel oil',
    section: 'aux',
    caption: 'Compressed air, fuel oil, auxiliary pumps and general plant services.',
    effects: [],
    telemetry: [
      { x: 0.4, y: 0.2, k: 'Aux load', tone: 'info', v: (r) => `${f(r.auxMW || r.grossMW * 0.08, 1)} MW` },
    ],
  },
];

export const sceneById = (id) => SCENES.find((s) => s.id === id) || SCENES[0];
