/** Live +/- impact lines when a control changes */
export function computeImpacts(key, before, after, state = {}) {
  if (!before || !after) return { pos: [], neg: [] };
  const pos = [];
  const neg = [];
  const d = (label, v, unit = '', goodHigh = true) => {
    if (!isFinite(v) || Math.abs(v) < 0.05) return;
    const up = v > 0;
    const good = goodHigh ? up : !up;
    const val = unit === '%' ? v.toFixed(1) : unit === 'MW' || unit === 't/h' ? Math.round(v) : v.toFixed(1);
    (good ? pos : neg).push(`${label} ${up ? '+' : ''}${val}${unit ? ' ' + unit : ''}`);
  };

  d('Net MW', after.netMW - before.netMW, 'MW', true);
  d('Gross MW', after.grossMW - before.grossMW, 'MW', true);
  d('Net heat rate', after.netHR - before.netHR, 'kcal/kWh', false);
  d('Boiler efficiency', (after.boilerEff - before.boilerEff) * 100, '%', true);
  d('Stack SO₂', after.so2OutMg - before.so2OutMg, 'mg/Nm³', false);
  d('Stack PM', after.pmOutMg - before.pmOutMg, 'mg/Nm³', false);
  d('Vacuum', after.vacuumKgcm2g - before.vacuumKgcm2g, 'kg/cm²(g)', true);
  d('MS temperature', after.msT - before.msT, '°C', true);
  d('Coal firing', after.coalTh - before.coalTh, 't/h', false);
  d('Auxiliary', after.auxMW - before.auxMW, 'MW', false);
  d('CW outlet', after.cwOutlet - before.cwOutlet, '°C', false);

  if (key === 'fdFanOn' && !state.fdFanOn) neg.push('FD OFF — no combustion, load → 0');
  if (key === 'idFanOn' && !state.idFanOn) neg.push('ID OFF — impaired draft, ~45% derate');
  if (key === 'espOn' && !state.espOn) neg.push('ESP OFF — PM emissions spike');
  if (key === 'fgdOn' && !state.fgdOn) neg.push('FGD OFF — SO₂ not scrubbed');
  if (key === 'clO2On' && !state.clO2On) neg.push('ClO₂ OFF — fouling penalty on vacuum');
  if (key === 'bcpOn' && !state.bcpOn) neg.push('BCP OFF — CC+ circulation impaired');
  if (key === 'useTdbfp' && !state.useTdbfp) neg.push('Motor BFP — higher auxiliary load');

  return { pos, neg };
}

export const CONTROL_HINTS = {
  loadSet: '↑ MW · part-load efficiency changes',
  gcv: '↑ GCV → less coal for same MW',
  sulphur: '↑ sulphur → ↑ SO₂ & gypsum',
  ashFrac: '↑ ash → ↓ boiler efficiency',
  cwInlet: '↑ CW inlet → ↓ vacuum · ↑ heat rate',
  excessAir: '↑ excess air → ↑ aux power',
  burnerTilt: '↑ tilt → ↑ steam / reheat temperature',
  millsInService: 'Fewer mills → output cap reduced',
  cwPumpPct: '↓ pump speed → ↓ vacuum',
  fdFanOn: 'OFF = zero MW',
  idFanOn: 'OFF = severe derate',
  bcpOn: 'OFF = boiler efficiency drop',
  useTdbfp: 'TDBFP saves auxiliary power',
  espOn: 'OFF = PM spike',
  fgdOn: 'OFF = SO₂ rises',
  clO2On: 'OFF = biofouling penalty',
  running: 'Pause / resume simulation',
};
