// effects.js — canvas overlay that paints live, physically-suggestive animation
// on top of the real plant photographs (smoke plumes, furnace glow, spinning
// machinery, steam wisps, flowing cooling water). All effect anchors are given
// in normalised image coordinates (0..1) so they track the photo on resize.

const rnd = (a, b) => a + Math.random() * (b - a);

export class EffectsLayer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.specs = [];
    this.intensity = 0.78; // 0..1, driven by plant load
    this.running = true;
    this.W = 0;
    this.H = 0;
    this.dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.t = 0;
  }

  resize() {
    const r = this.canvas.getBoundingClientRect();
    this.W = r.width;
    this.H = r.height;
    this.canvas.width = Math.max(1, Math.round(r.width * this.dpr));
    this.canvas.height = Math.max(1, Math.round(r.height * this.dpr));
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
  }

  setScene(effects = []) {
    // deep-clone so each scene keeps its own particle pools
    this.specs = effects.map((e) => ({ ...e, particles: [], spawnAcc: 0 }));
  }

  setState({ intensity, running }) {
    if (typeof intensity === 'number') this.intensity = Math.max(0, Math.min(1, intensity));
    if (typeof running === 'boolean') this.running = running;
  }

  render(dt) {
    if (!this.W) this.resize();
    this.t += dt;
    const { ctx } = this;
    ctx.clearRect(0, 0, this.W, this.H);
    const S = (this.W + this.H) / 2;
    for (const spec of this.specs) {
      switch (spec.type) {
        case 'smoke': this._plume(spec, dt, S, false); break;
        case 'steam': this._plume(spec, dt, S, true); break;
        case 'flame': this._flame(spec, S); break;
        case 'spin': this._spin(spec, dt, S); break;
        case 'water': this._water(spec, S); break;
        case 'pulse': this._pulse(spec, S); break;
      }
    }
  }

  // ---- rising plume (smoke or steam) ----
  _plume(spec, dt, S, steam) {
    const ctx = this.ctx;
    const px = spec.x * this.W;
    const py = spec.y * this.H;
    const inten = this.intensity * (spec.scale || 1);
    // emission rate scales with load; when tripped, stop emitting but let it dissipate
    const baseRate = steam ? 26 : 34;
    const rate = this.running ? baseRate * (0.25 + 0.9 * inten) : 0;
    spec.spawnAcc += rate * dt;
    while (spec.spawnAcc >= 1) {
      spec.spawnAcc -= 1;
      const life = steam ? rnd(1.1, 2.0) : rnd(2.6, 4.6);
      spec.particles.push({
        x: px + rnd(-0.012, 0.012) * S,
        y: py + rnd(-0.006, 0.006) * S,
        vx: (spec.drift || 0.3) * S * 0.02 + rnd(-0.004, 0.006) * S,
        vy: -(steam ? rnd(0.08, 0.13) : rnd(0.045, 0.075)) * S * (0.7 + 0.6 * inten),
        r: (steam ? rnd(0.008, 0.016) : rnd(0.012, 0.022)) * S,
        grow: (steam ? rnd(0.05, 0.09) : rnd(0.045, 0.08)) * S,
        life,
        max: life,
      });
    }
    ctx.save();
    ctx.globalCompositeOperation = 'source-over';
    for (let i = spec.particles.length - 1; i >= 0; i--) {
      const p = spec.particles[i];
      p.life -= dt;
      if (p.life <= 0) { spec.particles.splice(i, 1); continue; }
      // buoyant acceleration + drift
      p.vy -= 0.015 * S * dt;
      p.x += p.vx * dt + Math.sin((this.t + i) * 0.6) * 0.004 * S * dt * 8;
      p.y += p.vy * dt;
      p.r += p.grow * dt;
      const k = p.life / p.max;               // 1 -> 0
      const age = 1 - k;                       // 0 -> 1
      const alpha = (steam ? 0.42 : 0.5) * Math.sin(Math.min(1, k * 1.2) * Math.PI) * (0.5 + 0.5 * inten);
      const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r);
      if (steam) {
        g.addColorStop(0, `rgba(255,255,255,${alpha})`);
        g.addColorStop(1, 'rgba(255,255,255,0)');
      } else {
        // young smoke a touch darker, ageing to pale grey/white as it cools
        const tone = 150 + Math.round(95 * age);
        g.addColorStop(0, `rgba(${tone},${tone + 4},${tone + 8},${alpha})`);
        g.addColorStop(1, `rgba(${tone},${tone},${tone},0)`);
      }
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  // ---- furnace / combustion glow ----
  _flame(spec, S) {
    if (!this.running && this.intensity < 0.02) return;
    const ctx = this.ctx;
    const px = spec.x * this.W;
    const py = spec.y * this.H;
    const inten = this.intensity;
    const flick = 0.82 + 0.18 * Math.sin(this.t * 9) + 0.08 * Math.sin(this.t * 23.7);
    const R = (spec.r || 0.1) * S * (0.7 + 0.5 * inten) * flick;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const g = ctx.createRadialGradient(px, py, 0, px, py, R);
    const a = (0.55 + 0.35 * inten) * flick;
    g.addColorStop(0, `rgba(255,247,210,${a})`);
    g.addColorStop(0.35, `rgba(255,168,64,${a * 0.85})`);
    g.addColorStop(0.7, `rgba(226,88,30,${a * 0.45})`);
    g.addColorStop(1, 'rgba(120,30,10,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(px, py, R, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  // ---- rotating-machinery indicator (pumps / turbine / generator) ----
  _spin(spec, dt, S) {
    const ctx = this.ctx;
    const px = spec.x * this.W;
    const py = spec.y * this.H;
    const r = (spec.r || 0.05) * S;
    const speed = (spec.speed || 1) * (this.running ? (0.3 + 1.7 * this.intensity) : 0);
    spec._a = (spec._a || 0) + speed * dt * 3.0;
    const col = spec.color || '#38e1c6';
    ctx.save();
    ctx.translate(px, py);
    // soft hub
    ctx.globalAlpha = 0.9;
    ctx.lineWidth = Math.max(2, r * 0.14);
    ctx.strokeStyle = col;
    const blades = spec.blades || 3;
    for (let b = 0; b < blades; b++) {
      const a0 = spec._a + (b * Math.PI * 2) / blades;
      ctx.beginPath();
      ctx.arc(0, 0, r, a0, a0 + Math.PI * 0.55);
      ctx.stroke();
    }
    ctx.globalAlpha = 0.55;
    ctx.lineWidth = Math.max(1.5, r * 0.08);
    ctx.beginPath();
    ctx.arc(0, 0, r * 1.28, 0, Math.PI * 2);
    ctx.setLineDash([r * 0.5, r * 0.4]);
    ctx.stroke();
    ctx.setLineDash([]);
    // hub dot
    ctx.globalAlpha = 0.95;
    ctx.fillStyle = col;
    ctx.beginPath();
    ctx.arc(0, 0, Math.max(2, r * 0.12), 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  // ---- flowing water (CW intake / pump discharge) ----
  _water(spec, S) {
    const ctx = this.ctx;
    const x0 = spec.x * this.W;
    const y0 = spec.y * this.H;
    const len = (spec.w || 0.25) * this.W;
    const amp = (spec.amp || 0.012) * S;
    const col = spec.color || '#37b6ff';
    const flow = (this.running ? (0.4 + 1.4 * this.intensity) : 0.15);
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (let lane = 0; lane < 3; lane++) {
      const yo = y0 + (lane - 1) * amp * 1.6;
      const phase = this.t * flow * 3 + lane * 1.7;
      ctx.beginPath();
      for (let i = 0; i <= 40; i++) {
        const fx = i / 40;
        const xx = x0 + fx * len;
        const yy = yo + Math.sin(phase + fx * 10) * amp * (0.6 + 0.4 * Math.sin(fx * Math.PI));
        if (i === 0) ctx.moveTo(xx, yy); else ctx.lineTo(xx, yy);
      }
      ctx.strokeStyle = col;
      ctx.globalAlpha = 0.22 + 0.12 * lane;
      ctx.lineWidth = Math.max(1.5, amp * 0.5);
      ctx.setLineDash([len * 0.06, len * 0.05]);
      ctx.lineDashOffset = -this.t * flow * 90;
      ctx.stroke();
    }
    ctx.setLineDash([]);
    ctx.restore();
  }

  // ---- soft attention pulse (used to highlight a region) ----
  _pulse(spec, S) {
    const ctx = this.ctx;
    const px = spec.x * this.W;
    const py = spec.y * this.H;
    const k = (Math.sin(this.t * 2.2) + 1) / 2;
    const R = (spec.r || 0.06) * S * (1 + 0.25 * k);
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const g = ctx.createRadialGradient(px, py, R * 0.4, px, py, R);
    const col = spec.color || '198,40,40';
    g.addColorStop(0, `rgba(${col},${0.25 * (1 - k)})`);
    g.addColorStop(1, `rgba(${col},0)`);
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(px, py, R, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}
