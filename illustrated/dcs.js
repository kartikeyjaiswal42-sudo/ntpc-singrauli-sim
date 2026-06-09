// dcs.js — control-room (DCS/SCADA) mimic: dense live tags, trend, alarms,
// equipment status — driven by the same runPlant() result every tick.

const f = (x, d = 0) => (isFinite(x) ? Number(x).toLocaleString('en-IN',
  { minimumFractionDigits: d, maximumFractionDigits: d }) : '—');
const furnaceTemp = (r) => (r.grossMW > 2 ? Math.round(1010 + 460 * (r.inputs?.loadFrac || 0)) : 0);

// tag groups: each tag = { k:key, l:label, u:unit, g:(r)=>number|string, d:decimals }
const GROUPS = [
  { title: 'GENERATION', tags: [
    { l: 'Net export', u: 'MW', g: (r) => r.netMW, hero: true },
    { l: 'Gross', u: 'MW', g: (r) => r.grossMW },
    { l: 'Frequency', u: 'Hz', g: (r) => r.freq, d: 2 },
    { l: 'Shaft speed', u: 'rpm', g: (r) => r.rpm },
    { l: 'Plant load factor', u: '%', g: (r) => r.plf * 100 },
    { l: 'Net heat rate', u: 'kcal/kWh', g: (r) => r.netHR },
    { l: 'Net efficiency', u: '%', g: (r) => r.effNet * 100, d: 1 },
    { l: 'Aux. power', u: 'MW', g: (r) => r.auxMW, d: 1 },
  ] },
  { title: 'BOILER', tags: [
    { l: 'Main-steam temp', u: '°C', g: (r) => r.msT },
    { l: 'Main-steam press', u: 'ata', g: (r) => r.msP },
    { l: 'Steam flow', u: 't/h', g: (r) => r.steamTh },
    { l: 'Furnace temp', u: '°C', g: (r) => furnaceTemp(r) },
    { l: 'Boiler efficiency', u: '%', g: (r) => r.boilerEff * 100, d: 1 },
    { l: 'Excess air', u: '%', g: (r, s) => Math.round((s.excessAir - 1) * 100) },
  ] },
  { title: 'COAL & AIR', tags: [
    { l: 'Coal firing', u: 't/h', g: (r) => r.coalTh },
    { l: 'Coal GCV', u: 'kcal/kg', g: (r, s) => s.gcv },
    { l: 'Combustion air', u: 't/h', g: (r) => r.airKgh / 1000 },
    { l: 'Mills in service', u: '/3', g: (r, s) => s.millsInService },
  ] },
  { title: 'EMISSIONS', tags: [
    { l: 'Stack SO₂', u: 'mg/Nm³', g: (r) => r.so2OutMg, limit: 200 },
    { l: 'Raw SO₂', u: 'mg/Nm³', g: (r) => r.so2RawMg },
    { l: 'Particulate', u: 'mg/Nm³', g: (r) => r.pmOutMg, limit: 50 },
    { l: 'CO₂', u: 't/h', g: (r) => r.co2Th },
    { l: 'Gypsum', u: 't/h', g: (r) => r.gypsumTh, d: 1 },
  ] },
  { title: 'TURBINE & CONDENSER', tags: [
    { l: 'Cond. vacuum', u: 'ata', g: (r) => r.vacuumKgcm2g, d: 3 },
    { l: 'Cond. duty', u: 'M kcal/h', g: (r) => r.condDuty / 1e6 },
    { l: 'Cycle efficiency', u: '%', g: (r) => r.cycleEff * 100, d: 1 },
    { l: 'Shaft power', u: 'MW', g: (r) => r.mechMW },
  ] },
  { title: 'CIRCULATING WATER', tags: [
    { l: 'CW flow', u: 'm³/h', g: (r) => r.cwM3h },
    { l: 'CW inlet', u: '°C', g: (r) => r.cwInlet },
    { l: 'CW outlet', u: '°C', g: (r) => r.cwOutlet, d: 1 },
    { l: 'CW rise ΔT', u: '°C', g: (r) => r.cwDeltaT, d: 1 },
  ] },
];

const STATUS = [
  { k: 'fdFanOn', l: 'FD fan' }, { k: 'idFanOn', l: 'ID fan' },
  { k: 'bcpOn', l: 'BCP' }, { k: 'espOn', l: 'ESP' },
  { k: 'fgdOn', l: 'FGD' }, { k: 'clO2On', l: 'ClO₂' },
  { k: 'useTdbfp', l: 'TDBFP' },
];

export function buildDCS() {
  const groups = GROUPS.map((grp, gi) => `
    <section class="dcs-card">
      <h4>${grp.title}</h4>
      <div class="dcs-tags">
        ${grp.tags.map((t, ti) => `
          <div class="dcs-tag${t.hero ? ' hero' : ''}" id="tag-${gi}-${ti}">
            <span class="dcs-l">${t.l}</span>
            <span class="dcs-val"><b id="tv-${gi}-${ti}">—</b><i>${t.u}</i></span>
          </div>`).join('')}
      </div>
    </section>`).join('');

  return `
    <div class="dcs-top">
      <div class="dcs-unit">UNIT&nbsp;2 · 500 MW<small>NTPC Singrauli Stage-II · DCS overview</small></div>
      <div class="dcs-hero"><b id="dcs-mw">—</b><i>MW net</i></div>
      <div class="dcs-clock" id="dcs-clock">--:--:--</div>
    </div>
    <div class="dcs-alarms" id="dcs-alarms"></div>
    <div class="dcs-grid">${groups}</div>
    <div class="dcs-foot">
      <div class="dcs-trend-wrap"><span class="dcs-trend-lbl">NET MW · rolling</span><canvas id="dcs-trend" width="520" height="90"></canvas></div>
      <div class="dcs-status" id="dcs-status">
        ${STATUS.map((s) => `<span class="dcs-ind" id="ind-${s.k}"><i></i>${s.l}</span>`).join('')}
      </div>
    </div>`;
}

const trendBuf = [];
let trendCtx = null;

function drawTrend(rated = 500) {
  const c = document.getElementById('dcs-trend');
  if (!c) return;
  if (!trendCtx) trendCtx = c.getContext('2d');
  const g = trendCtx, W = c.width, H = c.height;
  g.clearRect(0, 0, W, H);
  g.strokeStyle = 'rgba(120,150,180,0.18)';
  g.lineWidth = 1;
  for (let i = 1; i < 4; i++) { const y = (H / 4) * i; g.beginPath(); g.moveTo(0, y); g.lineTo(W, y); g.stroke(); }
  if (trendBuf.length < 2) return;
  g.beginPath();
  trendBuf.forEach((v, i) => {
    const x = (i / (trendBuf.length - 1)) * W;
    const y = H - (Math.max(0, Math.min(rated, v)) / rated) * (H - 6) - 3;
    i ? g.lineTo(x, y) : g.moveTo(x, y);
  });
  g.strokeStyle = '#3ad29f';
  g.lineWidth = 2;
  g.stroke();
  g.lineTo(W, H); g.lineTo(0, H); g.closePath();
  g.fillStyle = 'rgba(58,210,159,0.12)';
  g.fill();
}

export function updateDCS(r, s, prot) {
  if (!document.getElementById('dcs-mw')) return;
  document.getElementById('dcs-mw').textContent = s.tripped ? '0' : f(r.netMW);
  const screen = document.getElementById('view-dcs');
  if (screen) screen.classList.toggle('dcs-tripped', !!s.tripped);
  const clk = document.getElementById('dcs-clock');
  if (clk) clk.textContent = new Date().toLocaleTimeString('en-GB');

  GROUPS.forEach((grp, gi) => grp.tags.forEach((t, ti) => {
    const el = document.getElementById(`tv-${gi}-${ti}`);
    if (!el) return;
    const raw = t.g(r, s);
    el.textContent = typeof raw === 'number' ? f(raw, t.d || 0) : raw;
    if (t.limit != null) {
      const tag = document.getElementById(`tag-${gi}-${ti}`);
      if (tag) tag.classList.toggle('over', raw > t.limit);
    }
  }));

  // ── alarms: trip cascade > armed protections > steady warnings ──
  const A = [];
  let banner = '';
  if (prot && prot.trip) {
    // cascade in progress — newest event first
    banner = `<div class="dcs-trip-banner">⛔ ${prot.trip.head} — UNIT TRIP IN PROGRESS</div>`;
    prot.trip.lines.slice().reverse().forEach((ln) => A.push([ln.sev, ln.text]));
  } else if (s.tripped) {
    banner = '<div class="dcs-trip-banner">⛔ UNIT TRIPPED (manual) — turbine on barring gear</div>';
    A.push(['crit', 'UNIT TRIPPED — generator breaker open, 0 MW']);
  } else {
    // armed protections counting down to a trip
    (prot ? prot.armed : []).forEach((a) => {
      const sev = a.remain < 4 ? 'crit' : 'warn';
      A.push([sev, `⏳ PROTECTION ARMED · ${a.head} in ${Math.ceil(a.remain)}s — ${a.label}`]);
    });
    if (s.running && !s.fdFanOn) A.push(['crit', 'FD FAN STOPPED — combustion air lost']);
    if (s.running && !s.idFanOn) A.push(['warn', 'ID FAN STOPPED — furnace draught abnormal']);
    if (!s.bcpOn) A.push(['warn', 'BCP OFF — boiler circulation low (DNB risk)']);
    if (!s.espOn) A.push(['warn', 'ESP OFF — particulate emission high']);
    if (!s.fgdOn) A.push(['warn', 'FGD BYPASS — stack SO₂ above limit']);
    if (!s.clO2On) A.push(['info', 'BIOCIDE OFF — condenser bio-fouling risk']);
    if (s.millsInService < 3 && s.loadSet > 70) A.push(['info', 'MILL OUT OF SERVICE — max load limited']);
    if (s.cwInlet >= 33) A.push(['info', 'CW INLET HOT — vacuum / heat-rate penalty']);
  }
  const ael = document.getElementById('dcs-alarms');
  if (ael) ael.innerHTML = banner + (A.length
    ? A.map(([c, t]) => `<span class="dcs-alm ${c}">${t}</span>`).join('')
    : '<span class="dcs-alm ok">ALL SYSTEMS NORMAL · no active alarms</span>');

  STATUS.forEach((st) => {
    const el = document.getElementById(`ind-${st.k}`);
    if (el) el.classList.toggle('on', !!s[st.k]);
  });

  if (s.running && !s.tripped) { trendBuf.push(r.netMW); if (trendBuf.length > 120) trendBuf.shift(); }
  drawTrend();
}
