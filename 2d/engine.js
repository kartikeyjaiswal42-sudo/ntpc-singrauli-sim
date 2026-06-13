/**
 * NTPC Singrauli Stage-2 — 500 MW unit performance engine.
 *
 * A transparent, first-principles thermal-cycle model. Every public figure is
 * accompanied by the formula and inputs that produced it, so the UI can render
 * a fully auditable "calculation ledger" (the way an MBB engagement team would
 * show its working, not just the answer).
 *
 * Units: kcal, kg, h, MW, kWh.  860 kcal/kWh = 100% thermal efficiency.
 */

export const DESIGN = Object.freeze({
  ratedMW: 500,            // gross machine rating
  grossHeatRate100: 2281,  // Singrauli Stage-II design gross heat rate, kcal/kWh @ 100% MCR
  auxPowerFrac: 0.0525,    // steam-driven BFP + open-cycle CW station basis
  genEff: 0.9862,          // generator electrical efficiency
  mechEff: 0.994,          // turbine mechanical / coupling efficiency
  boilerEff100: 0.864,     // boiler efficiency @ MCR (PG test basis)
  msPressure: 170,         // main steam pressure, kg/cm²(a)
  msTemp: 537,             // main steam temperature, °C
  rhTemp: 537,             // hot reheat temperature, °C
  hMS: 820,                // main steam enthalpy, kcal/kg (≈170 ata / 537 °C)
  hFW: 252,                // feed-water enthalpy at economiser inlet, kcal/kg
  hExhaust: 565,           // LP exhaust enthalpy (wet), kcal/kg
  hCondensate: 38,         // condensate enthalpy at hotwell, kcal/kg
  usefulDh: 600,           // effective steam-side enthalpy rise incl. reheat, kcal/kg
  cwCp: 1.0,               // cooling-water specific heat, kcal/kg·°C
  cwDeltaTDesign: 9.5,     // condenser CW temperature rise @ MCR, °C
  carbonFrac: 0.41,        // carbon content of as-fired coal
  ashFrac: 0.40,           // ash content (high-ash domestic coal)
  flyAshFrac: 0.80,        // fraction of ash carried as fly ash
  espEff: 0.9995,          // ESP particulate collection efficiency (modern)
  fgdEff: 0.95,            // wet-limestone FGD SO₂ removal efficiency
  fdAirRatio: 11.0,        // theoretical air, kg air / kg coal
  excessAir: 1.20,         // 20% excess air
  flueGasPerKg: 5.6,       // flue gas, Nm³ / kg coal fired
});

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

/**
 * Part-load gross heat-rate multiplier. Heat rate degrades as load drops
 * (fixed losses spread over fewer kWh). ≈1.00 @ 100%, ≈1.14 @ 50%.
 */
function heatRateFactor(loadFrac) {
  if (loadFrac <= 0.01) return 6;
  return 0.86 + 0.14 / loadFrac;
}

/** Boiler efficiency falls modestly at part load and with poorer coal. */
function boilerEfficiency(loadFrac, gcv) {
  const partLoad = 0.975 + 0.025 * loadFrac;
  const fuelFactor = clamp(0.985 + (gcv - 3500) / 60000, 0.95, 1.01);
  return DESIGN.boilerEff100 * partLoad * fuelFactor;
}

/**
 * Condenser back-pressure penalty from cooling-water inlet temperature.
 * Warmer CW → higher condenser pressure → slightly worse heat rate & vacuum.
 */
function vacuumModel(cwInlet, loadFrac) {
  const condPressMmHg = 38 + (cwInlet - 27) * 2.3 + loadFrac * 18; // abs, mmHg
  const vacuumKgcm2g = -(760 - condPressMmHg) / 735.6;             // gauge
  const hrPenalty = Math.max(0, (cwInlet - 27)) * 0.0012;          // +0.12%/°C
  return { condPressMmHg, vacuumKgcm2g, hrPenalty };
}

const f = (x, d = 0) => Number(x).toLocaleString('en-IN', {
  minimumFractionDigits: d, maximumFractionDigits: d,
});

/**
 * Run the full plant model.
 * @param {object} inp
 * @param {number} inp.load    generator load, % of rating (0–100)
 * @param {number} inp.gcv     coal gross calorific value, kcal/kg
 * @param {number} inp.sulphur coal sulphur, % (e.g. 0.42)
 * @param {number} inp.cwInlet cooling-water inlet temperature, °C
 */
export function runPlant({
  load = 78,
  gcv = 3600,
  sulphur = 0.42,
  cwInlet = 27,
  excessAir = 1.20,       // multiplier on theoretical air (1.0–1.40)
  ashFrac = 0.40,           // as-fired ash fraction
  espOn = true,
  fgdOn = true,
  burnerTilt = 0,           // −30…+30 ° (tilting tangential burners)
  millsInService = 3,       // 1–3 XRP 1003 bowl mills
  cwPumpPct = 100,          // circulating-water pump speed %
  useTdbfp = true,          // false → motor-driven BFP, higher aux
  bcpOn = true,             // boiler circulating pumps (CC+)
  fdFanOn = true,
  idFanOn = true,
  clO2On = true,
} = {}) {
  const loadFrac = clamp(load / 100, 0, 1.05);
  const S = sulphur / 100;
  const excess = clamp(excessAir, 1.0, 1.45);
  const espEff = espOn ? DESIGN.espEff : 0;
  const fgdEff = fgdOn ? DESIGN.fgdEff : 0;
  const millCap = clamp(millsInService / 3, 0.33, 1.05);
  const cwFrac = clamp(cwPumpPct / 100, 0.45, 1.05);

  // ── 1. Output ──────────────────────────────────────────────
  let grossMW = DESIGN.ratedMW * loadFrac * millCap;
  if (!fdFanOn) grossMW = 0;
  if (!idFanOn && grossMW > 0) grossMW *= 0.55; // impaired draft → derate

  const auxFrac = DESIGN.auxPowerFrac + (useTdbfp ? 0 : 0.012) + (excess - 1.2) * 0.008;
  const auxMW = grossMW * auxFrac;
  const netMW = grossMW - auxMW;
  const plf = loadFrac;

  // ── 2. Heat rate & efficiency ─────────────────────────────
  const { condPressMmHg, vacuumKgcm2g, hrPenalty: vacHr } = vacuumModel(cwInlet, loadFrac);
  const cwHrPen = (cwFrac < 0.85 ? (0.85 - cwFrac) * 0.04 : 0) + (clO2On ? 0 : 0.012);
  const excessHrPen = Math.max(0, (excess - 1.2)) * 0.006;
  const hrPenalty = vacHr + cwHrPen + excessHrPen;
  const grossHR = DESIGN.grossHeatRate100 * heatRateFactor(loadFrac) * (1 + hrPenalty);
  const heatInput = grossMW * 1000 * grossHR;          // kcal/h
  const netHR = netMW > 0 ? heatInput / (netMW * 1000) : 0;
  const effGross = grossHR > 0 ? 860 / grossHR : 0;
  const effNet = netHR > 0 ? 860 / netHR : 0;

  // ── 3. Fuel & combustion ──────────────────────────────────
  const coalKgh = heatInput / gcv;
  const coalTh = coalKgh / 1000;
  const airKgh = coalKgh * DESIGN.fdAirRatio * excess;
  const flueNm3h = coalKgh * DESIGN.flueGasPerKg;
  const sCC = netMW > 0 ? coalKgh / (netMW * 1000) : 0; // specific coal consumption kg/kWh

  // ── 4. Boiler / steam generation ──────────────────────────
  let boilerEff = boilerEfficiency(loadFrac, gcv);
  boilerEff *= clamp(1 - (ashFrac - 0.40) * 0.08, 0.92, 1.02);
  if (!bcpOn && loadFrac > 0.5) boilerEff *= 0.97;
  const qSteam = heatInput * boilerEff;
  const steamKgh = qSteam / DESIGN.usefulDh;
  const steamTh = steamKgh / 1000;
  const tiltBoost = clamp(burnerTilt, -30, 30) * 0.35;
  const msT = (loadFrac >= 0.6 ? DESIGN.msTemp : Math.round(470 + 67 * Math.max(0, (loadFrac - 0.4) / 0.2))) + tiltBoost;
  const msP = DESIGN.msPressure * (0.62 + 0.38 * loadFrac);

  // ── 5. Turbine cycle ──────────────────────────────────────
  const mechMW = grossMW / DESIGN.genEff;               // shaft power
  const turbineWork = mechMW * 1000 * 860;              // kcal/h equivalent
  const cycleEff = qSteam > 0 ? turbineWork / qSteam : 0;
  const rpm = loadFrac > 0.02 ? 3000 : 0;
  const freq = loadFrac > 0.02 ? 50.0 : 0;

  // ── 6. Condenser & cooling water ──────────────────────────
  // Heat rejected closes the energy balance: steam heat minus shaft work.
  const condDuty = Math.max(0, qSteam - turbineWork);
  const cwDeltaT = (DESIGN.cwDeltaTDesign * (0.5 + 0.5 * loadFrac)) / cwFrac;
  const cwKgh = cwDeltaT > 0 ? condDuty / (DESIGN.cwCp * cwDeltaT) : 0;
  const cwM3h = cwKgh / 1000;
  const cwOutlet = cwInlet + cwDeltaT;

  // ── 7. Emissions & environment ────────────────────────────
  const co2Th = (coalKgh * DESIGN.carbonFrac * (44 / 12)) / 1000;
  const so2RawKgh = coalKgh * S * 2;                    // S + O₂ → SO₂ (×2 mass)
  const so2OutKgh = so2RawKgh * (1 - fgdEff);
  const so2RawMg = (so2RawKgh * 1e6) / flueNm3h;        // mg/Nm³
  const so2OutMg = (so2OutKgh * 1e6) / flueNm3h;
  const gypsumTh = ((so2RawKgh - so2OutKgh) * (172 / 64)) / 1000; // CaSO₄·2H₂O
  const limestoneTh = ((so2RawKgh - so2OutKgh) * (100 / 64)) / 1000;
  const ashKgh = coalKgh * ashFrac;
  const flyAshKgh = ashKgh * DESIGN.flyAshFrac;
  const pmOutKgh = flyAshKgh * (1 - espEff);
  const pmOutMg = (pmOutKgh * 1e6) / flueNm3h;
  const ashTh = ashKgh / 1000;

  // ── 8. Energy balance (% of heat input) ──────────────────
  // Closes to 100%: net + aux + boiler loss + condenser loss + (gen/mech + radiation).
  const eNet = heatInput > 0 ? (netMW * 1000 * 860) / heatInput : 0;
  const eAux = heatInput > 0 ? (auxMW * 1000 * 860) / heatInput : 0;
  const eBoiler = 1 - boilerEff;
  const eCond = heatInput > 0 ? condDuty / heatInput : 0;
  const eOther = clamp(1 - eNet - eAux - eBoiler - eCond, 0, 1);  // generator, mechanical & radiation

  const result = {
    inputs: {
      load, gcv, sulphur, cwInlet, loadFrac, excessAir: excess, ashFrac,
      espOn, fgdOn, burnerTilt, millsInService, cwPumpPct, useTdbfp, bcpOn, fdFanOn, idFanOn, clO2On,
    },
    grossMW, auxMW, netMW, plf,
    grossHR, netHR, effGross, effNet, heatInput,
    coalTh, coalKgh, airKgh, flueNm3h, sCC,
    boilerEff, qSteam, steamTh, msT, msP,
    mechMW, cycleEff, rpm, freq,
    condDuty, cwM3h, cwDeltaT, cwInlet, cwOutlet, vacuumKgcm2g, condPressMmHg,
    co2Th, so2RawMg, so2OutMg, gypsumTh, limestoneTh, ashTh, pmOutMg,
    energy: { net: eNet, aux: eAux, boiler: eBoiler, condenser: eCond, other: eOther },
  };

  result.ledger = buildLedger(result);
  return result;
}

/**
 * Build the grouped calculation ledger. Each step shows the symbol, plain-text
 * formula with substituted numbers, the result, and a unit.
 */
function buildLedger(r) {
  const i = r.inputs;
  return [
    {
      id: 'fuel', title: 'Fuel & Combustion', accent: '#6b7280',
      steps: [
        { sym: 'GCV', name: 'Coal gross calorific value', expr: 'design input', val: f(i.gcv), unit: 'kcal/kg' },
        { sym: 'ṁ_coal', name: 'Coal firing rate', expr: `Q_in ÷ GCV = ${f(r.heatInput / 1e6, 1)}×10⁶ ÷ ${f(i.gcv)}`, val: f(r.coalTh, 1), unit: 't/h' },
        { sym: 'ṁ_air', name: 'Combustion air (20% excess)', expr: `ṁ_coal × ${DESIGN.fdAirRatio} × ${DESIGN.excessAir}`, val: f(r.airKgh / 1000, 0), unit: 't/h' },
        { sym: 'V_fg', name: 'Flue-gas volume', expr: `ṁ_coal × ${DESIGN.flueGasPerKg} Nm³/kg`, val: f(r.flueNm3h, 0), unit: 'Nm³/h' },
        { sym: 'SCC', name: 'Specific coal consumption', expr: `ṁ_coal ÷ net kWh`, val: f(r.sCC, 3), unit: 'kg/kWh' },
      ],
    },
    {
      id: 'boiler', title: 'Boiler / Steam Generation', accent: '#ea580c',
      steps: [
        { sym: 'η_b', name: 'Boiler efficiency', expr: 'PG-test basis, part-load corrected', val: f(r.boilerEff * 100, 1), unit: '%' },
        { sym: 'Q_s', name: 'Heat to working fluid', expr: `Q_in × η_b = ${f(r.heatInput / 1e6, 0)}×10⁶ × ${f(r.boilerEff, 3)}`, val: f(r.qSteam / 1e6, 0), unit: '×10⁶ kcal/h' },
        { sym: 'ṁ_s', name: 'Main steam flow', expr: `Q_s ÷ Δh (${DESIGN.usefulDh} kcal/kg)`, val: f(r.steamTh, 0), unit: 't/h' },
        { sym: 'P_ms', name: 'Main steam pressure', expr: 'sliding-pressure schedule', val: f(r.msP, 0), unit: 'kg/cm²(a)' },
        { sym: 'T_ms', name: 'Main steam temperature', expr: 'attemperation-controlled', val: f(r.msT, 0), unit: '°C' },
      ],
    },
    {
      id: 'turbine', title: 'Turbine & Generator', accent: '#0e7490',
      steps: [
        { sym: 'P_mech', name: 'Turbine shaft power', expr: `P_gross ÷ η_gen = ${f(r.grossMW, 1)} ÷ ${DESIGN.genEff}`, val: f(r.mechMW, 1), unit: 'MW' },
        { sym: 'η_cyc', name: 'Cycle (steam→shaft) efficiency', expr: 'turbine work ÷ Q_s', val: f(r.cycleEff * 100, 1), unit: '%' },
        { sym: 'P_gross', name: 'Gross generator output', expr: `${DESIGN.ratedMW} MW × ${f(i.loadFrac * 100, 0)}%`, val: f(r.grossMW, 1), unit: 'MW' },
        { sym: 'N', name: 'Shaft speed', expr: '3000 rpm synchronous (50 Hz)', val: f(r.rpm, 0), unit: 'rpm' },
        { sym: 'P_aux', name: 'Auxiliary power draw', expr: `P_gross × ${(DESIGN.auxPowerFrac * 100).toFixed(2)}%`, val: f(r.auxMW, 1), unit: 'MW' },
        { sym: 'P_net', name: 'Net power to grid', expr: 'P_gross − P_aux', val: f(r.netMW, 1), unit: 'MW' },
      ],
    },
    {
      id: 'perf', title: 'Heat Rate & Efficiency', accent: '#16a34a',
      steps: [
        { sym: 'Q_in', name: 'Heat input', expr: `P_gross × 10³ × GHR`, val: f(r.heatInput / 1e6, 0), unit: '×10⁶ kcal/h' },
        { sym: 'GHR', name: 'Gross station heat rate', expr: `design ${DESIGN.grossHeatRate100} × part-load × vacuum`, val: f(r.grossHR, 0), unit: 'kcal/kWh' },
        { sym: 'NHR', name: 'Net station heat rate', expr: 'Q_in ÷ net kWh', val: f(r.netHR, 0), unit: 'kcal/kWh' },
        { sym: 'η_gross', name: 'Gross thermal efficiency', expr: '860 ÷ GHR', val: f(r.effGross * 100, 1), unit: '%' },
        { sym: 'η_net', name: 'Net thermal efficiency', expr: '860 ÷ NHR', val: f(r.effNet * 100, 1), unit: '%' },
      ],
    },
    {
      id: 'cw', title: 'Condenser & Cooling Water', accent: '#2563eb',
      steps: [
        { sym: 'Q_cond', name: 'Condenser heat rejection', expr: `Q_s − shaft work (energy balance)`, val: f(r.condDuty / 1e6, 0), unit: '×10⁶ kcal/h' },
        { sym: 'ΔT_cw', name: 'CW temperature rise', expr: 'load-scaled (design 9.5 °C)', val: f(r.cwDeltaT, 1), unit: '°C' },
        { sym: 'ṁ_cw', name: 'Circulating water flow', expr: 'Q_cond ÷ (Cp × ΔT_cw)', val: f(r.cwM3h, 0), unit: 'm³/h' },
        { sym: 'T_out', name: 'CW outlet temperature', expr: `${f(r.cwInlet, 0)} + ΔT_cw`, val: f(r.cwOutlet, 1), unit: '°C' },
        { sym: 'vac', name: 'Condenser vacuum', expr: `f(CW inlet ${f(r.cwInlet, 0)} °C)`, val: f(r.vacuumKgcm2g, 3), unit: 'kg/cm²(g)' },
      ],
    },
    {
      id: 'env', title: 'Emissions & Environment', accent: '#9333ea',
      steps: [
        { sym: 'CO₂', name: 'CO₂ emission', expr: `ṁ_coal × C(${DESIGN.carbonFrac}) × 44/12`, val: f(r.co2Th, 0), unit: 't/h' },
        { sym: 'SO₂ᵢ', name: 'SO₂ raw (pre-FGD)', expr: `ṁ_coal × S(${i.sulphur}%) × 2`, val: f(r.so2RawMg, 0), unit: 'mg/Nm³' },
        { sym: 'SO₂ₒ', name: 'SO₂ at stack (post-FGD)', expr: `× (1 − ${DESIGN.fgdEff}) FGD removal`, val: f(r.so2OutMg, 0), unit: 'mg/Nm³' },
        { sym: 'PM', name: 'Particulate at stack', expr: `fly-ash × (1 − ${DESIGN.espEff}) ESP`, val: f(r.pmOutMg, 1), unit: 'mg/Nm³' },
        { sym: 'Gyp', name: 'Gypsum by-product', expr: 'captured SO₂ × 172/64', val: f(r.gypsumTh, 1), unit: 't/h' },
        { sym: 'Ash', name: 'Total ash generated', expr: `ṁ_coal × ash(${DESIGN.ashFrac * 100}%)`, val: f(r.ashTh, 0), unit: 't/h' },
      ],
    },
  ];
}

export const SCENARIOS = [
  { id: 'baseload', name: 'Full base load', load: 100, gcv: 3600, sulphur: 0.42, cwInlet: 27, note: 'MCR, design coal' },
  { id: 'economic', name: 'Economic dispatch', load: 78, gcv: 3600, sulphur: 0.42, cwInlet: 27, note: 'Typical merit-order point' },
  { id: 'partload', name: 'Part load (min. technical)', load: 55, gcv: 3400, sulphur: 0.5, cwInlet: 29, note: 'Night-time backing-down' },
  { id: 'highsulphur', name: 'High-sulphur coal', load: 85, gcv: 3300, sulphur: 0.75, cwInlet: 28, note: 'Imported blend, FGD stressed' },
  { id: 'monsoon', name: 'Monsoon / warm CW', load: 90, gcv: 3700, sulphur: 0.42, cwInlet: 33, note: 'Poor vacuum, HR penalty' },
];
