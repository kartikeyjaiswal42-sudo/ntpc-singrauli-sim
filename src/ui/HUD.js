import { Events } from '../core/EventBus.js';
import { ZONES } from '../config/zones.js';
import { EQUIPMENT } from '../config/equipment.js';
import { zoneById } from '../config/zones.js';

export class HUD {
  constructor(root, state, world, tour) {
    this.state = state;
    this.world = world;
    this.tour = tour;
    root.innerHTML = this.#template();
    this.#bind();
    state.bus.on(Events.STATE, (s) => this.#render(s));
    state.bus.on(Events.SELECT, (id) => this.#inspector(id, state.plant));
    this.#render(state.snapshot);
    this.#inspector(state.selection, state.plant);
  }

  #template() {
    const zones = ZONES.filter((z) => z.id !== 'overview')
      .map((z) => `<button class="zone-btn" data-z="${z.id}" style="--zc:${z.color}">${z.label}</button>`)
      .join('');
    const chips = ZONES.map((z) => `<button class="chip" data-z="${z.id}">${z.label}</button>`).join('');
    return `
      <div class="hud">
        <header class="hud-header">
          <div><h1>NTPC Singrauli · Stage 2</h1><p>3D modular simulation · 2×500 MW</p></div>
          <div class="grow"></div>
          <div class="pill"><span class="dot"></span><span id="statusTxt">Online</span></div>
          <button class="btn primary" id="tourBtn" type="button">▶ Auto Tour</button>
          <button class="btn" id="pauseBtn" type="button">⏸</button>
        </header>
        <div class="hud-body">
          <aside class="left">
            <div class="panel"><h3>Systems</h3>${zones}</div>
            <div class="panel">
              <h3>Unit control</h3>
              <div class="slider-row"><span>Load</span><span class="val" id="loadV">100%</span></div>
              <input type="range" id="load" min="0" max="100" value="100"/>
              <div class="slider-row"><span>Sulphur</span><span class="val" id="sulV">0.40%</span></div>
              <input type="range" id="sul" min="20" max="120" value="40"/>
              <div style="display:flex;gap:6px;margin-top:4px">
                <button class="btn" id="rampUp" type="button" style="flex:1">Ramp ▲</button>
                <button class="btn" id="rampDn" type="button" style="flex:1">Ramp ▼</button>
                <button class="btn" id="tripBtn" type="button">Trip</button>
              </div>
            </div>
            <div class="panel">
              <h3>Output</h3>
              <div class="metrics">
                <div class="metric"><div class="lbl">Net MW</div><div class="num" id="m_net">460</div></div>
                <div class="metric"><div class="lbl">Gross MW</div><div class="num" id="m_gross">500</div></div>
                <div class="metric"><div class="lbl">Steam</div><div class="num" id="m_steam">1700</div></div>
                <div class="metric"><div class="lbl">Coal</div><div class="num" id="m_coal">312</div></div>
              </div>
            </div>
          </aside>
          <div></div>
          <aside class="right">
            <div class="panel">
              <h3>Inspector</h3>
              <div id="inspName" style="font-weight:700;font-size:15px;margin-bottom:4px">—</div>
              <div id="inspDesc" style="font-size:12px;color:var(--muted);line-height:1.5;margin-bottom:8px">—</div>
              <div id="inspKv"></div>
            </div>
            <div class="panel">
              <h3>Process</h3>
              <div id="procKv"></div>
            </div>
          </aside>
        </div>
        <div class="hud-label">Drag to orbit · Scroll to zoom · Click equipment</div>
        <footer class="hud-footer">
          <span style="font-size:9px;color:var(--muted);text-transform:uppercase;margin-right:6px">Focus</span>
          ${chips}
          <span style="flex:1"></span>
          <button class="btn" id="resetView" type="button">Reset</button>
        </footer>
      </div>`;
  }

  #bind() {
    const go = (z) => {
      this.state.setZone(z);
      this.world.flyToZone(z);
      document.querySelectorAll('.zone-btn,.chip').forEach((b) => {
        b.classList.toggle('on', b.dataset.z === z);
      });
    };
    document.querySelectorAll('.zone-btn,.chip').forEach((b) => {
      b.onclick = () => go(b.dataset.z);
    });

    const load = document.getElementById('load');
    const sul = document.getElementById('sul');
    load.oninput = () => this.state.setLoad(+load.value);
    sul.oninput = () => this.state.setSul(+sul.value);

    document.getElementById('pauseBtn').onclick = () => {
      this.state.setRunning(!this.state.running);
      document.getElementById('pauseBtn').textContent = this.state.running ? '⏸' : '▶';
    };
    document.getElementById('tourBtn').onclick = () => this.tour.start();
    document.getElementById('resetView').onclick = () => go('overview');

    const tween = (target, ms) => {
      const s = this.state.load;
      const t0 = performance.now();
      const tick = (now) => {
        const k = Math.min(1, (now - t0) / ms);
        this.state.setLoad(Math.round(s + (target - s) * (1 - Math.pow(1 - k, 2))));
        if (k < 1) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    };
    document.getElementById('rampUp').onclick = () => { this.state.tripped = false; tween(100, 4000); };
    document.getElementById('rampDn').onclick = () => tween(50, 4000);
    document.getElementById('tripBtn').onclick = () => { this.state.trip(); tween(0, 1200); };

    this.state.bus.on(Events.SELECT, (id) => {
      const eq = EQUIPMENT[id];
      if (eq?.zone) go(eq.zone);
    });
  }

  #render(s) {
    document.getElementById('loadV').textContent = `${Math.round(s.load)}%`;
    document.getElementById('sulV').textContent = `${(s.sul / 100).toFixed(2)}%`;
    document.getElementById('m_net').textContent = s.plant.net;
    document.getElementById('m_gross').textContent = s.plant.gross;
    document.getElementById('m_steam').textContent = s.plant.steam;
    document.getElementById('m_coal').textContent = s.plant.coal;
    document.getElementById('statusTxt').textContent = s.tripped
      ? 'TRIPPED'
      : s.load < 55
        ? 'Low load'
        : 'Synchronised';
    document.getElementById('load').style.setProperty('--p', `${s.load}%`);
    document.getElementById('sul').style.setProperty('--p', `${((s.sul - 20) / 100) * 100}%`);
    document.querySelectorAll('.zone-btn,.chip').forEach((b) => {
      b.classList.toggle('on', b.dataset.z === s.zone);
    });
    this.#inspector(s.selection, s.plant);
    this.#process(s.plant);
  }

  #inspector(id, p) {
    const eq = EQUIPMENT[id];
    if (!eq) return;
    document.getElementById('inspName').textContent = eq.name;
    document.getElementById('inspDesc').textContent = eq.desc;
    document.getElementById('inspKv').innerHTML = eq.rows(p)
      .map(([k, v]) => `<div class="kv"><span class="k">${k}</span><span class="v">${v}</span></div>`)
      .join('');
  }

  #process(p) {
    document.getElementById('procKv').innerHTML = [
      ['Coal → Boiler', `${p.coal} t/h`],
      ['Steam → Turbine', `${p.steam} t/h @ ${p.msT}°C`],
      ['Generator', `${p.gross} MW`],
      ['CW loop', `${p.cwFlow.toLocaleString()} m³/h`],
      ['FGD gypsum', `${p.gyp} t/h`],
    ]
      .map(([k, v]) => `<div class="kv"><span class="k">${k}</span><span class="v">${v}</span></div>`)
      .join('');
  }
}
