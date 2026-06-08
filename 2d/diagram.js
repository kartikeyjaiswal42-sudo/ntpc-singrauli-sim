/** Builds the interactive 2D plant schematic SVG. */

const DEFS = `
<defs>
  <linearGradient id="g-metal" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0%" stop-color="#4a5e72"/><stop offset="100%" stop-color="#2a3544"/>
  </linearGradient>
  <linearGradient id="g-heat" x1="0" y1="1" x2="0" y2="0">
    <stop offset="0%" stop-color="#ea580c"/><stop offset="100%" stop-color="#fbbf24"/>
  </linearGradient>
  <linearGradient id="g-water" x1="0" y1="0" x2="1" y2="1">
    <stop offset="0%" stop-color="#0ea5e9"/><stop offset="100%" stop-color="#2dd4bf"/>
  </linearGradient>
  <linearGradient id="g-stack" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0%" stop-color="#e8eaed"/><stop offset="12%" stop-color="#e8eaed"/>
    <stop offset="12%" stop-color="#d42b2b"/><stop offset="24%" stop-color="#d42b2b"/>
    <stop offset="24%" stop-color="#e8eaed"/><stop offset="36%" stop-color="#e8eaed"/>
    <stop offset="36%" stop-color="#d42b2b"/><stop offset="48%" stop-color="#d42b2b"/>
    <stop offset="48%" stop-color="#e8eaed"/><stop offset="60%" stop-color="#e8eaed"/>
    <stop offset="60%" stop-color="#d42b2b"/><stop offset="72%" stop-color="#d42b2b"/>
    <stop offset="72%" stop-color="#e8eaed"/><stop offset="84%" stop-color="#e8eaed"/>
    <stop offset="84%" stop-color="#d42b2b"/><stop offset="100%" stop-color="#d42b2b"/>
  </linearGradient>
  <filter id="soft-shadow" x="-20%" y="-20%" width="140%" height="140%">
    <feDropShadow dx="0" dy="4" stdDeviation="6" flood-opacity="0.35"/>
  </filter>
</defs>`;

/** @type {{ id: string, zone: string, x: number, y: number, w: number, h: number, label: string, sub?: string, fill: string, rx?: number }[]} */
export const BLOCKS = [
  { id: 'stack', zone: 'fgd', x: 52, y: 28, w: 44, h: 100, label: 'Chimney', sub: '220 m', fill: 'url(#g-stack)', rx: 4 },
  { id: 'esp', zone: 'fgd', x: 30, y: 148, w: 108, h: 72, label: 'ESP', sub: 'Fly ash', fill: '#9aa4ae', rx: 6 },
  { id: 'fgd', zone: 'fgd', x: 158, y: 132, w: 72, h: 88, label: 'FGD', sub: 'SO₂ scrub', fill: 'url(#g-metal)', rx: 36 },
  { id: 'coal', zone: 'coal', x: 36, y: 300, w: 100, h: 76, label: 'Coal yard', sub: '312 t/h', fill: '#3a4450', rx: 8 },
  { id: 'boiler', zone: 'boiler', x: 188, y: 218, w: 118, h: 148, label: 'Boiler', sub: '1700 t/h', fill: 'url(#g-metal)', rx: 8 },
  { id: 'furnace', zone: 'boiler', x: 210, y: 300, w: 74, h: 48, label: 'Furnace', fill: 'url(#g-heat)', rx: 6 },
  { id: 'turbine', zone: 'turbine', x: 388, y: 258, w: 96, h: 88, label: 'Turbine', sub: 'HP–IP–LP', fill: 'url(#g-metal)', rx: 48 },
  { id: 'generator', zone: 'turbine', x: 508, y: 248, w: 88, h: 108, label: 'Generator', sub: '500 MW', fill: '#b87333', rx: 44 },
  { id: 'gt', zone: 'elec', x: 618, y: 108, w: 64, h: 72, label: 'GT', sub: '21→400 kV', fill: '#2a3544', rx: 6 },
  { id: 'switchyard', zone: 'elec', x: 708, y: 72, w: 130, h: 88, label: '400 kV Yard', fill: 'url(#g-metal)', rx: 8 },
  { id: 'condenser', zone: 'condcw', x: 648, y: 318, w: 108, h: 64, label: 'Condenser', sub: 'Vacuum', fill: 'url(#g-metal)', rx: 8 },
  { id: 'pumphouse', zone: 'pumphouse', x: 788, y: 268, w: 118, h: 86, label: 'CW Pump House', sub: '5× pumps', fill: '#1e4d8c', rx: 8 },
  { id: 'reservoir', zone: 'condcw', x: 788, y: 408, w: 148, h: 56, label: 'Rihand Reservoir', fill: 'url(#g-water)', rx: 8 },
  { id: 'cooltower', zone: 'aux', x: 968, y: 188, w: 88, h: 148, label: 'Cooling Tower', fill: '#9aa4ae', rx: 44 },
  { id: 'dm', zone: 'aux', x: 188, y: 468, w: 72, h: 52, label: 'DM Plant', fill: '#1a2438', rx: 6 },
  { id: 'h2', zone: 'aux', x: 278, y: 468, w: 72, h: 52, label: 'H₂ Plant', fill: '#1a2438', rx: 6 },
  { id: 'chlor', zone: 'aux', x: 368, y: 468, w: 72, h: 52, label: 'Chlorination', fill: '#1a2438', rx: 6 },
];

const FLOWS = [
  { cls: 'coal', d: 'M136,338 L188,338', anim: 'coal' },
  { cls: 'steam', d: 'M306,290 L388,300', anim: 'steam' },
  { cls: 'steam', d: 'M484,302 L508,302', anim: 'steam' },
  { cls: 'power', d: 'M596,302 L618,140 L708,116', anim: 'power' },
  { cls: 'water', d: 'M864,454 L864,354 L754,354', anim: 'water' },
  { cls: 'water', d: 'M754,350 L702,350', anim: 'water' },
  { cls: 'water', d: 'M906,354 L968,280', anim: 'water' },
  { cls: 'flue', d: 'M296,240 L138,184', anim: 'flue' },
  { cls: 'flue', d: 'M138,148 L74,128', anim: 'flue' },
  { cls: 'flue', d: 'M230,132 L158,176', anim: 'flue' },
];

function blockSvg(b) {
  const cx = b.x + b.w / 2;
  const cy = b.y + b.h / 2;
  const rx = b.rx ?? 8;
  return `
<g class="eq" data-id="${b.id}" data-zone="${b.zone}">
  <rect class="eq-body" x="${b.x}" y="${b.y}" width="${b.w}" height="${b.h}" rx="${rx}"
    fill="${b.fill}" stroke="rgba(255,255,255,0.12)" stroke-width="1.5" filter="url(#soft-shadow)"/>
  <text x="${cx}" y="${cy - 4}" text-anchor="middle" fill="#eef3fb" font-size="12" font-weight="600" font-family="IBM Plex Sans, sans-serif">${b.label}</text>
  ${b.sub ? `<text x="${cx}" y="${cy + 12}" text-anchor="middle" fill="#8b9cb3" font-size="10" font-family="IBM Plex Sans, sans-serif">${b.sub}</text>` : ''}
</g>`;
}

export function buildDiagramSvg() {
  const flows = FLOWS.map(
    (f) => `
  <path class="flow-line ${f.cls}" d="${f.d}"/>
  <path class="flow-anim ${f.cls}" d="${f.d}"/>`
  ).join('');

  const furnaceGlow = `
<ellipse class="furnace-glow pulse-glow" cx="247" cy="324" rx="30" ry="18" fill="#ff5c1a" opacity="0"/>

<g class="smoke-group">
  <circle class="smoke-puff" cx="74" cy="20" r="6" fill="#94a3b8" style="animation-delay:0s"/>
  <circle class="smoke-puff" cx="82" cy="18" r="5" fill="#94a3b8" style="animation-delay:0.8s"/>
  <circle class="smoke-puff" cx="68" cy="16" r="4" fill="#94a3b8" style="animation-delay:1.6s"/>
</g>`;

  const legend = `
<g transform="translate(40, 560)" font-family="IBM Plex Sans, sans-serif" font-size="10" fill="#8b9cb3">
  <rect x="0" y="0" width="10" height="3" fill="#7dd3fc" rx="1"/><text x="16" y="8">Steam</text>
  <rect x="70" y="0" width="10" height="3" fill="#38bdf8" rx="1"/><text x="86" y="8">Cooling water</text>
  <rect x="170" y="0" width="10" height="3" fill="#94a3b8" rx="1"/><text x="186" y="8">Flue gas</text>
  <rect x="250" y="0" width="10" height="3" fill="#fbbf24" rx="1"/><text x="266" y="8">Power</text>
</g>`;

  return `${DEFS}
<rect width="1200" height="680" fill="#0c1220"/>
<text x="600" y="640" text-anchor="middle" fill="#4a5568" font-size="11" font-family="IBM Plex Sans, sans-serif">Singrauli Super Thermal · Coal → Steam → Turbine → Grid · CW loop from Rihand</text>
${flows}
${furnaceGlow}
${BLOCKS.map(blockSvg).join('\n')}
${legend}`;
}

/** Zone focus regions for tour / nav zoom */
export const ZONE_VIEWS = {
  overview: { x: 0, y: 0, w: 1200, h: 680 },
  coal: { x: 20, y: 270, w: 200, h: 130 },
  boiler: { x: 170, y: 200, w: 200, h: 200 },
  turbine: { x: 370, y: 220, w: 250, h: 150 },
  condcw: { x: 620, y: 300, w: 340, h: 180 },
  pumphouse: { x: 760, y: 240, w: 200, h: 120 },
  fgd: { x: 20, y: 10, w: 230, h: 220 },
  aux: { x: 160, y: 160, w: 920, h: 200 },
  elec: { x: 600, y: 50, w: 260, h: 130 },
};
