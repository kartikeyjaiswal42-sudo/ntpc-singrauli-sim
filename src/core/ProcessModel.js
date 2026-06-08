/** Physics-ish plant calculations from load % and coal sulphur. */
export function computePlant(loadPct, sulPct) {
  const l = loadPct / 100;
  const S = sulPct / 100;
  const gross = 500 * l;
  const aux = gross * 0.086;
  const net = gross - aux;

  return {
    loadPct,
    sulPct,
    gross: Math.round(gross),
    net: +net.toFixed(1),
    aux: +aux.toFixed(1),
    steam: Math.round(1700 * (0.18 + 0.82 * l)),
    coal: Math.round(312 * (0.22 + 0.78 * l)),
    msT: l >= 0.6 ? 540 : Math.round(470 + 70 * Math.max(0, (l - 0.4) / 0.2)),
    msP: Math.round(170 * (0.6 + 0.4 * l)),
    so2i: Math.round(S * 3600),
    so2o: Math.round(S * 3600 * 0.05),
    lime: +((S / 0.004) * l * 4.9).toFixed(1),
    gyp: +((S / 0.004) * l * 8.6).toFixed(1),
    cwRise: +(2.8 + 8 * l).toFixed(1),
    cwFlow: Math.round(64000 * l),
    vac: +(-0.92 + 0.04 * (1 - l)).toFixed(2),
    dm: Math.round(1700 * (0.18 + 0.82 * l) * 0.02),
    airFD: Math.round(2050 * l),
    flue: Math.round(1650000 * (0.3 + 0.7 * l)),
    freq: 50,
    rpm: loadPct > 0 ? 3000 : 0,
  };
}
