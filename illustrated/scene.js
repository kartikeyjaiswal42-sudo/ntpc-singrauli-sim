// scene.js — NTPC Singrauli Stage-II · full equipment cutaway (coal → grid)

const lbl = (x, y, t, cls = 'unit-name') =>
  `<text class="${cls}" x="${x}" y="${y}" text-anchor="middle">${t}</text>`;
const lblL = (x, y, t) =>
  `<text class="unit-name xs" x="${x}" y="${y}" text-anchor="start">${t}</text>`;

function comp(id, zone, x, y, w, h, inner) {
  return `<g class="comp comp-hit" id="${id}" data-comp="${id}" data-zone="${zone}" tabindex="0" role="button">
    <rect class="comp-area" x="${x}" y="${y}" width="${w}" height="${h}" rx="6" fill="transparent"/>
    ${inner}
  </g>`;
}

function puffs(x, y, n, { rise = 100, spread = 20, r = 12, dur = 4, cls = 'smoke', color = '#d3d9df' } = {}) {
  let s = '';
  for (let i = 0; i < n; i++) {
    const dx = (Math.random() - 0.5) * spread;
    const delay = (i / n) * dur;
    s += `<circle class="puff ${cls}" cx="${(x + dx).toFixed(1)}" cy="${y}" r="${(r * (0.6 + Math.random() * 0.6)).toFixed(1)}"
      fill="${color}" style="--rise:${-rise}px;animation-duration:${dur}s;animation-delay:${-delay.toFixed(2)}s"/>`;
  }
  return s;
}

function fallers(x, y, n, { fall = 50, spread = 30, r = 3, dur = 1.4, color = '#9097a0' } = {}) {
  let s = '';
  for (let i = 0; i < n; i++) {
    const dx = (Math.random() - 0.5) * spread;
    s += `<circle class="faller" cx="${(x + dx).toFixed(1)}" cy="${y}" r="${(r * (0.5 + Math.random())).toFixed(1)}"
      fill="${color}" style="--fall:${fall}px;animation-duration:${dur}s;animation-delay:${(-i / n * dur).toFixed(2)}s"/>`;
  }
  return s;
}

function flames(cx, baseY, n, w, h) {
  let s = '';
  for (let i = 0; i < n; i++) {
    const fx = cx - (w * (n - 1)) / 2 + i * w;
    const hh = h * (0.85 + (i % 2) * 0.2);
    const ww = w * 0.48;
    s += `<path class="flame" style="animation-delay:${(-i * 0.15).toFixed(2)}s"
      d="M ${fx},${baseY} C ${fx - ww},${baseY - hh * 0.35} ${fx - ww * 0.35},${baseY - hh} ${fx},${baseY - hh}
         C ${fx + ww * 0.35},${baseY - hh} ${fx + ww},${baseY - hh * 0.35} ${fx},${baseY} Z" fill="url(#flameGrad)"/>`;
  }
  return s;
}

function pipe(d, cls, w = 7) {
  return `<path class="pipe-base" d="${d}" stroke-width="${w + 4}"/>
          <path class="flow ${cls}" d="${d}" stroke-width="${w}"/>`;
}

function mill(x, y, i) {
  return comp('c-mill', 'z-fuel', x - 22, y, 44, 72, `
    <g class="mill-unit" transform="translate(${x},${y})">
      <rect x="-18" y="0" width="36" height="52" rx="8" fill="#8f9caa" stroke="#6b7888" stroke-width="1.5"/>
      <ellipse cx="0" cy="4" rx="16" ry="5" fill="#b8c4ce"/>
      <g transform="translate(0,28)"><g class="spin mill-spin" stroke="#4a5564" stroke-width="3" stroke-linecap="round">
        <line x1="0" y1="-10" x2="0" y2="10"/><line x1="-10" y1="0" x2="10" y2="0"/>
      </g></g>
      ${lbl(0, 68, 'XRP 1003', 'unit-name xs')}
    </g>`);
}

function fanComp(id, zone, x, y, label) {
  return comp(id, zone, x - 26, y - 26, 52, 62, `
    <g transform="translate(${x},${y})">
      <circle r="22" fill="#7a8a96" stroke="#5a6878" stroke-width="1.5"/>
      <g class="spin fan-spin" stroke="#eef3f8" stroke-width="3" stroke-linecap="round">
        <line x1="0" y1="-14" x2="0" y2="14"/><line x1="-14" y1="0" x2="14" y2="0"/>
        <line x1="-10" y1="-10" x2="10" y2="10"/><line x1="-10" y1="10" x2="10" y2="-10"/>
      </g>
      ${lbl(0, 36, label, 'unit-name xs')}
    </g>`);
}

function tower(x, y, w, h) {
  return `<g transform="translate(${x},${y})">
    <g class="vapor">${puffs(w / 2, 20, 8, { rise: 90, spread: w * 0.4, r: 18, dur: 4.5, cls: 'vapor', color: '#fff' })}</g>
    <path d="M ${w * 0.15},${h * 0.12} C ${w * 0.35},${h * 0.55} ${w * 0.65},${h * 0.55} ${w * 0.85},${h * 0.12}
             L ${w * 0.78},${h * 0.12} C ${w * 0.58},${h * 0.48} ${w * 0.42},${h * 0.48} ${w * 0.22},${h * 0.12} Z"
          fill="url(#towerGrad)" stroke="#9ec0d6" stroke-width="1.5"/>
    <path d="M ${w * 0.22},${h * 0.12} C ${w * 0.32},${h * 0.72} ${w * 0.28},${h} ${w * 0.18},${h}
             L ${w * 0.82},${h} C ${w * 0.72},${h} ${w * 0.68},${h * 0.72} ${w * 0.78},${h * 0.12} Z"
          fill="url(#towerGrad)" stroke="#9ec0d6" stroke-width="1.5"/>
    <rect x="${w * 0.28}" y="${h * 0.88}" width="${w * 0.44}" height="${h * 0.08}" rx="4" fill="url(#coldWater)"/>
  </g>`;
}

export const VIEWBOX = '0 0 2800 980';

export function buildScene() {
  const defs = `
  <defs>
    <linearGradient id="skyGrad" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#7ec6ff"/><stop offset="0.6" stop-color="#bfe6ff"/><stop offset="1" stop-color="#eaf7ff"/>
    </linearGradient>
    <linearGradient id="grassGrad" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#8fd86a"/><stop offset="1" stop-color="#5fae45"/>
    </linearGradient>
    <linearGradient id="waterGrad" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#6ec4ff"/><stop offset="1" stop-color="#2a8fd4"/>
    </linearGradient>
    <linearGradient id="coalGrad" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#4a4f57"/><stop offset="1" stop-color="#16181c"/>
    </linearGradient>
    <linearGradient id="boilerGrad" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#cdd6df"/><stop offset="0.5" stop-color="#aab6c2"/><stop offset="1" stop-color="#8f9caa"/>
    </linearGradient>
    <linearGradient id="steelGrad" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#d7eef0"/><stop offset="1" stop-color="#6ba5ad"/>
    </linearGradient>
    <linearGradient id="genGrad" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#ffd9a0"/><stop offset="1" stop-color="#c9721c"/>
    </linearGradient>
    <radialGradient id="flameGrad" cx="0.5" cy="0.85" r="0.75">
      <stop offset="0" stop-color="#fff2a8"/><stop offset="0.45" stop-color="#ffb52e"/>
      <stop offset="0.8" stop-color="#ff6a1a"/><stop offset="1" stop-color="#e0341a"/>
    </radialGradient>
    <radialGradient id="furnaceGlow" cx="0.5" cy="0.6" r="0.6">
      <stop offset="0" stop-color="#ffb347" stop-opacity="0.9"/><stop offset="1" stop-color="#ff6a1a" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="towerGrad" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#eef6fb"/><stop offset="0.5" stop-color="#cfe2ef"/><stop offset="1" stop-color="#a9c6da"/>
    </linearGradient>
    <linearGradient id="coldWater" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#74d0ff"/><stop offset="1" stop-color="#2f8fe0"/>
    </linearGradient>
    <linearGradient id="hotWater" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#ff8f6b"/><stop offset="1" stop-color="#d83a1e"/>
    </linearGradient>
    <linearGradient id="limeGrad" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#e8f5e9"/><stop offset="1" stop-color="#a5d6a7"/>
    </linearGradient>
  </defs>`;

  const bg = `
  <rect width="2800" height="900" fill="url(#skyGrad)"/>
  <circle cx="2680" cy="70" r="48" fill="#ffdf6b" opacity="0.95"/>
  <g class="cloud" fill="#fff" opacity="0.88">
    <ellipse cx="900" cy="70" rx="50" ry="18"/><ellipse cx="940" cy="58" rx="36" ry="20"/>
  </g>
  <rect y="820" width="2800" height="160" fill="url(#grassGrad)"/>
  <rect y="820" width="2800" height="4" fill="#4f9a39"/>
  <path d="M0,860 Q500,840 1000,855 T2000,848 T2800,860 L2800,920 L0,920 Z" fill="url(#waterGrad)" opacity="0.85"/>
  ${lblL(20, 908, 'Rihand reservoir · canal · makeup water')}`;

  const pipes = `
  <g class="pipes">
    ${pipe('M200,800 L320,720 L400,640 L460,560', 'flow-coal', 6)}
    ${pipe('M560,680 C600,640 620,560 640,500', 'flow-air', 5)}
    ${pipe('M480,560 L520,480 L580,420', 'flow-coal', 5)}
    ${pipe('M760,300 L880,300 L980,300', 'flow-steam', 10)}
    ${pipe('M1040,360 L1100,360 L1140,400 L1160,460 L1140,520 L1100,560 L1040,580 L1000,540', 'flow-steam', 7)}
    ${pipe('M1000,540 L940,500 L880,460 L840,420', 'flow-steam', 7)}
    ${pipe('M1200,360 L1200,420 L1200,480', 'flow-steam', 8)}
    ${pipe('M240,720 C320,680 400,580 460,500 L500,440 L540,380', 'flow-feed', 6)}
    ${pipe('M320,680 L380,640 L420,600', 'flow-feed', 5)}
    ${pipe('M1080,320 L1140,360 L1160,420', 'flow-steam', 4)}
    ${pipe('M1240,520 C1320,540 1420,560 1520,580 L1640,600', 'flow-hot', 9)}
    ${pipe('M1840,760 C1660,720 1460,600 1260,520', 'flow-cold', 9)}
    ${pipe('M1280,280 C1320,260 1340,240 1360,220', 'flow-feed', 3)}
    ${pipe('M1340,720 L1320,440 L1300,300', 'flow-h2', 3)}
    ${pipe('M700,640 L760,660 L820,680 L880,700', 'flow-flue', 8)}
    ${pipe('M960,700 L1020,710 L1080,720', 'flow-flue', 8)}
    ${pipe('M1140,720 L1200,730 L1260,740', 'flow-flue', 8)}
    ${pipe('M1320,740 L1360,700 L1380,600 L1390,500 L1400,400', 'flow-flue', 8)}
    ${pipe('M620,660 L580,720 L540,780', 'flow-ash', 5)}
    ${pipe('M960,780 L1000,800 L1040,820', 'flow-ash', 4)}
    ${pipe('M1380,300 L1480,280 L1580,240 L1680,200', 'flow-power', 6)}
    ${pipe('M1340,320 L1400,360 L1440,420', 'flow-power', 3)}
    ${pipe('M1060,780 L1100,760 L1140,740', 'flow-lime', 4)}
    ${pipe('M1180,780 L1220,800 L1260,820', 'flow-lime', 4)}
    ${lblL(1260, 512, 'CW hot OUT → towers', 'duct-label')}
    ${lblL(1580, 748, 'CW cold IN ← basin', 'duct-label')}
    ${lblL(880, 692, 'Flue gas duct', 'duct-label')}
    ${lblL(520, 548, 'PA duct → mills', 'duct-label')}
  </g>`;

  /* ── ZONE backgrounds (visual grouping) ── */
  const zoneFuel = `<g class="zone" id="z-fuel">
    <rect x="8" y="720" width="340" height="100" rx="10" fill="rgba(255,255,255,0.35)" stroke="#c8d0d8" stroke-width="1"/>
    ${lbl(178, 738, 'COAL LOGISTICS · CHP', 'zone-title')}
  </g>`;

  const zoneDm = `<g class="zone" id="z-dm">
    <rect x="8" y="580" width="240" height="130" rx="8" fill="rgba(255,255,255,0.4)" stroke="#b8d4e8"/>
    ${lbl(128, 598, 'WATER TREATMENT', 'zone-title')}
  </g>`;

  const zoneBoiler = `<g class="zone" id="z-boiler">
    <rect x="620" y="50" width="220" height="700" rx="14" fill="url(#boilerGrad)" stroke="#7c8896" stroke-width="2"/>
    ${lbl(730, 78, 'BOILER · CC+ · 170 kg/cm²', 'zone-title')}
  </g>`;

  const zoneTurbine = `<g class="zone" id="z-turbine">
    <rect x="880" y="180" width="460" height="140" rx="8" fill="rgba(255,255,255,0.25)" stroke="#b8c4ce"/>
    ${lbl(1110, 198, 'TURBINE–GENERATOR HALL', 'zone-title')}
  </g>`;

  const zoneCw = `<g class="zone" id="z-cw">
    ${lbl(1580, 820, 'CIRCULATING WATER', 'zone-title')}
  </g>`;

  const zoneEnv = `<g class="zone" id="z-env">
    ${lbl(1080, 820, 'FLUE GAS · EMISSIONS', 'zone-title')}
  </g>`;

  const zoneAsh = `<g class="zone" id="z-ash">
    ${lbl(980, 900, 'ASH HANDLING', 'zone-title')}
  </g>`;

  const zoneH2 = `<g class="zone" id="z-h2"></g>`;
  const zoneGrid = `<g class="zone" id="z-grid"></g>`;
  const zoneAux = `<g class="zone" id="z-aux"></g>`;

  /* ── Individual equipment (clickable) ── */

  const fuelEquip = `
  ${comp('c-mgr', 'z-fuel', 10, 748, 300, 50, `
    <line x1="20" y1="778" x2="300" y2="778" stroke="#5a4a3a" stroke-width="5"/>
    <g fill="#3a3a3a"><rect x="40" y="762" width="50" height="16" rx="3"/><rect x="110" y="762" width="50" height="16" rx="3"/><rect x="180" y="762" width="50" height="16" rx="3"/><rect x="250" y="762" width="50" height="16" rx="3"/></g>
    ${lbl(160, 756, 'MGR railway · 22 km from Nigahi', 'unit-name xs')}`)}
  ${comp('c-hopper', 'z-fuel', 250, 700, 80, 60, `
    <path d="M260,758 L280,720 L300,758 Z" fill="#6b7280"/>
    ${lbl(280, 712, 'Track hopper', 'unit-name xs')}`)}
  ${comp('c-chp', 'z-fuel', 20, 710, 100, 50, `
    <rect x="30" y="720" width="90" height="40" rx="4" fill="#94a3b2" stroke="#6b7888"/>
    ${lbl(75, 742, 'CHP 2400 MTPH', 'unit-name xs')}
    <polygon points="20,820 80,760 140,820" fill="url(#coalGrad)"/>`)}
  ${comp('c-bunker', 'z-fuel', 380, 380, 120, 100, `
    <path d="M400,420 H460 L448,480 H412 Z" fill="#7c8896"/>
    <path d="M470,400 H530 L518,460 H482 Z" fill="#7c8896"/>
    ${lbl(465, 392, 'Coal bunkers', 'unit-name xs')}`)}
  ${mill(420, 520, 0)}${mill(490, 520, 1)}${mill(560, 520, 2)}
  <polygon points="170,800 188,800 420,560 402,560" fill="#5b6470" opacity="0.9"/>
  <line class="belt-flow" x1="180" y1="800" x2="410" y2="565"/>`;

  const waterEquip = `
  ${comp('c-forebay', 'z-dm', 8, 830, 180, 70, `
    <rect x="20" y="850" width="160" height="40" rx="6" fill="url(#waterGrad)" opacity="0.6" stroke="#2a8fd4"/>
    ${lbl(100, 876, 'Raw water forebay', 'unit-name xs')}`)}
  ${comp('c-dm', 'z-dm', 20, 590, 200, 100, `
    <rect x="30" y="610" width="36" height="50" rx="4" fill="#90caf9"/>${lbl(48, 672, 'SAC', 'unit-name xs')}
    <rect x="72" y="620" width="28" height="40" rx="4" fill="#64b5f6"/>${lbl(86, 672, 'Degas', 'unit-name xs')}
    <rect x="106" y="610" width="36" height="50" rx="4" fill="#42a5f5"/>${lbl(124, 672, 'SBA', 'unit-name xs')}
    <rect x="148" y="615" width="32" height="45" rx="4" fill="#1e88e5"/>${lbl(164, 672, 'MB', 'unit-name xs')}
    ${lbl(120, 688, 'Clarifier · PSF · ACF', 'unit-name xs')}`)}
  ${comp('c-deaerator', 'z-dm', 260, 600, 100, 80, `
    <ellipse cx="310" cy="640" rx="44" ry="18" fill="#78909c" stroke="#546e7a"/>
    <rect x="266" y="640" width="88" height="28" rx="4" fill="#90a4ae"/>
    ${lbl(310, 688, 'Deaerator (DA)', 'unit-name xs')}`)}
  ${comp('c-chlorine', 'z-cw', 1480, 780, 80, 50, `
    <rect x="1490" y="790" width="60" height="30" rx="4" fill="#81c784" stroke="#4caf50"/>
    ${lbl(1520, 828, 'ClO₂ / chlorination', 'unit-name xs')}`)}`;

  const boilerEquip = `
  ${comp('c-drum', 'z-boiler', 640, 88, 180, 50, `
    <ellipse cx="730" cy="108" rx="78" ry="16" fill="#cfd8e0" stroke="#8795a3" stroke-width="1.5"/>
    ${lbl(730, 130, 'Steam drum', 'unit-name xs')}`)}
  ${comp('c-eco', 'z-boiler', 640, 140, 180, 40, `
    <rect x="650" y="148" width="160" height="28" rx="4" fill="#38b6c9" opacity="0.5"/>
    ${lbl(730, 166, 'Economizer', 'unit-name xs')}`)}
  ${comp('c-sh', 'z-boiler', 640, 172, 180, 55, `
    <path d="M662,185 h136 v14 h-136 v14 h136 v14 h-136" fill="none" stroke="url(#hotWater)" stroke-width="5"/>
    ${lbl(730, 218, 'Superheater', 'unit-name xs')}`)}
  ${comp('c-rh', 'z-boiler', 640, 228, 180, 45, `
    <path d="M662,240 h136 v12 h-136 v12 h136" fill="none" stroke="#ff7a90" stroke-width="4"/>
    ${lbl(730, 268, 'Reheater', 'unit-name xs')}`)}
  ${comp('c-tubes', 'z-boiler', 630, 278, 200, 350, `
    <g stroke="url(#coldWater)" stroke-width="4" opacity="0.8">
      <line x1="644" y1="290" x2="644" y2="620"/><line x1="658" y1="290" x2="658" y2="620"/>
      <line x1="802" y1="290" x2="802" y2="620"/><line x1="816" y1="290" x2="816" y2="620"/>
    </g>
    ${lbl(730, 640, 'Waterwalls · rifled tubes', 'unit-name xs')}`)}
  ${comp('c-furnace', 'z-boiler', 658, 318, 132, 310, `
    <rect x="668" y="330" width="112" height="280" rx="10" fill="#1b1205"/>
    <ellipse class="glow" cx="724" cy="520" rx="90" ry="90" fill="url(#furnaceGlow)"/>
    <g class="flame-set">${flames(724, 600, 6, 20, 120)}</g>`)}
  ${comp('c-burner', 'z-boiler', 658, 400, 132, 120, `
    <g fill="#d98a2b"><circle cx="668" cy="440" r="6"/><circle cx="668" cy="500" r="6"/>
      <circle cx="778" cy="440" r="6"/><circle cx="778" cy="500" r="6"/></g>
    ${lbl(724, 530, 'Tilting burners ±30°', 'unit-name xs')}`)}
  ${comp('c-bcp', 'z-boiler', 660, 648, 120, 50, `
    <rect x="670" y="658" width="28" height="36" rx="4" fill="#2f8fe0"/>
    <rect x="706" y="658" width="28" height="36" rx="4" fill="#2f8fe0"/>
    <rect x="742" y="658" width="28" height="36" rx="4" fill="#2f8fe0"/>
    ${lbl(724, 708, 'BCP ×3', 'unit-name xs')}`)}
  ${comp('c-bah', 'z-ash', 660, 668, 100, 40, `
    <path d="M680,680 L780,680 L760,700 L700,700 Z" fill="#6b7280"/>
    ${lbl(730, 718, 'Bottom ash hopper', 'unit-name xs')}`)}
  ${fanComp('c-fd', 'z-boiler', 580, 660, 'FD fan')}
  ${fanComp('c-idf', 'z-boiler', 820, 640, 'ID fan')}
  ${fanComp('c-paf', 'z-boiler', 520, 560, 'PA fan')}
  ${comp('c-aph', 'z-boiler', 800, 548, 60, 100, `
    <rect x="810" y="558" width="48" height="80" rx="6" fill="#f0a043" stroke="#c9721c" stroke-width="1.5"/>
    ${lbl(834, 652, 'APH', 'unit-name xs')}`)}`;

  const turbineEquip = `
  ${comp('c-hp', 'z-turbine', 900, 240, 60, 70, `
    <rect x="910" y="250" width="52" height="52" rx="10" fill="url(#steelGrad)" stroke="#5b9aa2" stroke-width="1.5"/>
    ${lbl(936, 318, 'HP turbine', 'unit-name xs')}`)}
  ${comp('c-ip', 'z-turbine', 960, 234, 70, 76, `
    <rect x="970" y="244" width="58" height="58" rx="10" fill="url(#steelGrad)" stroke="#5b9aa2" stroke-width="1.5"/>
    ${lbl(999, 318, 'IP turbine', 'unit-name xs')}`)}
  ${comp('c-lp', 'z-turbine', 1030, 230, 80, 80, `
    <path d="M1038,244 L1100,236 L1100,310 L1038,310 Z" fill="url(#steelGrad)" stroke="#5b9aa2" stroke-width="1.5"/>
    ${lbl(1069, 318, 'LP turbine', 'unit-name xs')}`)}
  ${comp('c-gen', 'z-turbine', 1120, 236, 120, 80, `
    <rect x="1130" y="246" width="100" height="60" rx="12" fill="url(#genGrad)" stroke="#b06c1a" stroke-width="1.5"/>
    <text class="unit-name xs" x="1180" y="272" text-anchor="middle" fill="#fff8ee">THDF 500MW</text>
    ${lbl(1180, 318, 'Generator · H₂ cooled', 'unit-name xs')}
    <g transform="translate(1020,278)"><g class="spin" stroke="#2f7e88" stroke-width="3" stroke-linecap="round">
      <circle r="14" fill="#eaf6f7" stroke="#6ba5ad"/><line x1="0" y1="-10" x2="0" y2="10"/><line x1="-10" y1="0" x2="10" y2="0"/>
    </g></g>`)}
  ${comp('c-cond', 'z-turbine', 1040, 450, 200, 100, `
    <rect x="1060" y="470" width="160" height="56" rx="10" fill="#dff0fb" stroke="#7fb4d8" stroke-width="1.5"/>
    <g fill="#7fb4d8">${Array.from({ length: 24 }, (_, i) => `<circle cx="${1070 + (i % 8) * 18}" cy="${488 + Math.floor(i / 8) * 14}" r="2.5"/>`).join('')}</g>
    ${lbl(1140, 540, 'Surface condenser', 'unit-name xs')}
    ${lbl(1065, 462, '↗ hot CW OUT', 'unit-name xs')}
    ${lbl(1180, 538, '↙ cold CW IN', 'unit-name xs')}
    <path d="M1240,490 L1280,490" stroke="#e8472a" stroke-width="4" marker-end="url(#arrHot)"/>
    <path d="M1060,510 L1020,510" stroke="#2f8fe0" stroke-width="4"/>`)}
  ${comp('c-tdbfp', 'z-turbine', 920, 390, 60, 50, `
    <ellipse cx="950" cy="410" rx="28" ry="18" fill="#6ba5ad"/>
    <g transform="translate(950,410)"><g class="spin" stroke="#fff" stroke-width="2"><line x1="-12" y1="0" x2="12" y2="0"/></g></g>
    ${lbl(950, 438, 'TDBFP', 'unit-name xs')}`)}
  ${comp('c-mdbfp', 'z-turbine', 980, 400, 40, 45, `
    <circle cx="1000" cy="420" r="16" fill="#4a90c2"/>
    <g transform="translate(1000,420)"><g class="spin" stroke="#dff0fb" stroke-width="2"><line x1="-10" y1="0" x2="10" y2="0"/></g></g>
    ${lbl(1000, 448, 'MDBFP', 'unit-name xs')}`)}
  ${comp('c-bfp-boost', 'z-turbine', 860, 430, 50, 35, `
    <rect x="870" y="440" width="40" height="20" rx="4" fill="#2f8fe0" opacity="0.7"/>
    ${lbl(890, 468, 'Booster BFP', 'unit-name xs')}`)}`;

  const cwEquip = `
  ${comp('c-cwp', 'z-cw', 1320, 600, 80, 100, `
    <rect x="1330" y="610" width="24" height="70" rx="6" fill="#2f8fe0"/>
    <rect x="1362" y="610" width="24" height="70" rx="6" fill="#2f8fe0"/>
    <g transform="translate(1342,630)"><g class="spin" stroke="#dff0fb" stroke-width="2"><line x1="0" y1="-8" x2="0" y2="8"/></g></g>
    ${lbl(1350, 698, 'CW pumps ×2', 'unit-name xs')}`)}
  ${comp('c-ct', 'z-cw', 1520, 460, 280, 320, `
    ${tower(1520, 480, 120, 280)}${tower(1700, 500, 100, 240)}
    ${lbl(1580, 768, 'Cooling tower', 'unit-name xs')}
    ${lbl(1750, 748, 'Cooling tower', 'unit-name xs')}`)}`;

  const envEquip = `
  ${comp('c-flue', 'z-env', 680, 680, 520, 50, `
    <rect x="690" y="692" width="500" height="24" rx="4" fill="#b0bec5" opacity="0.35"/>
    ${lbl(940, 708, 'Flue gas duct · APH → ESP → FGD → stack', 'unit-name xs')}`)}
  ${comp('c-esp', 'z-env', 860, 640, 130, 100, `
    <rect x="870" y="650" width="110" height="80" rx="8" fill="#c7d2dc" stroke="#8795a3" stroke-width="1.5"/>
    <g stroke="#8795a3" stroke-width="2">${[0, 1, 2, 3, 4, 5].map((i) => `<line x1="${888 + i * 14}" y1="658" x2="${888 + i * 14}" y2="722"/>`).join('')}</g>
    <rect x="878" y="724" width="30" height="14" rx="2" fill="#9aa3ac"/>
    <rect x="918" y="724" width="30" height="14" rx="2" fill="#9aa3ac"/>
    <rect x="958" y="724" width="30" height="14" rx="2" fill="#9aa3ac"/>
    <g class="ash">${fallers(925, 738, 8)}</g>
    ${lbl(925, 748, 'ESP · multi-field', 'unit-name xs')}`)}
  ${comp('c-fgd', 'z-env', 1000, 620, 120, 140, `
    <rect x="1010" y="630" width="70" height="110" rx="8" fill="#d8f0e2" stroke="#69b791" stroke-width="1.5"/>
    <g class="spray" stroke="#9fe3c3" stroke-width="2">${[1030, 1050, 1070].map((x) => `<line x1="${x}" y1="640" x2="${x}" y2="710"/>`).join('')}</g>
    <rect x="1000" y="748" width="36" height="20" rx="3" fill="url(#limeGrad)" stroke="#81c784"/>
    ${lbl(1018, 778, 'Limestone slurry', 'unit-name xs')}
    <circle cx="1090" cy="720" r="16" fill="#69b791"/>
    <g transform="translate(1090,720)"><g class="spin fan-spin" stroke="#fff" stroke-width="2"><line x1="-10" y1="0" x2="10" y2="0"/></g></g>
    ${lbl(1050, 762, 'FGD absorber', 'unit-name xs')}`)}
  ${comp('c-stack', 'z-env', 1360, 160, 80, 640, `
    <g class="smoke-set">${puffs(1400, 200, 10, { rise: 120, spread: 24, r: 14, dur: 4 })}</g>
    <path d="M1380,780 L1374,180 L1426,180 L1420,780 Z" fill="#f3f4f6" stroke="#c4ccd4" stroke-width="1.5"/>
    <rect x="1378" y="220" width="44" height="18" fill="#e23b2e"/>
    <rect x="1380" y="340" width="40" height="16" fill="#e23b2e"/>
    <rect x="1382" y="480" width="36" height="14" fill="#e23b2e"/>
    <rect x="1384" y="620" width="32" height="12" fill="#e23b2e"/>
    ${lbl(1400, 800, 'Stack · CEMS', 'unit-name xs')}`)}
  <rect x="1120" y="760" width="40" height="24" rx="4" fill="#eef2f6" stroke="#b0bec5"/>
  ${lbl(1140, 798, 'Gypsum', 'unit-name xs')}`;

  const ashEquip = `
  ${comp('c-flyash', 'z-ash', 920, 760, 80, 60, `
    <rect x="930" y="770" width="36" height="48" rx="4" fill="#b9a98c" stroke="#8d7f6a"/>
    ${lbl(948, 832, 'Fly ash silo', 'unit-name xs')}
    <rect x="960" y="790" width="60" height="16" rx="2" fill="#78909c"/>
    ${lbl(990, 816, 'AHP pneumatic duct', 'unit-name xs')}`)}
  ${comp('c-bottom-ash', 'z-ash', 540, 760, 80, 60, `
    <rect x="550" y="780" width="50" height="24" rx="3" fill="#6b7280"/>
    ${lbl(575, 816, 'BA slurry pump', 'unit-name xs')}`)}
  ${comp('c-dyke', 'z-ash', 1020, 820, 120, 60, `
    <path d="M1040,840 L1120,840 L1100,880 L1060,880 Z" fill="#c8bfb0" opacity="0.7"/>
    ${lbl(1080, 898, 'Ash dyke · 400 ac', 'unit-name xs')}`)}`;

  const h2Equip = `
  ${comp('c-h2', 'z-h2', 1260, 640, 100, 110, `
    <rect x="1270" y="650" width="80" height="56" rx="6" fill="#e3f2fd" stroke="#64b5f6" stroke-width="1.5"/>
    ${lbl(1310, 668, 'H₂ plant', 'unit-name xs')}
    ${lbl(1310, 684, 'Electrolyser', 'unit-name xs')}
    <rect x="1280" y="710" width="24" height="32" rx="4" fill="#bbdefb"/>
    <rect x="1310" y="710" width="24" height="32" rx="4" fill="#bbdefb"/>
    ${lbl(1310, 758, 'H₂ driers', 'unit-name xs')}`)}`;

  const gridEquip = `
  ${comp('c-ipb', 'z-grid', 1380, 258, 100, 30, `
    <rect x="1390" y="268" width="80" height="12" rx="3" fill="#ffd400" opacity="0.8"/>
    ${lbl(1430, 258, 'IPB · 21 kV busduct', 'unit-name xs')}`)}
  ${comp('c-gt', 'z-grid', 1500, 230, 70, 100, `
    <rect x="1510" y="240" width="56" height="80" rx="6" fill="#78909c" stroke="#546e7a" stroke-width="1.5"/>
    ${lbl(1538, 332, 'GT 21→400kV', 'unit-name xs')}`)}
  ${comp('c-uat', 'z-grid', 1420, 350, 60, 60, `
    <rect x="1430" y="360" width="44" height="36" rx="4" fill="#90a4ae"/>
    ${lbl(1452, 408, 'UAT aux', 'unit-name xs')}`)}
  ${comp('c-yard', 'z-grid', 1620, 120, 220, 120, `
    <g transform="translate(1620,140)">
      <line x1="0" y1="80" x2="200" y2="80" stroke="#78909c" stroke-width="3"/>
      <line x1="40" y1="80" x2="40" y2="40" stroke="#78909c" stroke-width="2"/>
      <line x1="100" y1="80" x2="100" y2="30" stroke="#78909c" stroke-width="2"/>
      <line x1="160" y1="80" x2="160" y2="40" stroke="#78909c" stroke-width="2"/>
      <rect x="32" y="32" width="16" height="20" rx="2" fill="#546e7a"/>
      <rect x="92" y="22" width="16" height="20" rx="2" fill="#546e7a"/>
      <rect x="152" y="32" width="16" height="20" rx="2" fill="#546e7a"/>
      ${lbl(100, 108, '400 kV switchyard', 'unit-name xs')}
    </g>
    <g stroke="#9aa6b2" stroke-width="3" fill="none">
      <path d="M1740,200 L1728,280 M1740,200 L1752,280 M1724,240 L1756,240"/>
    </g>
    <g class="sparks" stroke="#ffd400" stroke-width="2" fill="none">
      <path d="M1752,204 l30,-8 l-10,14 l28,-6"/>
    </g>`)}`;

  const auxEquip = `
  ${comp('c-compressor', 'z-aux', 1880, 660, 100, 60, `
    <rect x="1890" y="670" width="90" height="50" rx="6" fill="#eceff1" stroke="#b0bec5"/>
    ${lbl(1935, 688, 'Instrument air', 'unit-name xs')}
    <circle cx="1910" cy="700" r="10" fill="#78909c"/>
    <g transform="translate(1910,700)"><g class="spin fan-spin" stroke="#fff" stroke-width="1.5"><line x1="-6" y1="0" x2="6" y2="0"/></g></g>
    ${lbl(1960, 710, 'Air dryer', 'unit-name xs')}`)}`;

  return defs + bg + pipes
    + zoneFuel + zoneDm + zoneBoiler + zoneTurbine + zoneCw + zoneEnv + zoneAsh + zoneH2 + zoneGrid + zoneAux
    + fuelEquip + waterEquip + boilerEquip + turbineEquip + cwEquip + envEquip + ashEquip + h2Equip + gridEquip + auxEquip;
}

export const LEGEND = [
  { c: '#ff5e7a', t: 'Steam duct' },
  { c: '#e8472a', t: 'Hot CW (condenser OUT)' },
  { c: '#2f8fe0', t: 'Cold CW (condenser IN)' },
  { c: '#16181c', t: 'Coal / PF duct' },
  { c: '#9097a0', t: 'Flue gas duct' },
  { c: '#81c784', t: 'FGD · limestone' },
  { c: '#38b6c9', t: 'DM feedwater' },
  { c: '#b39ddb', t: 'Hydrogen' },
  { c: '#ffb52e', t: 'Heat · flame' },
  { c: '#ffd400', t: 'Electric power (IPB)' },
  { c: '#78909c', t: 'Fly / bottom ash' },
];

export const ZONES = [
  { id: 'z-fuel', name: 'Fuel & CHP', sub: 'MGR · hopper · bunkers · mills' },
  { id: 'z-dm', name: 'Water treatment', sub: 'Forebay · DM · deaerator' },
  { id: 'z-boiler', name: 'Boiler CC+', sub: 'Drum · furnace · fans · APH' },
  { id: 'z-turbine', name: 'Turbine–Generator', sub: 'HP · IP · LP · condenser' },
  { id: 'z-cw', name: 'Circulating water', sub: 'CW pumps · towers · ClO₂' },
  { id: 'z-env', name: 'Flue gas & emissions', sub: 'ESP · FGD · stack' },
  { id: 'z-ash', name: 'Ash handling', sub: 'Fly · bottom · dyke' },
  { id: 'z-h2', name: 'Hydrogen', sub: 'Electrolyser · driers' },
  { id: 'z-grid', name: 'Power evacuation', sub: 'IPB · GT · 400 kV yard' },
  { id: 'z-aux', name: 'Instrument air', sub: 'Compressors · dryers' },
];
