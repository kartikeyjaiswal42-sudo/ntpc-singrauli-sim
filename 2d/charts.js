/**
 * Lightweight canvas charts (no dependencies):
 *  - EnergyBar:  Sankey-style "where the coal energy goes" stacked bar
 *  - EffCurve:   net efficiency vs load, with live operating point
 *  - Trend:      rolling net-MW sparkline
 */

const FONT = '11px "Inter", system-ui, sans-serif';
const INK = '#1e293b';
const MUTED = '#64748b';

function setup(canvas) {
  const dpr = Math.min(devicePixelRatio || 1, 2);
  const rect = canvas.getBoundingClientRect();
  const w = rect.width || canvas.clientWidth || 300;
  const h = rect.height || canvas.clientHeight || 150;
  canvas.width = w * dpr;
  canvas.height = h * dpr;
  const ctx = canvas.getContext('2d');
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, w, h);
  return { ctx, w, h };
}

export const ENERGY_SEGMENTS = [
  { key: 'net', label: 'Net electrical', color: '#16a34a' },
  { key: 'aux', label: 'Auxiliary', color: '#65a30d' },
  { key: 'boiler', label: 'Boiler loss', color: '#f59e0b' },
  { key: 'condenser', label: 'Condenser loss', color: '#3b82f6' },
  { key: 'other', label: 'Other losses', color: '#94a3b8' },
];

export class EnergyBar {
  constructor(canvas) { this.canvas = canvas; }
  draw(energy) {
    const { ctx, w, h } = setup(this.canvas);
    const padX = 12;
    const barX = padX;
    const barW = w - padX * 2;
    const barY = 14;
    const barH = 30;

    let x = barX;
    ENERGY_SEGMENTS.forEach((seg) => {
      const frac = Math.max(0, energy[seg.key] || 0);
      const segW = frac * barW;
      ctx.fillStyle = seg.color;
      ctx.fillRect(x, barY, segW, barH);
      if (segW > 34) {
        ctx.fillStyle = '#fff';
        ctx.font = '600 11px "JetBrains Mono", monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(`${(frac * 100).toFixed(0)}%`, x + segW / 2, barY + barH / 2);
      }
      x += segW;
    });

    ctx.strokeStyle = 'rgba(0,0,0,0.12)';
    ctx.strokeRect(barX, barY, barW, barH);

    // legend
    let lx = barX;
    const ly = barY + barH + 18;
    ctx.font = FONT;
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'left';
    ENERGY_SEGMENTS.forEach((seg) => {
      const frac = energy[seg.key] || 0;
      const text = `${seg.label} ${(frac * 100).toFixed(1)}%`;
      const tw = ctx.measureText(text).width + 18;
      if (lx + tw > w - padX) { lx = barX; }
      ctx.fillStyle = seg.color;
      ctx.fillRect(lx, ly - 4, 9, 9);
      ctx.fillStyle = MUTED;
      ctx.fillText(text, lx + 13, ly);
      lx += tw + 6;
    });
  }
}

export class EffCurve {
  constructor(canvas, model) { this.canvas = canvas; this.model = model; }
  draw(curvePoints, current) {
    const { ctx, w, h } = setup(this.canvas);
    const padL = 38, padR = 12, padT = 14, padB = 26;
    const plotW = w - padL - padR;
    const plotH = h - padT - padB;
    const xMin = 30, xMax = 100;
    const yMin = 26, yMax = 40;

    const X = (load) => padL + ((load - xMin) / (xMax - xMin)) * plotW;
    const Y = (eff) => padT + (1 - (eff - yMin) / (yMax - yMin)) * plotH;

    // gridlines + y labels
    ctx.font = '10px "JetBrains Mono", monospace';
    ctx.fillStyle = MUTED;
    ctx.strokeStyle = 'rgba(0,0,0,0.06)';
    ctx.lineWidth = 1;
    for (let e = 28; e <= 40; e += 4) {
      const y = Y(e);
      ctx.beginPath(); ctx.moveTo(padL, y); ctx.lineTo(w - padR, y); ctx.stroke();
      ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
      ctx.fillText(`${e}%`, padL - 6, y);
    }
    for (let l = 40; l <= 100; l += 20) {
      const x = X(l);
      ctx.textAlign = 'center'; ctx.textBaseline = 'top';
      ctx.fillText(`${l}`, x, h - padB + 6);
    }

    // curve
    ctx.beginPath();
    curvePoints.forEach((p, i) => {
      const x = X(p.load), y = Y(p.eff * 100);
      i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
    });
    ctx.strokeStyle = '#0e7490';
    ctx.lineWidth = 2.5;
    ctx.stroke();

    // area under
    ctx.lineTo(X(100), Y(yMin)); ctx.lineTo(X(xMin), Y(yMin)); ctx.closePath();
    ctx.fillStyle = 'rgba(14,116,144,0.08)';
    ctx.fill();

    // operating point
    const cx = X(current.load), cy = Y(current.eff * 100);
    ctx.beginPath(); ctx.arc(cx, cy, 5, 0, Math.PI * 2);
    ctx.fillStyle = '#0e7490'; ctx.fill();
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.stroke();

    ctx.fillStyle = INK;
    ctx.font = '600 11px "JetBrains Mono", monospace';
    ctx.textAlign = cx > w - 70 ? 'right' : 'left';
    ctx.textBaseline = 'bottom';
    ctx.fillText(`${(current.eff * 100).toFixed(1)}%`, cx + (cx > w - 70 ? -8 : 8), cy - 6);
  }
}

export class Trend {
  constructor(canvas, cap = 120) { this.canvas = canvas; this.data = []; this.cap = cap; }
  push(v) { this.data.push(v); if (this.data.length > this.cap) this.data.shift(); }
  draw(color = '#16a34a', max = 500) {
    const { ctx, w, h } = setup(this.canvas);
    if (this.data.length < 2) return;
    const pad = 4;
    const X = (i) => pad + (i / (this.cap - 1)) * (w - pad * 2);
    const Y = (v) => h - pad - (v / max) * (h - pad * 2);
    ctx.beginPath();
    this.data.forEach((v, i) => { const x = X(i), y = Y(v); i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); });
    ctx.strokeStyle = color; ctx.lineWidth = 2; ctx.stroke();
    ctx.lineTo(X(this.data.length - 1), h - pad); ctx.lineTo(X(0), h - pad); ctx.closePath();
    ctx.fillStyle = color + '22'; ctx.fill();
  }
}
